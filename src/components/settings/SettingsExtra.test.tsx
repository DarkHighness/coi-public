// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let settingsState: any;
const updateSettings = vi.fn();

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

import { SettingsExtra } from "./SettingsExtra";

const baseSettings = () => ({
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

  it("clamps numeric extra settings to valid ranges", () => {
    render(React.createElement(SettingsExtra));

    const numberInputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    expect(numberInputs).toHaveLength(6);

    fireEvent.change(numberInputs[0], { target: { value: "999" } });
    fireEvent.change(numberInputs[1], { target: { value: "-5" } });
    fireEvent.change(numberInputs[5], { target: { value: "1" } });

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
