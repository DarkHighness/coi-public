// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuestPanel } from "./QuestPanel";

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

vi.mock("../DetailedListModal", () => ({
  DetailedListModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? React.createElement("div", null, "detailed-modal") : null,
}));

vi.mock("../render/MarkdownText", () => ({
  MarkdownText: ({ content }: { content: string }) =>
    React.createElement("span", null, content),
}));

describe("QuestPanel", () => {
  it("renders visible objectives in expanded quest", () => {
    render(
      React.createElement(QuestPanel, {
        quests: [
          {
            id: "quest:1",
            title: "Find the Relay",
            type: "main",
            status: "active",
            knownBy: ["char:player"],
            createdAt: 1,
            lastModified: 1,
            visible: {
              description: "Travel to the old station",
              objectives: ["Reach the station", "Recover the keycard"],
            },
          } as any,
        ],
        themeFont: "font-theme",
        listState: { pinnedIds: [], customOrder: [], hiddenIds: [] },
        onUpdateList: vi.fn(),
      }),
    );

    fireEvent.click(screen.getByText("Find the Relay"));

    expect(screen.getByText("Reach the station")).toBeTruthy();
    expect(screen.getByText("Recover the keycard")).toBeTruthy();
  });
});
