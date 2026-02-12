import { describe, expect, it } from "vitest";
import { VfsSession } from "@/services/vfs/vfsSession";
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
    npcs: [],
    inventory: [],
    locations: [],
    quests: [],
    knowledge: [],
    factions: [],
    timeline: [],
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

const createSession = (): VfsSession => {
  const session = new VfsSession();
  session.writeFile(
    "outline/outline.json",
    JSON.stringify({ title: "Demo World", premise: "A world on edge." }),
    "application/json",
  );
  session.writeFile(
    "world/characters/char:player/profile.json",
    JSON.stringify({ name: "Hero", title: "Wanderer" }),
    "application/json",
  );
  session.writeFile(
    "world/global.json",
    JSON.stringify({ turnNumber: 10, forkId: 0 }),
    "application/json",
  );
  return session;
};

describe("messageBuilder", () => {
  it("builds initial context blocks and final awaiting marker", () => {
    const messages = buildInitialContext(createGameState(), createSession());
    const texts = messages.map(getText);

    expect(texts.some((text) => text.includes("[CONTEXT: World Foundation]"))).toBe(
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
    expect(texts.join("\n")).not.toContain("[CONTEXT: Current Entities]");
  });

  it("injects hot-start references context from latest summary markdown", () => {
    const messages = buildInitialContext(
      createGameState({
        summaries: [
          {
            id: 1,
            displayText: "old",
            nextSessionReferencesMarkdown: "- current/skills/commands/runtime/SKILL.md",
          },
          {
            id: 2,
            displayText: "new",
            nextSessionReferencesMarkdown:
              "- current/conversation/session.jsonl\n- current/skills/index.json",
          },
        ],
      }),
      createSession(),
    );

    const texts = messages.map(getText);
    const hotStartBlock = texts.find((text) =>
      text.includes("[CONTEXT: Hot Start References]"),
    );
    expect(hotStartBlock).toContain("current/conversation/session.jsonl");
    expect(hotStartBlock).toContain("current/skills/index.json");
    expect(
      texts.some((text) => text.includes("[Hot-start references acknowledged.]")),
    ).toBe(true);
  });

  it("builds turn messages with player-action prefix and sudo passthrough", () => {
    const normal = buildTurnMessages(
      createGameState({ godMode: false }),
      "open door",
      createSession(),
    );
    expect(getText(normal.userMessage)).toBe("[PLAYER_ACTION] open door");
    expect(normal.godModeContext).toBe("");

    const sudo = buildTurnMessages(
      createGameState(),
      "[SUDO] reset world",
      createSession(),
    );
    expect(getText(sudo.userMessage)).toBe("[SUDO] reset world");
    expect(sudo.godModeContext).toContain("GOD MODE ACTIVE");
  });
});
