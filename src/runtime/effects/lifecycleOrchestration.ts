import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { THEMES, LANG_MAP } from "../../utils/constants";
import { preloadAudio } from "../../utils/audioLoader";
import { saveImage } from "../../utils/imageStorage";
import {
  getThemeName,
  IMAGE_BASED_THEME,
  normalizeSavePresetProfile,
} from "../../services/ai/utils";
import {
  ContextOverflowError,
  HistoryCorruptedError,
  isContextLengthError,
  isInvalidArgumentError,
} from "../../services/ai/contextCompressor";
import type { OutlinePhaseProgress } from "../../services/aiService";
import type {
  AISettings,
  GameState,
  OutlineConversationState,
  SavePresetProfile,
  UnifiedMessage,
} from "../../types";
import type { VfsSession } from "../../services/vfs/vfsSession";
import { clearOutlineProgress, writeOutlineProgress } from "../../services/vfs/outline";
import { seedVfsSessionFromDefaults } from "../../services/vfs/seed";
import {
  applyOpeningNarrativeState,
  buildOpeningNarrativeSegment,
  buildOutlineHydratedState,
  persistOutlineCheckpoint,
} from "./outlineHydration";
import { blobToDataUrl, runOutlineGenerationPhased } from "./outlineGeneration";
import {
  applyCustomContextThemeOverrides,
  indexInitialEntities,
} from "./ragDocuments";

type ShowToast = (
  message: string,
  type?: "success" | "error" | "info" | "warning",
  duration?: number,
) => void;

type Navigate = (path: string) => void;

type Confirm = (message?: string) => boolean;

interface LifecycleActionsDeps {
  aiSettings: AISettings;
  language: string;
  t: TFunction;
  showToast: ShowToast;
  navigate: Navigate;
  confirm?: Confirm;
  vfsSession: VfsSession;
  gameStateRef: MutableRefObject<GameState>;
  setGameState: Dispatch<SetStateAction<GameState>>;
  createSaveSlot: (theme: string) => string;
  setCurrentSlotId: (slotId: string | null) => void;
  currentSlotId: string | null;
  saveToSlot: (slotId: string, state: GameState) => Promise<boolean>;
  deleteSlot: (slotId: string) => void;
  resetState: (theme: string) => void;
}

interface BuildOpeningStateParams {
  outline: any;
  logs: any[];
  themeConfig: any;
  theme: string;
  language: string;
  customContext?: string;
  seedImageId?: string;
  presetProfile?: SavePresetProfile;
  includeCustomContextInPrompt?: boolean;
  clearLiveToolCalls?: boolean;
}

interface CommitOutlineStateParams {
  saveId: string;
  outline: any;
  themeConfig: any;
  theme: string;
  language: string;
  customContext?: string;
  nextState: GameState;
  seedImageId?: string;
  logPrefix: string;
}

