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
} from "../types";
import { useGameState } from "./useGameState";
import { useGamePersistence } from "./useGamePersistence";
import { useSettings } from "./useSettings";
import {
  generateAdventureTurn,
  generateSceneImage,
  generateStoryOutlinePhased,
  summarizeContext,
  type OutlinePhaseProgress,
} from "../services/aiService";
import { THEMES, ENV_THEMES, LANG_MAP } from "../utils/constants";
import {
  createStateSnapshot,
  restoreStateFromSnapshot,
  createFork,
  normalizeAliveEntities,
} from "../utils/snapshotManager";
import {
  getThemeKeyForAtmosphere,
  type AtmosphereObject,
  normalizeAtmosphere,
} from "../utils/constants/atmosphere";
import { getRAGService } from "../services/rag";
import { extractDocumentsFromState } from "./useRAG";

import { preloadAudio } from "../utils/audioLoader";

// Helper: Traverse tree
const deriveHistory = (
  nodes: Record<string, StorySegment>,
  leafId: string | null,
): StorySegment[] => {
  const history: StorySegment[] = [];
  let currentId = leafId;
  while (currentId && nodes[currentId]) {
    history.unshift(nodes[currentId]);
    currentId = nodes[currentId].parentId;
  }
  return history;
};

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
    console.log(`[RAG Update] Updating ${entityIds.length} entities:`, entityIds);

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
 */
async function indexInitialEntities(state: any): Promise<void> {
  try {
    const ragService = getRAGService();
    if (!ragService) return;

    console.log("[RAG Init] Indexing initial entities");
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
    state.factions?.forEach((faction: any) => initialEntityIds.push(faction.id));
    state.timeline?.forEach((event: any) => initialEntityIds.push(event.id));

    if (initialEntityIds.length === 0) return;

    const documents = extractDocumentsFromState(state, initialEntityIds);
    if (documents.length === 0) return;

    await ragService.addDocuments(
      documents.map((doc) => ({
        ...doc,
        saveId: state.saveId || "unknown",
        forkId: state.forkId || 0,
        turnNumber: state.turnNumber || 0,
      })),
    );
    console.log(`[RAG Init] Indexed ${documents.length} documents`);
  } catch (error) {
    console.error("[RAG Init] Failed:", error);
  }
}

