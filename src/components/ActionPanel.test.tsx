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
});