export function createLifecycleActions({
  aiSettings,
  language,
  t,
  showToast,
  navigate,
  confirm,
  vfsSession,
  gameStateRef,
  setGameState,
  createSaveSlot,
  setCurrentSlotId,
  currentSlotId,
  saveToSlot,
  deleteSlot,
  resetState,
}: LifecycleActionsDeps) {
  const confirmAction: Confirm = confirm ?? ((message?: string) => window.confirm(message));

  const sanitizeOutlineConversationForRecovery = (
    conversation: OutlineConversationState,
  ): OutlineConversationState | null => {
    const sanitizedHistory: UnifiedMessage[] = [];

    for (const message of conversation.conversationHistory || []) {
      if (!message || typeof message !== "object") continue;
      if (message.role === "tool") continue;

      const nextContent = (Array.isArray(message.content) ? message.content : []).filter(
        (part) => {
          if (!part || typeof part !== "object") return false;
          if (part.type === "tool_use" || part.type === "tool_result") {
            return false;
          }
          if (
            part.type === "text" &&
            typeof part.text === "string" &&
            (part.text.startsWith("[SYSTEM: BUDGET STATUS]") ||
              part.text.startsWith("[SYSTEM: BUDGET UPDATE]"))
          ) {
            return false;
          }
          return true;
        },
      );

      if (nextContent.length === 0) continue;
      sanitizedHistory.push({
        ...message,
        content: nextContent,
      });
    }

    if (sanitizedHistory.length === 0) {
      return null;
    }

    return {
      ...conversation,
      conversationHistory: sanitizedHistory,
      liveToolCalls: [],
    };
  };

  type ResumeRecoveryKind = "history" | "context" | "transient";

  const TRANSIENT_RESUME_ERROR_PATTERN =
    /timeout|timed out|network|econnreset|connection reset|ehostunreach|enotfound|socket hang up|429|rate limit|overloaded|temporarily unavailable|service unavailable|502|503|504|gateway timeout|aborted/i;

  const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error || "");

  const isTransientResumeError = (error: unknown): boolean => {
    const msg = getErrorMessage(error);
    return TRANSIENT_RESUME_ERROR_PATTERN.test(msg);
  };

  const getResumeRecoveryKind = (error: unknown): ResumeRecoveryKind | null => {
    if (error instanceof HistoryCorruptedError || isInvalidArgumentError(error)) {
      return "history";
    }
    if (error instanceof ContextOverflowError || isContextLengthError(error)) {
      return "context";
    }
    if (isTransientResumeError(error)) {
      return "transient";
    }
    return null;
  };

  const trimConversationForContextRecovery = (
    conversation: OutlineConversationState,
  ): OutlineConversationState => {
    const history = conversation.conversationHistory || [];
    const maxMessages = 24;
    if (history.length <= maxMessages) return conversation;

    const head = history.slice(0, 2);
    const tail = history.slice(-(maxMessages - head.length));
    const trimmedHistory = [...head, ...tail];

    return {
      ...conversation,
      conversationHistory: trimmedHistory,
      liveToolCalls: [],
    };
  };

  const buildRecoveryConversation = (
    conversation: OutlineConversationState,
    kind: ResumeRecoveryKind,
  ): OutlineConversationState | null => {
    if (kind === "transient") {
      return {
        ...conversation,
        liveToolCalls: [],
      };
    }

    const sanitized = sanitizeOutlineConversationForRecovery(conversation);
    if (!sanitized) return null;

    if (kind === "context") {
      return trimConversationForContextRecovery(sanitized);
    }

    return sanitized;
  };

  const buildOpeningState = ({
    outline,
    logs,
    themeConfig,
    theme,
    language,
    customContext,
    seedImageId,
    presetProfile,
    includeCustomContextInPrompt = false,
    clearLiveToolCalls = false,
  }: BuildOpeningStateParams): GameState => {
    const hydratedState = buildOutlineHydratedState({
      baseState: gameStateRef.current,
      outline,
      logs,
      themeConfig,
      language,
      customContext,
      themeOverride: theme,
      seedImageId,
      clearLiveToolCalls,
    });

    const hydratedWithPresetProfile = hydratedState;
    hydratedWithPresetProfile.presetProfile = normalizeSavePresetProfile(
      presetProfile,
    );

    const { firstNode, openingAtmosphere, fallbackPrompt } =
      buildOpeningNarrativeSegment({
        outline,
        baseState: hydratedWithPresetProfile,
        theme,
        t,
        customContext,
        includeCustomContextInPrompt,
        seedImageId,
      });

    try {
      vfsSession.mergeJson("world/global.json", {
        initialPrompt: fallbackPrompt,
      });
    } catch (error) {
      console.warn("[Lifecycle] Failed to persist initialPrompt in VFS", error);
    }

    return applyOpeningNarrativeState(
      hydratedWithPresetProfile,
      firstNode,
      openingAtmosphere,
      fallbackPrompt,
    );
  };

  const commitOutlineState = async ({
    saveId,
    outline,
    themeConfig,
    theme,
    language,
    customContext,
    nextState,
    seedImageId,
    logPrefix,
  }: CommitOutlineStateParams): Promise<void> => {
    gameStateRef.current = nextState;
    setGameState(nextState);
    navigate("/game");

    try {
      await persistOutlineCheckpoint({
        outline,
        themeConfig,
        theme,
        language,
        customContext,
        saveId,
        nextState,
        vfsSession,
        saveToSlot,
        seedImageId,
      });
      console.log(`[${logPrefix}] Outline checkpoint saved`);
    } catch (error) {
      console.error(`[${logPrefix}] Failed to save outline checkpoint`, error);
    }

    if (aiSettings.embedding?.enabled) {
      indexInitialEntities(nextState, saveId, vfsSession).catch((error) => {
        console.error(`[${logPrefix}] Failed to index initial entities:`, error);
      });
    }
  };

  const startNewGame = async (
    initialTheme?: string,
    customContext?: string,
    onStream?: (text: string) => void,
    onPhaseProgress?: (progress: OutlinePhaseProgress) => void,
    existingSlotId?: string,
    seedImage?: Blob,
    protagonistFeature?: string,
    presetProfile?: SavePresetProfile,
  ): Promise<void> => {
    let selectedTheme: string;
    if (seedImage && !initialTheme) {
      selectedTheme = IMAGE_BASED_THEME;
    } else {
      const selectableThemeKeys = Object.keys(THEMES).filter(
        (key) => key !== "custom",
      );
      selectedTheme =
        initialTheme ||
        selectableThemeKeys[
          Math.floor(Math.random() * selectableThemeKeys.length)
        ] ||
        "fantasy";
    }

    if (
      !aiSettings.audioVolume.bgmMuted &&
      aiSettings.audioVolume.bgmVolume > 0
    ) {
      preloadAudio().catch((e) =>
        console.warn("Background audio preload failed", e),
      );
    }

    const displayTheme = selectedTheme || IMAGE_BASED_THEME;
    const persistedTheme = selectedTheme || "fantasy";

    const slotId = existingSlotId || createSaveSlot(displayTheme);
    setCurrentSlotId(slotId);

    const normalizedPresetProfile = normalizeSavePresetProfile(
      presetProfile ?? gameStateRef.current.presetProfile,
    );

    try {
      vfsSession.restore({});
      seedVfsSessionFromDefaults(vfsSession);
      vfsSession.writeFile(
        "world/global.json",
        JSON.stringify({
          time: "Day 1, 08:00",
          theme: persistedTheme,
          currentLocation: "Unknown",
          atmosphere: { envTheme: "fantasy", ambience: "quiet" },
          turnNumber: 0,
          forkId: 0,
          language,
          customContext,
          presetProfile: normalizedPresetProfile,
        }),
        "application/json",
      );

      await saveToSlot(slotId, {
        ...gameStateRef.current,
        nodes: {},
        activeNodeId: null,
        rootNodeId: null,
        currentFork: [],
        actors: [],
        inventory: [],
        npcs: [],
        quests: [],
        factions: [],
        knowledge: [],
        locations: [],
        locationItemsByLocationId: {},
        outline: null,
        summaries: [],
        lastSummarizedIndex: 0,
        logs: [],
        liveToolCalls: [],
        turnNumber: 0,
        forkId: 0,
        theme: persistedTheme,
        language,
        customContext,
        presetProfile: normalizedPresetProfile,
      });
    } catch (e) {
      console.warn("[StartNewGame] Failed to persist initial save snapshot", e);
    }

    resetState(displayTheme);
    setGameState((prev) => {
      const nextState = {
        ...prev,
        customContext,
        presetProfile: normalizedPresetProfile,
        isProcessing: true,
        liveToolCalls: [],
      };
      gameStateRef.current = nextState;
      return nextState;
    });

    navigate("/initializing");

    let seedImageId: string | undefined;
    if (seedImage) {
      try {
        seedImageId = await saveImage(seedImage, {
          saveId: slotId,
          forkId: 0,
          turnIdx: 0,
          storyTitle: getThemeName(selectedTheme, t, selectedTheme),
        });
        console.log("[StartNewGame] Saved seed image with ID:", seedImageId);
      } catch (e) {
        console.error("[StartNewGame] Failed to save seed image:", e);
      }
    }

    let outline;
    let logs;
    let themeConfig;
    try {
      let seedImageBase64: string | undefined;
      if (seedImage) {
        try {
          seedImageBase64 = await blobToDataUrl(seedImage);
          console.log("[StartNewGame] Converted seed image to base64");
        } catch (e) {
          console.error("[StartNewGame] Failed to convert seed image:", e);
        }
      }

      const result = await runOutlineGenerationPhased({
        theme: selectedTheme,
        language: LANG_MAP[language as "en" | "zh"],
        customContext,
        t,
        aiSettings,
        slotId,
        vfsSession,
        setGameState,
        gameStateRef,
        saveToSlot,
        onPhaseProgress,
        seedImageBase64,
        protagonistFeature,
        presetProfile: normalizedPresetProfile,
        logPrefix: "StartNewGame",
      });

      outline = result.outline;
      logs = result.logs;
      themeConfig = applyCustomContextThemeOverrides(
        result.themeConfig,
        customContext,
      );
      console.log("[StartNewGame] Outline generated (phased)", outline);
    } catch (outlineError) {
      console.error("Outline generation failed", outlineError);

      const isHistoryCorrupted = outlineError instanceof HistoryCorruptedError;
      if (isHistoryCorrupted) {
        console.log(
          "[StartNewGame] History corrupted - preserving checkpoint for resume recovery",
        );
      }

      const outlineFailedMessage = isHistoryCorrupted
        ? t("initializing.errors.historyCacheCorrupted")
        : t("initializing.errors.outlineGenerationFailed");
      showToast(outlineFailedMessage, "error", 5000);

      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        liveToolCalls: [],
      }));

      const savedConversation = gameStateRef.current.outlineConversation;
      const hasProgress = Boolean(
        savedConversation && savedConversation.currentPhase > 0,
      );

      const retryMessage = hasProgress
        ? `${outlineFailedMessage}\n\n${t("initializing.errors.retryWithProgress", { phase: savedConversation.currentPhase })}`
        : `${outlineFailedMessage}\n\n${t("initializing.errors.retryOutline")}`;

      const shouldRetry = confirmAction(retryMessage);

      if (shouldRetry) {
        if (hasProgress) {
          console.log(
            `[StartNewGame] Resuming from saved conversation at phase ${savedConversation.currentPhase}`,
          );
          setGameState((prev) => ({
            ...prev,
            isProcessing: true,
            liveToolCalls:
              gameStateRef.current.outlineConversation?.liveToolCalls || [],
          }));
          return resumeOutlineGeneration(onStream, onPhaseProgress);
        }

        console.log("[StartNewGame] No saved progress, retrying from scratch");
        return startNewGame(
          selectedTheme,
          customContext,
          onStream,
          onPhaseProgress,
          slotId,
          seedImage,
          protagonistFeature,
          normalizedPresetProfile,
        );
      }

      deleteSlot(slotId);
      setCurrentSlotId(null);
      navigate("/");
      return;
    }

    try {
      const nextState = buildOpeningState({
        outline,
        logs,
        themeConfig,
        theme: selectedTheme,
        language,
        customContext,
        seedImageId,
        presetProfile: normalizedPresetProfile,
      });

      await commitOutlineState({
        saveId: slotId,
        outline,
        themeConfig,
        theme: selectedTheme,
        language,
        customContext,
        nextState,
        seedImageId,
        logPrefix: "StartNewGame",
      });

      console.log(
        "[StartNewGame] First segment created from Phase 9 openingNarrative",
      );
    } catch (e) {
      console.error("Post-outline processing failed", e);
      const message =
        e instanceof Error && e.message.includes("opening narrative")
          ? t("initializing.errors.firstSegmentFailed")
          : t("initializing.errors.postOutlineProcessingFailed");
      showToast(message, "error", 5000);
      deleteSlot(slotId);
      setCurrentSlotId(null);
      setGameState((prev) => ({
        ...prev,
        error: message,
        isProcessing: false,
        liveToolCalls: [],
      }));
      navigate("/");
    }
  };

  const resumeOutlineGeneration = async (
    onStream?: (text: string) => void,
    onPhaseProgress?: (progress: OutlinePhaseProgress) => void,
  ): Promise<void> => {
    const savedConversation = gameStateRef.current.outlineConversation;
    if (!savedConversation) {
      console.warn("[ResumeOutline] No saved conversation to resume from");
      return;
    }

    const { theme, customContext } = savedConversation;
    const currentLoreConfig = aiSettings.lore;
    const savedModelId = savedConversation.modelId;
    const savedProviderId = savedConversation.providerId;

    if (
      savedModelId &&
      (savedModelId !== currentLoreConfig.modelId ||
        savedProviderId !== currentLoreConfig.providerId)
    ) {
      const confirmRestart = confirmAction(
        t("outline.modelMismatch", {
          oldModel: savedModelId,
          newModel: currentLoreConfig.modelId,
          defaultValue: `The outline was started with model "${savedModelId}" but you're now using "${currentLoreConfig.modelId}". Continuing with a different model may cause errors.\n\nClick OK to restart from scratch with the new model, or Cancel to continue anyway (not recommended).`,
        }),
      );

      if (confirmRestart) {
        console.log(
          "[ResumeOutline] User chose to restart with new model, clearing conversation state",
        );

        showToast(
          t("outline.restartingWithNewModel", "Restarting with new model..."),
          "info",
        );

        return startNewGame(
          theme,
          customContext,
          onStream,
          onPhaseProgress,
          currentSlotId || undefined,
          undefined,
          undefined,
          gameStateRef.current.presetProfile,
        );
      }

      console.warn(
        `[ResumeOutline] User chose to continue with mismatched model: saved=${savedModelId}, current=${currentLoreConfig.modelId}`,
      );
    }

    console.log(
      `[ResumeOutline] Resuming from phase ${savedConversation.currentPhase} for theme ${theme}`,
    );

    setGameState((prev) => ({
      ...prev,
      isProcessing: true,
      liveToolCalls: gameStateRef.current.outlineConversation?.liveToolCalls || [],
    }));
    navigate("/initializing");

    const runResumeAttempt = async (
      resumeFrom: OutlineConversationState,
      logPrefix: string,
      sessionTag?: string,
    ) => {
      const { outline, logs, themeConfig } = await runOutlineGenerationPhased({
        theme,
        language: resumeFrom.language,
        customContext,
        t,
        aiSettings,
        slotId: currentSlotId!,
        vfsSession,
        setGameState,
        gameStateRef,
        saveToSlot,
        onPhaseProgress,
        resumeFrom,
        presetProfile: gameStateRef.current.presetProfile,
        sessionTag,
        logPrefix,
      });

      console.log(`[${logPrefix}] Outline generation completed`, outline);
      const resolvedThemeConfig = applyCustomContextThemeOverrides(
        themeConfig,
        customContext,
      );

      const nextState = buildOpeningState({
        outline,
        logs,
        themeConfig: resolvedThemeConfig,
        theme,
        language: resumeFrom.language,
        customContext,
        presetProfile: gameStateRef.current.presetProfile,
        includeCustomContextInPrompt: true,
        clearLiveToolCalls: true,
      });

      await commitOutlineState({
        saveId: currentSlotId!,
        outline,
        themeConfig: resolvedThemeConfig,
        theme,
        language: resumeFrom.language,
        customContext,
        nextState,
        logPrefix,
      });

      console.log(
        `[${logPrefix}] First segment created from Phase 9 openingNarrative`,
      );
    };

    let finalError: unknown;

    try {
      await runResumeAttempt(savedConversation, "ResumeOutline");
      return;
    } catch (resumeError) {
      console.error("[ResumeOutline] Resume failed", resumeError);
      finalError = resumeError;

      const recoveryKind = getResumeRecoveryKind(resumeError);
      if (recoveryKind) {
        const recoveryConversation = buildRecoveryConversation(
          savedConversation,
          recoveryKind,
        );

        if (recoveryConversation) {
          console.log(
            `[ResumeOutline] Retrying with ${recoveryKind} recovery checkpoint (phase ${recoveryConversation.currentPhase}, messages ${savedConversation.conversationHistory.length} -> ${recoveryConversation.conversationHistory.length})`,
          );

          const recoveryState = {
            ...gameStateRef.current,
            isProcessing: true,
            outlineConversation: recoveryConversation,
            liveToolCalls: [],
          };
          gameStateRef.current = recoveryState;
          setGameState(recoveryState);
          writeOutlineProgress(vfsSession, recoveryConversation);

          try {
            await runResumeAttempt(
              recoveryConversation,
              "ResumeOutlineRecovery",
              `${recoveryKind}-recovery-${Date.now()}`,
            );
            return;
          } catch (recoveryError) {
            console.error(
              `[ResumeOutline] ${recoveryKind} recovery retry failed`,
              recoveryError,
            );
            finalError = recoveryError;
          }
        } else {
          console.warn(
            `[ResumeOutline] No recoverable messages remained for ${recoveryKind} recovery`,
          );
        }
      }
    }

    const shouldClearCorruptedProgress =
      finalError instanceof HistoryCorruptedError || isInvalidArgumentError(finalError);
    if (shouldClearCorruptedProgress) {
      console.log(
        "[ResumeOutline] History corrupted - clearing saved conversation state",
      );
      clearOutlineProgress(vfsSession);
    }

    const resumeErrorMsg = shouldClearCorruptedProgress
      ? t("initializing.errors.historyCacheCorruptedResume")
      : t("initializing.errors.resumeFailed");
    showToast(resumeErrorMsg, "error", 5000);

    setGameState((prev) => ({
      ...prev,
      error: resumeErrorMsg,
      isProcessing: false,
      liveToolCalls: [],
      outlineConversation: shouldClearCorruptedProgress
        ? undefined
        : prev.outlineConversation,
    }));
    navigate("/");
  };

  return {
    startNewGame,
    resumeOutlineGeneration,
  };
}
