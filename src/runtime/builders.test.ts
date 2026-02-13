import { describe, expect, it } from "vitest";
import { ENV_THEMES } from "../utils/constants";
import {
  buildRuntimeEngineState,
  buildRuntimeState,
  resolveRuntimeThemeConfig,
} from "./builders";

describe("resolveRuntimeThemeConfig", () => {
  it("uses fixed env theme when lockEnvTheme is enabled", () => {
    const themeConfig = resolveRuntimeThemeConfig(
      {
        theme: "fantasy",
        atmosphere: "calm",
      } as any,
      {
        lockEnvTheme: true,
        fixedEnvTheme: "cyberpunk",
      } as any,
    );

    expect(themeConfig).toBe(ENV_THEMES.cyberpunk);
  });

  it("derives env theme from atmosphere when unlocked", () => {
    const themeConfig = resolveRuntimeThemeConfig(
      {
        theme: "fantasy",
        atmosphere: "space",
      } as any,
      {
        lockEnvTheme: false,
        fixedEnvTheme: "fantasy",
      } as any,
    );

    expect(themeConfig).toBe(ENV_THEMES.obsidian);
  });
});

describe("runtime state builders", () => {
  it("injects theme config and theme font into engine state", () => {
    const engineState = buildRuntimeEngineState(
      {
        language: "en",
        isTranslating: false,
        gameState: {} as any,
        vfsSession: {} as any,
        isAutoSaving: false,
        aiSettings: {} as any,
        currentHistory: [],
        saveSlots: [],
        currentSlotId: null,
        themeMode: "system",
        persistenceError: null,
        failedImageNodes: new Set(),
        isMagicMirrorOpen: false,
        magicMirrorImage: null,
        isVeoScriptOpen: false,
        isSettingsOpen: false,
      },
      {
        name: "Test",
        fontClass: "font-test",
      } as any,
    );

    expect(engineState.themeFont).toBe("font-test");
    expect(engineState.currentThemeConfig).toEqual(
      expect.objectContaining({ fontClass: "font-test" }),
    );
  });

  it("builds runtime slices from engine, rag, and meta state", () => {
    const engineState = {
      language: "en",
      isTranslating: false,
      gameState: { id: "g1" },
      vfsSession: { id: "v1" },
      isAutoSaving: false,
      aiSettings: {},
      currentHistory: [{ id: "n1" }],
      saveSlots: [{ id: "s1" }],
      currentSlotId: "s1",
      themeMode: "night",
      persistenceError: null,
      failedImageNodes: new Set(),
      isMagicMirrorOpen: false,
      magicMirrorImage: null,
      isVeoScriptOpen: false,
      isSettingsOpen: true,
      currentThemeConfig: { name: "Test", fontClass: "font-test" },
      themeFont: "font-test",
    } as any;

    const runtimeState = buildRuntimeState(
      engineState,
      {
        isInitialized: true,
        isLoading: false,
        status: null,
        error: null,
        modelMismatch: null,
        storageOverflow: null,
        currentSaveId: "s1",
      },
      {
        runtimeRevision: 3,
        lastMutationReason: "ui.toggle",
      },
    );

    expect(runtimeState.domain.currentSlotId).toBe("s1");
    expect(runtimeState.ui.themeFont).toBe("font-test");
    expect(runtimeState.rag.currentSaveId).toBe("s1");
    expect(runtimeState.runtimeRevision).toBe(3);
  });
});
