import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { THEMES, LANG_MAP } from "../../utils/constants";
import { preloadAudio } from "../../utils/audioLoader";
import { saveImage } from "../../utils/imageStorage";
import { getThemeName } from "../../services/ai/utils";
import { HistoryCorruptedError } from "../../services/ai/contextCompressor";
import type { OutlinePhaseProgress } from "../../services/aiService";
import type { AISettings, GameState } from "../../types";
import type { VfsSession } from "../../services/vfs/vfsSession";
import { clearOutlineProgress } from "../../services/vfs/outline";
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

  const startNewGame = async (
    initialTheme?: string,
    customContext?: string,
    onStream?: (text: string) => void,
    onPhaseProgress?: (progress: OutlinePhaseProgress) => void,
    existingSlotId?: string,
    seedImage?: Blob,
    protagonistFeature?: string,
  ): Promise<void> => {
    let selectedTheme: string;
    if (seedImage && !initialTheme) {
      selectedTheme = "";
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

    const displayTheme = selectedTheme || "ImageBased";
    const persistedTheme = selectedTheme || "fantasy";

    const slotId = existingSlotId || createSaveSlot(displayTheme);
    setCurrentSlotId(slotId);

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
      });
    } catch (e) {
      console.warn("[StartNewGame] Failed to persist initial save snapshot", e);
    }

    resetState(displayTheme);
    setGameState((prev) => ({
      ...prev,
      isProcessing: true,
      liveToolCalls: [],
    }));

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
          "[StartNewGame] History corrupted - clearing saved conversation state",
        );
        clearOutlineProgress(vfsSession);
        setGameState((prev) => ({
          ...prev,
          outlineConversation: undefined,
        }));
      }

      const outlineFailedMessage = isHistoryCorrupted
        ? t("initializing.errors.historyCacheCorrupted")
        : t("initializing.errors.outlineGenerationFailed");
      showToast(outlineFailedMessage, "error", 5000);

      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        liveToolCalls: [],
        outlineConversation: isHistoryCorrupted
          ? undefined
          : prev.outlineConversation,
      }));

      const savedConversation = gameStateRef.current.outlineConversation;
      const hasProgress =
        !isHistoryCorrupted &&
        savedConversation &&
        savedConversation.currentPhase > 0;

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
        );
      }

      deleteSlot(slotId);
      setCurrentSlotId(null);
      navigate("/");
      return;
    }

    try {
      setGameState((prev) =>
        buildOutlineHydratedState({
          baseState: prev,
          outline,
          logs,
          themeConfig,
          language,
          customContext,
          themeOverride: selectedTheme,
          seedImageId,
        }),
      );

      setTimeout(async () => {
        try {
          const nextState = {
            ...gameStateRef.current,
            outline,
            themeConfig,
            outlineConversation: undefined,
          };
          await persistOutlineCheckpoint({
            outline,
            themeConfig,
            theme: selectedTheme,
            language,
            customContext,
            saveId: slotId,
            nextState,
            vfsSession,
            saveToSlot,
            seedImageId,
          });
          console.log("[StartNewGame] Outline checkpoint saved successfully");
        } catch (e) {
          console.error("[StartNewGame] Failed to save outline checkpoint", e);
        }
      }, 50);

      navigate("/game");

      setTimeout(async () => {
        try {
          const { firstNode, openingAtmosphere, fallbackPrompt } =
            buildOpeningNarrativeSegment({
              outline,
              baseState: gameStateRef.current,
              theme: selectedTheme,
              t,
              seedImageId,
            });

          try {
            vfsSession.mergeJson("world/global.json", {
              initialPrompt: fallbackPrompt,
            });
          } catch (e) {
            console.warn("[StartNewGame] Failed to persist initialPrompt in VFS", e);
          }

          setGameState((prev) =>
            applyOpeningNarrativeState(
              prev,
              firstNode,
              openingAtmosphere,
              fallbackPrompt,
            ),
          );

          console.log(
            "[StartNewGame] First segment created from Phase 9 openingNarrative",
          );

          setTimeout(async () => {
            try {
              await saveToSlot(slotId, gameStateRef.current);
              console.log("[StartNewGame] First segment auto-saved successfully");
            } catch (saveError) {
              console.error(
                "[StartNewGame] Failed to auto-save after first segment:",
                saveError,
              );
            }
          }, 100);

          if (aiSettings.embedding?.enabled) {
            indexInitialEntities(gameStateRef.current, slotId).catch((error) => {
              console.error("[RAG Init] Failed to index initial entities:", error);
            });
          }
        } catch (error) {
          console.error("Unexpected error during first segment creation", error);
          const message = t("initializing.errors.firstSegmentFailed");
          showToast(message, "error", 5000);
          setGameState((prev) => ({
            ...prev,
            isProcessing: false,
            liveToolCalls: [],
            error: message,
          }));
        }
      }, 100);
    } catch (e) {
      console.error("Post-outline processing failed", e);
      const message = t("initializing.errors.postOutlineProcessingFailed");
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

    try {
      const { outline, logs, themeConfig } = await runOutlineGenerationPhased({
        theme,
        language: savedConversation.language,
        customContext,
        t,
        aiSettings,
        slotId: currentSlotId!,
        vfsSession,
        setGameState,
        gameStateRef,
        saveToSlot,
        onPhaseProgress,
        resumeFrom: savedConversation,
        logPrefix: "ResumeOutline",
      });

      console.log("[ResumeOutline] Outline generation completed", outline);
      const resolvedThemeConfig = applyCustomContextThemeOverrides(
        themeConfig,
        customContext,
      );

      const nextState = buildOutlineHydratedState({
        baseState: gameStateRef.current,
        outline,
        logs,
        themeConfig: resolvedThemeConfig,
        language: savedConversation.language,
        customContext,
        clearLiveToolCalls: true,
      });

      setGameState(nextState);

      setTimeout(async () => {
        await persistOutlineCheckpoint({
          outline,
          themeConfig: resolvedThemeConfig,
          theme,
          language: savedConversation.language,
          customContext,
          saveId: currentSlotId!,
          nextState,
          vfsSession,
          saveToSlot,
        });
        console.log("[ResumeOutline] Outline checkpoint saved");
      }, 50);

      navigate("/game");

      setTimeout(async () => {
        try {
          const { firstNode, openingAtmosphere, fallbackPrompt } =
            buildOpeningNarrativeSegment({
              outline,
              baseState: gameStateRef.current,
              theme,
              t,
              customContext,
              includeCustomContextInPrompt: true,
            });

          try {
            vfsSession.mergeJson("world/global.json", {
              initialPrompt: fallbackPrompt,
            });
          } catch (e) {
            console.warn("[ResumeOutline] Failed to persist initialPrompt in VFS", e);
          }

          setGameState((prev) =>
            applyOpeningNarrativeState(
              prev,
              firstNode,
              openingAtmosphere,
              fallbackPrompt,
            ),
          );

          console.log(
            "[ResumeOutline] First segment created from Phase 9 openingNarrative",
          );
        } catch (error) {
          console.error("First segment creation error after resume", error);
          const message = t("initializing.errors.firstSegmentFailed");
          setGameState((prev) => ({
            ...prev,
            isProcessing: false,
            liveToolCalls: [],
            error: message,
          }));
        }
      }, 100);
    } catch (e) {
      console.error("[ResumeOutline] Resume failed", e);

      const isHistoryCorrupted = e instanceof HistoryCorruptedError;
      if (isHistoryCorrupted) {
        console.log(
          "[ResumeOutline] History corrupted - clearing saved conversation state",
        );
        clearOutlineProgress(vfsSession);
      }

      const resumeErrorMsg = isHistoryCorrupted
        ? t("initializing.errors.historyCacheCorruptedResume")
        : t("initializing.errors.resumeFailed");
      showToast(resumeErrorMsg, "error", 5000);

      setGameState((prev) => ({
        ...prev,
        error: resumeErrorMsg,
        isProcessing: false,
        liveToolCalls: [],
        outlineConversation: isHistoryCorrupted
          ? undefined
          : prev.outlineConversation,
      }));
      navigate("/");
    }
  };

  return {
    startNewGame,
    resumeOutlineGeneration,
  };
}
