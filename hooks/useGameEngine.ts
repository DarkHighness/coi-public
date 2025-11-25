import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AISettings,
  StorySegment,
  LanguageCode,
  StorySummary,
  Relationship,
} from "../types";
import { useGameState } from "./useGameState";
import { useGamePersistence } from "./useGamePersistence";
import {
  generateAdventureTurn,
  generateSceneImage,
  updateAIConfig,
  generateStoryOutline,
  summarizeContext,
} from "../services/aiService";
import { THEMES, ENV_THEMES, LANG_MAP, DEFAULTS } from "../utils/constants";
import {
  createStateSnapshot,
  restoreStateFromSnapshot,
} from "../utils/snapshotManager";
import {
  getThemeKeyForAtmosphere,
  Atmosphere,
} from "../utils/constants/atmosphere";

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
    const envThemeKey = getThemeKeyForAtmosphere(
      gameState.atmosphere as Atmosphere,
    );
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
      document.title = "Chronicles of Infinity";
    } else if (view === "game" && gameState.activeNodeId) {
      const activeNode = gameState.nodes[gameState.activeNodeId];
      if (activeNode && activeNode.text) {
        // Truncate text to ~60 chars
        const text = activeNode.text.replace(/\s+/g, " ").trim();
        const truncated =
          text.length > 60 ? text.substring(0, 60) + "..." : text;
        document.title = `${truncated} - Chronicles`;
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
    let baseSummaries: any[] = []; // Will be StorySummary[] once fully migrated
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
        const previousSummary =
          effectiveSummaries.length > 0
            ? typeof effectiveSummaries[effectiveSummaries.length - 1] ===
              "string"
              ? effectiveSummaries[effectiveSummaries.length - 1]
              : effectiveSummaries[effectiveSummaries.length - 1].displayText
            : "";

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
              return (
                (c as any).choice ||
                (c as any).text ||
                (c as any).label ||
                JSON.stringify(c)
              );
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
      const responseAtmosphere = (response.atmosphere ||
        gameStateRef.current.atmosphere ||
        "quiet") as Atmosphere;

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
        ending: response.ending || null, // Game ending type if story concludes
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
        aliveEntities: response.aliveEntities || {
          inventory: [],
          relationships: [],
          locations: [],
          quests: [],
          knowledge: [],
          timeline: [],
          skills: [],
          conditions: [],
          hiddenTraits: [],
          causalChains: [],
        },
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
      return {
        success: true as const,
        stateChanges,
        legacyMessage: toastMessage,
      };
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message || "Error connecting to the universe...";
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

    // Strict Reset
    resetState(selectedTheme);

    // Set processing state BEFORE navigation so InitializingPage sees it
    setGameState((prev) => ({ ...prev, isProcessing: true }));

    navigate("/initializing");
    try {
      const { outline, log } = await generateStoryOutline(
        selectedTheme,
        LANG_MAP[language],
        customContext,
        t,
        onStream,
      );
      setGameState((prev) => ({
        ...prev,
        outline,
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
        logs: [log, ...prev.logs],
        totalTokens: prev.totalTokens + (log.usage?.totalTokens || 0),
        generateImage: false,
        summaries: [],
        theme: selectedTheme, // Static Theme
        atmosphere: outline.initialAtmosphere || "quiet", // Initial atmosphere
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

  const switchSlot = async (id: string) => {
    navigate("/initializing");
    // Ensure audio is preloaded
    await preloadAudio();

    if (await loadSlot(id)) {
      // Allow state to propagate
      setTimeout(() => navigate("/game"), 0);
    }
  };

  const navigateToNode = (nodeId: string) => {
    setGameState((prev) => {
      const targetNode = prev.nodes[nodeId];
      let newState = { ...prev, activeNodeId: nodeId };

      if (targetNode && targetNode.stateSnapshot) {
        // Restore state from snapshot
        newState = restoreStateFromSnapshot(newState, targetNode.stateSnapshot);
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
          .filter(
            (r: any) =>
              r.visible?.relationshipType !== "Absent" &&
              r.visible?.relationshipType !== "Dead",
          )
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
  };
};
