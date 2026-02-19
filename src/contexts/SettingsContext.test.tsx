// @vitest-environment jsdom

import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const changeLanguage = vi.hoisted(() => vi.fn());
const getModels = vi.hoisted(() => vi.fn());
const setSessionHistoryLruLimit = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      i18n: {
        language: "en",
        changeLanguage,
      },
    }),
  };
});

vi.mock("../services/aiService", () => ({
  getModels,
}));

vi.mock("../services/vfs/conversation", () => ({
  setSessionHistoryLruLimit,
}));

import { SettingsProvider, useSettingsContext } from "./SettingsContext";

describe("SettingsContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("throws when hook is used outside provider", () => {
    const Consumer = () => {
      useSettingsContext();
      return React.createElement("div");
    };

    expect(() => render(React.createElement(Consumer))).toThrow(
      "useSettingsContext must be used within a SettingsProvider",
    );
  });

  it("migrates legacy prompt injection fields from storage", async () => {
    localStorage.setItem(
      "chronicles_aisettings",
      JSON.stringify({
        story: { providerId: "p1", modelId: "m1" },
        providers: { instances: [], nextId: 1 },
        audioVolume: { bgmVolume: 0.5, bgmMuted: false },
        language: "zh",
        extra: {
          customInstruction: null,
          customInstructionEnabled: null,
          customPromptInjection: "legacy instruction",
          promptInjectionEnabled: true,
          clearerSearchTool: true,
        },
      }),
    );

    let captured: any = null;
    const Consumer = () => {
      captured = useSettingsContext();
      return React.createElement("div");
    };

    render(
      React.createElement(
        SettingsProvider,
        null,
        React.createElement(Consumer),
      ),
    );

    expect(captured.settings.extra.customInstruction).toBe(
      "legacy instruction",
    );
    expect(captured.settings.extra.customInstructionEnabled).toBe(true);
    expect(captured.settings.extra.culturePreference).toBe(
      "follow_story_setting",
    );
    expect(
      (captured.settings.extra as Record<string, unknown>).clearerSearchTool,
    ).toBeUndefined();
    await waitFor(() => {
      expect(changeLanguage).toHaveBeenCalledWith("zh");
    });
  });

  it("uses default culture preference when settings are fresh", () => {
    let captured: any = null;
    const Consumer = () => {
      captured = useSettingsContext();
      return React.createElement("div");
    };

    render(
      React.createElement(
        SettingsProvider,
        null,
        React.createElement(Consumer),
      ),
    );

    expect(captured.settings.extra.culturePreference).toBe(
      "follow_story_setting",
    );
  });

  it("supports partial updateSettings and persists merged settings", async () => {
    let captured: any = null;
    const Consumer = () => {
      captured = useSettingsContext();
      return React.createElement("div");
    };

    render(
      React.createElement(
        SettingsProvider,
        null,
        React.createElement(Consumer),
      ),
    );

    await act(async () => {
      captured.updateSettings({
        extra: {
          ...(captured.settings.extra || {}),
          nsfw: true,
        },
      });
    });

    const saved = JSON.parse(
      localStorage.getItem("chronicles_aisettings") || "{}",
    );
    expect(saved.extra.nsfw).toBe(true);
  });

  it("cycles theme mode and saves value", async () => {
    let captured: any = null;
    const Consumer = () => {
      captured = useSettingsContext();
      return React.createElement("div");
    };

    render(
      React.createElement(
        SettingsProvider,
        null,
        React.createElement(Consumer),
      ),
    );

    expect(captured.themeMode).toBe("system");

    await act(async () => {
      captured.toggleThemeMode();
    });
    expect(localStorage.getItem("chronicles_theme_mode")).toBe("day");

    await act(async () => {
      captured.toggleThemeMode();
    });
    expect(localStorage.getItem("chronicles_theme_mode")).toBe("night");
  });

  it("uses cached provider models when cache is fresh", async () => {
    localStorage.setItem(
      "chronicles_model_cache",
      JSON.stringify({
        timestamp: Date.now(),
        models: {
          "provider-1": [{ id: "m1", name: "Model 1" }],
        },
      }),
    );

    let captured: any = null;
    const Consumer = () => {
      captured = useSettingsContext();
      return React.createElement("div");
    };

    render(
      React.createElement(
        SettingsProvider,
        null,
        React.createElement(Consumer),
      ),
    );

    await act(async () => {
      await captured.loadModels(false);
    });

    expect(getModels).not.toHaveBeenCalled();
    expect(captured.providerModels["provider-1"][0].id).toBe("m1");
  });

  it("applies session mirror LRU limit from settings", async () => {
    localStorage.setItem(
      "chronicles_aisettings",
      JSON.stringify({
        story: { providerId: "p1", modelId: "m1" },
        providers: { instances: [], nextId: 1 },
        audioVolume: {
          bgmVolume: 0.5,
          bgmMuted: false,
          ttsVolume: 1,
          ttsMuted: false,
        },
        language: "en",
        extra: {
          sessionHistoryLruLimit: 96,
        },
      }),
    );

    let captured: any = null;
    const Consumer = () => {
      captured = useSettingsContext();
      return React.createElement("div");
    };

    render(
      React.createElement(
        SettingsProvider,
        null,
        React.createElement(Consumer),
      ),
    );

    expect(setSessionHistoryLruLimit).toHaveBeenCalledWith(96);

    await act(async () => {
      captured.updateSettings({
        ...captured.settings,
        extra: {
          ...(captured.settings.extra || {}),
          sessionHistoryLruLimit: 32,
        },
      });
    });

    expect(setSessionHistoryLruLimit).toHaveBeenCalledWith(32);
  });
});
