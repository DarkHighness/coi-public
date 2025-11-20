
import { useState, useEffect } from 'react';
import { GameState, SaveSlot } from '../types';

export const useGamePersistence = (
  gameState: GameState, 
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  view: string
) => {
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Load Slots on Mount
  useEffect(() => {
    const slotsStr = localStorage.getItem('chronicles_meta_slots');
    if (slotsStr) {
      try {
        setSaveSlots(JSON.parse(slotsStr));
      } catch(e) {}
    }
  }, []);

  // Auto-Save Logic
  useEffect(() => {
    if (view === 'game' && currentSlotId && gameState.rootNodeId) {
      // Debounce could be added here, but for now simple effect
      localStorage.setItem(`chronicles_save_${currentSlotId}`, JSON.stringify(gameState));
      
      // Update Slot Meta
      const summaryText = gameState.activeNodeId && gameState.nodes[gameState.activeNodeId] 
         ? gameState.nodes[gameState.activeNodeId].text.substring(0, 60) + "..." 
         : "In Progress";
         
      const updatedSlots = saveSlots.map(s => 
         s.id === currentSlotId 
         ? { ...s, timestamp: Date.now(), theme: gameState.theme, summary: summaryText } 
         : s
      );
      
      // Only update if changed to avoid loops
      if (JSON.stringify(updatedSlots) !== JSON.stringify(saveSlots)) {
          setSaveSlots(updatedSlots);
          localStorage.setItem('chronicles_meta_slots', JSON.stringify(updatedSlots));
      }

      setIsAutoSaving(true);
      const timer = setTimeout(() => setIsAutoSaving(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState, currentSlotId, view]);

  const createSaveSlot = (theme: string) => {
     const id = Date.now().toString();
     const newSlot: SaveSlot = {
         id,
         name: `Chronicle ${saveSlots.length + 1}`,
         timestamp: Date.now(),
         theme,
         summary: "New Game"
     };
     const newSlots = [...saveSlots, newSlot];
     setSaveSlots(newSlots);
     localStorage.setItem('chronicles_meta_slots', JSON.stringify(newSlots));
     return id;
  };

  const loadSlot = (id: string) => {
     const data = localStorage.getItem(`chronicles_save_${id}`);
     if (data) {
         const parsed = JSON.parse(data);
         // Migrations
         if (!parsed.logs) parsed.logs = [];
         if (!parsed.totalTokens) parsed.totalTokens = 0;
         
         setGameState(parsed);
         setCurrentSlotId(id);
         return true;
     }
     return false;
  };

  const deleteSlot = (id: string) => {
      const newSlots = saveSlots.filter(s => s.id !== id);
      setSaveSlots(newSlots);
      localStorage.setItem('chronicles_meta_slots', JSON.stringify(newSlots));
      localStorage.removeItem(`chronicles_save_${id}`);
      if (currentSlotId === id) {
          setCurrentSlotId(null);
      }
  };

  return {
    saveSlots,
    currentSlotId,
    setCurrentSlotId,
    createSaveSlot,
    loadSlot,
    deleteSlot,
    isAutoSaving
  };
};