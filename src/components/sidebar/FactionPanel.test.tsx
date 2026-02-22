// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FactionPanel } from "./FactionPanel";

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

vi.mock("../render/MarkdownText", () => ({
  MarkdownText: ({ content }: { content: string }) =>
    React.createElement("span", null, content),
}));

vi.mock("../../runtime/context", () => ({
  useOptionalRuntimeContext: () => null,
}));

describe("FactionPanel", () => {
  it("does not render visible influence as row tag", () => {
    const influenceText =
      "Controls court logistics and the entire supply chain.";

    render(
      React.createElement(FactionPanel, {
        themeFont: "font-theme",
        factions: [
          {
            id: "fac:gamma",
            name: "Gamma Court",
            knownBy: ["char:player"],
            visible: {
              agenda: "Stabilize inner palace operations",
              influence: influenceText,
              members: [],
              relations: [],
            },
          },
        ],
      }),
    );

    expect(screen.queryByText(influenceText)).toBeNull();

    fireEvent.click(screen.getByText("Gamma Court"));
    expect(screen.getByText(influenceText)).toBeTruthy();
  });

  it("reveals hidden internal conflict when unlocked", () => {
    render(
      React.createElement(FactionPanel, {
        themeFont: "font-theme",
        unlockMode: true,
        factions: [
          {
            id: "fac:alpha",
            name: "Alpha Guild",
            knownBy: ["char:player"],
            visible: {
              agenda: "Control trade lanes",
              influence: "High",
              members: [],
              relations: [
                { target: "fac:beta", status: "Hostile" },
                { target: "fac:rogue_network", status: "Tense" },
              ],
            },
            hidden: {
              agenda: "Corner the black market",
              internalConflict: "Leaders disagree on alliance with Beta",
              influence: "Very High",
              members: [],
              relations: [{ target: "fac:beta", status: "Secret pact" }],
            },
            unlocked: true,
            unlockReason: "Captured encrypted leadership briefing",
          },
          {
            id: "fac:beta",
            name: "Beta Council",
            visible: { agenda: "Hold borders" },
          },
        ],
      }),
    );

    fireEvent.click(screen.getByText("Alpha Guild"));

    expect(
      screen.getByText("Leaders disagree on alliance with Beta"),
    ).toBeTruthy();
    expect(
      screen.getByText("Captured encrypted leadership briefing"),
    ).toBeTruthy();
    expect(screen.getAllByText("Beta Council").length).toBeGreaterThan(0);
    expect(screen.getByText("Rogue Network")).toBeTruthy();
  });
});
