import { describe, expect, it } from "vitest";
import { buildInitialContext, buildTurnMessages } from "../messageBuilder";

const getText = (message: any): string =>
  message?.content?.find((part: any) => part.type === "text")?.text ?? "";

const createGameState = (overrides: Record<string, unknown> = {}) =>
  ({
    outline: {
      title: "Demo World",
      premise: "A world on edge.",
      mainGoal: "Survive",
      worldSetting: "Ruined city",
    },
    character: {
      name: "Hero",
      title: "Wanderer",
      race: "Human",
      profession: "Scout",
      conditions: [{ id: "cond:1", name: "Wounded" }],
      hiddenTraits: [],
    },
    npcs: [
      {
        id: "char:npc_1",
        visible: { name: "Visible NPC" },
        hidden: { trueName: "Hidden NPC" },
      },
    ],
    inventory: [{ id: "inv:1", name: "Knife" }],
    locations: [{ id: "loc:1", name: "Old Bridge" }],
    quests: [{ id: "quest:1", title: "Find Shelter" }],
    knowledge: [{ id: "knowledge:1", title: "The bridge is trapped" }],
    factions: [{ id: "faction:1", name: "Wardens" }],
    timeline: [{ id: "timeline:1", name: "Nightfall" }],
    summaries: [
      {
        id: 1,
        createdAt: 1,
        displayText: "Summary <unsafe> text",
        visible: {
          narrative: "visible",
          majorEvents: ["event-1"],
          characterDevelopment: "growth",
          worldState: "tense",
        },
        hidden: {
          truthNarrative: "truth",
          hiddenPlots: ["plot"],
          npcActions: ["action"],
          worldTruth: "truth-world",
          unrevealed: ["secret"],
        },
        nodeRange: { fromIndex: 0, toIndex: 2 },
      },
    ],
    lastSummarizedIndex: 3,
    godMode: true,
    ...overrides,
  }) as any;

describe("messageBuilder", () => {
  it("builds initial context blocks and final awaiting marker", () => {
    const messages = buildInitialContext(createGameState());
    const texts = messages.map(getText);

    expect(texts.some((text) => text.includes("[CONTEXT: World Foundation]"))).toBe(
      true,
    );
    expect(texts.some((text) => text.includes("[CONTEXT: Current Entities]"))).toBe(
      true,
    );
    expect(texts.some((text) => text.includes("[CONTEXT: Story Summary]"))).toBe(
      true,
    );
    expect(texts.some((text) => text.includes("[CONTEXT: God Mode]"))).toBe(true);
    expect(texts[texts.length - 1]).toBe("[Awaiting player action.]");

    expect(
      texts.some((text) => text.includes("[Story summary acknowledged.]")),
    ).toBe(true);
    expect(texts.join("\n")).toContain("&lt;unsafe&gt;");
  });

  it("builds turn messages with player-action prefix and sudo passthrough", () => {
    const normal = buildTurnMessages(createGameState({ godMode: false }), "open door");
    expect(getText(normal.userMessage)).toBe("[PLAYER_ACTION] open door");
    expect(normal.godModeContext).toBe("");

    const sudo = buildTurnMessages(createGameState(), "[SUDO] reset world");
    expect(getText(sudo.userMessage)).toBe("[SUDO] reset world");
    expect(sudo.godModeContext).toContain("GOD MODE ACTIVE");
  });
});
