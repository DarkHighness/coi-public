// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let settingsState: any;
const updateSettings = vi.fn();
const writeFile = vi.fn();
const snapshot = vi.fn();
const applyVfsDerivedState = vi.fn();
const triggerSave = vi.fn();
const deriveGameStateFromVfs = vi.fn();
let runtimeContextState: any;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: unknown) => {
      if (typeof options === "string") return options;
      if (
        options &&
        typeof options === "object" &&
        "defaultValue" in options &&
        typeof (options as any).defaultValue === "string"
      ) {
        return (options as any).defaultValue;
      }
      return key;
    },
  }),
}));

vi.mock("../../hooks/useSettings", () => ({
  useSettings: () => ({
    settings: settingsState,
    updateSettings,
  }),
}));

vi.mock("../../runtime/context", () => ({
  useOptionalRuntimeContext: () => runtimeContextState,
}));

vi.mock("../../services/vfs/derivations", () => ({
  deriveGameStateFromVfs: (...args: any[]) => deriveGameStateFromVfs(...args),
}));

import { SettingsExtra } from "./SettingsExtra";

const baseSettings = () => ({
  playerProfile: "# Player Soul (Global)\n\n- Scope: Global\n",
  extra: {
    detailedDescription: false,
    nsfw: false,
    toolCallCarousel: true,
    disablePlayerProfiling: false,
    customInstructionEnabled: false,
    customInstruction: "",
    maxAgenticRounds: 20,
    maxErrorRetries: 3,
    maxToolCalls: 50,
  },
});

