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
    },
    currentHistory: [
      {
        role: "model",
        choices: ["Go left", "Go right"],
      },
    ],
    isTranslating: false,
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
});
