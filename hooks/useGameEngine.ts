
import { useState, useEffect, useMemo, useRef } from 'react';
import { AISettings, StorySegment, LanguageCode } from '../types';
import { useGameState } from './useGameState';
import { useGamePersistence } from './useGamePersistence';
import {
  generateAdventureTurn,
  generateSceneImage,
  updateAIConfig,
  generateStoryOutline,
  summarizeContext
} from '../services/geminiService';
import { THEMES, LANG_MAP, DEFAULTS, TRANSLATIONS } from '../utils/constants';

// Helper: Traverse tree
const deriveHistory = (nodes: Record<string, StorySegment>, leafId: string | null): StorySegment[] => {
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
  const [view, setView] = useState<'start' | 'initializing' | 'game'>('start');
  const { saveSlots, currentSlotId, setCurrentSlotId, createSaveSlot, loadSlot, deleteSlot, isAutoSaving } = useGamePersistence(gameState, setGameState, view);

  // Ref to access latest state in async callbacks/closures
  const gameStateRef = useRef(gameState);
  useEffect(() => {
      gameStateRef.current = gameState;
  }, [gameState]);

  const [isTranslating, setIsTranslating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>(DEFAULTS);
  const [isMagicMirrorOpen, setIsMagicMirrorOpen] = useState(false);
  const [magicMirrorImage, setMagicMirrorImage] = useState<string | null>(null);

  // Derived Language State
  const language = aiSettings.language;

  const setLanguage = (lang: LanguageCode) => {
      const newSettings = { ...aiSettings, language: lang };
      setAiSettings(newSettings);
      updateAIConfig(newSettings);
      localStorage.setItem('chronicles_aisettings', JSON.stringify(newSettings));
  };

  const currentHistory = useMemo(() => deriveHistory(gameState.nodes, gameState.activeNodeId), [gameState.nodes, gameState.activeNodeId]);

  // Theme Application
  useEffect(() => {
    const root = document.documentElement;
    const themeConfig = THEMES[gameState.theme] || THEMES.fantasy;
    Object.entries(themeConfig.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [gameState.theme]);

  // Init Settings
  useEffect(() => {
    const savedSettingsStr = localStorage.getItem('chronicles_aisettings');
    if (savedSettingsStr) {
       try {
         const parsed = JSON.parse(savedSettingsStr);

         // Deep merge with DEFAULTS to ensure new keys (like 'translation', 'lore') exist
         const mergedSettings: AISettings = {
            ...DEFAULTS,
            ...parsed,
            gemini: { ...DEFAULTS.gemini, ...(parsed.gemini || {}) },
            openai: { ...DEFAULTS.openai, ...(parsed.openai || {}) },
            story: { ...DEFAULTS.story, ...(parsed.story || {}) },
            image: { ...DEFAULTS.image, ...(parsed.image || {}) },
            video: { ...DEFAULTS.video, ...(parsed.video || {}) },
            audio: { ...DEFAULTS.audio, ...(parsed.audio || {}) },
            translation: { ...DEFAULTS.translation, ...(parsed.translation || {}) },
            lore: { ...DEFAULTS.lore, ...(parsed.lore || {}) },
         };

         if (!mergedSettings.contextLen) mergedSettings.contextLen = 16;
         if (!mergedSettings.language) mergedSettings.language = 'en';

         setAiSettings(mergedSettings);
         updateAIConfig(mergedSettings);
       } catch (e) {
         console.error("Failed to load settings", e);
         updateAIConfig(DEFAULTS);
       }
    } else {
      updateAIConfig(DEFAULTS);
    }
  }, []);

  const handleSaveSettings = (newSettings: AISettings) => {
    setAiSettings(newSettings);
    updateAIConfig(newSettings);
    localStorage.setItem('chronicles_aisettings', JSON.stringify(newSettings));
  };

  // --- Core Game Loop ---

  const handleAction = async (action: string, isInit: boolean = false, forceTheme?: string) => {
    if (gameStateRef.current.isProcessing || isTranslating) return null; // Return null instead of void for toast handling

    const newSegmentId = Date.now().toString();
    const userNodeId = `user-${newSegmentId}`;
    const parentId = isInit ? null : gameStateRef.current.activeNodeId;

    if (!isInit) {
      setGameState(prev => ({
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
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } // User msgs have no token cost locally
            }
        },
        activeNodeId: userNodeId
      }));
    } else {
      setGameState(prev => ({ ...prev, isProcessing: true, error: null }));
    }

    try {
      // Summarization Logic
      let contextNodes = deriveHistory(gameStateRef.current.nodes, parentId);
      if (!isInit) contextNodes.push({ id: userNodeId, parentId, text: action, choices: [], imagePrompt: "", role: "user", timestamp: Date.now() } as any);

      const limit = aiSettings.contextLen || 16;
      let effectiveSummary = gameStateRef.current.accumulatedSummary;
      let segmentsToSend = contextNodes;
      let summarySnapshot = "";

      if (contextNodes.length > limit) {
         const overflowCount = contextNodes.length - limit;
         if (overflowCount >= 4) {
             const toSummarize = contextNodes.slice(0, overflowCount);
             const textBlock = toSummarize.map(s => `${s.role}: ${s.text}`).join("\n");

             // Call Summary Service
             const sumResult = await summarizeContext(textBlock, LANG_MAP[language]);

             effectiveSummary = effectiveSummary
                 ? `${effectiveSummary}\n[Later]: ${sumResult.summary}`
                 : sumResult.summary;

             segmentsToSend = contextNodes.slice(overflowCount);
             summarySnapshot = sumResult.summary;

             // Log the summary action
             setGameState(prev => ({
                ...prev,
                logs: [sumResult.log, ...prev.logs].slice(0, 50), // Keep last 50 logs
                totalTokens: prev.totalTokens + (sumResult.log.usage?.totalTokens || 0)
             }));
         }
      }

      // Generate Turn
      const { response, log, usage } = await generateAdventureTurn(
          segmentsToSend,
          effectiveSummary,
          gameStateRef.current.outline,
          action,
          LANG_MAP[language],
          gameStateRef.current.theme // Pass the theme key
      );

      // Sanitize choices to ensure strict string array
      const sanitizedChoices = Array.isArray(response.choices)
          ? response.choices.map(c => {
              if (typeof c === 'object' && c !== null) {
                  return (c as any).choice || (c as any).text || (c as any).label || JSON.stringify(c);
              }
              return String(c);
          })
          : [];

      const modelNodeId = `model-${newSegmentId}`;
      const modelNode: StorySegment = {
        id: modelNodeId,
        parentId: isInit ? null : userNodeId,
        text: response.narrative || "...",
        choices: sanitizedChoices,
        imagePrompt: response.imagePrompt || "",
        role: "model",
        timestamp: Date.now(),
        summarySnapshot: summarySnapshot || undefined,
        usage: usage
      };

      // Determine Toast Message based on state changes
      let toastMessage = "";
      const t = TRANSLATIONS[language];
      // Process Deltas
      let newInventory = [...(gameStateRef.current.inventory || [])];
      if (response.inventoryActions) {
          response.inventoryActions.forEach(act => {
              if (act.action === 'add') {
                  // Check if exists by ID or Name to avoid dupes
                  const exists = newInventory.some(i => i.name === act.item);
                  if (!exists) {
                      newInventory.push({
                          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                          name: act.item,
                          description: act.description || "A mysterious item.",
                          lore: act.lore,
                          isMystery: act.isMystery
                      });
                  }
              }
              if (act.action === 'remove') {
                  newInventory = newInventory.filter(i => i.name !== act.item);
              }
              if (act.action === 'update') {
                  const idx = newInventory.findIndex(i => i.name === act.item);
                  if (idx !== -1) {
                      if (act.newItem) newInventory[idx].name = act.newItem;
                      if (act.description) newInventory[idx].description = act.description;
                      if (act.lore) newInventory[idx].lore = act.lore;
                      if (act.isMystery !== undefined) newInventory[idx].isMystery = act.isMystery;
                  }
              }
          });
      }

      let newRels = [...(gameStateRef.current.relationships || [])];
      if (response.relationshipActions) {
          response.relationshipActions.forEach(act => {
              const idx = newRels.findIndex(r => r.name === act.name);
              if (act.action === 'add' && idx === -1) {
                  newRels.push({
                      name: act.name,
                      description: act.description || "Unknown",
                      status: act.status || "Neutral",
                      affinity: act.affinity || 50,
                      affinityKnown: act.affinityKnown ?? true
                  });
              } else if (act.action === 'remove' && idx !== -1) {
                  newRels.splice(idx, 1);
              } else if ((act.action === 'update' || act.action === 'add') && idx !== -1) { // Allow 'add' to update if exists
                  if (act.description) newRels[idx].description = act.description;
                  if (act.status) newRels[idx].status = act.status;
                  if (act.affinity !== undefined) newRels[idx].affinity = act.affinity;
                  if (act.affinityKnown !== undefined) newRels[idx].affinityKnown = act.affinityKnown;
              }
          });
      }

      let newQuests = [...(gameStateRef.current.quests || [])];
      if (response.questActions) {
          response.questActions.forEach(act => {
              const idx = newQuests.findIndex(q => q.id === act.id);
              if (act.action === 'add' && idx === -1) {
                  newQuests.push({
                      id: act.id,
                      title: act.title || "Unknown Quest",
                      description: act.description || "",
                      type: act.type || 'main',
                      status: 'active'
                  });
              } else if (idx !== -1) {
                  if (act.action === 'update') {
                      if (act.title) newQuests[idx].title = act.title;
                      if (act.description) newQuests[idx].description = act.description;
                  } else if (act.action === 'complete') {
                      newQuests[idx].status = 'completed';
                  } else if (act.action === 'fail') {
                      newQuests[idx].status = 'failed';
                  }
              }
          });
      }

      let newKnownLocations = [...(gameStateRef.current.knownLocations || [])];
      let newCurrentLocation = gameStateRef.current.currentLocation;
      let newLocations = [...(gameStateRef.current.locations || [])];

      if (response.locationActions) {
          response.locationActions.forEach(act => {
              if (act.type === 'current' && act.action === 'update') newCurrentLocation = act.name;
              if (act.type === 'known' && act.action === 'add' && !newKnownLocations.includes(act.name)) newKnownLocations.push(act.name);

              // Rich Location Update
              const locIdx = newLocations.findIndex(l => l.name === act.name);
              if (locIdx === -1) {
                  if (act.description) {
                      newLocations.push({
                          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                          name: act.name,
                          description: act.description,
                          lore: act.lore,
                          isVisited: act.type === 'current'
                      });
                  }
              } else {
                  if (act.description) newLocations[locIdx].description = act.description;
                  if (act.lore) newLocations[locIdx].lore = act.lore;
                  if (act.type === 'current') newLocations[locIdx].isVisited = true;
              }
          });
      }

      let newCharacter = { ...gameStateRef.current.character };
      if (response.characterActions) {
          response.characterActions.forEach(act => {
              if (act.target === 'status' && act.action === 'update') {
                   newCharacter.status = (act.value as string) || (act.strValue as string) || newCharacter.status;
              }
              if (act.target === 'attribute') {
                  const idx = newCharacter.attributes.findIndex(a => a.label === act.name);
                  if (act.action === 'add' && idx === -1) {
                      newCharacter.attributes.push({
                          label: act.name,
                          value: (act.value as number) || (act.intValue as number) || 0,
                          maxValue: act.maxValue || 100,
                          color: (act.color as any) || 'gray'
                      });
                  } else if (act.action === 'remove' && idx !== -1) {
                      newCharacter.attributes.splice(idx, 1);
                  } else if (act.action === 'update' && idx !== -1) {
                      const val = (act.value !== undefined ? act.value : act.intValue);
                      if (val !== undefined) newCharacter.attributes[idx].value = Number(val);
                      if (act.maxValue) newCharacter.attributes[idx].maxValue = act.maxValue;
                  }
              }
              if (act.target === 'skill') {
                  const idx = newCharacter.skills.findIndex(s => s.name === act.name);
                  if (act.action === 'add' && idx === -1) {
                      newCharacter.skills.push({
                          name: act.name,
                          level: (act.value as string) || (act.strValue as string) || "Novice",
                          description: act.description
                      });
                  } else if (act.action === 'remove' && idx !== -1) {
                      newCharacter.skills.splice(idx, 1);
                  } else if (act.action === 'update' && idx !== -1) {
                      const val = (act.value as string) || (act.strValue as string);
                      if (val) newCharacter.skills[idx].level = val;
                      if (act.description) newCharacter.skills[idx].description = act.description;
                  }
              }
          });
      }



      // Determine Toast Message based on ACTIONS
      if (response.inventoryActions?.some(a => a.action === 'add')) {
         toastMessage = t.toast.itemAdded;
      } else if (response.relationshipActions?.some(a => a.action === 'add')) {
         toastMessage = t.toast.charMet;
      } else if (response.questActions?.some(a => a.action === 'add' || a.action === 'complete')) {
         toastMessage = t.toast.questUpd;
      }

      // Update State with Response
      setGameState(prev => ({
        ...prev,
        nodes: {
            ...prev.nodes,
            [modelNodeId]: modelNode
        },
        activeNodeId: modelNodeId,
        rootNodeId: prev.rootNodeId || (isInit ? modelNodeId : prev.rootNodeId),
        inventory: newInventory,
        relationships: newRels,
        quests: newQuests,
        currentQuest: newQuests.find(q => q.status === 'active' && q.type === 'main')?.title || prev.currentQuest, // Fallback sync
        currentLocation: newCurrentLocation,
        knownLocations: newKnownLocations,
        locations: newLocations,
        character: newCharacter,
        accumulatedSummary: effectiveSummary,
        isProcessing: false,
        isImageGenerating: true,
        theme: response.theme || forceTheme || prev.theme,
        logs: [log, ...prev.logs].slice(0, 50),
        totalTokens: prev.totalTokens + usage.totalTokens
      }));

      // Async Image Gen
      if (response.imagePrompt) {
        generateSceneImage(response.imagePrompt).then(({ url, log }) => {
            setGameState(prev => ({
              ...prev,
              isImageGenerating: false,
              logs: [log, ...prev.logs].slice(0, 50),
              totalTokens: prev.totalTokens + (log.usage?.totalTokens || 0),
              nodes: url ? { ...prev.nodes, [modelNodeId]: { ...prev.nodes[modelNodeId], imageUrl: url } } : prev.nodes
            }));
        });
      } else {
         setGameState(prev => ({ ...prev, isImageGenerating: false }));
      }

      return toastMessage;

    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message || "Error connecting to the universe...";
      setGameState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMsg,
      }));
      return `Error: ${errorMsg}`;
    }
  };

  const startNewGame = async (initialTheme?: string, customContext?: string) => {
    let selectedTheme = initialTheme || Object.keys(THEMES)[Math.floor(Math.random() * Object.keys(THEMES).length)];
    const slotId = createSaveSlot(selectedTheme);
    setCurrentSlotId(slotId);

    // Strict Reset
    resetState(selectedTheme);

    setView('initializing');
    try {
       const { outline, log } = await generateStoryOutline(selectedTheme, LANG_MAP[language], customContext);
       setGameState(prev => ({
          ...prev,
          outline,
          character: outline.character,
          quests: [{
              id: 'main_quest_init',
              title: outline.mainGoal || "Survive and explore.",
              description: outline.premise,
              type: 'main',
              status: 'active'
          }],
          currentQuest: outline.mainGoal || "Survive and explore.",
          currentLocation: outline.locations?.[0] || "Unknown",
          knownLocations: outline.locations || [],
          locations: [],
          isProcessing: false,
          logs: [log, ...prev.logs],
          totalTokens: prev.totalTokens + (log.usage?.totalTokens || 0)
       }));
       setView('game');

       // Safety timeout to ensure we don't get stuck in processing state
       const safetyTimer = setTimeout(() => {
           setGameState(prev => {
               if (prev.isProcessing) {
                   return { ...prev, isProcessing: false, error: "The narrator seems to have drifted off..." };
               }
               return prev;
           });
       }, 20000); // 20s timeout

       setTimeout(() => {
           handleAction(`Begin the ${selectedTheme} story. ${customContext ? `Context: ${customContext}` : ''}`, true, selectedTheme)
             .finally(() => clearTimeout(safetyTimer));
       }, 100);
    } catch (e) {
       console.error("Init failed", e);
       setGameState(prev => ({ ...prev, error: "Init Failed", isProcessing: false }));
       setView('start');
    }
  };

  const switchSlot = (id: string) => {
      if (loadSlot(id)) setView('game');
  };

  const navigateToNode = (nodeId: string) => {
      setGameState(prev => ({ ...prev, activeNodeId: nodeId }));
  };

  const generateImageForNode = async (nodeId: string) => {
      const node = gameStateRef.current.nodes[nodeId];
      if (!node || !node.imagePrompt) return;

      setGameState(prev => ({ ...prev, isImageGenerating: true }));
      try {
          const { url, log } = await generateSceneImage(node.imagePrompt);
          setGameState(prev => ({
              ...prev,
              isImageGenerating: false,
              logs: [log, ...prev.logs].slice(0, 50),
              totalTokens: prev.totalTokens + (log.usage?.totalTokens || 0),
              nodes: {
                  ...prev.nodes,
                  [nodeId]: { ...prev.nodes[nodeId], imageUrl: url }
              }
          }));
      } catch (e) {
          console.error("Failed to generate image", e);
          setGameState(prev => ({ ...prev, isImageGenerating: false }));
      }
  };

  return {
    view, setView,
    language, setLanguage,
    isTranslating,
    gameState, setGameState,
    handleAction,
    startNewGame,
    isAutoSaving,
    isMagicMirrorOpen, setIsMagicMirrorOpen,
    magicMirrorImage, setMagicMirrorImage,
    isSettingsOpen, setIsSettingsOpen,
    aiSettings, handleSaveSettings,
    currentHistory,
    saveSlots, switchSlot, deleteSlot,
    currentSlotId,
    navigateToNode,
    generateImageForNode
  };
};