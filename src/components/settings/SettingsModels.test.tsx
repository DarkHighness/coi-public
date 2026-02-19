// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULTS } from "../../utils/constants/defaults";

let settingsState: any;
const updateSettings = vi.fn();
const loadModels = vi.fn();
const showToast = vi.fn();

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
    providerModels: {},
    isLoadingModels: false,
    loadModels,
  }),
}));

import { SettingsModels } from "./SettingsModels";

describe("SettingsModels", () => {
  beforeEach(() => {
    settingsState = JSON.parse(JSON.stringify(DEFAULTS));
    vi.clearAllMocks();
  });

  it("renders agentic controls in models tab", () => {
    render(React.createElement(SettingsModels, { showToast }));

    expect(screen.getByText("settings.extra.agenticLoop")).toBeTruthy();
    expect(screen.getByText("settings.extra.forceAutoToolChoice")).toBeTruthy();
    expect(
      screen.getByText("settings.extra.providerManagedMaxTokens"),
    ).toBeTruthy();
  });

  it("toggles force auto tool choice in models tab", () => {
    render(React.createElement(SettingsModels, { showToast }));

    fireEvent.click(
      screen.getByRole("button", {
        name: "settings.extra.forceAutoToolChoice",
      }),
    );

    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        extra: expect.objectContaining({ forceAutoToolChoice: true }),
      }),
    );
  });

  it("toggles provider-managed max tokens in models tab", () => {
    render(React.createElement(SettingsModels, { showToast }));

    fireEvent.click(
      screen.getByRole("button", {
        name: "settings.extra.providerManagedMaxTokens",
      }),
    );

    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        extra: expect.objectContaining({ providerManagedMaxTokens: false }),
      }),
    );
  });
});
