// @vitest-environment jsdom

import React from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useRuntimeEngineMock = vi.hoisted(() => vi.fn());
const useRagRuntimeMock = vi.hoisted(() => vi.fn());
const useRuntimeLifecycleEffectsMock = vi.hoisted(() => vi.fn());
const useRuntimeActionsAdapterMock = vi.hoisted(() => vi.fn());

const resolveRuntimeThemeConfigMock = vi.hoisted(() => vi.fn());
const buildRuntimeEngineStateMock = vi.hoisted(() => vi.fn());
const buildRuntimeStateMock = vi.hoisted(() => vi.fn());

const buildRuntimeEngineActionsFromSourceMock = vi.hoisted(() => vi.fn());
const buildRuntimeEngineBaseStateFromSourceMock = vi.hoisted(() => vi.fn());

vi.mock("./useRuntimeEngine", () => ({
  useRuntimeEngine: useRuntimeEngineMock,
}));

vi.mock("./ragRuntime", () => ({
  useRagRuntime: useRagRuntimeMock,
}));

vi.mock("./effects/lifecycle", () => ({
  useRuntimeLifecycleEffects: useRuntimeLifecycleEffectsMock,
}));

vi.mock("./useRuntimeActions", () => ({
  useRuntimeActions: useRuntimeActionsAdapterMock,
}));

vi.mock("./builders", () => ({
  resolveRuntimeThemeConfig: resolveRuntimeThemeConfigMock,
  buildRuntimeEngineState: buildRuntimeEngineStateMock,
  buildRuntimeState: buildRuntimeStateMock,
}));

vi.mock("./engineBridge", () => ({
  buildRuntimeEngineActionsFromSource: buildRuntimeEngineActionsFromSourceMock,
  buildRuntimeEngineBaseStateFromSource: buildRuntimeEngineBaseStateFromSourceMock,
}));

import {
  RuntimeProvider,
  useOptionalRuntimeContext,
  useRuntimeActions,
  useRuntimeContext,
  useRuntimeState,
} from "./context";

describe("runtime context", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useRuntimeEngineMock.mockReturnValue({
      gameState: {
        theme: "fantasy",
        atmosphere: { mood: "calm" },
      },
      aiSettings: {
        lockEnvTheme: false,
        fixedEnvTheme: null,
      },
    });

    useRagRuntimeMock.mockReturnValue({
      isInitialized: true,
      isLoading: false,
      status: { currentSaveId: "save-1" },
      error: null,
      modelMismatch: null,
      storageOverflow: null,
      currentSaveId: "save-1",
      actions: {
        search: vi.fn(),
      },
    });

    resolveRuntimeThemeConfigMock.mockReturnValue({ key: "resolved-theme" });
    buildRuntimeEngineBaseStateFromSourceMock.mockReturnValue({ key: "base-state" });
    buildRuntimeEngineStateMock.mockReturnValue({ key: "engine-state" });
    buildRuntimeEngineActionsFromSourceMock.mockReturnValue({ key: "engine-actions" });
    useRuntimeActionsAdapterMock.mockReturnValue({ key: "runtime-actions" });
    buildRuntimeStateMock.mockReturnValue({ key: "runtime-state" });
  });

  it("throws when useRuntimeContext is used outside provider", () => {
    const Probe = () => {
      useRuntimeContext();
      return React.createElement("div");
    };

    expect(() => render(React.createElement(Probe))).toThrow(
      "useRuntimeContext must be used within a RuntimeProvider",
    );
  });

  it("returns null for optional context outside provider", () => {
    let value: ReturnType<typeof useOptionalRuntimeContext> | undefined;

    const Probe = () => {
      value = useOptionalRuntimeContext();
      return React.createElement("div");
    };

    render(React.createElement(Probe));

    expect(value).toBeNull();
  });

  it("wires provider state/actions through all runtime hooks", () => {
    let captured:
      | {
          context: ReturnType<typeof useRuntimeContext>;
          state: ReturnType<typeof useRuntimeState>;
          actions: ReturnType<typeof useRuntimeActions>;
        }
      | undefined;

    const Probe = () => {
      captured = {
        context: useRuntimeContext(),
        state: useRuntimeState(),
        actions: useRuntimeActions(),
      };
      return React.createElement("div");
    };

    render(
      React.createElement(
        RuntimeProvider,
        null,
        React.createElement(Probe),
      ),
    );

    expect(resolveRuntimeThemeConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({ theme: "fantasy" }),
      expect.objectContaining({ lockEnvTheme: false }),
    );

    expect(buildRuntimeEngineBaseStateFromSourceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        gameState: expect.objectContaining({ theme: "fantasy" }),
      }),
    );

    expect(buildRuntimeEngineStateMock).toHaveBeenCalledWith(
      { key: "base-state" },
      { key: "resolved-theme" },
    );

    expect(buildRuntimeEngineActionsFromSourceMock).toHaveBeenCalled();

    expect(useRuntimeActionsAdapterMock).toHaveBeenCalledWith(
      expect.objectContaining({
        engineActions: { key: "engine-actions" },
        engineState: { key: "engine-state" },
        ragRuntime: expect.objectContaining({ isInitialized: true }),
        markMutation: expect.any(Function),
      }),
    );

    expect(buildRuntimeStateMock).toHaveBeenCalledWith(
      { key: "engine-state" },
      expect.objectContaining({
        isInitialized: true,
        currentSaveId: "save-1",
      }),
      expect.anything(),
    );

    expect(useRuntimeLifecycleEffectsMock).toHaveBeenCalledWith({
      state: { key: "runtime-state" },
      actions: { key: "runtime-actions" },
    });

    expect(captured?.context.state).toEqual({ key: "runtime-state" });
    expect(captured?.state).toEqual({ key: "runtime-state" });
    expect(captured?.actions).toEqual({ key: "runtime-actions" });
  });
});
