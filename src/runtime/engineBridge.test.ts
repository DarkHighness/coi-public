import { describe, expect, it, vi } from "vitest";
import {
  buildRuntimeEngineActionsFromSource,
  buildRuntimeEngineBaseStateFromSource,
} from "./engineBridge";

function createEngineSource() {
  return {
    language: "en",
    isTranslating: false,
    gameState: { id: "game-1" },
    vfsSession: { id: "vfs-1" },
    isAutoSaving: false,
    aiSettings: { lockEnvTheme: false },
    currentHistory: [{ id: "n1" }],
    saveSlots: [{ id: "s1" }],
    currentSlotId: "s1",
    themeMode: "system",
    persistenceError: null,
    failedImageNodes: new Set<string>(),
    isMagicMirrorOpen: false,
    magicMirrorImage: null,
    isVeoScriptOpen: false,
    isSettingsOpen: false,

    setLanguage: vi.fn(),
    handleAction: vi.fn(),
    startNewGame: vi.fn(),
    resumeOutlineGeneration: vi.fn(),
    handleSaveSettings: vi.fn(),
    loadSlot: vi.fn(),
    renameSlot: vi.fn(async () => true),
    deleteSlot: vi.fn(),
    refreshSlots: vi.fn(),
    toggleThemeMode: vi.fn(),
    setThemeMode: vi.fn(),
    resetSettings: vi.fn(),
    clearAllSaves: vi.fn(),
    hardReset: vi.fn(),
    navigateToNode: vi.fn(),
    generateImageForNode: vi.fn(),
    updateNodeAudio: vi.fn(),
    clearHighlight: vi.fn(),
    triggerSave: vi.fn(),
    handleForceUpdate: vi.fn(),
    handlePlayerRate: vi.fn(async () => ({ success: true })),
    cleanupEntities: vi.fn(),
    rebuildContext: vi.fn(),
    invalidateSession: vi.fn(),
    setIsMagicMirrorOpen: vi.fn(),
    setMagicMirrorImage: vi.fn(),
    setIsVeoScriptOpen: vi.fn(),
    setIsSettingsOpen: vi.fn(),
    updateUiState: vi.fn(),
    setViewedSegmentId: vi.fn(),
    updateNodeMeta: vi.fn(),
    setVeoScript: vi.fn(),
    toggleGodMode: vi.fn(),
    setUnlockMode: vi.fn(),
    applyVfsMutation: vi.fn(),
    applyVfsDerivedState: vi.fn(),
  } as any;
}

describe("engineBridge", () => {
  it("maps runtime engine base state", () => {
    const source = createEngineSource();

    const baseState = buildRuntimeEngineBaseStateFromSource(source);

    expect(baseState.language).toBe("en");
    expect(baseState.currentSlotId).toBe("s1");
    expect(baseState.gameState).toBe(source.gameState);
    expect(baseState.vfsSession).toBe(source.vfsSession);
  });

  it("maps runtime engine actions preserving function references", () => {
    const source = createEngineSource();

    const actions = buildRuntimeEngineActionsFromSource(source);

    expect(actions.startNewGame).toBe(source.startNewGame);
    expect(actions.renameSlot).toBe(source.renameSlot);
    expect(actions.updateUiState).toBe(source.updateUiState);
    expect(actions.applyVfsDerivedState).toBe(source.applyVfsDerivedState);
  });
});
