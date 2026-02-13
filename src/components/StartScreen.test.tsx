// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("./LanguageSelector", () => ({
  LanguageSelector: ({ onChange }: { onChange: (value: string) => void }) =>
    React.createElement(
      "button",
      { onClick: () => onChange("en") },
      "language-selector",
    ),
}));

vi.mock("./ThemeSelector", () => ({
  ThemeSelector: ({
    onSelect,
    onBack,
  }: {
    onSelect: (theme: string, role?: string) => void;
    onBack: () => void;
  }) =>
    React.createElement(
      "div",
      null,
      React.createElement(
        "button",
        { onClick: () => onSelect("fantasy", "wanderer") },
        "select-theme",
      ),
      React.createElement("button", { onClick: onBack }, "back-theme"),
    ),
}));

vi.mock("./CustomGameModal", () => ({
  CustomGameModal: () => null,
}));

vi.mock("./CustomContextModal", () => ({
  CustomContextModal: () => null,
}));

vi.mock("./ImageUploadModal", () => ({
  ImageUploadModal: () => null,
}));

vi.mock("./effects/ButterflyBackground", () => ({
  ButterflyBackground: () => null,
}));

vi.mock("./render/MarkdownText", () => ({
  MarkdownText: ({ content }: { content: string }) =>
    React.createElement("span", null, content),
}));

vi.mock("../utils/constants/buildInfo", () => ({
  BUILD_INFO: {
    buildTime: "now",
    gitHash: "abc123",
  },
}));

vi.mock("../utils/imageStorage", () => ({
  getImage: vi.fn(async () => null),
}));

vi.mock("../services/ai/utils", () => ({
  getThemeName: () => "Fantasy",
  IMAGE_BASED_THEME: "image-based",
}));

vi.mock("../hooks/useMediaQuery", () => ({
  useMediaQuery: (query: string) => {
    if (query.includes("min-width")) return false;
    if (query.includes("max-height")) return false;
    if (query.includes("prefers-color-scheme")) return false;
    return false;
  },
}));

vi.mock("../hooks/useSettings", () => ({
  useSettings: () => ({
    settings: {
      providers: { instances: [{ enabled: true, apiKey: "k" }] },
      story: { modelId: "model-1", providerId: "provider-1" },
      extra: {},
    },
    themeMode: "system",
  }),
}));

vi.mock("../contexts/TutorialContext", () => ({
  useTutorialContextOptional: () => null,
}));

vi.mock("../hooks/useTutorial", () => ({
  useTutorialTarget: () => ({ current: null }),
}));

import { StartScreen } from "./StartScreen";

describe("StartScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it("calls onSettings when settings button is clicked", () => {
    const onSettings = vi.fn();

    render(
      React.createElement(StartScreen, {
        onStart: vi.fn(),
        onContinue: vi.fn(),
        onLoad: vi.fn(),
        onSettings,
        setLanguage: vi.fn(),
      }),
    );

    fireEvent.click(screen.getByTitle("settings.title"));
    expect(onSettings).toHaveBeenCalledTimes(1);
  });

  it("calls onContinue for latest save", () => {
    const onContinue = vi.fn();

    render(
      React.createElement(StartScreen, {
        onStart: vi.fn(),
        onContinue,
        onLoad: vi.fn(),
        onSettings: vi.fn(),
        setLanguage: vi.fn(),
        latestSave: {
          id: "slot-1",
          name: "Slot 1",
          timestamp: Date.now(),
          summary: "Saved summary",
          theme: "fantasy",
        },
      }),
    );

    fireEvent.click(screen.getByText("continueGame"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("calls onLoad when file input changes", () => {
    const onLoad = vi.fn();
    const { container } = render(
      React.createElement(StartScreen, {
        onStart: vi.fn(),
        onContinue: vi.fn(),
        onLoad,
        onSettings: vi.fn(),
        setLanguage: vi.fn(),
      }),
    );

    const file = new File(["{}"], "save.json", { type: "application/json" });
    const input = container.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(onLoad).toHaveBeenCalledWith(file);
  });

  it("enters theme select and starts game after select", async () => {
    const onStart = vi.fn();
    const onThemePreview = vi.fn();

    render(
      React.createElement(StartScreen, {
        onStart,
        onContinue: vi.fn(),
        onLoad: vi.fn(),
        onSettings: vi.fn(),
        setLanguage: vi.fn(),
        onThemePreview,
      }),
    );

    fireEvent.click(screen.getByText("startTitle"));
    expect(onThemePreview).toHaveBeenCalledWith("fantasy");

    fireEvent.click(screen.getByText("select-theme"));

    await act(async () => {
      vi.advanceTimersByTime(1600);
    });

    expect(onStart).toHaveBeenCalledWith("fantasy", "", undefined, "wanderer");
  });

  it("clears preview when exiting theme selection", () => {
    const onThemePreview = vi.fn();

    render(
      React.createElement(StartScreen, {
        onStart: vi.fn(),
        onContinue: vi.fn(),
        onLoad: vi.fn(),
        onSettings: vi.fn(),
        setLanguage: vi.fn(),
        onThemePreview,
      }),
    );

    fireEvent.click(screen.getByText("startTitle"));
    fireEvent.click(screen.getByText("back-theme"));

    expect(onThemePreview).toHaveBeenLastCalledWith(null);
  });
});
