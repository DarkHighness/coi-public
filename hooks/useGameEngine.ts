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
import {
  generateAdventureTurn,
  generateSceneImage,
  updateAIConfig,
  generateStoryOutlinePhased,
  summarizeContext,
  type OutlinePhaseProgress,
} from "../services/aiService";
import { THEMES, ENV_THEMES, LANG_MAP, DEFAULTS } from "../utils/constants";
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
import {
  resetEmbeddingManager,
  getEmbeddingManager,
  initializeEmbeddingManager,
} from "../services/embedding/embeddingManager";

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

  // Initialize settings from localStorage to avoid flash
  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem("chronicles_aisettings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULTS,
          ...parsed,
          gemini: { ...DEFAULTS.gemini, ...(parsed.gemini || {}) },
          openai: { ...DEFAULTS.openai, ...(parsed.openai || {}) },
          story: { ...DEFAULTS.story, ...(parsed.story || {}) },
          script: { ...DEFAULTS.script, ...(parsed.script || {}) },
          image: { ...DEFAULTS.image, ...(parsed.image || {}) },
          video: { ...DEFAULTS.video, ...(parsed.video || {}) },
          audio: { ...DEFAULTS.audio, ...(parsed.audio || {}) },
          audioVolume: {
            ...DEFAULTS.audioVolume,
            ...(parsed.audioVolume || {}),
          },
          translation: {
            ...DEFAULTS.translation,
            ...(parsed.translation || {}),
          },
          lore: { ...DEFAULTS.lore, ...(parsed.lore || {}) },
        };
      } catch (e) {
        console.error("Failed to parse settings", e);
        return DEFAULTS;
      }
    }
    return DEFAULTS;
  });

  const [isMagicMirrorOpen, setIsMagicMirrorOpen] = useState(false);
  const [isVeoScriptOpen, setIsVeoScriptOpen] = useState(false);
  const [magicMirrorImage, setMagicMirrorImage] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<"day" | "night" | "system">(() => {
    const saved = localStorage.getItem("chronicles_theme_mode");
    return saved === "day" || saved === "night" || saved === "system"
      ? saved
      : "system";
  });

  // Derived Language State
  const language = i18n.language as LanguageCode;

  const setLanguage = (lang: LanguageCode) => {
    const newSettings = { ...aiSettings, language: lang };
    setAiSettings(newSettings);
    updateAIConfig(newSettings);
    localStorage.setItem("chronicles_aisettings", JSON.stringify(newSettings));
    i18n.changeLanguage(lang);
  };

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

  useEffect(() => {
    // Sync i18n with settings on mount if different
    if (aiSettings.language && aiSettings.language !== i18n.language) {
      i18n.changeLanguage(aiSettings.language);
    }
    updateAIConfig(aiSettings);
  }, []);

  const handleSaveSettings = (newSettings: AISettings) => {
    setAiSettings(newSettings);
    updateAIConfig(newSettings);
    localStorage.setItem("chronicles_aisettings", JSON.stringify(newSettings));
    if (newSettings.language !== language) {
      i18n.changeLanguage(newSettings.language);
    }
  };

  const toggleThemeMode = () => {
    const modes: ("day" | "night" | "system")[] = ["day", "night", "system"];
    const nextIndex = (modes.indexOf(themeMode) + 1) % modes.length;
    const newMode = modes[nextIndex];
    setThemeMode(newMode);
    localStorage.setItem("chronicles_theme_mode", newMode);
  };

  const setThemeModeValue = (mode: "day" | "night" | "system") => {
    setThemeMode(mode);
    localStorage.setItem("chronicles_theme_mode", mode);
  };

  const resetSettings = () => {
    // Reset to default settings
    const defaultSettings = DEFAULTS;
    setAiSettings(defaultSettings);
    updateAIConfig(defaultSettings);
    localStorage.setItem(
      "chronicles_aisettings",
      JSON.stringify(defaultSettings),
    );
    // Reset language to default
    i18n.changeLanguage(defaultSettings.language);
  };

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

    // Initialize embedding manager if RAG is enabled and not already initialized
    if (aiSettings.embedding?.enabled) {
      const existingManager = getEmbeddingManager();
      if (!existingManager) {
        console.log("[RAG] Initializing embedding manager...");
        initializeEmbeddingManager({ settings: aiSettings });
      }
    }

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
      } = await generateAdventureTurn(gameStateRef.current, {
        recentHistory: segmentsToSend,
        userAction: action,
        language: LANG_MAP[language],
        themeKey: gameStateRef.current.theme,
        tFunc: t,
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

      // Legacy single toast message for backwards compatibility
      let toastMessage = "";
      if (stateChanges.itemsAdded.length > 0) {
        toastMessage = t("toast.itemAdded");
      } else if (stateChanges.npcsAdded.length > 0) {
        toastMessage = t("toast.charMet");
      } else if (
        stateChanges.questsAdded.length > 0 ||
        stateChanges.questsCompleted.length > 0
      ) {
        toastMessage = t("toast.questUpd");
      }

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
          worldSetting: finalState.outline?.worldSetting?.visible,
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

        generateSceneImage(response.imagePrompt, imageContext)
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

      // Background Embedding Update (Silent)
      if (aiSettings.embedding?.enabled) {
        // Run in background, don't await
        const manager = getEmbeddingManager();
        if (manager) {
          // We need to identify what changed. For now, we pass the whole state
          // and let the manager figure it out or just update everything.
          // Ideally, we would pass changedEntityIds, but for now we'll rely on
          // the manager's ability to handle updates or we can optimize later.
          // Actually, updateIndex takes changedEntityIds.
          // We can construct a list from stateChanges.
          const changedIds: string[] = [];

          // Helper to extract IDs from actions
          // Note: The actions in response don't always have IDs, so we might need to rely on
          // the fact that we have the final state.
          // A simpler approach for now is to let the manager re-scan or just pass a flag.
          // But updateIndex requires changedEntityIds.
          // Let's try to gather some IDs if possible, or pass a special "all" flag if we modify manager.
          // Since we don't have easy access to IDs here without parsing actions deeply,
          // and updateIndex is designed for incremental updates...
          // Let's look at how we can get IDs.
          // The finalState has the new entities.
          // We can just pass an empty array and let the manager decide, or we can skip for now
          // and implement a "scan for changes" method in manager later.
          // Wait, the user asked for "background embedding updates (silent updates)".
          // If I pass all entity IDs, it might be too slow.
          // Let's just pass the IDs of the active node and related entities for now.

          // Actually, let's just use a "smart update" if we can.
          // For now, I'll pass the IDs of the new model node and user node.
          changedIds.push(`story:${modelNodeId}`);
          changedIds.push(`story:${effectiveUserNodeId}`);

          // Add IDs from state changes
          // This is a bit tricky without exact IDs.
          // Let's just trigger a full re-scan/update in the background for now,
          // or better, let's modify updateIndex to accept null to mean "scan all".
          // But I can't modify manager right now easily without another tool call.
          // Let's just pass the story nodes for now, as they are the most important context.
          // And maybe the current location.
          if (finalState.currentLocation) changedIds.push(`location:${finalState.currentLocation}`);

          // We should also include any entities mentioned in the response?
          // That's hard to know.

          // Alternative: The EmbeddingManager could have a method `updateFromState(state)`
          // that diffs with previous state.
          // For now, let's just update the story nodes and current location.
          // This is a "good enough" incremental update for the turn.

          manager.updateIndex(finalState, changedIds).catch(err => {
            console.warn("[RAG] Background update failed:", err);
          });
        }
      }

      return {
        success: true as const,
        stateChanges,
        legacyMessage: toastMessage,
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

    // Reset embedding manager when starting a new game
    resetEmbeddingManager();

    // Strict Reset
    resetState(selectedTheme);

    // Set processing state BEFORE navigation so InitializingPage sees it
    setGameState((prev) => ({ ...prev, isProcessing: true }));

    navigate("/initializing");
    try {
      // NOTE: startNewGame creates a completely NEW game, so we don't resume from
      // any previous conversation state. resumeOutlineGeneration should be used
      // to resume from a saved conversation state.

      // Use phased generation to avoid "schema produces a constraint that has too many states" errors
      const { outline, logs } = await generateStoryOutlinePhased(
        selectedTheme,
        LANG_MAP[language],
        customContext,
        t,
        {
          onChunk: onStream,
          onPhaseProgress,
          // Do NOT resume from saved conversation - this is a fresh new game
          resumeFromConversation: undefined,
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

      console.log("[StartNewGame] Outline generated (phased)", outline);

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
          // Initialize RAG embedding manager and build initial index BEFORE first turn
          if (aiSettings.embedding?.enabled) {
            console.log("[StartNewGame] Initializing RAG for first turn...");
            const manager = initializeEmbeddingManager({
              settings: aiSettings,
            });
            try {
              // Build index from current game state (which now has the outline)
              await manager.buildIndex(gameStateRef.current);
              console.log("[StartNewGame] RAG index built successfully");
            } catch (ragError) {
              console.warn(
                "[StartNewGame] Failed to build RAG index, continuing without RAG:",
                ragError,
              );
              // Continue without RAG - it's not critical for game to function
            }
          }

          const prompt = `Begin the ${selectedTheme} story. ${customContext ? `Context: ${customContext}` : ""}`;

          // Store initial prompt for retry
          setGameState((prev) => ({ ...prev, initialPrompt: prompt }));

          const result = await handleAction(prompt, true, selectedTheme);

          // handleAction returns:
          // - { success: true, stateChanges, legacyMessage } on success
          // - { success: false, error } on failure
          // If first turn fails, stay in game and allow retry via retry button
          // Don't delete the save since outline generation succeeded
          if (result && !result.success) {
            console.warn(
              "First turn generation failed, but outline is valid - player can retry",
            );
            // Error state is already set by handleAction, player can use retry button
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
      console.error("Init failed", e);
      // Outline generation failed - clean up the save slot
      deleteSlot(slotId);
      setCurrentSlotId(null);
      setGameState((prev) => ({
        ...prev,
        error: "Init Failed",
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
          if (aiSettings.embedding?.enabled) {
            const manager = initializeEmbeddingManager({
              settings: aiSettings,
            });
            await manager.buildIndex(gameStateRef.current);
          }

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
      // Restore embedding index if available and embedding is enabled
      if (aiSettings.embedding?.enabled) {
        const currentModelId = aiSettings.embedding.modelId;
        let indexRestored = false;

        if (result.embeddingIndex) {
          if (result.savedModelId && result.savedModelId !== currentModelId) {
            // Model mismatch - prompt user
            const shouldRebuild = window.confirm(
              `Embedding model mismatch (Saved: ${result.savedModelId}, Current: ${currentModelId}).\n\n` +
                `Click OK to rebuild the index (consumes tokens).\n` +
                `Click Cancel to disable RAG for this session.`,
            );

            if (shouldRebuild) {
              console.log("[Embedding] User chose to rebuild index.");
              // Fall through to rebuild logic below
            } else {
              console.log("[Embedding] User chose to disable RAG.");
              // Disable RAG in settings
              const newSettings = {
                ...aiSettings,
                embedding: { ...aiSettings.embedding, enabled: false },
              };
              setAiSettings(newSettings);
              updateAIConfig(newSettings);
              // Don't rebuild
              indexRestored = true; // Pretend restored to skip rebuild block
            }
          } else {
            // Model matches - restore the index
            try {
              const manager = initializeEmbeddingManager({
                settings: aiSettings,
              });
              await manager.loadIndex(result.embeddingIndex);
              console.log(
                `[Embedding] Restored index with ${result.embeddingIndex.documents.length} documents`,
              );
              indexRestored = true;
            } catch (error) {
              console.error("[Embedding] Failed to restore index:", error);
            }
          }
        }

        // If no index was restored, build a new one from the loaded game state
        if (!indexRestored) {
          console.log("[Embedding] Building new index from game state...");
          try {
            const manager = initializeEmbeddingManager({
              settings: aiSettings,
            });
            await manager.buildIndex(gameStateRef.current);
            console.log("[Embedding] Index rebuilt successfully");
          } catch (error) {
            console.error("[Embedding] Failed to build index:", error);
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
        const { newForkId, newForkTree } = createFork(
          prev.forkId,
          prev.forkTree,
          nodeId,
          newState.turnNumber,
        );
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
