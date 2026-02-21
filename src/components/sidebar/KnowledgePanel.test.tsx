// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KnowledgePanel } from "./KnowledgePanel";
import type { ListState } from "../../types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: unknown) => {
      if (
        options &&
        typeof options === "object" &&
        "defaultValue" in options &&
        typeof (options as { defaultValue?: unknown }).defaultValue === "string"
      ) {
        return (options as { defaultValue: string }).defaultValue;
      }
      return key;
    },
  }),
}));

vi.mock("../render/MarkdownText", () => ({
  MarkdownText: ({ content }: { content: string }) =>
    React.createElement("span", null, content),
}));

vi.mock("../DetailedListModal", () => ({
  DetailedListModal: () => null,
}));

vi.mock("../../runtime/context", () => ({
  useOptionalRuntimeContext: () => null,
}));

const DEFAULT_LIST_STATE: ListState = {
  pinnedIds: [],
  customOrder: [],
  hiddenIds: [],
};

describe("KnowledgePanel", () => {
  it("resolves related entity IDs without runtime context", () => {
    render(
      React.createElement(KnowledgePanel, {
        knowledge: [
          {
            id: "know:archive",
            title: "Archive Note",
            category: "history",
            relatedTo: ["loc:market", "fac:unknown_militant"],
            visible: {
              description: "Old record",
            },
            unlocked: true,
            createdAt: 1,
            lastModified: 1,
          },
        ],
        themeFont: "font-theme",
        listState: DEFAULT_LIST_STATE,
        onUpdateList: vi.fn(),
        entityDisplayState: {
          playerActorId: "char:player",
          character: { name: "Player" },
          actors: [],
          npcs: [],
          locations: [
            {
              id: "loc:market",
              name: "Sky Market",
              isVisited: true,
              createdAt: 1,
              visible: { description: "Stub" },
            },
          ],
          quests: [],
          knowledge: [],
          factions: [],
          timeline: [],
          inventory: [],
        },
      }),
    );

    fireEvent.click(screen.getByText("Archive Note"));

    expect(screen.getByText("Sky Market")).toBeTruthy();
    expect(screen.getByText("Unknown Militant")).toBeTruthy();
    expect(screen.queryByText("loc:market")).toBeNull();
    expect(screen.queryByText("fac:unknown_militant")).toBeNull();
  });
});