export const useGameEngine = () => {
  const { gameState, setGameState, resetState } = useGameState();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

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
  } = useGamePersistence(gameState, setGameState, view);

  // Ref to access latest state in async callbacks/closures
  const gameStateRef = useRef(gameState);
  const processingRef = useRef(false); // Immediate lock to prevent race conditions

  useEffect(() => {
    gameStateRef.current = gameState;
    processingRef.current = gameState.isProcessing;
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
    const envThemeKey = getThemeKeyForAtmosphere(gameState.atmosphere);
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
  }, [gameState.theme, themeMode]);

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

  const handleAction = async (
    action: string,
    isInit: boolean = false,
    forceTheme?: string,
  ) => {
    // Check both the ref (immediate) and state (persisted)
    if (
      (processingRef.current && !isInit) ||
      (gameStateRef.current.isProcessing && !isInit) ||
      isTranslating
    )
      return null;

    // Immediately lock
    if (!isInit) processingRef.current = true;

    // RAG is now managed via the SharedWorker service - no need to initialize here
    // The RAG service should be initialized when the game loads via useRAG hook or App.tsx

    const newSegmentId = Date.now().toString();
    const userNodeId = `user-${newSegmentId}`;
    const parentId = isInit ? null : gameStateRef.current.activeNodeId;

    let effectiveUserNodeId = userNodeId;
    let effectiveParentId = parentId;
    let reuseExistingNode = false;

    if (!isInit && parentId) {
      const parentNode = gameStateRef.current.nodes[parentId];
      // If the active node is a USER node and has the same text, we are retrying
      if (
        parentNode &&
        parentNode.role === "user" &&
        parentNode.text === action
      ) {
        effectiveUserNodeId = parentId;
        effectiveParentId = parentNode.parentId;
        reuseExistingNode = true;
      }
    }

    // --- Fork-Safe Summary Retrieval ---
    let baseSummaries: StorySummary[] = []; // Will be StorySummary[] once fully migrated
    let baseIndex = 0;

    // Use effectiveParentId for context
    if (effectiveParentId && gameStateRef.current.nodes[effectiveParentId]) {
      const pNode = gameStateRef.current.nodes[effectiveParentId];
      baseSummaries = pNode.summaries || [];
      baseIndex = pNode.summarizedIndex || 0;
    }
    // -----------------------------------

    if (!isInit) {
      setGameState((prev) => {
        // If reusing, just set processing and clear error
        if (reuseExistingNode) {
          return {
            ...prev,
            isProcessing: true,
            error: null,
          };
        }

        // Otherwise add new node
        return {
          ...prev,
          isProcessing: true,
          error: null,
          nodes: {
            ...prev.nodes,
            [userNodeId]: {
              id: userNodeId,
              parentId: parentId,
              text: action,
              choices: [],
              imagePrompt: "",
              role: "user",
              timestamp: Date.now(),
              usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
              summaries: baseSummaries,
              summarizedIndex: baseIndex,
              ending: "continue",
            },
          },
          activeNodeId: userNodeId,
        };
      });
    } else {
      setGameState((prev) => ({ ...prev, isProcessing: true, error: null }));
    }

    try {
      // Summarization Logic
      let contextNodes = deriveHistory(
        gameStateRef.current.nodes,
        effectiveParentId,
      );

      // Create temp user node for context calculation
      const tempUserNode: StorySegment = {
        id: effectiveUserNodeId,
        parentId: effectiveParentId,
        text: action,
        choices: [],
        imagePrompt: "",
        role: "user",
        timestamp: Date.now(),
        summaries: baseSummaries,
        summarizedIndex: baseIndex,
        ending: "continue",
      };

      if (!isInit) contextNodes.push(tempUserNode);

      const limit = aiSettings.contextLen || 10;
      const summaryStep = limit;

      let effectiveSummaries = [...baseSummaries];
      let lastIndex = baseIndex;
      let summarySnapshot: StorySummary;

      const totalLength = contextNodes.length;
      const keepFresh = 4;
      const summarizeEnd = Math.max(lastIndex, totalLength - keepFresh);
      const nodesToSummarizeCount = summarizeEnd - lastIndex;

      if (nodesToSummarizeCount >= summaryStep && summarizeEnd > lastIndex) {
        const toSummarize = contextNodes.slice(lastIndex, summarizeEnd);
        const textBlock = toSummarize
          .map((s) => `${s.role}: ${s.text}`)
          .join("\n");

        // Get previous summary text for context
        // Get previous summary text for context
        const lastSummary =
          effectiveSummaries.length > 0
            ? effectiveSummaries[effectiveSummaries.length - 1]
            : undefined;
        const previousSummary = lastSummary || {
          id: 0,
          displayText: "",
          visible: {
            narrative: "",
            majorEvents: [],
            characterDevelopment: "",
            worldState: "",
          },
          hidden: {
            truthNarrative: "",
            hiddenPlots: [],
            npcActions: [],
            worldTruth: "",
            unrevealed: [],
          },
          timeRange: { from: "", to: "" },
          nodeRange: { fromIndex: 0, toIndex: 0 },
        };

        // Call Summary Service
        const sumResult = await summarizeContext(
          previousSummary,
          textBlock,
          LANG_MAP[language],
          aiSettings,
        );

        // Push the new summary object (or string for legacy compatibility)
        effectiveSummaries.push(sumResult.summary);

        // Extract displayText for UI
        summarySnapshot = sumResult.summary || sumResult.summary;
        lastIndex = summarizeEnd;

        // Log the summary action
        setGameState((prev) => ({
          ...prev,
          logs: [sumResult.log, ...prev.logs].slice(0, 50),
          totalTokens:
            prev.totalTokens + (sumResult.log.usage?.totalTokens || 0),
        }));
      } else {
        // Ensure lastIndex is at least baseIndex to prevent regression
        lastIndex = Math.max(lastIndex, baseIndex);
      }

      // Update the user node in state with the FINAL summary state for this turn
      // This ensures that if we fork from here later, we have the correct state
      if (!isInit) {
        setGameState((prev) => ({
          ...prev,
          nodes: {
            ...prev.nodes,
            [effectiveUserNodeId]: {
              ...prev.nodes[effectiveUserNodeId],
              summaries: effectiveSummaries,
              summarizedIndex: lastIndex,
            },
          },
          // Update global view for UI (optional, but good for debugging)
          summaries: effectiveSummaries,
          lastSummarizedIndex: lastIndex,
        }));
      }

      // We send everything from the last summarized point onwards
      let segmentsToSend = contextNodes.slice(lastIndex);

      // Generate Turn - pass GameState directly with TurnContext
      const {
        response,
        logs: turnLogs,
        usage,
        changedEntities,
      } = await generateAdventureTurn(gameStateRef.current, {
        recentHistory: segmentsToSend,
        userAction: action,
        language: LANG_MAP[language],
        themeKey: gameStateRef.current.theme,
        tFunc: t,
        settings: aiSettings,
      });

      // Sanitize choices to ensure strict string array
      const sanitizedChoices = Array.isArray(response.choices)
        ? response.choices.map((c) => {
            if (typeof c === "object" && c !== null) {
              const obj = c as {
                choice?: string;
                text?: string;
                label?: string;
              };
              return obj.choice || obj.text || obj.label || JSON.stringify(c);
            }
            return String(c);
          })
        : [];

      const modelNodeId = `model-${newSegmentId}`;

      // ===== STATE UPDATE =====
      // We now use the finalState returned by the Agentic Loop (GameDatabase)
      // If for some reason it's missing (legacy/fallback), we might need a backup,
      // but for this refactor we assume it's there.
      const finalState = response.finalState;

      if (!finalState) {
        throw new Error(
          "AI Service did not return a final state. Agentic loop failed?",
        );
      }

      // Collect state changes for toast notifications (with names)
      const stateChanges = {
        itemsAdded:
          response.inventoryActions
            ?.filter((a) => a.action === "add")
            .map((a) => ({ name: a.name || "Unknown Item" })) || [],
        itemsRemoved:
          response.inventoryActions
            ?.filter((a) => a.action === "remove")
            .map((a) => ({ name: a.name || "Unknown Item" })) || [],
        npcsAdded:
          response.relationshipActions
            ?.filter((a) => a.action === "add")
            .map((a) => ({ name: a.visible?.name || "Unknown NPC" })) || [],
        questsAdded:
          response.questActions
            ?.filter((a) => a.action === "add")
            .map((a) => ({ name: a.title || "Unknown Quest" })) || [],
        questsCompleted:
          response.questActions
            ?.filter((a) => a.action === "complete")
            .map((a) => ({ name: a.title || "Unknown Quest" })) || [],
        locationsDiscovered:
          response.locationActions
            ?.filter((a) => a.action === "add")
            .map((a) => ({ name: a.name || "Unknown Location" })) || [],
      };

      // Resolve atmosphere from response (environment from finish_turn is actually atmosphere)
      const responseAtmosphere: AtmosphereObject = normalizeAtmosphere(
        response.atmosphere || gameStateRef.current.atmosphere,
      );

      const modelNode: StorySegment = {
        id: modelNodeId,
        parentId: isInit ? null : effectiveUserNodeId,
        text: response.narrative || "...",
        choices: sanitizedChoices,
        imagePrompt: response.imagePrompt || "",
        role: "model",
        timestamp: Date.now(),
        summarySnapshot: summarySnapshot || undefined,
        usage: usage,
        summaries: effectiveSummaries,
        summarizedIndex: lastIndex,
        atmosphere: responseAtmosphere, // Unified atmosphere
        narrativeTone: response.narrativeTone,
        imageSkipped: !response.generateImage,
        ending: response.ending || "continue", // Game ending type, default to continue
        forceEnd: response.forceEnd, // Whether game ends permanently
        stateSnapshot: createStateSnapshot(
          finalState, // Use finalState for snapshot
          {
            summaries: effectiveSummaries,
            lastSummarizedIndex: lastIndex,
            currentLocation: finalState.currentLocation,
            time: finalState.time,
            atmosphere: responseAtmosphere,
            veoScript: gameStateRef.current.veoScript,
            uiState: gameStateRef.current.uiState,
          },
        ),
      };

      // Update State with Response
      setGameState((prev) => ({
        ...prev,
        nodes: {
          ...prev.nodes,
          [modelNodeId]: modelNode,
        },
        activeNodeId: modelNodeId,
        rootNodeId: prev.rootNodeId || (isInit ? modelNodeId : prev.rootNodeId),

        // Apply the full new state from the database
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

        // Context Priority System: update alive entities and increment turn
        aliveEntities: normalizeAliveEntities(response.aliveEntities),
        turnNumber: prev.turnNumber + 1,

        summaries: effectiveSummaries,
        isProcessing: false,
        isImageGenerating: true,
        generatingNodeId: modelNodeId,
        atmosphere: responseAtmosphere,
        theme: prev.theme,
        logs: [...turnLogs, ...prev.logs].slice(0, 100),
        totalTokens: prev.totalTokens + usage.totalTokens,
        generateImage: response.generateImage,
      }));

      // Async Image Gen with Timeout
      if (
        response.generateImage &&
        response.imagePrompt &&
        !aiSettings.manualImageGen
      ) {
        const stateSnapshot = createStateSnapshot(finalState, {
          time: finalState.time,
          currentLocation: finalState.currentLocation, // Added required field
          summaries: effectiveSummaries, // Use previous summaries or updated ones if available
          lastSummarizedIndex: lastIndex,
          uiState: gameStateRef.current.uiState,
          atmosphere: responseAtmosphere,
          veoScript: gameStateRef.current.veoScript,
        });

        // Build rich image context with all relevant details
        const currentLoc = finalState.locations?.find(
          (l) =>
            l.name === finalState.currentLocation ||
            String(l.id) === String(finalState.currentLocation),
        );

        const imageContext = {
          theme: finalState.theme,
          worldSetting: finalState.outline?.worldSetting?.visible?.description,
          time: finalState.time,
          location: currentLoc
            ? {
                name: currentLoc.name,
                environment: currentLoc.environment || "Unknown",
                details: currentLoc.visible?.description || "",
              }
            : {
                name: finalState.currentLocation,
                environment: "Unknown",
                details: "",
              },
          character: {
            name: finalState.character?.name || "Unknown",
            race: finalState.character?.race || "Unknown",
            profession: finalState.character?.profession || "",
            appearance: finalState.character?.appearance || "Not described",
            status: finalState.character?.status || "Normal",
          },
          stateSnapshot,
          activeNPCs: finalState.relationships.map((r) => ({
            name: r.visible.name,
            description: r.visible.description,
            appearance: r.visible.appearance || "Unknown",
            status: r.visible.relationshipType,
          })),
        };

        const imageTimeout = setTimeout(
          () => {
            setGameState((prev) => {
              if (prev.isImageGenerating) {
                console.warn("Image generation timeout");
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

        generateSceneImage(response.imagePrompt, aiSettings, imageContext)
          .then(({ url, log }) => {
            clearTimeout(imageTimeout);
            setGameState((prev) => ({
              ...prev,
              isImageGenerating: false,
              generatingNodeId: null,
              logs: [log, ...prev.logs].slice(0, 50),
              totalTokens: prev.totalTokens + (log.usage?.totalTokens || 0),
              nodes: url
                ? {
                    ...prev.nodes,
                    [modelNodeId]: {
                      ...prev.nodes[modelNodeId],
                      imageUrl: url,
                    },
                  }
                : prev.nodes,
            }));
          })
          .then(() => {
            triggerSave();
          })
          .catch((error) => {
            clearTimeout(imageTimeout);
            console.error("Image generation failed:", error);
            setGameState((prev) => ({
              ...prev,
              isImageGenerating: false,
              generatingNodeId: null,
            }));
          });
      } else {
        setGameState((prev) => ({
          ...prev,
          isImageGenerating: false,
          generatingNodeId: null,
        }));
      }

      // Clear lock
      processingRef.current = false;

      // Return state changes for toast notifications
      // Trigger save immediately after generation
      triggerSave();

      // Background RAG Update (non-blocking)
      if (aiSettings.embedding?.enabled && changedEntities.length > 0) {
        updateRAGDocumentsBackground(changedEntities, gameStateRef.current).catch((error) => {
          console.error("[RAG Update] Background update failed:", error);
        });
      }

      return {
        success: true as const,
        stateChanges,
      };
    } catch (error: unknown) {
      console.error(error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Error connecting to the universe...";
      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        error: errorMsg,
      }));
      // Clear lock
      processingRef.current = false;
      return { success: false as const, error: errorMsg };
    }
  };

  const startNewGame = async (
    initialTheme?: string,
    customContext?: string,
    onStream?: (text: string) => void,
    onPhaseProgress?: (progress: OutlinePhaseProgress) => void,
  ) => {
    let selectedTheme =
      initialTheme ||
      Object.keys(THEMES)[
        Math.floor(Math.random() * Object.keys(THEMES).length)
      ];

    // Preload audio in background if not muted (Mobile optimization: trigger on user click)
    if (
      !aiSettings.audioVolume.bgmMuted &&
      aiSettings.audioVolume.bgmVolume > 0
    ) {
      preloadAudio().catch((e) =>
        console.warn("Background audio preload failed", e),
      );
    }

    const slotId = createSaveSlot(selectedTheme);
    setCurrentSlotId(slotId);

    // Note: RAG context switching is now handled automatically by the SharedWorker
    // when switching saves. No manual reset needed here.

    // Strict Reset
    resetState(selectedTheme);

    // Set processing state BEFORE navigation so InitializingPage sees it
    setGameState((prev) => ({ ...prev, isProcessing: true }));

    navigate("/initializing");

    // Step 1: Generate outline (with separate error handling)
    let outline;
    let logs;
    try {
      // NOTE: startNewGame creates a completely NEW game, so we don't resume from
      // any previous conversation state. resumeOutlineGeneration should be used
      // to resume from a saved conversation state.

      // Use phased generation to avoid "schema produces a constraint that has too many states" errors
      const result = await generateStoryOutlinePhased(
        selectedTheme,
        LANG_MAP[language],
        customContext,
        t,
        {
          onChunk: onStream,
          onPhaseProgress,
          // Do NOT resume from saved conversation - this is a fresh new game
          resumeFromConversation: undefined,
          // Pass settings for the generation
          settings: aiSettings,
          // Save conversation state after each phase for fault recovery
          onSaveConversation: async (
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
      console.log("[StartNewGame] Outline generated (phased)", outline);
    } catch (outlineError) {
      // Outline generation failed - prompt user to retry
      console.error("Outline generation failed", outlineError);
      const errorMessage =
        outlineError instanceof Error
          ? outlineError.message
          : "Failed to generate story outline";

      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
      }));

      // Show alert asking if user wants to retry
      const shouldRetry = window.confirm(
        `${errorMessage}\n\nWould you like to retry generating the story outline?`,
      );

      if (shouldRetry) {
        // Retry outline generation
        return startNewGame(selectedTheme, customContext, onStream, onPhaseProgress);
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
      const totalPhaseTokens = logs.reduce(
        (sum, log) => sum + (log.usage?.totalTokens || 0),
        0,
      );

      setGameState((prev) => ({
        ...prev,
        outline,
        // Clear conversation state after successful generation
        outlineConversation: undefined,
        character: {
          ...outline.character,
          conditions: (outline.character.conditions || []).map(
            (c: any, i: number) => ({
              ...c,
              id: `cond:${i + 1}`,
            }),
          ),
          hiddenTraits: (outline.character.hiddenTraits || []).map(
            (t: any, i: number) => ({
              ...t,
              id: `trait:${i + 1}`,
            }),
          ),
        },
        inventory: (outline.inventory || []).map(
          (item: any, index: number) => ({
            ...item,
            id: `inv:${index + 1}`,
            createdAt: Date.now(),
          }),
        ),
        relationships: (outline.relationships || []).map(
          (rel: any, index: number) => ({
            ...rel,
            id: `npc:${index + 1}`,
            createdAt: Date.now(),
          }),
        ),
        quests: (outline.quests || []).map((q: any, index: number) => ({
          ...q,
          id: `quest:${index + 1}`,
          status: "active",
          createdAt: Date.now(),
        })),
        currentLocation: outline.locations?.[0]?.name || "Unknown",
        locations: (outline.locations || []).map((loc: any, index: number) => ({
          ...loc,
          id: `loc:${index + 1}`,
          isVisited: index === 0,
          createdAt: Date.now(),
        })),
        knowledge: (outline.knowledge || []).map((k: any, index: number) => ({
          ...k,
          id: `know:${index + 1}`,
        })),
        factions: (outline.factions || []).map((f: any, index: number) => ({
          ...f,
          id: `fac:${index + 1}`,
        })),
        timeline: (outline.timeline || []).map((e: any) => ({
          ...e,
          category: e.category || "world_event", // Default to world_event if missing
        })),
        nextIds: {
          item: (outline.inventory?.length || 0) + 1,
          npc: (outline.relationships?.length || 0) + 1,
          location: (outline.locations?.length || 0) + 1,
          knowledge: (outline.knowledge?.length || 0) + 1,
          quest: (outline.quests?.length || 0) + 1,
          faction: (outline.factions?.length || 0) + 1,
          timeline: (outline.timeline?.length || 0) + 1,
          causalChain: 1, // Causal chains start fresh
          skill: (outline.character?.skills?.length || 0) + 1,
          condition: (outline.character?.conditions?.length || 0) + 1,
          hiddenTrait: (outline.character?.hiddenTraits?.length || 0) + 1,
        },
        isProcessing: true, // Keep processing true while generating first turn
        logs: [...logs, ...prev.logs],
        totalTokens: prev.totalTokens + totalPhaseTokens,
        generateImage: false,
        summaries: [],
        theme: selectedTheme, // Static Theme
        atmosphere: normalizeAtmosphere(outline.initialAtmosphere), // Initial atmosphere
        time: outline.initialTime || "Day 1",
      }));

      // === IMPORTANT: Save outline immediately after generation ===
      // This ensures we have a valid checkpoint even if first turn generation fails
      // Use setTimeout to ensure the state update has propagated
      setTimeout(async () => {
        try {
          await saveToSlot(slotId, gameStateRef.current);
          console.log("[StartNewGame] Outline checkpoint saved successfully");
        } catch (e) {
          console.error("[StartNewGame] Failed to save outline checkpoint", e);
        }
      }, 50);

      // Navigate to game immediately after outline is ready
      navigate("/game");

      // Generate first turn in the game view
      setTimeout(async () => {
        try {
          // RAG initialization is now handled automatically by the SharedWorker
          // when documents are added. No manual initialization needed.
          // The RAG service should already be initialized via App.tsx

          const prompt = `Begin the ${selectedTheme} story. ${customContext ? `Context: ${customContext}` : ""}`;

          // Store initial prompt for retry
          setGameState((prev) => ({ ...prev, initialPrompt: prompt }));

          const result = await handleAction(prompt, true, selectedTheme);

          // handleAction returns:
          // - { success: true, stateChanges } on success
          // - { success: false, error } on failure
          // If first turn fails, stay in game and allow retry via retry button
          // Don't delete the save since outline generation succeeded
          if (result && !result.success) {
            console.warn(
              "First turn generation failed, but outline is valid - player can retry",
            );
            // Error state is already set by handleAction, player can use retry button
          } else if (result && result.success) {
            // On success, index initial entities in background (non-blocking)
            if (aiSettings.embedding?.enabled) {
              indexInitialEntities(gameStateRef.current).catch((error) => {
                console.error("[RAG Init] Failed to index initial entities:", error);
              });
            }
          }
          // On success, we're already in /game with content showing
        } catch (error) {
          // Unexpected error during first turn
          console.error("Unexpected error during first turn", error);
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
    console.log(
      `[ResumeOutline] Resuming from phase ${savedConversation.currentPhase} for theme ${theme}`,
    );

    // Set processing state
    setGameState((prev) => ({ ...prev, isProcessing: true }));
    navigate("/initializing");

    try {
      const { outline, logs } = await generateStoryOutlinePhased(
        theme,
        savedConversation.language,
        customContext,
        t,
        {
          onChunk: onStream,
          onPhaseProgress,
          resumeFromConversation: savedConversation,
          onSaveConversation: async (
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

      const totalPhaseTokens = logs.reduce(
        (sum, log) => sum + (log.usage?.totalTokens || 0),
        0,
      );

      setGameState((prev) => ({
        ...prev,
        outline,
        outlineConversation: undefined,
        character: {
          ...outline.character,
          conditions: (outline.character.conditions || []).map(
            (c: any, i: number) => ({ ...c, id: `cond:${i + 1}` }),
          ),
          hiddenTraits: (outline.character.hiddenTraits || []).map(
            (t: any, i: number) => ({ ...t, id: `trait:${i + 1}` }),
          ),
        },
        inventory: (outline.inventory || []).map(
          (item: any, index: number) => ({
            ...item,
            id: `inv:${index + 1}`,
            createdAt: Date.now(),
          }),
        ),
        relationships: (outline.relationships || []).map(
          (rel: any, index: number) => ({
            ...rel,
            id: `npc:${index + 1}`,
            createdAt: Date.now(),
          }),
        ),
        quests: (outline.quests || []).map((q: any, index: number) => ({
          ...q,
          id: `quest:${index + 1}`,
          status: "active",
          createdAt: Date.now(),
        })),
        currentLocation: outline.locations?.[0]?.name || "Unknown",
        locations: (outline.locations || []).map((loc: any, index: number) => ({
          ...loc,
          id: `loc:${index + 1}`,
          isVisited: index === 0,
          createdAt: Date.now(),
        })),
        knowledge: (outline.knowledge || []).map((k: any, index: number) => ({
          ...k,
          id: `know:${index + 1}`,
        })),
        factions: (outline.factions || []).map((f: any, index: number) => ({
          ...f,
          id: `fac:${index + 1}`,
        })),
        timeline: (outline.timeline || []).map((e: any) => ({
          ...e,
          category: e.category || "world_event",
        })),
        nextIds: {
          item: (outline.inventory?.length || 0) + 1,
          npc: (outline.relationships?.length || 0) + 1,
          location: (outline.locations?.length || 0) + 1,
          knowledge: (outline.knowledge?.length || 0) + 1,
          quest: (outline.quests?.length || 0) + 1,
          faction: (outline.factions?.length || 0) + 1,
          timeline: (outline.timeline?.length || 0) + 1,
          causalChain: 1,
          skill: (outline.character?.skills?.length || 0) + 1,
          condition: (outline.character?.conditions?.length || 0) + 1,
          hiddenTrait: (outline.character?.hiddenTraits?.length || 0) + 1,
        },
        isProcessing: true,
        logs: [...logs, ...gameStateRef.current.logs],
        totalTokens: gameStateRef.current.totalTokens + totalPhaseTokens,
        generateImage: false,
        summaries: [],
        atmosphere: normalizeAtmosphere(outline.initialAtmosphere),
        time: outline.initialTime || "Day 1",
      }));

      // Save checkpoint
      setTimeout(async () => {
        await saveToSlot(currentSlotId!, gameStateRef.current);
        console.log("[ResumeOutline] Outline checkpoint saved");
      }, 50);

      navigate("/game");

      // Generate first turn
      setTimeout(async () => {
        try {
          // RAG is now managed by the SharedWorker - no manual initialization needed

          const prompt = `Begin the ${theme} story. ${customContext ? `Context: ${customContext}` : ""}`;
          setGameState((prev) => ({ ...prev, initialPrompt: prompt }));

          const result = await handleAction(prompt, true, theme);
          if (result && !result.success) {
            console.warn("First turn failed after resume, player can retry");
          }
        } catch (error) {
          console.error("First turn error after resume", error);
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
      setGameState((prev) => ({
        ...prev,
        error: "Failed to resume outline generation",
        isProcessing: false,
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

  const generateImageForNode = async (nodeId: string) => {
    const node = gameStateRef.current.nodes[nodeId];
    if (!node || !node.imagePrompt) {
      console.warn(
        "Cannot generate image: missing node or imagePrompt for nodeId:",
        nodeId,
      );
      return;
    }

    console.log(
      "Starting image generation for node:",
      nodeId,
      "with prompt:",
      node.imagePrompt,
    );
    setGameState((prev) => ({
      ...prev,
      isImageGenerating: true,
      generatingNodeId: nodeId, // Set the node ID so UI knows which image is generating
    }));

    const imageTimeout = setTimeout(
      () => {
        setGameState((prev) => {
          if (prev.isImageGenerating) {
            console.warn("Image generation timeout for node:", nodeId);
            return { ...prev, isImageGenerating: false };
          }
          return prev;
        });
      },
      (aiSettings.imageTimeout || 60) * 1000,
    );

    try {
      const snapshot = node.stateSnapshot || gameStateRef.current;
      const imageContext = {
        theme: gameStateRef.current.theme,
        worldSetting: gameStateRef.current.outline?.worldSetting?.visible?.description,
        time: snapshot.time,
        location: {
          name: snapshot.currentLocation,
          environment:
            snapshot.locations?.find(
              (l: any) => l.name === snapshot.currentLocation,
            )?.environment || "Unknown",
          details:
            snapshot.locations?.find(
              (l: any) => l.name === snapshot.currentLocation,
            )?.visible?.description || "",
        },
        character: {
          name: snapshot.character?.name || "Unknown",
          race: snapshot.character?.race || "Unknown",
          profession: snapshot.character?.profession || "",
          appearance: snapshot.character?.appearance || "Not described",
          status: snapshot.character?.status || "Normal",
        },
        activeNPCs: (snapshot.relationships || [])
          .filter((r: Relationship) => {
            // Resolve player location ID
            const playerLoc = snapshot.locations?.find(
              (l: GameLocation) =>
                l.name === snapshot.currentLocation ||
                l.id === snapshot.currentLocation,
            );
            const playerLocId = playerLoc?.id;
            const playerLocName = playerLoc?.name;

            // Check if NPC is in the same location
            const isAtLocation =
              r.currentLocation &&
              r.currentLocation !== "unknown" &&
              (r.currentLocation === playerLocId ||
                r.currentLocation === playerLocName ||
                r.currentLocation === snapshot.currentLocation);

            return (
              r.visible?.relationshipType !== "Absent" &&
              r.visible?.relationshipType !== "Dead" &&
              isAtLocation
            );
          })
          .map((r: any) => ({
            name: r.name,
            description: `${r.visible?.description || "No description"} [True Nature: ${r.hidden?.realPersonality || "Unknown"}]`,
            appearance: r.visible?.appearance || "No appearance available",
            status: `${r.visible?.relationshipType || "Unknown"} (${r.hidden?.status || "Normal"})`,
          })),
      };

      const { url, log } = await generateSceneImage(
        node.imagePrompt,
        aiSettings,
        imageContext,
      );
      clearTimeout(imageTimeout);

      if (url && url.trim()) {
        console.log(
          "Image generated successfully for node:",
          nodeId,
          "URL:",
          url.substring(0, 50) + "...",
        );
        setGameState((prev) => ({
          ...prev,
          isImageGenerating: false,
          logs: [log, ...prev.logs].slice(0, 50),
          totalTokens: prev.totalTokens + (log.usage?.totalTokens || 0),
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
          logs: [log, ...prev.logs].slice(0, 50),
          totalTokens: prev.totalTokens + (log.usage?.totalTokens || 0),
        }));
      }
    } catch (e) {
      clearTimeout(imageTimeout);
      console.error("Failed to generate image for node:", nodeId, "Error:", e);
      setGameState((prev) => ({ ...prev, isImageGenerating: false }));
    }
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

  return {
    language,
    setLanguage,
    isTranslating,
    gameState,
    setGameState,
    handleAction,
    startNewGame,
    resumeOutlineGeneration,
    isAutoSaving,
    isMagicMirrorOpen,
    setIsMagicMirrorOpen,
    magicMirrorImage,
    setMagicMirrorImage,
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
  };
};