describe("SettingsExtra", () => {
  beforeEach(() => {
    settingsState = baseSettings();
    snapshot.mockReturnValue({
      "shared/config/runtime/soul.md": {
        content: "# Mirror Global Soul\n",
        contentType: "text/markdown",
      },
    });
    runtimeContextState = {
      state: {
        runtimeRevision: 1,
        currentSlotId: "slot-1",
        gameState: {
          playerProfile: "# Player Soul (This Save)\n\n- Scope: This Save\n",
        },
        vfsSession: {
          snapshot,
          writeFile,
        },
      },
      actions: {
        applyVfsDerivedState,
        triggerSave,
      },
    };
    deriveGameStateFromVfs.mockReturnValue({
      playerProfile: "# Player Soul (This Save)\n\n- Scope: This Save\n",
    });
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      value: { reload: vi.fn() },
      writable: true,
    });
  });

  it("toggles detailed description setting", () => {
    render(React.createElement(SettingsExtra));

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        extra: expect.objectContaining({ detailedDescription: true }),
      }),
    );
  });

  it("updates custom instruction text", () => {
    render(React.createElement(SettingsExtra));

    const textarea = screen.getByPlaceholderText(
      "settings.extra.customPromptInjectionPlaceholder",
    );
    fireEvent.change(textarea, { target: { value: "Stay concise" } });

    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        extra: expect.objectContaining({ customInstruction: "Stay concise" }),
      }),
    );
  });

  it("hides deprecated clearer search tool controls", () => {
    render(React.createElement(SettingsExtra));

    expect(screen.queryByText("settings.extra.clearerSearchTool")).toBeNull();
    expect(
      screen.queryByText("settings.extra.clearerSearchToolHelp"),
    ).toBeNull();
  });

  it("clamps numeric extra settings to valid ranges", () => {
    render(React.createElement(SettingsExtra));

    const numberInputs = screen.getAllByRole(
      "spinbutton",
    ) as HTMLInputElement[];
    expect(numberInputs).toHaveLength(7);

    fireEvent.change(numberInputs[0], { target: { value: "999" } });
    fireEvent.change(numberInputs[1], { target: { value: "-5" } });
    fireEvent.change(numberInputs[5], { target: { value: "1" } });
    fireEvent.change(numberInputs[6], { target: { value: "100" } });

    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        extra: expect.objectContaining({ maxAgenticRounds: 100 }),
      }),
    );
    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        extra: expect.objectContaining({ turnRetryLimit: 0 }),
      }),
    );
    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        extra: expect.objectContaining({ maxToolCalls: 5 }),
      }),
    );
    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        extra: expect.objectContaining({ maxOutputTokensFallback: 1024 }),
      }),
    );
  });

  it("shows custom instruction warning when enabled and non-empty", () => {
    settingsState = {
      ...baseSettings(),
      extra: {
        ...baseSettings().extra,
        customInstructionEnabled: true,
        customInstruction: "  be dramatic  ",
      },
    };

    render(React.createElement(SettingsExtra));

    expect(
      screen.getByText("settings.extra.customPromptInjectionWarning"),
    ).toBeTruthy();
  });

  it("shows max output fallback warning when value is too low", () => {
    settingsState = {
      ...baseSettings(),
      extra: {
        ...baseSettings().extra,
        maxOutputTokensFallback: 4096,
      },
    };

    render(React.createElement(SettingsExtra));

    expect(
      screen.getByText("settings.extra.maxOutputTokensFallbackWarning"),
    ).toBeTruthy();
  });

  it("shows global and current soul markdown content", () => {
    render(React.createElement(SettingsExtra));

    const textareas = screen
      .getAllByRole("textbox")
      .filter(
        (element): element is HTMLTextAreaElement =>
          element instanceof HTMLTextAreaElement,
      );
    expect(
      textareas.some((textarea) =>
        textarea.value.includes("Mirror Global Soul"),
      ),
    ).toBe(true);
    expect(
      textareas.some((textarea) =>
        textarea.value.includes("Player Soul (This Save)"),
      ),
    ).toBe(true);
  });

  it("resets global soul in settings and writes VFS mirror", () => {
    render(React.createElement(SettingsExtra));

    fireEvent.click(screen.getByText("settings.extra.soul.resetGlobal"));

    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        playerProfile: expect.stringContaining("Player Soul (Global)"),
      }),
    );
    expect(writeFile).toHaveBeenCalledWith(
      "world/global/soul.md",
      expect.stringContaining("Player Soul (Global)"),
      "text/markdown",
    );
    expect(triggerSave).toHaveBeenCalledTimes(1);
  });

  it("resets current save soul and applies derived runtime state", () => {
    render(React.createElement(SettingsExtra));

    fireEvent.click(screen.getByText("settings.extra.soul.resetCurrent"));

    expect(writeFile).toHaveBeenCalledWith(
      "world/soul.md",
      expect.stringContaining("Player Soul (This Save)"),
      "text/markdown",
    );
    expect(deriveGameStateFromVfs).toHaveBeenCalledWith(
      expect.objectContaining({
        "shared/config/runtime/soul.md": expect.any(Object),
      }),
    );
    expect(applyVfsDerivedState).toHaveBeenCalledWith(
      expect.objectContaining({
        playerProfile: expect.any(String),
      }),
      "settings.extra.resetCurrentSoul",
    );
    expect(triggerSave).toHaveBeenCalledTimes(1);
  });

  it("shows unavailable current soul state when no active save", () => {
    runtimeContextState = {
      ...runtimeContextState,
      state: {
        ...runtimeContextState.state,
        currentSlotId: null,
      },
    };

    render(React.createElement(SettingsExtra));

    expect(
      screen.getByText("settings.extra.soul.currentUnavailable"),
    ).toBeTruthy();
    const resetCurrentButton = screen.getByText(
      "settings.extra.soul.resetCurrent",
    ) as HTMLButtonElement;
    expect(resetCurrentButton.disabled).toBe(true);
  });

  it("resets tutorial flags and reloads page", () => {
    render(React.createElement(SettingsExtra));

    fireEvent.click(screen.getByText("settings.extra.resetTutorialsButton"));

    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        extra: expect.objectContaining({
          tutorialStartScreenCompleted: false,
          tutorialGamePageCompleted: false,
        }),
      }),
    );
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });
});
