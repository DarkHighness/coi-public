// @vitest-environment jsdom

import React from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routerState = vi.hoisted(() => ({
  pathname: "/game",
  navigate: vi.fn(),
}));

const runtimeState = vi.hoisted(() => ({
  gameState: {
    theme: "fantasy",
    atmosphere: { envTheme: "rainy", ambience: "windy" },
    nodes: {
      "node-1": {
        id: "node-1",
        text: "A very long opening line that should be truncated by runtime title handling for visibility checks.",
      },
    },
    activeNodeId: "node-1",
    liveToolCalls: [],
  } as any,
}));

const useGameStateMock = vi.hoisted(() => vi.fn());
const useVfsPersistenceMock = vi.hoisted(() => vi.fn());
const useSettingsMock = vi.hoisted(() => vi.fn());
const useGameActionMock = vi.hoisted(() => vi.fn());
const useToastMock = vi.hoisted(() => vi.fn());
const createLifecycleActionsMock = vi.hoisted(() => vi.fn());
const createCommandActionsMock = vi.hoisted(() => vi.fn());
const useImageGenerationQueueMock = vi.hoisted(() => vi.fn());
const createDomainUiActionsMock = vi.hoisted(() => vi.fn());
const createDomainMutationActionsMock = vi.hoisted(() => vi.fn());
const deriveHistoryMock = vi.hoisted(() => vi.fn());
const getThemeKeyForAtmosphereMock = vi.hoisted(() => vi.fn());
const deriveThemeVarsMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({
  useNavigate: () => routerState.navigate,
  useLocation: () => ({ pathname: routerState.pathname }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => (key === "title" ? "Chronicles" : key),
  }),
}));

vi.mock("../hooks/useGameState", () => ({
  useGameState: useGameStateMock,
}));

vi.mock("../hooks/useVfsPersistence", () => ({
  useVfsPersistence: useVfsPersistenceMock,
}));

vi.mock("../hooks/useSettings", () => ({
  useSettings: useSettingsMock,
}));

vi.mock("../hooks/useGameAction", () => ({
  useGameAction: useGameActionMock,
}));

vi.mock("../contexts/ToastContext", () => ({
  useToast: useToastMock,
}));

vi.mock("./effects/lifecycleOrchestration", () => ({
  createLifecycleActions: createLifecycleActionsMock,
}));

vi.mock("./effects/commandActions", () => ({
  createCommandActions: createCommandActionsMock,
}));

vi.mock("./effects/imageGeneration", () => ({
  useImageGenerationQueue: useImageGenerationQueueMock,
}));

vi.mock("./effects/domainUiActions", () => ({
  createDomainUiActions: createDomainUiActionsMock,
}));

vi.mock("./effects/domainMutations", () => ({
  createDomainMutationActions: createDomainMutationActionsMock,
}));

vi.mock("../utils/storyUtils", () => ({
  deriveHistory: deriveHistoryMock,
}));

vi.mock("../utils/constants/atmosphere", () => ({
  getThemeKeyForAtmosphere: getThemeKeyForAtmosphereMock,
}));

vi.mock("../utils/theme/deriveThemeVars", () => ({
  deriveThemeVars: deriveThemeVarsMock,
}));

vi.mock("../utils/constants", () => ({
  THEMES: {
    fantasy: { envTheme: "fantasy" },
  },
  ENV_THEMES: {
    fantasy: {
      vars: {
        "--bg": "#112233",
      },
      dayVars: {
        "--bg": "#445566",
      },
    },
    rainy: {
      vars: {
        "--bg": "#aabbcc",
      },
      dayVars: {
        "--bg": "#ddeeff",
      },
    },
  },
}));

import { useRuntimeEngine } from "./useRuntimeEngine";

const mount = () => {
  let current: any = null;

  const Probe = () => {
    current = useRuntimeEngine();
    return React.createElement("div");
  };

  render(React.createElement(Probe));
  if (!current) {
    throw new Error("useRuntimeEngine did not return actions");
  }
  return current;
};

