import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AISettings,
  StorySegment,
  LanguageCode,
  StorySummary,
  NPC,
  Location as GameLocation,
  OutlineConversationState,
  TurnContext,
  ResolvedThemeConfig,
} from "../types";
import { useGameState } from "./useGameState";
import { useVfsPersistence } from "./useVfsPersistence";
import { useSettings } from "./useSettings";
import {
  generateAdventureTurn,
  generateSceneImage,
  generateStoryOutlinePhased,
  summarizeContext,
  generateForceUpdate,
  generateEntityCleanup,
  type OutlinePhaseProgress,
} from "../services/aiService";
import { HistoryCorruptedError } from "../services/ai/contextCompressor";
import { THEMES, ENV_THEMES, LANG_MAP } from "../utils/constants";
import { deriveThemeVars } from "../utils/theme/deriveThemeVars";
import {
  createStateSnapshot,
  restoreStateFromSnapshot,
  createFork,
} from "../utils/snapshotManager";
import {
  getThemeKeyForAtmosphere,
  type AtmosphereObject,
  normalizeAtmosphere,
} from "../utils/constants/atmosphere";
import { getRAGService } from "../services/rag";
import { extractDocumentsFromState } from "./useRAG";
import { deriveHistory } from "../utils/storyUtils";
import { useGameAction } from "./useGameAction";
import { deriveGameStateFromVfs } from "../services/vfs/derivations";
import { saveImage } from "../utils/imageStorage";
import { getThemeName } from "../services/ai/utils";
import {
  clearOutlineProgress,
  writeOutlineFile,
  writeOutlineProgress,
} from "../services/vfs/outline";
import {
  seedVfsSessionFromDefaults,
  seedVfsSessionFromOutline,
} from "../services/vfs/seed";
import {
  forkConversation,
  writeConversationIndex,
  writeForkTree,
  writeTurnFile,
} from "../services/vfs/conversation";

import { preloadAudio } from "../utils/audioLoader";
import { useToast } from "../contexts/ToastContext";
import { mergeDerivedViewState } from "./vfsViewState";

/**
 * Update RAG documents for changed entities in background (non-blocking)
 */
async function updateRAGDocumentsBackground(
  changedEntities: Array<{ id: string; type: string }>,
  state: any,
): Promise<void> {
  if (changedEntities.length === 0) return;

  try {
    const ragService = getRAGService();
    if (!ragService) return;

    const entityIds = changedEntities.map((e) => e.id);
    console.log(
      `[RAG Update] Updating ${entityIds.length} entities:`,
      entityIds,
    );

    const documents = extractDocumentsFromState(state, entityIds);
    if (documents.length === 0) return;

    await ragService.addDocuments(
      documents.map((doc) => ({
        ...doc,
        saveId: state.saveId || "unknown",
        forkId: state.forkId || 0,
        turnNumber: state.turnNumber || 0,
      })),
    );
    console.log(`[RAG Update] Updated ${documents.length} documents`);
  } catch (error) {
    console.error("[RAG Update] Failed:", error);
  }
}

function extractXmlTagValue(
  input: string | undefined,
  tagName: string,
): string | undefined {
  if (!input) return undefined;
  const re = new RegExp(`<${tagName}>\\s*([\\s\\S]*?)\\s*<\\/${tagName}>`, "i");
  const match = input.match(re);
  const value = match?.[1]?.trim();
  return value ? value : undefined;
}

function applyCustomContextThemeOverrides(
  themeConfig: ResolvedThemeConfig,
  customContext?: string,
): ResolvedThemeConfig {
  const narrativeStyleOverride = extractXmlTagValue(
    customContext,
    "narrative_style",
  );
  if (!narrativeStyleOverride) return themeConfig;
  return { ...themeConfig, narrativeStyle: narrativeStyleOverride };
}

/**
 * Index initial entities when game starts (outline + first turn)
 * IMPORTANT: This function must switch to the correct save context before indexing
 */
async function indexInitialEntities(state: any, saveId: string): Promise<void> {
  try {
    const ragService = getRAGService();
    if (!ragService) return;

    console.log(`[RAG Init] Indexing initial entities for save: ${saveId}`);

    // CRITICAL: Switch to the correct save context BEFORE adding documents
    // Without this, documents won't be associated with the correct save
    await ragService.switchSave(saveId, state.forkId || 0, {
      nodes: Object.fromEntries(
        Object.entries(
          state.forkTree?.nodes || { 0: { id: 0, parentId: null } },
        ).map(([id, node]: [string, any]) => [
          Number(id),
          { id: Number(id), parentId: node.parentId },
        ]),
      ),
    });
    console.log(`[RAG Init] Switched to save context: ${saveId}`);

    const initialEntityIds: string[] = [];

    // Index outline documents first (highest priority)
    if (state.outline) {
      initialEntityIds.push("outline:full");
      initialEntityIds.push("outline:world");
      initialEntityIds.push("outline:goal");
      initialEntityIds.push("outline:premise");
      initialEntityIds.push("outline:character");
    }

    state.inventory?.forEach((item: any) => initialEntityIds.push(item.id));
    state.npcs?.forEach((npc: any) => initialEntityIds.push(npc.id));
    state.locations?.forEach((loc: any) => initialEntityIds.push(loc.id));
    state.quests?.forEach((quest: any) => initialEntityIds.push(quest.id));
    state.knowledge?.forEach((know: any) => initialEntityIds.push(know.id));
    state.factions?.forEach((faction: any) =>
      initialEntityIds.push(faction.id),
    );
    state.timeline?.forEach((event: any) => initialEntityIds.push(event.id));

    if (initialEntityIds.length === 0) return;

    const documents = extractDocumentsFromState(state, initialEntityIds);
    if (documents.length === 0) return;

    await ragService.addDocuments(
      documents.map((doc) => ({
        ...doc,
        saveId,
        forkId: state.forkId || 0,
        turnNumber: state.turnNumber || 0,
      })),
    );
    console.log(
      `[RAG Init] Indexed ${documents.length} initial documents for save: ${saveId}`,
    );
  } catch (error) {
    console.error("[RAG Init] Failed:", error);
  }
}

