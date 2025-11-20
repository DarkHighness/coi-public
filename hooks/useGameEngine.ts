
import { useState, useEffect, useMemo } from 'react';
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

  const [language, setLanguage] = useState<LanguageCode>('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>(DEFAULTS);
  const [isMagicMirrorOpen, setIsMagicMirrorOpen] = useState(false);
  const [magicMirrorImage, setMagicMirrorImage] = useState<string | null>(null);

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

         setAiSettings(mergedSettings);
         updateAIConfig(mergedSettings);
       } catch (e) {
         console.error("Failed to load settings", e);
         updateAIConfig(DEFAULTS);
       }
    } else {
      updateAIConfig(DEFAULTS);
    }
    const savedLang = localStorage.getItem('chronicles_language');
    if (savedLang) setLanguage(savedLang as LanguageCode);
  }, []);

  useEffect(() => localStorage.setItem('chronicles_language', language), [language]);

  const handleSaveSettings = (newSettings: AISettings) => {
    setAiSettings(newSettings);
    updateAIConfig(newSettings);
    localStorage.setItem('chronicles_aisettings', JSON.stringify(newSettings));
  };

  // --- Core Game Loop ---

  const handleAction = async (action: string, isInit: boolean = false, forceTheme?: string) => {
    if (gameState.isProcessing || isTranslating) return null; // Return null instead of void for toast handling

    const newSegmentId = Date.now().toString();
    const userNodeId = `user-${newSegmentId}`;
    const parentId = isInit ? null : gameState.activeNodeId;

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
      let contextNodes = deriveHistory(gameState.nodes, parentId);
      if (!isInit) contextNodes.push({ id: userNodeId, parentId, text: action, choices: [], imagePrompt: "", role: "user", timestamp: Date.now() } as any);

      const limit = aiSettings.contextLen || 16;
      let effectiveSummary = gameState.accumulatedSummary;
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
          gameState.outline,
          action,
          LANG_MAP[language],
          THEMES[gameState.theme]?.narrativeStyle // Pass the style
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
      const prevInventory = gameState.inventory || [];
      const newInventory = response.inventory || [];
      const prevRels = gameState.relationships || [];
      const newRels = response.relationships || [];

      if (newInventory.length > prevInventory.length) {
         toastMessage = t.toast.itemAdded;
      } else if (newRels.length > prevRels.length) {
         toastMessage = t.toast.charMet;
      } else if (gameState.currentQuest && response.currentQuest && gameState.currentQuest !== response.currentQuest) {
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
        currentQuest: response.currentQuest || prev.currentQuest,
        currentLocation: response.currentLocation || prev.currentLocation,
        knownLocations: response.knownLocations || prev.knownLocations || [],
        character: response.character ? { ...response.character, attributes: response.character.attributes||[], skills: response.character.skills||[] } : prev.character,
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
          currentQuest: outline.mainGoal,
          currentLocation: outline.locations?.[0] || "Unknown",
          knownLocations: outline.locations || [],
          isProcessing: false,
          logs: [log, ...prev.logs],
          totalTokens: prev.totalTokens + (log.usage?.totalTokens || 0)
       }));
       setView('game');
       setTimeout(() => handleAction(`Begin the ${selectedTheme} story. ${customContext ? `Context: ${customContext}` : ''}`, true, selectedTheme), 100);
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
    navigateToNode
  };
};