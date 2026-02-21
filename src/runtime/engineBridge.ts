import type { useRuntimeEngine } from "./useRuntimeEngine";
import type { RuntimeActions, RuntimeEngineActions } from "./state";
import type { RuntimeEngineBaseState } from "./builders";

export type RuntimeEngineSource = ReturnType<typeof useRuntimeEngine>;

type MutationBridgeActions = Pick<
  RuntimeActions,
  | "updateUiState"
  | "setViewedSegmentId"
  | "updateNodeMeta"
  | "setVeoScript"
  | "toggleGodMode"
  | "setUnlockMode"
  | "applyVfsMutation"
  | "applyVfsDerivedState"
>;

export type RuntimeEngineBridgeActions = RuntimeEngineActions &
  MutationBridgeActions;

export function buildRuntimeEngineBaseStateFromSource(
  engine: RuntimeEngineSource,
): RuntimeEngineBaseState {
  return {
    language: engine.language,
    gameState: engine.gameState,
    vfsSession: engine.vfsSession,
    isAutoSaving: engine.isAutoSaving,
    aiSettings: engine.aiSettings,
    currentHistory: engine.currentHistory,
    saveSlots: engine.saveSlots,
    currentSlotId: engine.currentSlotId,
    themeMode: engine.themeMode,
    persistenceError: engine.persistenceError,
    failedImageNodes: engine.failedImageNodes,
    isMagicMirrorOpen: engine.isMagicMirrorOpen,
    magicMirrorImage: engine.magicMirrorImage,
    isVeoScriptOpen: engine.isVeoScriptOpen,
    isSettingsOpen: engine.isSettingsOpen,
  };
}

export function buildRuntimeEngineActionsFromSource(
  engine: RuntimeEngineSource,
): RuntimeEngineBridgeActions {
  return {
    setLanguage: engine.setLanguage,
    handleAction: engine.handleAction,
    startNewGame: engine.startNewGame,
    resumeOutlineGeneration: engine.resumeOutlineGeneration,
    handleSaveSettings: engine.handleSaveSettings,
    loadSlot: engine.loadSlot,
    renameSlot: engine.renameSlot,
    deleteSlot: engine.deleteSlot,
    refreshSlots: engine.refreshSlots,
    toggleThemeMode: engine.toggleThemeMode,
    setThemeMode: engine.setThemeMode,
    resetSettings: engine.resetSettings,
    clearAllSaves: engine.clearAllSaves,
    hardReset: engine.hardReset,
    navigateToNode: engine.navigateToNode,
    generateImageForNode: engine.generateImageForNode,
    updateNodeAudio: engine.updateNodeAudio,
    clearHighlight: engine.clearHighlight,
    triggerSave: engine.triggerSave,
    handleForceUpdate: engine.handleForceUpdate,
    handlePlayerRate: engine.handlePlayerRate,
    cleanupEntities: engine.cleanupEntities,
    rebuildContext: engine.rebuildContext,
    invalidateSession: engine.invalidateSession,
    setIsMagicMirrorOpen: engine.setIsMagicMirrorOpen,
    setMagicMirrorImage: engine.setMagicMirrorImage,
    setIsVeoScriptOpen: engine.setIsVeoScriptOpen,
    setIsSettingsOpen: engine.setIsSettingsOpen,
    updateUiState: engine.updateUiState,
    setViewedSegmentId: engine.setViewedSegmentId,
    updateNodeMeta: engine.updateNodeMeta,
    setVeoScript: engine.setVeoScript,
    toggleGodMode: engine.toggleGodMode,
    setUnlockMode: engine.setUnlockMode,
    applyVfsMutation: engine.applyVfsMutation,
    applyVfsDerivedState: engine.applyVfsDerivedState,
  };
}
