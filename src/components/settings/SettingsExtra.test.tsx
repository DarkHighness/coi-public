// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let settingsState: any;
const updateSettings = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: unknown) => {
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
    customInstructionEnabled: false,
    customInstruction: "",
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

  it("hides deprecated clearer search tool controls", () => {
    render(React.createElement(SettingsExtra));

    expect(screen.queryByText("settings.extra.clearerSearchTool")).toBeNull();
    expect(
      screen.queryByText("settings.extra.clearerSearchToolHelp"),
    ).toBeNull();
  });

  it("does not render agentic loop controls in extra tab", () => {
    render(React.createElement(SettingsExtra));

    expect(screen.queryByText("settings.extra.agenticLoop")).toBeNull();
    expect(screen.queryByText("settings.extra.forceAutoToolChoice")).toBeNull();
    expect(
      screen.queryByText("settings.extra.maxOutputTokensFallback"),
    ).toBeNull();
    expect(
      screen.queryByText("settings.extra.providerManagedMaxTokens"),
    ).toBeNull();
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

  it("supports pan_gender selection", () => {
    render(React.createElement(SettingsExtra));

    const genderSelect = (
      screen.getAllByRole("combobox") as HTMLSelectElement[]
    ).find((select) =>
      Boolean(select.querySelector('option[value="pan_gender"]')),
    );
    expect(genderSelect).toBeTruthy();

    fireEvent.change(genderSelect as HTMLSelectElement, {
      target: { value: "pan_gender" },
    });

    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        extra: expect.objectContaining({ genderPreference: "pan_gender" }),
      }),
    );
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