describe("useRuntimeEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    runtimeState.gameState = {
      theme: "fantasy",
      atmosphere: { envTheme: "rainy", ambience: "windy" },
      nodes: {
        "node-1": {
          id: "node-1",
          text: "A very long opening line that should be truncated by runtime title handling for visibility checks.",
        },
      },
      activeNodeId: "node-1",
      liveToolCalls: [],
    } as any;

    routerState.pathname = "/game";

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        media: query,
        matches: false,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const setGameState = vi.fn((next: any) => {
      if (typeof next === "function") {
        runtimeState.gameState = next(runtimeState.gameState);
      } else {
        runtimeState.gameState = next;
      }
    });

    useGameStateMock.mockReturnValue({
      gameState: runtimeState.gameState,
      setGameState,
      resetState: vi.fn(),
    });

    useVfsPersistenceMock.mockReturnValue({
      saveSlots: [{ id: "slot-1" }],
      currentSlotId: "slot-1",
      setCurrentSlotId: vi.fn(),
      createSaveSlot: vi.fn(() => "slot-1"),
      renameSlot: vi.fn(),
      loadSlot: vi.fn(),
      deleteSlot: vi.fn(),
      clearAllSaves: vi.fn(),
      isAutoSaving: false,
      persistenceError: null,
      hardReset: vi.fn(),
      saveToSlot: vi.fn(async () => true),
      setSkipNextSave: vi.fn(),
      triggerSave: vi.fn(),
      refreshSlots: vi.fn(),
      vfsSession: { id: "vfs" },
      seedFromDefaults: vi.fn(),
      restoreVfsToTurn: vi.fn(),
    });

    useSettingsMock.mockReturnValue({
      settings: {
        lockEnvTheme: false,
        fixedEnvTheme: null,
      },
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
      language: "en",
      setLanguage: vi.fn(),
      themeMode: "system",
      setThemeMode: vi.fn(),
      toggleThemeMode: vi.fn(),
    });

    useToastMock.mockReturnValue({ showToast: vi.fn() });

    useGameActionMock.mockImplementation((params: any) => ({
      handleAction: vi.fn(),
      handleRebuildContext: vi.fn(),
      handleInvalidateSession: vi.fn(),
      params,
    }));

    createLifecycleActionsMock.mockReturnValue({
      startNewGame: vi.fn(),
      resumeOutlineGeneration: vi.fn(),
    });

    createCommandActionsMock.mockReturnValue({
      navigateToNode: vi.fn(async () => undefined),
      handleForceUpdate: vi.fn(async () => undefined),
      handleCleanupEntities: vi.fn(async () => undefined),
    });

    useImageGenerationQueueMock.mockReturnValue({
      failedImageNodes: ["node-x"],
      generateImageForNode: vi.fn(async () => undefined),
    });

    createDomainUiActionsMock.mockReturnValue({
      updateNodeAudio: vi.fn(),
      clearHighlight: vi.fn(),
    });

    createDomainMutationActionsMock.mockReturnValue({
      updateUiState: vi.fn(),
      setViewedSegmentId: vi.fn(),
      updateNodeMeta: vi.fn(),
      setVeoScript: vi.fn(),
      toggleGodMode: vi.fn(),
      setUnlockMode: vi.fn(),
      applyVfsMutation: vi.fn(),
      applyVfsDerivedState: vi.fn(),
    });

    deriveHistoryMock.mockReturnValue([{ id: "history-1" }]);
    getThemeKeyForAtmosphereMock.mockReturnValue("rainy");
    deriveThemeVarsMock.mockImplementation(
      (vars: Record<string, string>) => vars,
    );
  });

  it("applies theme/title effects and delegates runtime actions", async () => {
    const actions = mount();

    expect(deriveHistoryMock).toHaveBeenCalledWith(
      runtimeState.gameState.nodes,
      runtimeState.gameState.activeNodeId,
    );
    expect(getThemeKeyForAtmosphereMock).toHaveBeenCalledWith(
      runtimeState.gameState.atmosphere,
    );
    expect(document.documentElement.style.getPropertyValue("--bg")).toBe(
      "#ddeeff",
    );
    expect(document.documentElement.style.getPropertyValue("--bg-rgb")).toBe(
      "221 238 255",
    );
    expect(document.title).toBe(
      "A very long opening line that should be truncated by runtime... - Chronicles",
    );

    await act(async () => {
      await actions.navigateToNode("node-2", true);
      await actions.handleForceUpdate("rewrite prompt");
      await actions.cleanupEntities();
    });

    const commandActions = createCommandActionsMock.mock.results[0]?.value;
    expect(commandActions.navigateToNode).toHaveBeenCalledWith("node-2", true);
    expect(commandActions.handleForceUpdate).toHaveBeenCalledWith(
      "rewrite prompt",
    );
    expect(commandActions.handleCleanupEntities).toHaveBeenCalled();

    actions.updateNodeAudio("node-1", "audio-1");
    actions.clearHighlight({ type: "node", id: "node-1" });
    const domainUi = createDomainUiActionsMock.mock.results[0]?.value;
    expect(domainUi.updateNodeAudio).toHaveBeenCalledWith("node-1", "audio-1");
    expect(domainUi.clearHighlight).toHaveBeenCalledWith({
      type: "node",
      id: "node-1",
    });

    actions.updateUiState("feedLayout", "cards");
    actions.setViewedSegmentId("segment-1");
    actions.updateNodeMeta("node-1", { title: "new" });
    actions.setVeoScript("veo");
    actions.toggleGodMode(true);
    actions.setUnlockMode(true);
    actions.applyVfsMutation({ tag: "mutation" });
    actions.applyVfsDerivedState({ tag: "derived" });

    const domainMutations =
      createDomainMutationActionsMock.mock.results[0]?.value;
    expect(domainMutations.updateUiState).toHaveBeenCalledWith(
      "feedLayout",
      "cards",
    );
    expect(domainMutations.setViewedSegmentId).toHaveBeenCalledWith(
      "segment-1",
    );
    expect(domainMutations.updateNodeMeta).toHaveBeenCalledWith("node-1", {
      title: "new",
    });
    expect(domainMutations.setVeoScript).toHaveBeenCalledWith("veo");
    expect(domainMutations.toggleGodMode).toHaveBeenCalledWith(true);
    expect(domainMutations.setUnlockMode).toHaveBeenCalledWith(true);
    expect(domainMutations.applyVfsMutation).toHaveBeenCalledWith({
      tag: "mutation",
    });
    expect(domainMutations.applyVfsDerivedState).toHaveBeenCalledWith({
      tag: "derived",
    });
  });

  it("forwards image generation callbacks and handles initializing title", async () => {
    routerState.pathname = "/initializing";
    const actions = mount();

    expect(document.title).toBe("Chronicles");

    const gameActionParams = useGameActionMock.mock.calls[0]?.[0];
    const imageQueue = useImageGenerationQueueMock.mock.results[0]?.value;

    await act(async () => {
      await gameActionParams.generateImageForNode("node-1", {
        id: "node-1",
      });
    });
    expect(imageQueue.generateImageForNode).toHaveBeenCalledWith("node-1", {
      id: "node-1",
    });

    gameActionParams.onLiveToolCallsUpdate([{ name: "tool-call" }]);
    expect(runtimeState.gameState.liveToolCalls).toEqual([
      { name: "tool-call" },
    ]);

    actions.startNewGame("fantasy", "ctx");
    actions.resumeOutlineGeneration();
    const lifecycle = createLifecycleActionsMock.mock.results[0]?.value;
    expect(lifecycle.startNewGame).toHaveBeenCalledWith("fantasy", "ctx");
    expect(lifecycle.resumeOutlineGeneration).toHaveBeenCalled();
  });

  it("uses locked story env theme in start view and skips atmosphere-derived theme lookup", () => {
    routerState.pathname = "/";
    runtimeState.gameState = {
      theme: "unknown-theme",
      atmosphere: { envTheme: "rainy", ambience: "windy" },
      nodes: {},
      activeNodeId: null,
      liveToolCalls: [],
    } as any;

    useSettingsMock.mockReturnValueOnce({
      settings: {
        lockEnvTheme: true,
        fixedEnvTheme: null,
      },
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
      language: "en",
      setLanguage: vi.fn(),
      themeMode: "day",
      setThemeMode: vi.fn(),
      toggleThemeMode: vi.fn(),
    });

    mount();

    expect(getThemeKeyForAtmosphereMock).not.toHaveBeenCalled();
    expect(document.documentElement.style.getPropertyValue("--bg")).toBe(
      "#445566",
    );
    expect(document.title).toBe("Chronicles");
  });

  it("uses fixed env theme in locked mode and picks night variables", () => {
    runtimeState.gameState = {
      theme: "fantasy",
      atmosphere: { envTheme: "fantasy", ambience: "quiet" },
      nodes: {},
      activeNodeId: null,
      liveToolCalls: [],
    } as any;

    useSettingsMock.mockReturnValueOnce({
      settings: {
        lockEnvTheme: true,
        fixedEnvTheme: "rainy",
      },
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
      language: "en",
      setLanguage: vi.fn(),
      themeMode: "night",
      setThemeMode: vi.fn(),
      toggleThemeMode: vi.fn(),
    });

    mount();

    expect(getThemeKeyForAtmosphereMock).not.toHaveBeenCalled();
    expect(document.documentElement.style.getPropertyValue("--bg")).toBe(
      "#aabbcc",
    );
    expect(document.documentElement.style.getPropertyValue("--bg-rgb")).toBe(
      "170 187 204",
    );
  });
});
