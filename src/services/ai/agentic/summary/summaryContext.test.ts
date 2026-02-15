import { describe, expect, it } from "vitest";
import { VfsSession } from "../../../vfs/vfsSession";
import {
  buildTurnPath,
  writeConversationIndex,
  writeForkTree,
  writeTurnFile,
} from "../../../vfs/conversation";
import type { SummaryLoopInput } from "./summary";
import type { StorySummary } from "../../../../types";
import {
  buildSummaryInitialContext,
  getSummarySystemInstruction,
} from "./summaryContext";

const makeInput = (
  vfsSession: VfsSession,
  overrides: Partial<SummaryLoopInput> = {},
): SummaryLoopInput => ({
  vfsSession,
  slotId: "slot-1",
  forkId: 0,
  nodeRange: { fromIndex: 0, toIndex: 1 },
  baseSummaries: [],
  baseIndex: 0,
  language: "English",
  settings: {} as any,
  ...overrides,
});

const makeSummary = (): StorySummary =>
  ({
    id: 1,
    createdAt: 1,
    displayText: "A concise summary.",
    visible: {
      narrative: "Visible narrative",
      majorEvents: ["event-1"],
      characterDevelopment: "growth",
      worldState: "tense",
    },
    hidden: {
      truthNarrative: "Hidden truth",
      hiddenPlots: ["plot-1"],
      npcActions: ["npc-1"],
      worldTruth: "real world state",
      unrevealed: ["secret-1"],
    },
    timeRange: { from: "Day 1", to: "Day 2" },
    nodeRange: { fromIndex: 0, toIndex: 3 },
  }) as StorySummary;

describe("summaryContext", () => {
  it("includes optional NSFW and detail clauses when enabled", () => {
    const instruction = getSummarySystemInstruction("English", true, true);

    expect(instruction).toContain(
      "Maintain neutrality even when summarizing mature or violent content.",
    );
    expect(instruction).toContain(
      "Ensure key sensory details and character emotional shifts are captured",
    );
    expect(instruction).toContain("displayText: Brief 2-3 sentences");
    expect(instruction).toContain("in en, visible layer only");
    expect(instruction).toContain("read command protocol (hub first)");
    expect(instruction).toContain("current/skills/commands/runtime/SKILL.md");
    expect(instruction).toContain(
      "current/skills/commands/runtime/summary/SKILL.md",
    );
    expect(instruction).toContain("current/skills/core/protocols/SKILL.md");
    expect(instruction).toContain("current/skills/craft/writing/SKILL.md");
    expect(instruction).toContain("Loop quick-start (recommended)");
    expect(instruction).toContain("Read fork anchors");
    expect(instruction).toContain("read soul anchors once per read-epoch");
    expect(instruction).toContain("current/world/soul.md");
    expect(instruction).toContain("current/world/global/soul.md");
    expect(instruction).toContain("notes.md");
    expect(instruction).toContain("optional context only");
    expect(instruction).toContain("current/conversation/session.jsonl");
    expect(instruction).toContain('mode: "lines"');
    expect(instruction).toContain("Do NOT full-read large session.jsonl files");
    expect(instruction).toContain("Structured error recovery flow");
    expect(instruction).toContain("RUNTIME_FIELDS_FORBIDDEN");
  });

  it("builds minimal context when no prior summary or conversation exists", () => {
    const context = buildSummaryInitialContext(makeInput(new VfsSession()));

    expect(context).toContain('active_fork_id="unknown"');
    expect(context).toContain(
      "<previous_summary>None - this is the first summary</previous_summary>",
    );
    expect(context).toContain('<turn_files count="0">');
    expect(context).toContain("It MUST be your LAST tool call.");
  });

  it("includes previous summary, filtered turn files, and pending action", () => {
    const session = new VfsSession();

    writeConversationIndex(session, {
      activeForkId: 0,
      activeTurnId: "fork-0/turn-1",
      rootTurnIdByFork: { "0": "fork-0/turn-0" },
      latestTurnNumberByFork: { "0": 1 },
      turnOrderByFork: {
        "0": ["fork-0/turn-0", "fork-0/turn-1"],
      },
    });

    writeForkTree(session, {
      nodes: {
        0: {
          id: 0,
          parentId: null,
          createdAt: 0,
          createdAtTurn: 0,
          sourceNodeId: "",
        },
      },
      nextForkId: 2,
    });

    writeTurnFile(session, 0, 0, {
      turnId: "fork-0/turn-0",
      forkId: 0,
      turnNumber: 0,
      parentTurnId: null,
      createdAt: 1,
      userAction: "User said <hello> & asked",
      assistant: {
        narrative: "Assistant response one",
        choices: [],
      },
    });

    writeTurnFile(session, 0, 1, {
      turnId: "fork-0/turn-1",
      forkId: 0,
      turnNumber: 1,
      parentTurnId: "fork-0/turn-0",
      createdAt: 2,
      userAction: "",
      assistant: {
        narrative: "Assistant response two",
        choices: [],
      },
    });

    const context = buildSummaryInitialContext(
      makeInput(session, {
        baseSummaries: [makeSummary()],
        baseIndex: 2,
        nodeRange: { fromIndex: 2, toIndex: 2 },
        pendingPlayerAction: {
          segmentIdx: 2,
          text: "I open the hidden door",
        },
      }),
    );

    expect(context).toContain('active_fork_id="0"');
    expect(context).toContain('fork_count="1"');
    expect(context).toContain(
      "<display_text>A concise summary.</display_text>",
    );

    expect(context).toContain('<turn_files count="1">');
    expect(context).toContain(buildTurnPath(0, 1));
    expect(context).not.toContain(buildTurnPath(0, 0));

    expect(context).toContain('<pending_player_action segmentIdx="2">');
    expect(context).toContain("I open the hidden door");
  });
});
