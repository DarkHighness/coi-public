// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionPanel } from "./ActionPanel";

const runtimeState = vi.hoisted(() => ({
  state: {
    gameState: {
      isProcessing: false,
      summaries: [],
      godMode: false,
      unlockMode: false,
      liveToolCalls: [],
      error: null as string | null,
    },
    currentHistory: [
      {
        role: "model",
        choices: ["Go left", "Go right"],
      },
    ],
    aiSettings: {
      providers: {
        instances: [{ id: "provider-1", protocol: "openai" }],
      },
      story: {
        providerId: "provider-1",
        modelId: "gpt-4o",
      },
      extra: {},
      modelContextWindows: {},
      learnedModelContextWindows: {},
      actionPanelFontScaleLevel: 3,
    },
  },
  actions: {
    toggleGodMode: vi.fn(),
    setUnlockMode: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("../runtime/context", () => ({
  useRuntimeContext: () => runtimeState,
}));

vi.mock("../contexts/SettingsContext", () => ({
  useSettingsContext: () => ({
    providerModels: {},
  }),
}));

describe("ActionPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    runtimeState.state.gameState = {
      isProcessing: false,
      summaries: [],
      godMode: false,
      unlockMode: false,
      liveToolCalls: [],
      error: null,
    };
    runtimeState.state.currentHistory = [
      {
        role: "model",
        choices: ["Go left", "Go right"],
      },
    ] as any;
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })) as any,
    );
  });

  it("sends choice when clicking the choice label text", () => {
    const onAction = vi.fn();
    render(React.createElement(ActionPanel, { onAction }));

    fireEvent.click(screen.getByText("Go left"));

    expect(onAction).toHaveBeenCalledWith("Go left");
  });

  it("renders historical context usage from per-turn context snapshot", () => {
    runtimeState.state.currentHistory = [
      {
        role: "model",
        choices: ["Continue"],
        contextUsage: {
          usageTokens: 70000,
          totalTokens: 70000,
          promptTokens: 65000,
          completionTokens: 5000,
          contextWindowTokens: 100000,
          usageRatio: 0.7,
          autoCompactThreshold: 0.7,
          thresholdTokens: 70000,
          tokensToThreshold: 0,
          source: "settings.modelContextWindows",
        },
      },
    ] as any;

    render(React.createElement(ActionPanel, { onAction: vi.fn() }));

    expect(screen.getByText(/70,000\/100,000 \(70%\)/i)).toBeTruthy();
  });

  it("ignores implausible legacy aggregate usage when no context snapshot exists", () => {
    runtimeState.state.currentHistory = [
      {
        role: "model",
        choices: ["Continue"],
        usage: {
          promptTokens: 600000,
          completionTokens: 1000,
          totalTokens: 601000,
          reported: true,
        },
      },
    ] as any;

    render(React.createElement(ActionPanel, { onAction: vi.fn() }));

    expect(screen.getByTitle(/contextUsage:\s*—\/128,?000/i)).toBeTruthy();
  });

  it("locks action input after turn error and keeps retry only", () => {
    runtimeState.state.gameState = {
      ...runtimeState.state.gameState,
      error: "Turn failed",
    };

    const onAction = vi.fn();
    render(React.createElement(ActionPanel, { onAction, onRetry: vi.fn() }));

    expect(screen.queryByText("Go left")).toBeNull();
    expect(
      screen.getByRole("button", { name: /retryGeneration/i }),
    ).toBeTruthy();

    fireEvent.keyDown(window, { key: "1" });
    expect(onAction).not.toHaveBeenCalled();
  });

  it("applies action panel font scale css variable", () => {
    runtimeState.state.aiSettings = {
      ...runtimeState.state.aiSettings,
      actionPanelFontScaleLevel: 5,
    } as any;

    render(React.createElement(ActionPanel, { onAction: vi.fn() }));

    const root = screen.getByTestId("action-panel-root");
    expect(
      (root as HTMLElement).style.getPropertyValue("--action-panel-font-scale"),
    ).toBe("1.4");
  });
});
