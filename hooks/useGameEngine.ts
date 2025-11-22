import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AISettings, StorySegment, LanguageCode } from "../types";
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
  } = useGamePersistence(gameState, setGameState, view);

  // Ref to access latest state in async callbacks/closures
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
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
    const envThemeKey = gameState.envTheme || storyTheme.defaultEnvTheme;
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
    if ((gameStateRef.current.isProcessing && !isInit) || isTranslating)
      return null; // Return null instead of void for toast handling

    const newSegmentId = Date.now().toString();
    const userNodeId = `user-${newSegmentId}`;
    const parentId = isInit ? null : gameStateRef.current.activeNodeId;

    // --- Fork-Safe Summary Retrieval ---
    let baseSummaries: string[] = [];
    let baseIndex = 0;

    if (parentId && gameStateRef.current.nodes[parentId]) {
      const pNode = gameStateRef.current.nodes[parentId];
      baseSummaries = pNode.summaries || [];
      baseIndex = pNode.summarizedIndex || 0;
    }
    // -----------------------------------

    if (!isInit) {
      setGameState((prev) => ({
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
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, // User msgs have no token cost locally
            summaries: baseSummaries,
            summarizedIndex: baseIndex,
          },
        },
        activeNodeId: userNodeId,
      }));
    } else {
      setGameState((prev) => ({ ...prev, isProcessing: true, error: null }));
    }

    try {
      // Summarization Logic
      let contextNodes = deriveHistory(gameStateRef.current.nodes, parentId);

      // Create temp user node for context calculation
      const tempUserNode: StorySegment = {
        id: userNodeId,
        parentId,
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
      // Use contextLen as the step to avoid too frequent summarization
      const summaryStep = limit;

      let effectiveSummaries = [...baseSummaries];
      let lastIndex = baseIndex;
      let summarySnapshot = "";

      // Calculate range to summarize: from lastIndex to (total - limit)
      // We keep 'limit' messages as fresh context
      const totalLength = contextNodes.length;
      const keepFresh = 4; // Keep last 2 turns fresh
      const summarizeEnd = Math.max(lastIndex, totalLength - keepFresh);
      const nodesToSummarizeCount = summarizeEnd - lastIndex;

      // Only summarize if we have enough new nodes AND we are advancing (not regressing)
      if (nodesToSummarizeCount >= summaryStep && summarizeEnd > lastIndex) {
        const toSummarize = contextNodes.slice(lastIndex, summarizeEnd);
        const textBlock = toSummarize
          .map((s) => `${s.role}: ${s.text}`)
          .join("\n");
        const previousSummary =
          effectiveSummaries.length > 0
            ? effectiveSummaries[effectiveSummaries.length - 1]
            : "";

        // Call Summary Service
        const sumResult = await summarizeContext(
          previousSummary,
          textBlock,
          LANG_MAP[language],
        );

        effectiveSummaries.push(sumResult.summary);
        summarySnapshot = sumResult.summary;
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
            [userNodeId]: {
              ...prev.nodes[userNodeId],
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

      // Generate Turn
      const { response, log, usage } = await generateAdventureTurn({
        recentHistory: segmentsToSend,
        summaries: effectiveSummaries,
        outline: gameStateRef.current.outline,
        inventory: gameStateRef.current.inventory,
        relationships: gameStateRef.current.relationships,
        quests: gameStateRef.current.quests,
        locations: gameStateRef.current.locations,
        currentLocationId: gameStateRef.current.currentLocation,
        character: gameStateRef.current.character,
        knowledge: gameStateRef.current.knowledge, // Pass knowledge to AI
        userAction: action,
        language: LANG_MAP[language],
        themeKey: gameStateRef.current.theme, // Pass the static theme key
        tFunc: t, // Pass translation function
        time: gameStateRef.current.time, // Pass current time
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

      // Determine Toast Message based on state changes
      let toastMessage = "";
      // Process Deltas
      let newInventory = [...(gameStateRef.current.inventory || [])];
      if (response.inventoryActions) {
        response.inventoryActions.forEach((act) => {
          if (act.action === "add") {
            // Check if exists by ID or Name to avoid dupes
            const exists = newInventory.some((i) => i.name === act.item);
            if (!exists) {
              newInventory.push({
                id:
                  Date.now().toString() +
                  Math.random().toString(36).substr(2, 5),
                name: act.item,
                description: act.description || "A mysterious item.",
                lore: act.lore,
                isMystery: act.isMystery,
              });
            }
          }
          if (act.action === "remove") {
            newInventory = newInventory.filter((i) => i.name !== act.item);
          }
          if (act.action === "update") {
            const idx = newInventory.findIndex((i) => i.name === act.item);
            if (idx !== -1) {
              if (act.newItem) newInventory[idx].name = act.newItem;
              if (act.description)
                newInventory[idx].description = act.description;
              if (act.lore) newInventory[idx].lore = act.lore;
              if (act.isMystery !== undefined)
                newInventory[idx].isMystery = act.isMystery;
            } else {
              console.warn(
                `[handleAction] Inventory update failed: item "${act.item}" not found`,
              );
            }
          }
        });
      }

      let newRels = [...(gameStateRef.current.relationships || [])];
      if (response.relationshipActions) {
        response.relationshipActions.forEach((act) => {
          const idx = newRels.findIndex((r) => r.name === act.name);
          if (act.action === "add" && idx === -1) {
            newRels.push({
              name: act.name,
              description: act.description || "Unknown",
              status: act.status || "Neutral",
              affinity: act.affinity || 50,
              affinityKnown: act.affinityKnown ?? true,
              appearance: act.appearance,
              personality: act.personality,
              notes: act.notes,
            });
          } else if (act.action === "remove" && idx !== -1) {
            newRels.splice(idx, 1);
          } else if (
            (act.action === "update" || act.action === "add") &&
            idx !== -1
          ) {
            // Allow 'add' to update if exists
            if (act.description) newRels[idx].description = act.description;
            if (act.status) newRels[idx].status = act.status;
            if (act.affinity !== undefined)
              newRels[idx].affinity = act.affinity;
            if (act.affinityKnown !== undefined)
              newRels[idx].affinityKnown = act.affinityKnown;
            if (act.appearance) newRels[idx].appearance = act.appearance;
            if (act.personality) newRels[idx].personality = act.personality;
            if (act.notes) newRels[idx].notes = act.notes;
          } else if (act.action === "update" && idx === -1) {
            console.warn(
              `[handleAction] Relationship update failed: "${act.name}" not found`,
            );
          }
        });
      }

      let newQuests = [...(gameStateRef.current.quests || [])];
      if (response.questActions) {
        response.questActions.forEach((act) => {
          const idx = newQuests.findIndex((q) => q.id === act.id);
          if (act.action === "add" && idx === -1) {
            newQuests.push({
              id: act.id,
              title: act.title || "Unknown Quest",
              description: act.description || "",
              type: act.type || "main",
              status: "active",
            });
          } else if (idx !== -1) {
            if (act.action === "update") {
              if (act.title) newQuests[idx].title = act.title;
              if (act.description) newQuests[idx].description = act.description;
            } else if (act.action === "complete") {
              newQuests[idx].status = "completed";
            } else if (act.action === "fail") {
              newQuests[idx].status = "failed";
            }
          } else if (act.action !== "add") {
            console.warn(
              `[handleAction] Quest action "${act.action}" failed: quest "${act.id}" not found`,
            );
          }
        });
      }

      let newKnownLocations = [...(gameStateRef.current.knownLocations || [])];
      let newCurrentLocation = gameStateRef.current.currentLocation;
      let newLocations = [...(gameStateRef.current.locations || [])];

      if (response.locationActions) {
        response.locationActions.forEach((act) => {
          if (act.type === "current" && act.action === "update")
            newCurrentLocation = act.name;
          if (
            act.type === "known" &&
            act.action === "add" &&
            !newKnownLocations.includes(act.name)
          )
            newKnownLocations.push(act.name);

          // Rich Location Update
          const locIdx = newLocations.findIndex((l) => l.name === act.name);
          if (locIdx === -1) {
            if (act.description) {
              newLocations.push({
                id:
                  Date.now().toString() +
                  Math.random().toString(36).substr(2, 5),
                name: act.name,
                description: act.description,
                lore: act.lore,
                isVisited: act.type === "current",
                environment: act.environment,
                notes: act.notes,
              });
            }
          } else {
            if (act.description)
              newLocations[locIdx].description = act.description;
            if (act.lore) newLocations[locIdx].lore = act.lore;
            if (act.type === "current") newLocations[locIdx].isVisited = true;
            if (act.environment)
              newLocations[locIdx].environment = act.environment;
            if (act.notes) newLocations[locIdx].notes = act.notes;
          }
        });
      }

      let newCharacter = { ...gameStateRef.current.character };
      if (response.characterActions) {
        response.characterActions.forEach((act) => {
          if (act.target === "status" && act.action === "update") {
            newCharacter.status =
              (act.value as string) ||
              (act.strValue as string) ||
              newCharacter.status;
          }
          if (act.target === "appearance" && act.action === "update") {
            newCharacter.appearance =
              (act.value as string) ||
              (act.strValue as string) ||
              newCharacter.appearance;
          }
          if (act.target === "profession" && act.action === "update") {
            newCharacter.profession =
              (act.value as string) || (act.strValue as string);
          }
          if (act.target === "background" && act.action === "update") {
            newCharacter.background =
              (act.value as string) || (act.strValue as string);
          }
          if (act.target === "race" && act.action === "update") {
            newCharacter.race =
              (act.value as string) || (act.strValue as string);
          }
          if (act.target === "attribute") {
            const idx = newCharacter.attributes.findIndex(
              (a) => a.label === act.name,
            );
            if (act.action === "add" && idx === -1) {
              newCharacter.attributes.push({
                label: act.name,
                value: (act.value as number) || (act.intValue as number) || 0,
                maxValue: act.maxValue || 100,
                color: (act.color as any) || "gray",
              });
            } else if (act.action === "remove" && idx !== -1) {
              newCharacter.attributes.splice(idx, 1);
            } else if (act.action === "update" && idx !== -1) {
              const val = act.value !== undefined ? act.value : act.intValue;
              if (val !== undefined)
                newCharacter.attributes[idx].value = Number(val);
              if (act.maxValue)
                newCharacter.attributes[idx].maxValue = act.maxValue;
            }
          }
          if (act.target === "skill") {
            const idx = newCharacter.skills.findIndex(
              (s) => s.name === act.name,
            );
            if (act.action === "add" && idx === -1) {
              newCharacter.skills.push({
                name: act.name,
                level:
                  (act.value as string) || (act.strValue as string) || "Novice",
                description: act.description,
              });
            } else if (act.action === "remove" && idx !== -1) {
              newCharacter.skills.splice(idx, 1);
            } else if (act.action === "update" && idx !== -1) {
              const val = (act.value as string) || (act.strValue as string);
              if (val) newCharacter.skills[idx].level = val;
              if (act.description)
                newCharacter.skills[idx].description = act.description;
            }
          }
        });
      }

      // Process Knowledge Actions (add/update only, no remove)
      let newKnowledge = [...(gameStateRef.current.knowledge || [])];
      if (response.knowledgeActions) {
        response.knowledgeActions.forEach((act) => {
          const idx = newKnowledge.findIndex((k) => k.title === act.title);
          if (act.action === "add" && idx === -1) {
            newKnowledge.push({
              id:
                Date.now().toString() + Math.random().toString(36).substr(2, 5),
              title: act.title,
              category: act.category || "other",
              description: act.description || "",
              details: act.details,
              discoveredAt: act.discoveredAt,
              relatedTo: act.relatedTo,
            });
          } else if (act.action === "update" && idx !== -1) {
            // Update existing knowledge
            if (act.description)
              newKnowledge[idx].description = act.description;
            if (act.details) newKnowledge[idx].details = act.details;
            if (act.category) newKnowledge[idx].category = act.category;
            if (act.discoveredAt)
              newKnowledge[idx].discoveredAt = act.discoveredAt;
            if (act.relatedTo) newKnowledge[idx].relatedTo = act.relatedTo;
          } else if (act.action === "update" && idx === -1) {
            console.warn(
              `[handleAction] Knowledge update failed: "${act.title}" not found`,
            );
          } else {
            console.warn(
              `[handleAction] Invalid knowledge action: "${act.action}" for "${act.title}"`,
            );
          }
        });
      }

      // Update Time
      const newTime =
        response.timeUpdate || gameStateRef.current.time || "unknown";

      const modelNode: StorySegment = {
        id: modelNodeId,
        parentId: isInit ? null : userNodeId,
        text: response.narrative || "...",
        choices: sanitizedChoices,
        imagePrompt: response.imagePrompt || "",
        role: "model",
        timestamp: Date.now(),
        summarySnapshot: summarySnapshot || undefined,
        usage: usage,
        // Inherit summary state from the user node (which was just updated)
        summaries: effectiveSummaries,
        summarizedIndex: lastIndex,
        environment: response.environment,
        narrativeTone: response.narrativeTone, // Save narrative tone
        imageSkipped: !response.generateImage, // Mark if image was intentionally skipped
        envTheme: gameState.envTheme, // Save current envTheme to the node
        stateSnapshot: {
          inventory: newInventory,
          relationships: newRels,
          quests: newQuests,
          character: newCharacter,
          knowledge: newKnowledge, // Preserve accumulated knowledge
          currentLocation: newCurrentLocation,
          knownLocations: newKnownLocations,
          locations: newLocations,
          currentQuest: newQuests.find(
            (q) => q.status === "active" && q.type === "main",
          )?.title,
          veoScript: gameStateRef.current.veoScript, // Preserve Veo script in snapshot
          uiState: gameStateRef.current.uiState, // Preserve UI customizations
          envTheme:
            response.envTheme || forceTheme || gameStateRef.current.envTheme, // Save dynamic theme
          time: newTime, // Save time in snapshot
          // Note: outline is NOT saved as it's immutable for the entire game
        },
      };

      // Determine Toast Message based on ACTIONS
      if (response.inventoryActions?.some((a) => a.action === "add")) {
        toastMessage = t("toast.itemAdded");
      } else if (
        response.relationshipActions?.some((a) => a.action === "add")
      ) {
        toastMessage = t("toast.charMet");
      } else if (
        response.questActions?.some(
          (a) => a.action === "add" || a.action === "complete",
        )
      ) {
        toastMessage = t("toast.questUpd");
      }

      // Update State with Response
      setGameState((prev) => ({
        ...prev,
        nodes: {
          ...prev.nodes,
          [modelNodeId]: modelNode,
        },
        activeNodeId: modelNodeId,
        rootNodeId: prev.rootNodeId || (isInit ? modelNodeId : prev.rootNodeId),
        inventory: newInventory,
        relationships: newRels,
        quests: newQuests,
        currentQuest:
          newQuests.find((q) => q.status === "active" && q.type === "main")
            ?.title || undefined, // Fallback sync
        currentLocation: newCurrentLocation,
        knownLocations: newKnownLocations,
        locations: newLocations,
        character: newCharacter,
        knowledge: newKnowledge, // Update knowledge state
        summaries: effectiveSummaries,
        isProcessing: false,
        isImageGenerating: true,
        generatingNodeId: modelNodeId,
        envTheme: response.envTheme || forceTheme || prev.envTheme,
        theme: prev.theme, // Keep static theme
        logs: [log, ...prev.logs].slice(0, 50),
        totalTokens: prev.totalTokens + usage.totalTokens,
        generateImage: response.generateImage,
        time: newTime, // Update global time
      }));

      // Async Image Gen with Timeout
      if (
        response.generateImage &&
        response.imagePrompt &&
        !aiSettings.manualImageGen
      ) {
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

        generateSceneImage(response.imagePrompt)
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

      return toastMessage;
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message || "Error connecting to the universe...";
      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        error: errorMsg,
      }));
      return `Error: ${errorMsg}`;
    }
  };

  const startNewGame = async (
    initialTheme?: string,
    customContext?: string,
  ) => {
    let selectedTheme =
      initialTheme ||
      Object.keys(THEMES)[
        Math.floor(Math.random() * Object.keys(THEMES).length)
      ];
    const slotId = createSaveSlot(selectedTheme);
    setCurrentSlotId(slotId);

    // Strict Reset
    resetState(selectedTheme);

    navigate("/initializing");
    try {
      const { outline, log } = await generateStoryOutline(
        selectedTheme,
        LANG_MAP[language],
        customContext,
        t,
      );
      setGameState((prev) => ({
        ...prev,
        outline,
        character: outline.character,
        inventory: (outline.inventory || []).map((item: any) => ({
          ...item,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        })),
        relationships: outline.relationships || [],
        quests: [
          {
            id: "main_quest_init",
            title: outline.mainGoal || "Survive and explore.",
            description: outline.premise,
            type: "main",
            status: "active",
          },
        ],
        currentQuest: outline.mainGoal || "Survive and explore.",
        currentLocation: outline.locations?.[0] || "Unknown",
        knownLocations: outline.locations || [],
        locations: [],
        isProcessing: true, // Keep processing true while generating first turn
        logs: [log, ...prev.logs],
        totalTokens: prev.totalTokens + (log.usage?.totalTokens || 0),
        generateImage: false,
        summaries: [],
        theme: selectedTheme, // Static Theme
        envTheme: selectedTheme, // Initial Env Theme
      }));

      // Navigate to game immediately after outline is ready
      navigate("/game");

      // Generate first turn in the game view
      setTimeout(async () => {
        try {
          const result = await handleAction(
            `Begin the ${selectedTheme} story. ${customContext ? `Context: ${customContext}` : ""}`,
            true,
            selectedTheme,
          );

          // handleAction returns:
          // - null or empty string "" on success
          // - "Error: ..." string on failure
          // If first turn fails, stay in game and allow retry via retry button
          // Don't delete the save since outline generation succeeded
          if (result && result.startsWith("Error:")) {
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
        newState = {
          ...newState,
          inventory: targetNode.stateSnapshot.inventory,
          relationships: targetNode.stateSnapshot.relationships,
          quests: targetNode.stateSnapshot.quests,
          character: targetNode.stateSnapshot.character,
          knowledge: targetNode.stateSnapshot.knowledge, // Restore accumulated knowledge
          currentLocation: targetNode.stateSnapshot.currentLocation,
          knownLocations: targetNode.stateSnapshot.knownLocations,
          locations: targetNode.stateSnapshot.locations,
          veoScript: targetNode.stateSnapshot.veoScript, // Restore Veo script from snapshot
          uiState: targetNode.stateSnapshot.uiState, // Restore UI customizations
          envTheme: targetNode.stateSnapshot.envTheme, // Restore dynamic theme
          // Note: outline is NOT restored as it's immutable for the entire game
        };
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
      node.imagePrompt.substring(0, 50) + "...",
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
      const { url, log } = await generateSceneImage(node.imagePrompt);
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
    switchSlot,
    deleteSlot,
    currentSlotId,
    navigateToNode,
    generateImageForNode,
    updateNodeAudio,
    themeMode,
    toggleThemeMode,
    setThemeMode: setThemeModeValue,
    resetSettings,
    clearAllSaves,
  };
};
