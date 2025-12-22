import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AISettings,
  StorySegment,
  LanguageCode,
  StorySummary,
  Relationship,
  Location as GameLocation,
  OutlineConversationState,
  TurnContext,
} from "../types";
import { useGameState } from "./useGameState";
import { useGamePersistence } from "./useGamePersistence";
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
import { deriveHistory, getSegmentsForAI } from "../utils/storyUtils";
import { useGameAction } from "./useGameAction";
import { saveImage } from "../utils/imageStorage";
import { getThemeName } from "../services/ai/utils";

import { preloadAudio } from "../utils/audioLoader";
import { useToast } from "../contexts/ToastContext";

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
    state.relationships?.forEach((npc: any) => initialEntityIds.push(npc.id));
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
  } = useGamePersistence(gameState, setGameState, view);

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

    // Apply Colors
    Object.entries(targetVars).forEach(([key, value]) => {
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
    });

  const startNewGame = async (
    initialTheme?: string,
    customContext?: string,
    onStream?: (text: string) => void,
    onPhaseProgress?: (progress: OutlinePhaseProgress) => void,
    existingSlotId?: string,
    seedImage?: Blob,
  ) => {
    // For image-based starts (seedImage provided with no theme), keep theme empty
    // so outline.ts can detect isImageBasedStart and let Phase 0 generate context
    let selectedTheme: string;
    if (seedImage && !initialTheme) {
      // Image-based start: keep theme empty for Phase 0 to handle
      selectedTheme = "";
    } else {
      selectedTheme =
        initialTheme ||
        Object.keys(THEMES)[
          Math.floor(Math.random() * Object.keys(THEMES).length)
        ];
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

    const slotId = existingSlotId || createSaveSlot(displayTheme);
    setCurrentSlotId(slotId);

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
      themeConfig = result.themeConfig;
      console.log("[StartNewGame] Outline generated (phased)", outline);
    } catch (outlineError) {
      // Outline generation failed - prompt user to retry
      console.error("Outline generation failed", outlineError);
      const errorMessage =
        outlineError instanceof Error
          ? outlineError.message
          : "Failed to generate story outline";

      // Check if history was corrupted - if so, clear the saved conversation
      const isHistoryCorrupted = outlineError instanceof HistoryCorruptedError;
      if (isHistoryCorrupted) {
        console.log(
          "[StartNewGame] History corrupted - clearing saved conversation state",
        );
        setGameState((prev) => ({
          ...prev,
          outlineConversation: undefined,
        }));
      }

      showToast(
        isHistoryCorrupted
          ? "History cache corrupted. The cache has been cleared. Please retry."
          : errorMessage,
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
        ? `${errorMessage}\n\n${t("initializing.errors.retryWithProgress", { phase: savedConversation.currentPhase })}`
        : `${errorMessage}\n\n${t("initializing.errors.retryOutline")}`;

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

      setGameState((prev) => ({
        ...prev,
        outline,
        themeConfig, // Store resolved theme config from outline generation
        // Clear conversation state after successful generation
        outlineConversation: undefined,
        character: {
          ...outline.character,
          conditions: (outline.character.conditions || []).map(
            (c: any, i: number) => ({
              ...c,
            }),
          ),
          hiddenTraits: (outline.character.hiddenTraits || []).map(
            (t: any, i: number) => ({
              ...t,
            }),
          ),
        },
        inventory: (outline.inventory || []).map(
          (item: any, index: number) => ({
            ...item,
            createdAt: Date.now(),
          }),
        ),
        relationships: (outline.relationships || []).map(
          (rel: any, index: number) => ({
            ...rel,
            createdAt: Date.now(),
          }),
        ),
        quests: (outline.quests || []).map((q: any, index: number) => ({
          ...q,
          status: "active",
          createdAt: Date.now(),
        })),
        currentLocation: outline.locations?.[0]?.name || "Unknown",
        locations: (outline.locations || []).map((loc: any, index: number) => ({
          ...loc,
          isVisited: index === 0,
          createdAt: Date.now(),
        })),
        knowledge: (outline.knowledge || []).map((k: any, index: number) => ({
          ...k,
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
          await saveToSlot(slotId, nextState);
          console.log("[StartNewGame] Outline checkpoint saved successfully");
        } catch (e) {
          console.error("[StartNewGame] Failed to save outline checkpoint", e);
        }
      }, 50);

      // Navigate to game immediately after outline is ready
      navigate("/game");

      // Generate first turn from Phase 10 openingNarrative
      setTimeout(async () => {
        try {
          // RAG initialization is now handled automatically by the SharedWorker
          // when documents are added. No manual initialization needed.
          // The RAG service should already be initialized via App.tsx

          // Use Phase 10 openingNarrative directly instead of calling handleAction
          const openingNarrative = outline.openingNarrative;
          if (!openingNarrative) {
            throw new Error("Missing opening narrative from Phase 10");
          }

          // Create the first segment directly from openingNarrative
          const firstNodeId = `model-opening-${Date.now()}`;

          // Determine atmosphere - use openingNarrative.atmosphere if provided, otherwise use initialAtmosphere
          const openingAtmosphere = openingNarrative.atmosphere
            ? normalizeAtmosphere(openingNarrative.atmosphere)
            : normalizeAtmosphere(outline.initialAtmosphere);

          // Create state snapshot for the first segment
          const stateSnapshot = createStateSnapshot(gameStateRef.current, {
            summaries: [],
            lastSummarizedIndex: 0,
            currentLocation: outline.locations?.[0]?.name || "Unknown",
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
            imagePrompt: openingNarrative.imagePrompt || "",
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
            turnNumber: 1,
            atmosphere: openingAtmosphere,
          }));

          console.log(
            "[StartNewGame] First segment created from Phase 10 openingNarrative",
          );

          // Trigger image generation for the first node if enabled AND no seed image
          if (
            openingNarrative.imagePrompt &&
            !aiSettings.manualImageGen &&
            !seedImageId
          ) {
            generateImageForNode(firstNodeId, firstNode);
          }

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
          const errorMsg =
            error instanceof Error
              ? error.message
              : "Unknown error during first segment";
          showToast(errorMsg, "error", 5000);

          // Don't delete save or navigate away - outline is still valid
          // Set error state so player can retry
          setGameState((prev) => ({
            ...prev,
            isProcessing: false,
            error:
              "Failed to start the story. Please try again using the retry button.",
          }));
        }
      }, 100);
    } catch (e) {
      // This catch block now only handles errors AFTER outline generation
      // (e.g., state processing errors, navigation errors)
      console.error("Post-outline processing failed", e);
      const postErrorMsg =
        e instanceof Error ? e.message : "Failed to initialize game state";
      showToast(postErrorMsg, "error", 5000);
      deleteSlot(slotId);
      setCurrentSlotId(null);
      setGameState((prev) => ({
        ...prev,
        error: "Failed to initialize game state",
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
            await saveToSlot(currentSlotId!, updatedState);
            console.log(
              `[ResumeOutline] Saved conversation state at phase ${conversationState.currentPhase}`,
            );
          },
        },
      );

      console.log("[ResumeOutline] Outline generation completed", outline);

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
        themeConfig, // Store resolved theme config
        outlineConversation: undefined,
        character: {
          ...outline.character,
          conditions: (outline.character.conditions || []).map(
            (c: any, i: number) => ({ ...c }),
          ),
          hiddenTraits: (outline.character.hiddenTraits || []).map(
            (t: any, i: number) => ({ ...t }),
          ),
        },
        inventory: (outline.inventory || []).map(
          (item: any, index: number) => ({
            ...item,
            createdAt: Date.now(),
          }),
        ),
        relationships: (outline.relationships || []).map(
          (rel: any, index: number) => ({
            ...rel,
            createdAt: Date.now(),
          }),
        ),
        quests: (outline.quests || []).map((q: any, index: number) => ({
          ...q,
          status: "active",
          createdAt: Date.now(),
        })),
        currentLocation: outline.locations?.[0]?.name || "Unknown",
        locations: (outline.locations || []).map((loc: any, index: number) => ({
          ...loc,
          isVisited: index === 0,
          createdAt: Date.now(),
        })),
        knowledge: (outline.knowledge || []).map((k: any, index: number) => ({
          ...k,
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
      };

      setGameState(nextState);

      // Save checkpoint
      setTimeout(async () => {
        await saveToSlot(currentSlotId!, nextState);
        console.log("[ResumeOutline] Outline checkpoint saved");
      }, 50);

      navigate("/game");

      // Generate first turn from Phase 10 openingNarrative
      setTimeout(async () => {
        try {
          // RAG is now managed by the SharedWorker - no manual initialization needed

          // Use Phase 10 openingNarrative directly instead of calling handleAction
          const openingNarrative = outline.openingNarrative;
          if (!openingNarrative) {
            throw new Error("Missing opening narrative from Phase 10");
          }

          // Create the first segment directly from openingNarrative
          const firstNodeId = `model-opening-${Date.now()}`;

          // Determine atmosphere
          const openingAtmosphere = openingNarrative.atmosphere
            ? normalizeAtmosphere(openingNarrative.atmosphere)
            : normalizeAtmosphere(outline.initialAtmosphere);

          // Create state snapshot for the first segment
          const stateSnapshot = createStateSnapshot(gameStateRef.current, {
            summaries: [],
            lastSummarizedIndex: 0,
            currentLocation: outline.locations?.[0]?.name || "Unknown",
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
            imagePrompt: openingNarrative.imagePrompt || "",
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
            turnNumber: 1,
            atmosphere: openingAtmosphere,
          }));

          console.log(
            "[ResumeOutline] First segment created from Phase 10 openingNarrative",
          );

          // Trigger image generation for the first node if enabled
          if (openingNarrative.imagePrompt && !aiSettings.manualImageGen) {
            generateImageForNode(firstNodeId, firstNode);
          }
        } catch (error) {
          console.error("First segment creation error after resume", error);
          setGameState((prev) => ({
            ...prev,
            isProcessing: false,
            error:
              "Failed to start the story. Please try again using the retry button.",
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
      }

      const resumeErrorMsg = isHistoryCorrupted
        ? "History cache corrupted. The cache has been cleared. Please retry from the beginning."
        : e instanceof Error
          ? e.message
          : "Failed to resume story generation";
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
  const navigateToNode = (nodeId: string, isFork: boolean = false) => {
    let newForkId: number | null = null;
    let newForkTree: any = null;

    setGameState((prev) => {
      const targetNode = prev.nodes[nodeId];
      let newState = { ...prev, activeNodeId: nodeId };

      if (targetNode && targetNode.stateSnapshot) {
        // Restore state from snapshot
        newState = restoreStateFromSnapshot(newState, targetNode.stateSnapshot);
      }

      // If this is a fork operation (going back to an earlier point to diverge),
      // create a new fork branch
      if (isFork && nodeId !== prev.activeNodeId) {
        const forkResult = createFork(
          prev.forkId,
          prev.forkTree,
          nodeId,
          newState.turnNumber,
        );
        newForkId = forkResult.newForkId;
        newForkTree = forkResult.newForkTree;
        newState = {
          ...newState,
          forkId: newForkId,
          forkTree: newForkTree,
        };
        console.log(
          `[Fork] Created new fork ${newForkId} from node ${nodeId}, parent fork: ${prev.forkId}`,
        );
      }

      return newState;
    });

    // Update RAG context if a fork was created (background, non-blocking)
    if (isFork && newForkId !== null && aiSettings.embedding?.enabled) {
      const ragService = getRAGService();
      if (ragService && currentSlotId) {
        ragService
          .switchSave(currentSlotId, newForkId, newForkTree)
          .then(() => {
            console.log(`[RAG] Switched to fork ${newForkId} context`);
          })
          .catch((error) => {
            console.error("[RAG] Failed to switch fork context:", error);
          });
      }
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
              ...prev.tokenUsage,
              totalTokens:
                (prev.tokenUsage?.totalTokens || 0) +
                (log.usage?.totalTokens || 0),
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
              ...prev.tokenUsage,
              totalTokens:
                (prev.tokenUsage?.totalTokens || 0) +
                (log.usage?.totalTokens || 0),
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
              ...prev.tokenUsage,
              totalTokens:
                (prev.tokenUsage?.totalTokens || 0) +
                (log.usage?.totalTokens || 0),
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

    // Manual Mode Check
    // If manual mode is ON, and this is NOT a manual click (i.e. auto-gen), skip.
    if (aiSettings.manualImageGen && !isManualClick) {
      console.log("Skipping auto-generation due to Manual Mode");
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

      // Apply freshSegmentCount overlap for narrative continuity
      const freshCount = aiSettings.freshSegmentCount ?? 4;
      const lastSummarizedIndex = gameStateRef.current.lastSummarizedIndex ?? 0;
      const recentHistory = getSegmentsForAI(
        fullHistory,
        lastSummarizedIndex,
        freshCount,
      );

      const context: TurnContext = {
        recentHistory,
        userAction: prompt,
        language: LANG_MAP[language],
        themeKey: gameStateRef.current.theme,
        tFunc: t,
        settings: aiSettings,
        slotId: currentSlotId || "default",
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

      const finalState = (response as any).finalState;
      if (!finalState) {
        throw new Error("Force update failed: No final state returned.");
      }

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
        imagePrompt: response.imagePrompt || "",
        role: "system",
        timestamp: Date.now() + 1,
        atmosphere: responseAtmosphere,
        narrativeTone: response.narrativeTone,
        ending: "continue",
        summaries: baseSummaries,
        summarizedIndex: baseIndex,
        stateSnapshot: createStateSnapshot(finalState, {
          summaries: baseSummaries,
          lastSummarizedIndex: baseIndex,
          currentLocation: finalState.currentLocation,
          time: finalState.time,
          atmosphere: responseAtmosphere,
          veoScript: gameStateRef.current.veoScript,
          uiState: gameStateRef.current.uiState,
        }),
      };

      setGameState((prev) => {
        const newNodes = {
          ...prev.nodes,
          [commandNodeId]: commandNode,
          [resultNodeId]: resultNode,
        };

        return {
          ...prev,
          nodes: newNodes,
          activeNodeId: resultNodeId,
          currentFork: deriveHistory(newNodes, resultNodeId),
          // Update state
          inventory: finalState.inventory,
          relationships: finalState.relationships,
          quests: finalState.quests,
          currentLocation: finalState.currentLocation,
          locations: finalState.locations,
          character: finalState.character,
          knowledge: finalState.knowledge,
          factions: finalState.factions,
          time: finalState.time,
          nextIds: finalState.nextIds,
          timeline: finalState.timeline,
          causalChains: finalState.causalChains,
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
      // Construct TurnContext
      const fullHistory = deriveHistory(
        gameStateRef.current.nodes,
        gameStateRef.current.activeNodeId,
        true,
      );

      const freshCount = aiSettings.freshSegmentCount ?? 4;
      const lastSummarizedIndex = gameStateRef.current.lastSummarizedIndex ?? 0;
      const recentHistory = getSegmentsForAI(
        fullHistory,
        lastSummarizedIndex,
        freshCount,
      );

      const context: TurnContext = {
        recentHistory,
        userAction: "[CLEANUP]",
        language: LANG_MAP[language],
        themeKey: gameStateRef.current.theme,
        tFunc: t,
        settings: aiSettings,
        slotId: currentSlotId || "default",
      };

      const { response, logs, changedEntities } = await generateEntityCleanup(
        gameStateRef.current,
        context,
      );

      // Add cleanup logs to game state
      if (logs && logs.length > 0) {
        setGameState((prev) => ({
          ...prev,
          logs: [...logs, ...(prev.logs || [])].slice(0, 100),
        }));
      }

      // Update changed entities in state
      const finalState = (response as any).finalState || gameStateRef.current;

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
        stateSnapshot: createStateSnapshot(finalState, {
          summaries: baseSummaries,
          lastSummarizedIndex: baseIndex,
          currentLocation: finalState.currentLocation,
          time: finalState.time,
          atmosphere: gameStateRef.current.atmosphere,
          veoScript: gameStateRef.current.veoScript,
          uiState: gameStateRef.current.uiState,
        }),
      };

      setGameState((prev) => {
        const newNodes = {
          ...prev.nodes,
          [cleanupNodeId]: cleanupNode,
        };

        return {
          ...prev,
          nodes: newNodes,
          activeNodeId: cleanupNodeId,
          currentFork: deriveHistory(newNodes, cleanupNodeId),
          inventory: finalState.inventory,
          relationships: finalState.relationships,
          quests: finalState.quests,
          currentLocation: finalState.currentLocation,
          locations: finalState.locations,
          character: finalState.character,
          knowledge: finalState.knowledge,
          factions: finalState.factions,
          time: finalState.time,
          timeline: finalState.timeline,
          causalChains: finalState.causalChains,
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
  };
};
