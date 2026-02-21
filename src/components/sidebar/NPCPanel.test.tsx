// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NPCPanel, buildNpcList } from "./NPCPanel";

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

vi.mock("../../runtime/context", () => ({
  useOptionalRuntimeContext: () => null,
}));

vi.mock("../DetailedListModal", () => ({
  DetailedListModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? React.createElement("div", null, "detailed-modal") : null,
}));

vi.mock("../render/MarkdownText", () => ({
  MarkdownText: ({ content }: { content: string }) =>
    React.createElement("span", null, content),
}));

const makeNpc = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "char:npc_1",
    kind: "npc",
    knownBy: ["char:player"],
    currentLocation: "loc:1",
    visible: {
      name: "NPC One",
      description: "A mysterious stranger",
      status: "Idle",
      race: "Human",
      gender: "Female",
    },
    hidden: { race: "High Dimension", gender: "Unknown Truth" },
    ...overrides,
  }) as any;

describe("NPCPanel", () => {
  it("filters NPC list by player knowledge when unlockMode is false", () => {
    const list = buildNpcList(
      [
        makeNpc({ id: "npc-1", knownBy: [] }),
        makeNpc({ id: "npc-2", knownBy: ["char:player"] }),
      ],
      "char:player",
      false,
    );

    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("npc-2");
  });

  it("renders empty state when no visible NPCs", () => {
    render(
      React.createElement(NPCPanel, {
        npcs: [],
        actors: [],
        playerActorId: "char:player",
        locations: [],
        themeFont: "font-theme",
        listState: { pinnedIds: [], customOrder: [], hiddenIds: [] },
        onUpdateList: vi.fn(),
      }),
    );

    expect(screen.getByText("emptyNpcs")).toBeTruthy();
  });

  it("shows visible NPC count in header badge", () => {
    render(
      React.createElement(NPCPanel, {
        npcs: [
          makeNpc({ id: "npc-1", knownBy: ["char:player"] }),
          makeNpc({ id: "npc-2", knownBy: [] }),
        ],
        actors: [],
        playerActorId: "char:player",
        locations: [],
        themeFont: "font-theme",
        listState: { pinnedIds: [], customOrder: [], hiddenIds: [] },
        onUpdateList: vi.fn(),
      }),
    );

    expect(screen.getByText("npcs")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("toggles edit mode button state", () => {
    render(
      React.createElement(NPCPanel, {
        npcs: [makeNpc()],
        actors: [],
        playerActorId: "char:player",
        locations: [],
        themeFont: "font-theme",
        listState: { pinnedIds: [], customOrder: [], hiddenIds: [] },
        onUpdateList: vi.fn(),
      }),
    );

    const editButton = screen.getByTitle("edit");
    fireEvent.click(editButton);

    expect(screen.getByTitle("done")).toBeTruthy();
  });

  it("opens detailed list modal from view all button", () => {
    render(
      React.createElement(NPCPanel, {
        npcs: [makeNpc()],
        actors: [],
        playerActorId: "char:player",
        locations: [],
        themeFont: "font-theme",
        listState: { pinnedIds: [], customOrder: [], hiddenIds: [] },
        onUpdateList: vi.fn(),
      }),
    );

    fireEvent.click(screen.getByTitle("edit"));
    fireEvent.click(screen.getByTitle("viewAll"));
    expect(screen.getByText("detailed-modal")).toBeTruthy();
  });

  it("shows visible race/gender and gates hidden race/gender by unlock", () => {
    const baseProps = {
      npcs: [makeNpc()],
      actors: [],
      playerActorId: "char:player",
      locations: [],
      themeFont: "font-theme",
      listState: { pinnedIds: [], customOrder: [], hiddenIds: [] },
      onUpdateList: vi.fn(),
    };

    const { rerender } = render(React.createElement(NPCPanel, baseProps));

    fireEvent.click(screen.getByText("NPC One"));
    expect(screen.getByText("Human")).toBeTruthy();
    expect(screen.getByText("Female")).toBeTruthy();
    expect(screen.queryByText("High Dimension")).toBeNull();
    expect(screen.queryByText("Unknown Truth")).toBeNull();

    rerender(React.createElement(NPCPanel, { ...baseProps, unlockMode: true }));
    fireEvent.click(screen.getByText("NPC One"));
    expect(screen.getByText("High Dimension")).toBeTruthy();
    expect(screen.getByText("Unknown Truth")).toBeTruthy();
  });

  it("does not reveal attitude hidden details when relation unlock is NPC-only", () => {
    const npc = makeNpc({
      knownBy: ["char:player"],
      unlocked: true,
      hidden: { realMotives: "Player-unlocked NPC truth" },
      relations: [
        {
          id: "rel:attitude-1",
          kind: "attitude",
          to: { kind: "character", id: "char:player" },
          knownBy: ["char:npc_1"],
          unlocked: true,
          unlockReason: "NPC-only unlock",
          visible: { signals: ["Cold smile"] },
          hidden: { affinity: 70, impression: "Secret impression" },
        },
      ],
    });

    render(
      React.createElement(NPCPanel, {
        npcs: [npc],
        actors: [],
        playerActorId: "char:player",
        locations: [],
        themeFont: "font-theme",
        listState: { pinnedIds: [], customOrder: [], hiddenIds: [] },
        onUpdateList: vi.fn(),
      }),
    );

    fireEvent.click(screen.getByText("NPC One"));
    expect(screen.getByText("Player-unlocked NPC truth")).toBeTruthy();
    expect(screen.queryByText("NPC-only unlock")).toBeNull();
    expect(screen.queryByText("Secret impression")).toBeNull();
  });
});
