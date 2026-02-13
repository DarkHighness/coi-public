import { describe, expect, it } from "vitest";
import { VfsSession } from "@/services/vfs/vfsSession";
import {
  writeConversationIndex,
  writeTurnFile,
} from "@/services/vfs/conversation";
import {
  buildResponseFromVfs,
  createFinalLog,
  createIterationLog,
  getChangedEntitiesArray,
  getConversationMarker,
  trackChangedEntity,
} from "../resultAccumulator";

const createConversationState = (session: VfsSession): void => {
  writeConversationIndex(session, {
    activeForkId: 0,
    activeTurnId: "fork-0/turn-0",
    rootTurnIdByFork: { "0": "fork-0/turn-0" },
    latestTurnNumberByFork: { "0": 0 },
    turnOrderByFork: { "0": ["fork-0/turn-0"] },
  });

  writeTurnFile(session, 0, 0, {
    turnId: "fork-0/turn-0",
    forkId: 0,
    turnNumber: 0,
    parentTurnId: null,
    createdAt: 1,
    userAction: "Start",
    assistant: {
      narrative: "A cold wind rises.",
      choices: [{ text: "Move" }, { text: "Wait" }],
      narrativeTone: "tense",
      atmosphere: { envTheme: "horror", ambience: "storm" },
      ending: "continue",
      forceEnd: false,
    },
  });
};

describe("resultAccumulator", () => {
  it("returns null marker/response for empty VFS snapshot", () => {
    const session = new VfsSession();

    expect(getConversationMarker(session)).toBeNull();
    expect(buildResponseFromVfs(session)).toBeNull();
  });

  it("builds marker and latest response from conversation files", () => {
    const session = new VfsSession();
    createConversationState(session);

    const marker = getConversationMarker(session);
    expect(marker).toEqual({
      activeForkId: 0,
      activeTurnId: "fork-0/turn-0",
      latestTurnNumber: 0,
    });

    const response = buildResponseFromVfs(session);
    expect(response?.narrative).toBe("A cold wind rises.");
    expect(response?.choices).toEqual([{ text: "Move" }, { text: "Wait" }]);
    expect(response?.narrativeTone).toBe("tense");
    expect(response?.atmosphere).toEqual({
      envTheme: "horror",
      ambience: "storm",
    });
    expect(response?.finalState).toBeTruthy();

    expect(buildResponseFromVfs(session, marker)).toBeNull();
  });

  it("tracks changed entities and emits stable log envelopes", () => {
    const changed = new Map<string, string>();

    trackChangedEntity(changed, { success: true, id: "npc:1" }, "npc");
    trackChangedEntity(changed, { success: false, id: "npc:2" }, "npc");
    trackChangedEntity(changed, { success: true }, "npc");

    expect(getChangedEntitiesArray(changed)).toEqual([
      { id: "npc:1", type: "npc" },
    ]);

    const usage = { promptTokens: 1, completionTokens: 2, totalTokens: 3 };

    const iterationLog = createIterationLog(
      "openai",
      "m1",
      2,
      [{ name: "vfs_read", input: { path: "x" }, output: { ok: true } }],
      usage,
    );
    expect(iterationLog.endpoint).toBe("adventure-iteration-2");
    expect(iterationLog.toolCalls?.[0]?.name).toBe("vfs_read");
    expect(iterationLog.usage).toEqual(usage);

    const finalLog = createFinalLog(
      "openai",
      "m1",
      {
        narrative: "done",
        choices: [],
        inventoryActions: [],
        npcActions: [],
        locationActions: [],
        questActions: [],
        knowledgeActions: [],
        factionActions: [],
        timelineEvents: [],
      },
      usage,
    );
    expect(finalLog.endpoint).toBe("adventure-complete");
    expect((finalLog.parsedResult as any).narrative).toBe("done");
  });
});