export const useGameEngine = () => {
  const { gameState, setGameState, resetState } = useGameState();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();

  // Derive view from path
  const view = useMemo(() => {
    if (location.pathname === "/initializing") return "initializing";
    if (location.pathname === "/game") return "game";
    return "start";
  }, [location.pathname]);

  const {
    saveSlots,
    currentSlotId,
    setCurrentSlotId,
    createSaveSlot,
    loadSlot,
    deleteSlot,
    clearAllSaves,
    isAutoSaving,
    persistenceError,
    hardReset,
    saveToSlot,
    setSkipNextSave,
    triggerSave,
    refreshSlots,
    vfsSession,
    legacySaveCount,
    legacySaveNoticeDismissed,
    dismissLegacySavesNotice,
    seedFromDefaults,
    restoreVfsToTurn,
  } = useVfsPersistence(gameState, setGameState, view);

  // Ref to access latest state in async callbacks/closures
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const [isTranslating, setIsTranslating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Use settings hook for all settings management
  const {
    settings: aiSettings,
    updateSettings: handleSaveSettings,
    resetSettings,
    language,
    setLanguage,
    themeMode,
    setThemeMode: setThemeModeValue,
    toggleThemeMode,
  } = useSettings();

  const [isMagicMirrorOpen, setIsMagicMirrorOpen] = useState(false);
  const [isVeoScriptOpen, setIsVeoScriptOpen] = useState(false);
  const [magicMirrorImage, setMagicMirrorImage] = useState<string | null>(null);

  const currentHistory = useMemo(
    () => deriveHistory(gameState.nodes, gameState.activeNodeId),
    [gameState.nodes, gameState.activeNodeId],
  );

  // Theme Application
  useEffect(() => {
    const root = document.documentElement;
    const storyTheme = THEMES[gameState.theme] || THEMES.fantasy;

    // Determine the envTheme key based on lockEnvTheme setting
    let envThemeKey: string;
    if (aiSettings.lockEnvTheme) {
      // Locked: use fixedEnvTheme if set, otherwise story's default envTheme
      envThemeKey = aiSettings.fixedEnvTheme || storyTheme.envTheme;
    } else {
      // Dynamic: derive from current atmosphere
      envThemeKey = getThemeKeyForAtmosphere(gameState.atmosphere);
    }

    const themeConfig = ENV_THEMES[envThemeKey] || ENV_THEMES.fantasy;

    // Determine active mode
    let activeMode = themeMode;
    if (themeMode === "system") {
      activeMode = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "night"
        : "day";
    }

    // Select variables based on mode
    // Default to 'vars' (Night) if dayVars is missing or mode is night
    const targetVars =
      activeMode === "day" && themeConfig.dayVars
        ? themeConfig.dayVars
        : themeConfig.vars;

    const derivedVars = deriveThemeVars(targetVars);

    // Apply Colors
    Object.entries(derivedVars).forEach(([key, value]) => {
      // Set the raw color value (for standard CSS usage)
      root.style.setProperty(key, value);

      // Convert Hex to RGB channels for Tailwind opacity support
      if (value.startsWith("#")) {
        const hex = value.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        // Set a separate variable with -rgb suffix
        root.style.setProperty(`${key}-rgb`, `${r} ${g} ${b}`);
      }
    });

    // Clean up alpha override (we don't use it anymore since we have proper palettes)
    root.style.removeProperty("--theme-alpha-override");
  }, [
    gameState.theme,
    gameState.atmosphere,
    themeMode,
    aiSettings.lockEnvTheme,
    aiSettings.fixedEnvTheme,
  ]);

  // Dynamic Title Update
  useEffect(() => {
    if (view === "start" || view === "initializing") {
      document.title = t("title");
    } else if (view === "game" && gameState.activeNodeId) {
      const activeNode = gameState.nodes[gameState.activeNodeId];
      if (activeNode && activeNode.text) {
        // Truncate text to ~60 chars
        const text = activeNode.text.replace(/\s+/g, " ").trim();
        const truncated =
          text.length > 60 ? text.substring(0, 60) + "..." : text;
        document.title = `${truncated} - ${t("title")}`;
      }
    }
  }, [view, gameState.activeNodeId, gameState.nodes]);

  // --- Core Game Loop ---
  // Note: generateImageForNode is defined later but we can reference it here
  // because hooks are called in order and we'll pass the actual function
  const { handleAction, handleRebuildContext, handleInvalidateSession } =
    useGameAction({
      gameState,
      setGameState,
      aiSettings,
      handleSaveSettings,
      language,
      isTranslating,
      currentSlotId,
      generateImageForNode: async (
        nodeId: string,
        nodeOverride?: StorySegment,
      ) => {
        // Forward to the actual implementation defined below
        await generateImageForNode(nodeId, nodeOverride);
      },
      triggerSave,
      vfsSession,
    });

  const startNewGame = async (
    initialTheme?: string,
    customContext?: string,
    onStream?: (text: string) => void,
    onPhaseProgress?: (progress: OutlinePhaseProgress) => void,
    existingSlotId?: string,
    seedImage?: Blob,
    protagonistFeature?: string,
  ) => {
    // For image-based starts (seedImage provided with no theme), keep theme empty
    // so outline.ts can detect isImageBasedStart and let Phase 0 generate context
    let selectedTheme: string;
    if (seedImage && !initialTheme) {
      // Image-based start: keep theme empty for Phase 0 to handle
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

    // Preload audio in background if not muted (Mobile optimization: trigger on user click)
    if (
      !aiSettings.audioVolume.bgmMuted &&
      aiSettings.audioVolume.bgmVolume > 0
    ) {
      preloadAudio().catch((e) =>
        console.warn("Background audio preload failed", e),
      );
    }

    // For slot/UI operations, use a fallback theme; but keep selectedTheme for generation
    const displayTheme = selectedTheme || "ImageBased";
    const persistedTheme = selectedTheme || "fantasy";

    const slotId = existingSlotId || createSaveSlot(displayTheme);
    setCurrentSlotId(slotId);

    // Reset the VFS session at the start of a new game to avoid cross-save contamination.
    // Also persist an initial snapshot immediately so a crash/error before phase checkpoints
    // doesn't lead to "default fantasy + new save" on restart.
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
        turnNumber: 0,
        forkId: 0,
        theme: persistedTheme,
        language,
        customContext,
      });
    } catch (e) {
      console.warn("[StartNewGame] Failed to persist initial save snapshot", e);
    }

    // Note: RAG context switching is now handled automatically by the SharedWorker
    // when switching saves. No manual reset needed here.

    // Strict Reset - use displayTheme to avoid empty string issues
    resetState(displayTheme);

    // Set processing state BEFORE navigation so InitializingPage sees it
    setGameState((prev) => ({ ...prev, isProcessing: true }));

    navigate("/initializing");

    // Save seed image to IndexedDB if provided
    let seedImageId: string | undefined;
    if (seedImage) {
      try {
        seedImageId = await saveImage(seedImage, {
          saveId: slotId,
          forkId: 0,
          turnIdx: 0, // Use 0 to indicate seed/starting image
          storyTitle: getThemeName(selectedTheme, t, selectedTheme),
        });
        console.log("[StartNewGame] Saved seed image with ID:", seedImageId);
      } catch (e) {
        console.error("[StartNewGame] Failed to save seed image:", e);
        // Continue without seed image - not a critical failure
      }
    }

    // Step 1: Generate outline (with separate error handling)
    let outline;
    let logs;
    let themeConfig;
    try {
      // NOTE: startNewGame creates a completely NEW game, so we don't resume from
      // any previous conversation state. resumeOutlineGeneration should be used
      // to resume from a saved conversation state.

      // Convert seedImage blob to base64 data URL if provided
      let seedImageBase64: string | undefined;
      if (seedImage) {
        try {
          const reader = new FileReader();
          seedImageBase64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(seedImage);
          });
          console.log("[StartNewGame] Converted seed image to base64");
        } catch (e) {
          console.error("[StartNewGame] Failed to convert seed image:", e);
          // Continue without image - not a critical failure
        }
      }

      // Use phased generation to avoid "schema produces a constraint that has too many states" errors
      const result = await generateStoryOutlinePhased(
        selectedTheme,
        LANG_MAP[language],
        customContext,
        t,
        {
          onPhaseProgress,
          // Do NOT resume from saved conversation - this is a fresh new game
          resumeFrom: undefined,
          // Pass settings for the generation
          settings: aiSettings,
          // Pass slotId for session isolation
          slotId,
          // Pass seed image for Phase 0 vision analysis
          seedImageBase64,
          // Pass protagonist feature
          protagonistFeature,
          // Save conversation state after each phase for fault recovery
          onSaveCheckpoint: async (
            conversationState: OutlineConversationState,
          ) => {
            // Update state and get the new state for saving
            const updatedState = {
              ...gameStateRef.current,
              outlineConversation: conversationState,
            };
            setGameState(updatedState);
            gameStateRef.current = updatedState;
            writeOutlineProgress(vfsSession, conversationState);
            // Persist immediately with the updated state
            await saveToSlot(slotId, updatedState);
            console.log(
              `[StartNewGame] Saved conversation state at phase ${conversationState.currentPhase}`,
            );
          },
        },
      );

      outline = result.outline;
      logs = result.logs;
      themeConfig = applyCustomContextThemeOverrides(
        result.themeConfig,
        customContext,
      );
      console.log("[StartNewGame] Outline generated (phased)", outline);
    } catch (outlineError) {
      // Outline generation failed - prompt user to retry
      console.error("Outline generation failed", outlineError);

      // Check if history was corrupted - if so, clear the saved conversation
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
      showToast(
        outlineFailedMessage,
        "error",
        5000,
      );

      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        // Clear outline conversation if corrupted
        outlineConversation: isHistoryCorrupted
          ? undefined
          : prev.outlineConversation,
      }));

      // Check if we have saved conversation state from previous phases
      // (but NOT if history was corrupted - we need to start fresh in that case)
      const savedConversation = gameStateRef.current.outlineConversation;
      const hasProgress =
        !isHistoryCorrupted &&
        savedConversation &&
        savedConversation.currentPhase > 0;

      // Show alert asking if user wants to retry
      const retryMessage = hasProgress
        ? `${outlineFailedMessage}\n\n${t("initializing.errors.retryWithProgress", { phase: savedConversation.currentPhase })}`
        : `${outlineFailedMessage}\n\n${t("initializing.errors.retryOutline")}`;

      const shouldRetry = window.confirm(retryMessage);

      if (shouldRetry) {
        // If we have saved progress, use resumeOutlineGeneration to continue from saved state
        if (hasProgress) {
          console.log(
            `[StartNewGame] Resuming from saved conversation at phase ${savedConversation.currentPhase}`,
          );
          // Set processing state back
          setGameState((prev) => ({ ...prev, isProcessing: true }));
          // Call resumeOutlineGeneration instead of starting over
          return resumeOutlineGeneration(onStream, onPhaseProgress);
        } else {
          // No saved progress, start fresh but keep the same slot
          console.log(
            "[StartNewGame] No saved progress, retrying from scratch",
          );
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
      } else {
        // User chose not to retry - clean up and go back
        deleteSlot(slotId);
        setCurrentSlotId(null);
        navigate("/");
        return;
      }
    }

    // Step 2: Process outline and generate first turn (original try-catch continues)
    try {
      // Calculate total tokens from all phase logs
      const accumulatedTokens = logs.reduce(
        (acc, log) => ({
          promptTokens: acc.promptTokens + (log.usage?.promptTokens || 0),
          completionTokens:
            acc.completionTokens + (log.usage?.completionTokens || 0),
          totalTokens: acc.totalTokens + (log.usage?.totalTokens || 0),
          cacheRead: acc.cacheRead + (log.usage?.cacheRead || 0),
          cacheWrite: acc.cacheWrite + (log.usage?.cacheWrite || 0),
        }),
        {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cacheRead: 0,
          cacheWrite: 0,
        },
      );

      const now = Date.now();
      const player = (outline as any).player;
      const npcBundles: any[] = Array.isArray((outline as any).npcs)
        ? ((outline as any).npcs as any[])
        : [];
      const placeholders: any[] = Array.isArray((outline as any).placeholders)
        ? ((outline as any).placeholders as any[])
        : [];
      const visible = (player?.profile as any)?.visible ?? {};

      setGameState((prev) => ({
        ...prev,
        outline,
        worldInfo: {
          title: outline.title,
          premise: outline.premise,
          narrativeScale: outline.narrativeScale,
          worldSetting: outline.worldSetting,
          mainGoal: outline.mainGoal,
          worldSettingUnlocked: false,
          mainGoalUnlocked: false,
        },
        themeConfig, // Store resolved theme config from outline generation
        // Clear conversation state after successful generation
        outlineConversation: undefined,
        actors: [player, ...npcBundles].filter(Boolean),
        playerActorId: (player?.profile as any)?.id ?? "char:player",
        placeholders,
        locationItemsByLocationId: {},
        character: {
          ...prev.character,
          name: visible.name ?? prev.character.name,
          title: visible.title ?? prev.character.title,
          status: visible.status ?? prev.character.status,
          attributes: Array.isArray(visible.attributes) ? visible.attributes : [],
          appearance: visible.appearance ?? prev.character.appearance,
          age: visible.age ?? prev.character.age ?? "Unknown",
          profession: visible.profession ?? prev.character.profession ?? "Unknown",
          background: visible.background ?? prev.character.background ?? "",
          race: visible.race ?? prev.character.race ?? "Unknown",
          currentLocation:
            (player?.profile as any)?.currentLocation ?? prev.currentLocation,
          skills: Array.isArray(player?.skills) ? player.skills : [],
          conditions: Array.isArray(player?.conditions) ? player.conditions : [],
          hiddenTraits: Array.isArray(player?.traits) ? player.traits : [],
        },
        inventory: Array.isArray(player?.inventory)
          ? player.inventory.map((item: any) => ({
              ...item,
              createdAt: item.createdAt ?? now,
              lastModified: item.lastModified ?? now,
            }))
          : [],
        npcs: npcBundles.map((b) => b?.profile).filter(Boolean),
        quests: (outline.quests || []).map((q: any, index: number) => ({
          ...q,
          status: "active",
          createdAt: q.createdAt ?? now,
          lastModified: q.lastModified ?? now,
        })),
        currentLocation:
          (player?.profile as any)?.currentLocation ||
          outline.locations?.[0]?.id ||
          "Unknown",
        locations: (outline.locations || []).map((loc: any, index: number) => ({
          ...loc,
          isVisited: index === 0,
          createdAt: loc.createdAt ?? now,
        })),
        knowledge: (outline.knowledge || []).map((k: any) => ({
          ...k,
          createdAt: k.createdAt ?? now,
          lastModified: k.lastModified ?? now,
        })),
        factions: (outline.factions || []).map((f: any, index: number) => ({
          ...f,
        })),
        timeline: (outline.timeline || []).map((e: any) => ({
          ...e,
          category: e.category || "world_event", // Default to world_event if missing
        })),
        isProcessing: true, // Keep processing true while generating first turn
        logs: [...logs, ...prev.logs],
        tokenUsage: {
          promptTokens:
            (prev.tokenUsage?.promptTokens || 0) +
            accumulatedTokens.promptTokens,
          completionTokens:
            (prev.tokenUsage?.completionTokens || 0) +
            accumulatedTokens.completionTokens,
          totalTokens:
            (prev.tokenUsage?.totalTokens || 0) + accumulatedTokens.totalTokens,
          cacheRead:
            (prev.tokenUsage?.cacheRead || 0) + accumulatedTokens.cacheRead,
          cacheWrite:
            (prev.tokenUsage?.cacheWrite || 0) + accumulatedTokens.cacheWrite,
        },
        generateImage: false,
        summaries: [],
        theme: selectedTheme, // Static Theme
        language: language, // Save language to game state
        customContext: customContext, // Save custom context to game state
        atmosphere: normalizeAtmosphere(outline.initialAtmosphere), // Initial atmosphere
        time: outline.initialTime || "Day 1",
        seedImageId, // Store seed image ID for persistence
        narrativeScale: outline.narrativeScale, // Store AI's narrative scale decision
      }));

      // === IMPORTANT: Save outline immediately after generation ===
      // This ensures we have a valid checkpoint even if first turn generation fails
      // Use setTimeout to ensure the state update has propagated
      setTimeout(async () => {
        try {
          // Construct the next state explicitly using ref as base to ensure we have the latest
          const nextState = {
            ...gameStateRef.current,
            outline,
            themeConfig, // Include resolved theme config
            outlineConversation: undefined,
          };
          seedVfsSessionFromOutline(vfsSession, outline, {
            theme: selectedTheme,
            time: outline.initialTime || "Day 1",
            currentLocation: outline.locations?.[0]?.id || "Unknown",
            atmosphere: normalizeAtmosphere(outline.initialAtmosphere),
            language,
            customContext,
            seedImageId,
            narrativeScale: outline.narrativeScale,
          });
          writeOutlineFile(vfsSession, outline);
          clearOutlineProgress(vfsSession);
          writeConversationIndex(vfsSession, {
            activeForkId: 0,
            activeTurnId: "fork-0/turn-0",
            rootTurnIdByFork: { "0": "fork-0/turn-0" },
            latestTurnNumberByFork: { "0": 0 },
            turnOrderByFork: { "0": ["fork-0/turn-0"] },
          });
          writeTurnFile(vfsSession, 0, 0, {
            turnId: "fork-0/turn-0",
            forkId: 0,
            turnNumber: 0,
            parentTurnId: null,
            createdAt: Date.now(),
            userAction: "",
            assistant: {
              narrative: outline.openingNarrative?.narrative || "",
              choices: outline.openingNarrative?.choices || [],
              atmosphere: outline.openingNarrative?.atmosphere,
            },
          });
          await saveToSlot(slotId, nextState);
          console.log("[StartNewGame] Outline checkpoint saved successfully");
        } catch (e) {
          console.error("[StartNewGame] Failed to save outline checkpoint", e);
        }
      }, 50);

      // Navigate to game immediately after outline is ready
      navigate("/game");

      // Generate first turn from Phase 9 openingNarrative
      setTimeout(async () => {
        try {
          // RAG initialization is now handled automatically by the SharedWorker
          // when documents are added. No manual initialization needed.
          // The RAG service should already be initialized via App.tsx

          // Use Phase 9 openingNarrative directly instead of calling handleAction
          const openingNarrative = outline.openingNarrative;
          if (!openingNarrative) {
            throw new Error("Missing opening narrative from Phase 9");
          }

          // Create the first segment directly from openingNarrative
          const firstNodeId = "model-fork-0/turn-0";

          // Determine atmosphere - use openingNarrative.atmosphere if provided, otherwise use initialAtmosphere
          const openingAtmosphere = openingNarrative.atmosphere
            ? normalizeAtmosphere(openingNarrative.atmosphere)
            : normalizeAtmosphere(outline.initialAtmosphere);

          // Create state snapshot for the first segment
          const stateSnapshot = createStateSnapshot(gameStateRef.current, {
            summaries: [],
            lastSummarizedIndex: 0,
            currentLocation: gameStateRef.current.currentLocation || "Unknown",
            time: outline.initialTime || "Day 1",
            atmosphere: openingAtmosphere,
            veoScript: undefined,
            uiState: gameStateRef.current.uiState,
          });

          const firstNode: StorySegment = {
            id: firstNodeId,
            parentId: null,
            text: openingNarrative.narrative,
            choices: openingNarrative.choices.map((c) => ({
              text: c.text,
              consequence: c.consequence || undefined,
            })),
            imagePrompt: "",
            // Use seed image if available, otherwise leave undefined for generation
            imageId: seedImageId || undefined,
            role: "model",
            timestamp: Date.now(),
            segmentIdx: 0,
            summaries: [],
            summarizedIndex: 0,
            atmosphere: openingAtmosphere,
            ending: "continue",
            stateSnapshot,
          };

          // Store initial prompt for potential retry (backward compatibility)
          const themeName = getThemeName(selectedTheme, t);
          const fallbackPrompt = t("initialPrompt.begin", { theme: themeName });

          setGameState((prev) => ({
            ...prev,
            nodes: { [firstNodeId]: firstNode },
            activeNodeId: firstNodeId,
            rootNodeId: firstNodeId,
            currentFork: [firstNode],
            isProcessing: false,
            initialPrompt: fallbackPrompt, // Keep for backward compatibility with retry
            turnNumber: 0,
            atmosphere: openingAtmosphere,
          }));

          console.log(
            "[StartNewGame] First segment created from Phase 9 openingNarrative",
          );

          // === Auto-save after first segment is created ===
          setTimeout(async () => {
            try {
              await saveToSlot(slotId, gameStateRef.current);
              console.log(
                "[StartNewGame] First segment auto-saved successfully",
              );
            } catch (saveError) {
              console.error(
                "[StartNewGame] Failed to auto-save after first segment:",
                saveError,
              );
            }
          }, 100);

          // Index initial entities in background (non-blocking)
          if (aiSettings.embedding?.enabled) {
            indexInitialEntities(gameStateRef.current, slotId).catch(
              (error) => {
                console.error(
                  "[RAG Init] Failed to index initial entities:",
                  error,
                );
              },
            );
          }
        } catch (error) {
          // Unexpected error during first segment creation
          console.error(
            "Unexpected error during first segment creation",
            error,
          );
          const message = t("initializing.errors.firstSegmentFailed");
          showToast(message, "error", 5000);

          // Don't delete save or navigate away - outline is still valid
          // Set error state so player can retry
          setGameState((prev) => ({
            ...prev,
            isProcessing: false,
            error: message,
          }));
        }
      }, 100);
    } catch (e) {
      // This catch block now only handles errors AFTER outline generation
      // (e.g., state processing errors, navigation errors)
      console.error("Post-outline processing failed", e);
      const message = t("initializing.errors.postOutlineProcessingFailed");
      showToast(message, "error", 5000);
      deleteSlot(slotId);
      setCurrentSlotId(null);
      setGameState((prev) => ({
        ...prev,
        error: message,
        isProcessing: false,
      }));
      navigate("/");
    }
  };

  /**
   * Resume an incomplete outline generation from saved conversation state
   * Called when loading a save that has outlineConversation but no outline
   */
  const resumeOutlineGeneration = async (
    onStream?: (text: string) => void,
    onPhaseProgress?: (progress: OutlinePhaseProgress) => void,
  ) => {
    const savedConversation = gameStateRef.current.outlineConversation;
    if (!savedConversation) {
      console.warn("[ResumeOutline] No saved conversation to resume from");
      return;
    }

    const { theme, customContext } = savedConversation;

    // Check for model mismatch - if user changed model, warn and offer to restart
    const currentLoreConfig = aiSettings.lore;
    const savedModelId = savedConversation.modelId;
    const savedProviderId = savedConversation.providerId;

    if (
      savedModelId &&
      (savedModelId !== currentLoreConfig.modelId ||
        savedProviderId !== currentLoreConfig.providerId)
    ) {
      // Model has changed - prompt user
      const confirmRestart = window.confirm(
        t("outline.modelMismatch", {
          oldModel: savedModelId,
          newModel: currentLoreConfig.modelId,
          defaultValue: `The outline was started with model "${savedModelId}" but you're now using "${currentLoreConfig.modelId}". Continuing with a different model may cause errors.\n\nClick OK to restart from scratch with the new model, or Cancel to continue anyway (not recommended).`,
        }),
      );

      if (confirmRestart) {
        // User wants to restart with new model - clear conversation and start fresh in same slot
        console.log(
          "[ResumeOutline] User chose to restart with new model, clearing conversation state",
        );

        showToast(
          t("outline.restartingWithNewModel", "Restarting with new model..."),
          "info",
        );

        // Restart game generation using the existing slot
        return startNewGame(
          theme,
          customContext,
          onStream,
          onPhaseProgress,
          currentSlotId || undefined,
        );
      } else {
        // User chose to continue anyway - log warning
        console.warn(
          `[ResumeOutline] User chose to continue with mismatched model: saved=${savedModelId}, current=${currentLoreConfig.modelId}`,
        );
      }
    }

    console.log(
      `[ResumeOutline] Resuming from phase ${savedConversation.currentPhase} for theme ${theme}`,
    );

    // Set processing state
    setGameState((prev) => ({ ...prev, isProcessing: true }));
    navigate("/initializing");

    try {
      const { outline, logs, themeConfig } = await generateStoryOutlinePhased(
        theme,
        savedConversation.language,
        customContext,
        t,
        {
          settings: aiSettings,
          slotId: currentSlotId!,
          onPhaseProgress,
          resumeFrom: savedConversation,
          onSaveCheckpoint: async (
            conversationState: OutlineConversationState,
          ) => {
            const updatedState = {
              ...gameStateRef.current,
              outlineConversation: conversationState,
            };
            setGameState(updatedState);
            gameStateRef.current = updatedState;
            writeOutlineProgress(vfsSession, conversationState);
            await saveToSlot(currentSlotId!, updatedState);
            console.log(
              `[ResumeOutline] Saved conversation state at phase ${conversationState.currentPhase}`,
            );
          },
        },
      );

      console.log("[ResumeOutline] Outline generation completed", outline);
      const resolvedThemeConfig = applyCustomContextThemeOverrides(
        themeConfig,
        customContext,
      );

      const accumulatedTokens = logs.reduce(
        (acc, log) => ({
          promptTokens: acc.promptTokens + (log.usage?.promptTokens || 0),
          completionTokens:
            acc.completionTokens + (log.usage?.completionTokens || 0),
          totalTokens: acc.totalTokens + (log.usage?.totalTokens || 0),
          cacheRead: acc.cacheRead + (log.usage?.cacheRead || 0),
          cacheWrite: acc.cacheWrite + (log.usage?.cacheWrite || 0),
        }),
        {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cacheRead: 0,
          cacheWrite: 0,
        },
      );

      const nextState = {
        ...gameStateRef.current,
        outline,
        worldInfo: {
          title: outline.title,
          premise: outline.premise,
          narrativeScale: outline.narrativeScale,
          worldSetting: outline.worldSetting,
          mainGoal: outline.mainGoal,
          worldSettingUnlocked: false,
          mainGoalUnlocked: false,
        },
        themeConfig: resolvedThemeConfig, // Store resolved theme config
        outlineConversation: undefined,
        actors: [
          (outline as any).player,
          ...(((outline as any).npcs as any[]) || []),
        ].filter(Boolean),
        playerActorId: ((outline as any).player?.profile as any)?.id ?? "char:player",
        placeholders: Array.isArray((outline as any).placeholders)
          ? ((outline as any).placeholders as any[])
          : [],
        locationItemsByLocationId: {},
        character: (() => {
          const player = (outline as any).player;
          const v = (player?.profile as any)?.visible ?? {};
          return {
            ...gameStateRef.current.character,
            name: v.name ?? gameStateRef.current.character.name,
            title: v.title ?? gameStateRef.current.character.title,
            status: v.status ?? gameStateRef.current.character.status,
            attributes: Array.isArray(v.attributes) ? v.attributes : [],
            appearance: v.appearance ?? gameStateRef.current.character.appearance,
            age: v.age ?? gameStateRef.current.character.age ?? "Unknown",
            profession:
              v.profession ?? gameStateRef.current.character.profession ?? "Unknown",
            background: v.background ?? gameStateRef.current.character.background ?? "",
            race: v.race ?? gameStateRef.current.character.race ?? "Unknown",
            currentLocation:
              (player?.profile as any)?.currentLocation ??
              gameStateRef.current.currentLocation,
            skills: Array.isArray(player?.skills) ? player.skills : [],
            conditions: Array.isArray(player?.conditions) ? player.conditions : [],
            hiddenTraits: Array.isArray(player?.traits) ? player.traits : [],
          };
        })(),
        inventory: Array.isArray((outline as any).player?.inventory)
          ? ((outline as any).player.inventory as any[]).map((item: any) => ({
              ...item,
              createdAt: item.createdAt ?? Date.now(),
              lastModified: item.lastModified ?? Date.now(),
            }))
          : [],
        npcs: Array.isArray((outline as any).npcs)
          ? ((outline as any).npcs as any[]).map((b) => b?.profile).filter(Boolean)
          : [],
        quests: (outline.quests || []).map((q: any, index: number) => ({
          ...q,
          status: "active",
          createdAt: q.createdAt ?? Date.now(),
          lastModified: q.lastModified ?? Date.now(),
        })),
        currentLocation:
          ((outline as any).player?.profile as any)?.currentLocation ||
          outline.locations?.[0]?.id ||
          "Unknown",
        locations: (outline.locations || []).map((loc: any, index: number) => ({
          ...loc,
          isVisited: index === 0,
          createdAt: loc.createdAt ?? Date.now(),
        })),
        knowledge: (outline.knowledge || []).map((k: any) => ({
          ...k,
          createdAt: k.createdAt ?? Date.now(),
          lastModified: k.lastModified ?? Date.now(),
        })),
        factions: (outline.factions || []).map((f: any, index: number) => ({
          ...f,
        })),
        timeline: (outline.timeline || []).map((e: any) => ({
          ...e,
          category: e.category || "world_event",
        })),
        isProcessing: true,
        logs: [...logs, ...gameStateRef.current.logs],
        tokenUsage: {
          promptTokens:
            (gameStateRef.current.tokenUsage?.promptTokens || 0) +
            accumulatedTokens.promptTokens,
          completionTokens:
            (gameStateRef.current.tokenUsage?.completionTokens || 0) +
            accumulatedTokens.completionTokens,
          totalTokens:
            (gameStateRef.current.tokenUsage?.totalTokens || 0) +
            accumulatedTokens.totalTokens,
          cacheRead:
            (gameStateRef.current.tokenUsage?.cacheRead || 0) +
            accumulatedTokens.cacheRead,
          cacheWrite:
            (gameStateRef.current.tokenUsage?.cacheWrite || 0) +
            accumulatedTokens.cacheWrite,
        },
        generateImage: false,
        summaries: [],
        language: savedConversation.language, // Restore language from conversation state
        customContext: customContext, // Restore custom context from conversation state
        atmosphere: normalizeAtmosphere(outline.initialAtmosphere),
        time: outline.initialTime || "Day 1",
        narrativeScale: outline.narrativeScale, // Store AI's narrative scale decision
      };

      setGameState(nextState);

      // Save checkpoint
      setTimeout(async () => {
        seedVfsSessionFromOutline(vfsSession, outline, {
          theme,
          time: outline.initialTime || "Day 1",
          currentLocation: outline.locations?.[0]?.id || "Unknown",
          atmosphere: normalizeAtmosphere(outline.initialAtmosphere),
          language: savedConversation.language,
          customContext,
          narrativeScale: outline.narrativeScale,
        });
        writeOutlineFile(vfsSession, outline);
        clearOutlineProgress(vfsSession);
        writeConversationIndex(vfsSession, {
          activeForkId: 0,
          activeTurnId: "fork-0/turn-0",
          rootTurnIdByFork: { "0": "fork-0/turn-0" },
          latestTurnNumberByFork: { "0": 0 },
          turnOrderByFork: { "0": ["fork-0/turn-0"] },
        });
        writeTurnFile(vfsSession, 0, 0, {
          turnId: "fork-0/turn-0",
          forkId: 0,
          turnNumber: 0,
          parentTurnId: null,
          createdAt: Date.now(),
          userAction: "",
          assistant: {
            narrative: outline.openingNarrative?.narrative || "",
            choices: outline.openingNarrative?.choices || [],
            atmosphere: outline.openingNarrative?.atmosphere,
          },
        });
        await saveToSlot(currentSlotId!, nextState);
        console.log("[ResumeOutline] Outline checkpoint saved");
      }, 50);

      navigate("/game");

      // Generate first turn from Phase 9 openingNarrative
      setTimeout(async () => {
        try {
          // RAG is now managed by the SharedWorker - no manual initialization needed

          // Use Phase 9 openingNarrative directly instead of calling handleAction
          const openingNarrative = outline.openingNarrative;
          if (!openingNarrative) {
            throw new Error("Missing opening narrative from Phase 9");
          }

          // Create the first segment directly from openingNarrative
          const firstNodeId = "model-fork-0/turn-0";

          // Determine atmosphere
          const openingAtmosphere = openingNarrative.atmosphere
            ? normalizeAtmosphere(openingNarrative.atmosphere)
            : normalizeAtmosphere(outline.initialAtmosphere);

          // Create state snapshot for the first segment
          const stateSnapshot = createStateSnapshot(gameStateRef.current, {
            summaries: [],
            lastSummarizedIndex: 0,
            currentLocation: gameStateRef.current.currentLocation || "Unknown",
            time: outline.initialTime || "Day 1",
            atmosphere: openingAtmosphere,
            veoScript: undefined,
            uiState: gameStateRef.current.uiState,
          });

          const firstNode: StorySegment = {
            id: firstNodeId,
            parentId: null,
            text: openingNarrative.narrative,
            choices: openingNarrative.choices.map((c) => ({
              text: c.text,
              consequence: c.consequence || undefined,
            })),
            role: "model",
            timestamp: Date.now(),
            segmentIdx: 0,
            summaries: [],
            summarizedIndex: 0,
            atmosphere: openingAtmosphere,
            ending: "continue",
            stateSnapshot,
          };

          // Store initial prompt for potential retry (backward compatibility)
          const themeName = getThemeName(theme, t);
          const fallbackPrompt =
            t("initialPrompt.begin", { theme: themeName }) +
            (customContext
              ? ` ${t("initialPrompt.context")}: ${customContext}`
              : "");

          setGameState((prev) => ({
            ...prev,
            nodes: { [firstNodeId]: firstNode },
            activeNodeId: firstNodeId,
            rootNodeId: firstNodeId,
            currentFork: [firstNode],
            isProcessing: false,
            initialPrompt: fallbackPrompt,
            turnNumber: 0,
            atmosphere: openingAtmosphere,
          }));

          console.log(
            "[ResumeOutline] First segment created from Phase 9 openingNarrative",
          );
        } catch (error) {
          console.error("First segment creation error after resume", error);
          const message = t("initializing.errors.firstSegmentFailed");
          setGameState((prev) => ({
            ...prev,
            isProcessing: false,
            error: message,
          }));
        }
      }, 100);
    } catch (e) {
      console.error("[ResumeOutline] Resume failed", e);

      // Check if history was corrupted - if so, clear the saved conversation
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
        // Clear outline conversation if corrupted
        outlineConversation: isHistoryCorrupted
          ? undefined
          : prev.outlineConversation,
      }));
      navigate("/");
    }
  };

  const switchSlot = async (id: string) => {
    navigate("/initializing");
    // Ensure audio is preloaded
    await preloadAudio();

    const result = await loadSlot(id);
    if (result.success) {
      // RAG context switching is now handled by the SharedWorker
      // It automatically loads the correct embeddings for the save when switchSave is called
      // Model mismatch detection is handled in App.tsx via useRAG hook
      if (aiSettings.embedding?.enabled) {
        const ragService = getRAGService();
        if (ragService) {
          try {
            // Switch RAG context to the loaded save
            await ragService.switchSave(
              id,
              gameStateRef.current.forkId,
              gameStateRef.current.forkTree,
            );
            console.log(`[RAG] Switched to save context: ${id}`);
          } catch (error) {
            console.error("[RAG] Failed to switch context:", error);
            // Continue without RAG - not critical
          }
        }
      }

      // Allow state to propagate
      setTimeout(() => navigate("/game"), 0);
    }
  };

  /**
   * Navigate to a node, optionally creating a fork (new timeline branch)
   * @param nodeId - The node to navigate to
   * @param isFork - If true, creates a new fork branch from this node
   */
  const navigateToNode = async (
    nodeId: string,
    isFork: boolean = false,
  ): Promise<void> => {
    const match = /fork-(\d+)\/turn-(\d+)/.exec(nodeId);
    if (!match) {
      // Fallback: keep existing behavior (UI focus only).
      setGameState((prev) => ({
        ...prev,
        activeNodeId: nodeId,
        currentFork: deriveHistory(prev.nodes, nodeId),
      }));
      return;
    }

    const forkId = Number(match[1]);
    const turn = Number(match[2]);
    if (!Number.isFinite(forkId) || !Number.isFinite(turn)) {
      showToast(t("tree.errors.invalidNodeId", { nodeId }), "error", 4000);
      return;
    }

    if (!currentSlotId) {
      showToast(t("tree.errors.noActiveSaveSlot"), "error", 4000);
      return;
    }

    // Lock UI while we restore VFS + re-derive state.
    setGameState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      const restored = await restoreVfsToTurn(currentSlotId, forkId, turn);
      if (!restored) {
        throw new Error(
          `Snapshot not found for save=${currentSlotId}, fork=${forkId}, turn=${turn}`,
        );
      }

      if (!vfsSession) {
        throw new Error("VFS session is not available");
      }

      if (isFork) {
        const baseDerived = deriveGameStateFromVfs(vfsSession.snapshot());
        const forkResult = createFork(
          baseDerived.forkId ?? forkId,
          baseDerived.forkTree,
          nodeId,
          turn,
        );

        forkConversation(vfsSession, {
          sourceForkId: forkId,
          sourceTurnNumber: turn,
          newForkId: forkResult.newForkId,
        });
        writeForkTree(vfsSession, forkResult.newForkTree);

        const derived = deriveGameStateFromVfs(vfsSession.snapshot());
        const nextState = mergeDerivedViewState(gameStateRef.current, derived, {
          resetRuntime: true,
        });

        gameStateRef.current = nextState;
        setGameState(nextState);

        // Persist the fork baseline snapshot immediately so future restores work.
        await saveToSlot(currentSlotId, nextState);

        // Update RAG context (best-effort, non-blocking).
        if (aiSettings.embedding?.enabled) {
          const ragService = getRAGService();
          if (ragService) {
            ragService
              .switchSave(
                currentSlotId,
                forkResult.newForkId,
                forkResult.newForkTree,
              )
              .catch((error) => {
                console.error("[RAG] Failed to switch fork context:", error);
              });
          }
        }

        return;
      }

      const derived = deriveGameStateFromVfs(vfsSession.snapshot());
      let nextState = mergeDerivedViewState(gameStateRef.current, derived, {
        resetRuntime: true,
      });

      if (nextState.nodes[nodeId]) {
        nextState = {
          ...nextState,
          activeNodeId: nodeId,
          currentFork: deriveHistory(nextState.nodes, nodeId),
        };
      }

      gameStateRef.current = nextState;
      setGameState(nextState);

      // Update RAG context when switching forks (best-effort, non-blocking).
      if (aiSettings.embedding?.enabled) {
        const ragService = getRAGService();
        if (ragService) {
          ragService
            .switchSave(currentSlotId, nextState.forkId, nextState.forkTree)
            .catch((error) => {
              console.error("[RAG] Failed to switch save context:", error);
            });
        }
      }
    } catch (error) {
      console.error("[NavigateToNode] Failed:", error);
      const message = t("tree.errors.navigateFailed");
      showToast(message, "error", 5000);
      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        error: message,
      }));
    }
  };

  // Image Generation Queue and Error State
  const [imageQueue, setImageQueue] = useState<string[]>([]);
  const [failedImageNodes, setFailedImageNodes] = useState<Set<string>>(
    new Set(),
  );
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);

  // Queue Processing Effect
  useEffect(() => {
    const processQueue = async () => {
      if (isQueueProcessing || imageQueue.length === 0) return;

      // Get next node ID
      const nodeId = imageQueue[0];
      const node = gameStateRef.current.nodes[nodeId];

      if (!node) {
        // Node gone? Remove from queue
        setImageQueue((prev) => prev.slice(1));
        return;
      }

      setIsQueueProcessing(true);
      setGameState((prev) => ({
        ...prev,
        isImageGenerating: true,
        generatingNodeId: nodeId,
      }));

      // Remove from failed set if retrying
      setFailedImageNodes((prev) => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });

      console.log(
        "Processing image queue item:",
        nodeId,
        "Remaining:",
        imageQueue.length - 1,
      );

      const imageTimeout = setTimeout(
        () => {
          setGameState((prev) => {
            if (prev.isImageGenerating && prev.generatingNodeId === nodeId) {
              console.warn("Image generation timeout for node:", nodeId);
              return {
                ...prev,
                isImageGenerating: false,
                generatingNodeId: null,
              };
            }
            return prev;
          });
        },
        (aiSettings.imageTimeout || 60) * 1000,
      );

      try {
        const snapshot = node.stateSnapshot || gameStateRef.current;

        const { url, log, blob } = await generateSceneImage(
          node.imagePrompt || "",
          aiSettings,
          gameStateRef.current,
          snapshot,
        );
        clearTimeout(imageTimeout);

        if (blob) {
          // Save to IndexedDB
          const imageId = await saveImage(blob, {
            saveId: currentSlotId || "unsaved",
            forkId: gameStateRef.current.forkId,
            turnIdx: node.segmentIdx || gameStateRef.current.turnNumber,
            imagePrompt: node.imagePrompt || "",
            storyTitle: gameStateRef.current.outline?.title || undefined,
            location: gameStateRef.current.currentLocation || undefined,
            storyTime: gameStateRef.current.time || undefined,
          });

          setGameState((prev) => ({
            ...prev,
            isImageGenerating: false,
            generatingNodeId: null,
            logs: [log, ...prev.logs].slice(0, 100),
            tokenUsage: {
              promptTokens:
                (prev.tokenUsage?.promptTokens || 0) +
                (log.usage?.promptTokens || 0),
              completionTokens:
                (prev.tokenUsage?.completionTokens || 0) +
                (log.usage?.completionTokens || 0),
              totalTokens:
                (prev.tokenUsage?.totalTokens || 0) +
                (log.usage?.totalTokens || 0),
              cacheRead:
                (prev.tokenUsage?.cacheRead || 0) +
                (log.usage?.cacheRead || 0),
              cacheWrite:
                (prev.tokenUsage?.cacheWrite || 0) +
                (log.usage?.cacheWrite || 0),
            },
            nodes: {
              ...prev.nodes,
              [nodeId]: {
                ...prev.nodes[nodeId],
                imageId: imageId,
                imageUrl: undefined,
              },
            },
          }));
          triggerSave();
        } else if (url && url.trim()) {
          setGameState((prev) => ({
            ...prev,
            isImageGenerating: false,
            generatingNodeId: null,
            logs: [log, ...prev.logs].slice(0, 100),
            tokenUsage: {
              promptTokens:
                (prev.tokenUsage?.promptTokens || 0) +
                (log.usage?.promptTokens || 0),
              completionTokens:
                (prev.tokenUsage?.completionTokens || 0) +
                (log.usage?.completionTokens || 0),
              totalTokens:
                (prev.tokenUsage?.totalTokens || 0) +
                (log.usage?.totalTokens || 0),
              cacheRead:
                (prev.tokenUsage?.cacheRead || 0) +
                (log.usage?.cacheRead || 0),
              cacheWrite:
                (prev.tokenUsage?.cacheWrite || 0) +
                (log.usage?.cacheWrite || 0),
            },
            nodes: {
              ...prev.nodes,
              [nodeId]: { ...prev.nodes[nodeId], imageUrl: url },
            },
          }));
          triggerSave();
        } else {
          console.warn("Image generation returned empty URL for node:", nodeId);
          setGameState((prev) => ({
            ...prev,
            isImageGenerating: false,
            generatingNodeId: null,
            logs: [log, ...prev.logs].slice(0, 100),
            tokenUsage: {
              promptTokens:
                (prev.tokenUsage?.promptTokens || 0) +
                (log.usage?.promptTokens || 0),
              completionTokens:
                (prev.tokenUsage?.completionTokens || 0) +
                (log.usage?.completionTokens || 0),
              totalTokens:
                (prev.tokenUsage?.totalTokens || 0) +
                (log.usage?.totalTokens || 0),
              cacheRead:
                (prev.tokenUsage?.cacheRead || 0) +
                (log.usage?.cacheRead || 0),
              cacheWrite:
                (prev.tokenUsage?.cacheWrite || 0) +
                (log.usage?.cacheWrite || 0),
            },
          }));
          // Treat empty result as failure
          setFailedImageNodes((prev) => new Set(prev).add(nodeId));
        }
      } catch (e) {
        clearTimeout(imageTimeout);
        console.error(
          "Failed to generate image for node:",
          nodeId,
          "Error:",
          e,
        );
        setGameState((prev) => ({
          ...prev,
          isImageGenerating: false,
          generatingNodeId: null,
        }));
        // Add to failed set (transient)
        setFailedImageNodes((prev) => new Set(prev).add(nodeId));
      } finally {
        setIsQueueProcessing(false);
        // Remove processed item from queue
        setImageQueue((prev) => prev.slice(1));
      }
    };

    processQueue();
  }, [imageQueue, isQueueProcessing, aiSettings, currentSlotId, triggerSave]);

  const generateImageForNode = async (
    nodeId: string,
    nodeOverride?: StorySegment,
    isManualClick: boolean = false,
  ) => {
    const node = nodeOverride || gameStateRef.current.nodes[nodeId];
    if (!node || !node.imagePrompt) {
      console.warn(
        "Cannot generate image: missing node or imagePrompt for nodeId:",
        nodeId,
      );
      return;
    }

    // Add to queue if not already present
    setImageQueue((prev) => {
      if (prev.includes(nodeId)) return prev;
      return [...prev, nodeId];
    });
  };

  const updateNodeAudio = (nodeId: string, audioKey: string) => {
    setGameState((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: { ...prev.nodes[nodeId], audioKey },
      },
    }));
  };

  type HighlightTarget =
    | {
        kind:
          | "inventory"
          | "npcs"
          | "locations"
          | "knowledge"
          | "quests"
          | "factions"
          | "timeline";
        id: string;
      }
    | {
        kind: "characterSkills" | "characterConditions" | "characterTraits";
        id?: string;
        name?: string;
      };

  const clearHighlight = useCallback(
    (target: HighlightTarget) => {
      const applyEntityHighlightClear = (filePath: string) => {
        try {
          if (!vfsSession.readFile(filePath)) {
            return;
          }
          vfsSession.mergeJson(filePath, { highlight: false });
        } catch (error) {
          console.warn("[UI] Failed to clear highlight in VFS:", filePath, error);
        }
      };

      const applyCharacterHighlightClear = (
        section: "skills" | "conditions" | "hiddenTraits",
        match: { id?: string; name?: string },
      ) => {
        const current = gameStateRef.current.character;
        if (!current) {
          return;
        }

        const list = (current as any)[section] as Array<any> | undefined;
        if (!Array.isArray(list) || list.length === 0) {
          return;
        }

        const sectionDir: Record<string, string> = {
          skills: `world/characters/${gameStateRef.current.playerActorId || "char:player"}/skills`,
          conditions: `world/characters/${gameStateRef.current.playerActorId || "char:player"}/conditions`,
          hiddenTraits: `world/characters/${gameStateRef.current.playerActorId || "char:player"}/traits`,
        };
        const dir = sectionDir[section];

        const matches = (entry: any): boolean => {
          if (match.id && entry?.id && entry.id === match.id) return true;
          if (match.name && entry?.name && entry.name === match.name) return true;
          return false;
        };

        for (const entry of list) {
          if (!matches(entry)) continue;
          const id = entry?.id;
          if (typeof id !== "string" || id.trim().length === 0) {
            continue;
          }
          const filePath = `${dir}/${id}.json`;
          try {
            if (!vfsSession.readFile(filePath)) {
              continue;
            }
            vfsSession.mergeJson(filePath, { highlight: false });
          } catch (error) {
            console.warn("[UI] Failed to clear highlight in VFS:", filePath, error);
          }
        }

        setGameState((prev) => {
          if (!prev.character) {
            return prev;
          }
          const prevList = (prev.character as any)[section] as Array<any> | undefined;
          if (!Array.isArray(prevList) || prevList.length === 0) {
            return prev;
          }
          const nextList = prevList.map((entry) =>
            matches(entry) ? { ...entry, highlight: false } : entry,
          );
          return {
            ...prev,
            character: {
              ...prev.character,
              [section]: nextList,
            },
          };
        });
      };

      if (
        target.kind === "inventory" ||
        target.kind === "npcs" ||
        target.kind === "locations" ||
        target.kind === "knowledge" ||
        target.kind === "quests" ||
        target.kind === "factions" ||
        target.kind === "timeline"
      ) {
        const playerId = gameStateRef.current.playerActorId || "char:player";
        const filePathByKind: Record<string, string> = {
          inventory: `world/characters/${playerId}/inventory/${target.id}.json`,
          npcs: `world/characters/${target.id}/profile.json`,
          // Per-actor UI fields (highlight/unlocked/status/visited) live in views
          locations: `world/characters/${playerId}/views/locations/${target.id}.json`,
          knowledge: `world/characters/${playerId}/views/knowledge/${target.id}.json`,
          quests: `world/characters/${playerId}/views/quests/${target.id}.json`,
          factions: `world/characters/${playerId}/views/factions/${target.id}.json`,
          timeline: `world/characters/${playerId}/views/timeline/${target.id}.json`,
        };

        const filePath = filePathByKind[target.kind];
        if (filePath) {
          applyEntityHighlightClear(filePath);
        }

        setGameState((prev) => {
          const list = (prev as any)[target.kind] as Array<any> | undefined;
          if (!Array.isArray(list) || list.length === 0) {
            return prev;
          }
          const updated = list.map((entry) =>
            entry?.id === target.id ? { ...entry, highlight: false } : entry,
          );
          return {
            ...prev,
            [target.kind]: updated,
          };
        });

        triggerSave();
        return;
      }

      if (target.kind === "characterSkills") {
        applyCharacterHighlightClear("skills", { id: target.id, name: target.name });
        triggerSave();
        return;
      }

      if (target.kind === "characterConditions") {
        applyCharacterHighlightClear("conditions", { id: target.id, name: target.name });
        triggerSave();
        return;
      }

      if (target.kind === "characterTraits") {
        applyCharacterHighlightClear("hiddenTraits", {
          id: target.id,
          name: target.name,
        });
        triggerSave();
        return;
      }
    },
    [setGameState, triggerSave, vfsSession],
  );

  /**
   * Handle Force Update Command (/sudo)
   */
  const handleForceUpdate = async (prompt: string) => {
    if (gameStateRef.current.isProcessing) return;

    setGameState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      // Construct TurnContext
      // First get full history from summary point
      const fullHistory = deriveHistory(
        gameStateRef.current.nodes,
        gameStateRef.current.activeNodeId,
        true, // Truncate to last summary
      );

      const recentHistory = fullHistory;

      const context: TurnContext = {
        recentHistory,
        userAction: prompt,
        language: LANG_MAP[language],
        themeKey: gameStateRef.current.theme,
        tFunc: t,
        settings: aiSettings,
        slotId: currentSlotId || "default",
        vfsSession,
      };

      const { response, logs } = await generateForceUpdate(
        prompt,
        gameStateRef.current,
        context,
      );

      // Add force update logs to game state (prepend for newest first)
      if (logs && logs.length > 0) {
        setGameState((prev) => ({
          ...prev,
          logs: [...logs, ...(prev.logs || [])].slice(0, 100),
        }));
      }

      const vfsSnapshot = vfsSession?.snapshot() ?? {};
      if (Object.keys(vfsSnapshot).length === 0) {
        throw new Error(
          "VFS snapshot is empty after force update. Ensure tools wrote state files.",
        );
      }
      const derivedState = deriveGameStateFromVfs(vfsSnapshot);
      const viewState = mergeDerivedViewState(
        gameStateRef.current,
        derivedState,
      );

      // Resolve atmosphere
      const responseAtmosphere: AtmosphereObject = normalizeAtmosphere(
        response.atmosphere || gameStateRef.current.atmosphere,
      );

      // Create a command node to record the user's intent
      const newSegmentId = Date.now().toString();
      const commandNodeId = `command-${newSegmentId}`;
      const parentId = gameStateRef.current.activeNodeId;

      // Inherit summaries from parent
      const parentNode = gameStateRef.current.nodes[parentId];
      const baseSummaries = parentNode?.summaries || [];
      const baseIndex = parentNode?.summarizedIndex || 0;

      const commandNode: StorySegment = {
        segmentIdx:
          (gameStateRef.current.nodes[parentId]?.segmentIdx ?? -1) + 1,
        id: commandNodeId,
        parentId: parentId,
        text: prompt, // Just the command text
        choices: [],
        imagePrompt: "",
        role: "command", // New role for sudo commands
        timestamp: Date.now(),
        atmosphere: gameStateRef.current.atmosphere,
        ending: "continue",
        summaries: baseSummaries,
        summarizedIndex: baseIndex,
        // Snapshot the state BEFORE the update
        stateSnapshot: createStateSnapshot(gameStateRef.current, {
          summaries: baseSummaries,
          lastSummarizedIndex: baseIndex,
          currentLocation: gameStateRef.current.currentLocation,
          time: gameStateRef.current.time,
          atmosphere: gameStateRef.current.atmosphere,
          veoScript: gameStateRef.current.veoScript,
          uiState: gameStateRef.current.uiState,
        }),
      };

      // Sanitize choices to ensure valid structure (same as createModelNode)
      const sanitizedChoices = Array.isArray(response.choices)
        ? response.choices.map((c: any) => {
            if (typeof c === "object" && c !== null) {
              const obj = c as any;
              return {
                text: obj.text || obj.choice || obj.label || "Continue",
                consequence: obj.consequence,
              };
            }
            return String(c);
          })
        : [];

      // Create a system node for the RESULT
      const resultNodeId = `system-${newSegmentId}`;
      const resultNode: StorySegment = {
        segmentIdx: (commandNode.segmentIdx ?? -1) + 1,
        id: resultNodeId,
        parentId: commandNodeId,
        text: response.narrative, // Remove FORCE UPDATE markers - cleaner display
        choices:
          sanitizedChoices.length > 0 ? sanitizedChoices : [t("continue")],
        role: "system",
        timestamp: Date.now() + 1,
        atmosphere: responseAtmosphere,
        narrativeTone: response.narrativeTone,
        ending: "continue",
        summaries: baseSummaries,
        summarizedIndex: baseIndex,
        stateSnapshot: createStateSnapshot(derivedState, {
          summaries: baseSummaries,
          lastSummarizedIndex: baseIndex,
          currentLocation: derivedState.currentLocation,
          time: derivedState.time,
          atmosphere: responseAtmosphere,
          veoScript: viewState.veoScript,
          uiState: viewState.uiState,
        }),
      };

      setGameState((prev) => {
        const mergedBase = mergeDerivedViewState(prev, derivedState);
        const newNodes = {
          ...mergedBase.nodes,
          [commandNodeId]: commandNode,
          [resultNodeId]: resultNode,
        };

        return {
          ...mergedBase,
          nodes: newNodes,
          activeNodeId: resultNodeId,
          currentFork: deriveHistory(newNodes, resultNodeId),
          atmosphere: responseAtmosphere,
          isProcessing: false,
        };
      });

      triggerSave();
      return { success: true };
    } catch (error: unknown) {
      console.error("Force update failed:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Force update failed";
      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        error: errorMsg,
      }));
      return { success: false, error: errorMsg };
    }
  };

  /**
   * Handle Entity Cleanup - trigger agentic loop to identify and merge duplicates
   */
  const handleCleanupEntities = async () => {
    if (gameStateRef.current.isProcessing) return;

    setGameState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      if (!vfsSession) {
        throw new Error("VFS session is not available");
      }

      // Cleanup is a maintenance action; preserve the story conversation files so
      // it doesn't pollute the player's visible history or break retry semantics.
      const baselineConversationFiles = (() => {
        const snapshot = vfsSession.snapshot();
        const baseline: Record<
          string,
          { content: string; contentType: (typeof snapshot)[string]["contentType"] }
        > = {};

        for (const [path, file] of Object.entries(snapshot)) {
          if (path.startsWith("conversation/") || path.startsWith("current/conversation/")) {
            baseline[path] = { content: file.content, contentType: file.contentType };
          }
        }

        return baseline;
      })();

      // Construct TurnContext
      const fullHistory = deriveHistory(
        gameStateRef.current.nodes,
        gameStateRef.current.activeNodeId,
        true,
      );

      const recentHistory = fullHistory;

      const context: TurnContext = {
        recentHistory,
        userAction: "[CLEANUP]",
        language: LANG_MAP[language],
        themeKey: gameStateRef.current.theme,
        tFunc: t,
        settings: aiSettings,
        // Use a dedicated session id so cleanup doesn't overwrite story retry checkpoints.
        slotId: `${currentSlotId || "default"}:cleanup`,
        vfsSession,
      };

      const { response, logs, changedEntities } = await generateEntityCleanup(
        gameStateRef.current,
        context,
      );

      // Restore conversation files back to baseline, while keeping world/entity edits.
      // This avoids appending a synthetic "[CLEANUP]" turn into story history.
      const afterCleanupSnapshot = vfsSession.snapshot();
      for (const path of Object.keys(afterCleanupSnapshot)) {
        if (
          (path.startsWith("conversation/") ||
            path.startsWith("current/conversation/")) &&
          !baselineConversationFiles[path]
        ) {
          try {
            vfsSession.deleteFile(path);
          } catch (error) {
            console.warn("[Cleanup] Failed to delete conversation file:", path, error);
          }
        }
      }
      for (const [path, file] of Object.entries(baselineConversationFiles)) {
        vfsSession.writeFile(path, file.content, file.contentType);
      }

      // Add cleanup logs to game state
      if (logs && logs.length > 0) {
        setGameState((prev) => ({
          ...prev,
          logs: [...logs, ...(prev.logs || [])].slice(0, 100),
        }));
      }

      const vfsSnapshot = vfsSession.snapshot() ?? {};
      if (Object.keys(vfsSnapshot).length === 0) {
        throw new Error(
          "VFS snapshot is empty after cleanup. Ensure tools wrote state files.",
        );
      }
      const derivedState = deriveGameStateFromVfs(vfsSnapshot);
      const viewState = mergeDerivedViewState(
        gameStateRef.current,
        derivedState,
      );

      // Create a system node to record the cleanup result
      const newSegmentId = Date.now().toString();
      const cleanupNodeId = `cleanup-${newSegmentId}`;
      const parentId = gameStateRef.current.activeNodeId;

      const parentNode = gameStateRef.current.nodes[parentId];
      const baseSummaries = parentNode?.summaries || [];
      const baseIndex = parentNode?.summarizedIndex || 0;

      const cleanupNode: StorySegment = {
        segmentIdx:
          (gameStateRef.current.nodes[parentId]?.segmentIdx ?? -1) + 1,
        id: cleanupNodeId,
        parentId: parentId,
        text: response.narrative || "Entity cleanup completed.",
        choices:
          Array.isArray(response.choices) && response.choices.length > 0
            ? response.choices.map((c: any) =>
                typeof c === "string"
                  ? c
                  : { text: c.text || "Continue", consequence: c.consequence },
              )
            : [t("continue")],
        imagePrompt: "",
        role: "system",
        timestamp: Date.now(),
        atmosphere: gameStateRef.current.atmosphere,
        ending: "continue",
        summaries: baseSummaries,
        summarizedIndex: baseIndex,
        stateSnapshot: createStateSnapshot(derivedState, {
          summaries: baseSummaries,
          lastSummarizedIndex: baseIndex,
          currentLocation: derivedState.currentLocation,
          time: derivedState.time,
          atmosphere: gameStateRef.current.atmosphere,
          veoScript: viewState.veoScript,
          uiState: viewState.uiState,
        }),
      };

      setGameState((prev) => {
        const mergedBase = mergeDerivedViewState(prev, derivedState);
        const newNodes = {
          ...mergedBase.nodes,
          [cleanupNodeId]: cleanupNode,
        };

        return {
          ...mergedBase,
          nodes: newNodes,
          activeNodeId: cleanupNodeId,
          currentFork: deriveHistory(newNodes, cleanupNodeId),
          isProcessing: false,
        };
      });

      // Update RAG for changed entities
      if (changedEntities.length > 0 && aiSettings.embedding?.enabled) {
        const stateWithSaveInfo = {
          ...gameStateRef.current,
          saveId: currentSlotId || "default",
          forkId: gameStateRef.current.forkId,
          turnNumber: gameStateRef.current.turnNumber,
        };
        updateRAGDocumentsBackground(changedEntities, stateWithSaveInfo).catch(
          (e) => console.error("[Cleanup] RAG update failed:", e),
        );
      }

      triggerSave();
      return { success: true };
    } catch (error: unknown) {
      console.error("Entity cleanup failed:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Entity cleanup failed";
      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        error: errorMsg,
      }));
      return { success: false, error: errorMsg };
    }
  };

  return {
    language,
    setLanguage,
    isTranslating,
    gameState,
    setGameState,
    handleAction,
    startNewGame,
    resumeOutlineGeneration,
    rebuildContext: handleRebuildContext,
    invalidateSession: handleInvalidateSession,
    isAutoSaving,
    isMagicMirrorOpen,
    setIsMagicMirrorOpen,
    magicMirrorImage,
    setMagicMirrorImage,
    handleForceUpdate,
    cleanupEntities: handleCleanupEntities,
    isVeoScriptOpen,
    setIsVeoScriptOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    aiSettings,
    handleSaveSettings,
    currentHistory,
    saveSlots,
    loadSlot,
    deleteSlot,
    currentSlotId,
    themeMode,
    toggleThemeMode,
    setThemeMode: setThemeModeValue,
    resetSettings,
    clearAllSaves,
    persistenceError,
    hardReset,
    navigateToNode,
    generateImageForNode,
    updateNodeAudio,
    triggerSave,
    failedImageNodes,
    refreshSlots,
    vfsSession,
    clearHighlight,
    legacySaveCount,
    legacySaveNoticeDismissed,
    dismissLegacySavesNotice,
  };
};
