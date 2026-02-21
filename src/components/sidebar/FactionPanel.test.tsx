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
              relations: [],
            },
            hidden: {
              agenda: "Corner the black market",
              internalConflict: "Leaders disagree on alliance with Beta",
              influence: "Very High",
              members: [],
              relations: [],
            },
            unlocked: true,
            unlockReason: "Captured encrypted leadership briefing",
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
  });
});
