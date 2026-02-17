import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAgenticLoopRefactored } from "../agenticLoop";
import { checkpointVfsSession } from "@/services/vfs/runtimeCheckpoints";

const aiHandlerMock = vi.hoisted(() => ({
  handleAICall: vi.fn(),
}));

const toolProcessorMock = vi.hoisted(() => ({
  executeGenericTool: vi.fn(),
}));

vi.mock("../aiCallHandler", () => ({
  handleAICall: aiHandlerMock.handleAICall,
}));

vi.mock("../toolCallProcessor", () => ({
  executeGenericTool: toolProcessorMock.executeGenericTool,
}));

vi.mock("../../../sessionManager", () => ({
  sessionManager: {
    getProvider: vi.fn(() => ({})),
  },
}));

const createSettings = () =>
  ({
    story: {
      providerId: "provider-1",
      modelId: "model-1",
    },
    providers: {
      instances: [{ id: "provider-1", protocol: "openai" }],
    },
    modelContextWindows: { "provider-1::model-1": 100 },
    extra: {
      maxToolCalls: 20,
      maxAgenticRounds: 10,
      autoCompactEnabled: true,
      autoCompactThreshold: 0.7,
    },
    embedding: { enabled: false },
  }) as any;

const createGameState = () =>
  ({
    forkId: 0,
    turnNumber: 3,
  }) as any;

interface MockVfsSnapshotFile {
  path: string;
  contentType: string;
  content: string;
}

type MockVfsSnapshot = Record<string, MockVfsSnapshotFile>;

const createVfsSession = () => {
  const snapshots: MockVfsSnapshot[] = [
    {
      "conversation/index.json": {
        path: "conversation/index.json",
        contentType: "application/json",
        content: JSON.stringify({
          activeForkId: 0,
          activeTurnId: "fork-0/turn-2",
          latestTurnNumberByFork: { "0": 2 },
          turnOrderByFork: { "0": ["fork-0/turn-2"] },
          rootTurnIdByFork: { "0": "fork-0/turn-2" },
        }),
      },
      "conversation/turns/fork-0/turn-2.json": {
        path: "conversation/turns/fork-0/turn-2.json",
        contentType: "application/json",
        content: JSON.stringify({
          turnId: "fork-0/turn-2",
          parentTurnId: null,
          forkId: 0,
          turnNumber: 2,
          createdAt: 10,
          userAction: "old",
          assistant: {
            narrative: "old narrative",
            choices: [],
          },
        }),
      },
    },
    {
      "conversation/index.json": {
        path: "conversation/index.json",
        contentType: "application/json",
        content: JSON.stringify({
          activeForkId: 0,
          activeTurnId: "fork-0/turn-3",
          latestTurnNumberByFork: { "0": 3 },
          turnOrderByFork: { "0": ["fork-0/turn-2", "fork-0/turn-3"] },
          rootTurnIdByFork: { "0": "fork-0/turn-2" },
        }),
      },
      "conversation/turns/fork-0/turn-2.json": {
        path: "conversation/turns/fork-0/turn-2.json",
        contentType: "application/json",
        content: JSON.stringify({
          turnId: "fork-0/turn-2",
          parentTurnId: null,
          forkId: 0,
          turnNumber: 2,
          createdAt: 10,
          userAction: "old",
          assistant: {
            narrative: "old narrative",
            choices: [],
          },
        }),
      },
      "conversation/turns/fork-0/turn-3.json": {
        path: "conversation/turns/fork-0/turn-3.json",
        contentType: "application/json",
        content: JSON.stringify({
          turnId: "fork-0/turn-3",
          parentTurnId: "fork-0/turn-2",
          forkId: 0,
          turnNumber: 3,
          createdAt: 20,
          userAction: "next",
          assistant: {
            narrative: "new narrative",
            choices: [{ text: "A" }],
          },
        }),
      },
    },
  ];

  let cursor = 0;
  return {
    snapshot: () => snapshots[Math.min(cursor, snapshots.length - 1)],
    snapshotReadFenceState: vi.fn(() => ({ epoch: 0, reads: {} })),
    readFile: vi.fn(() => null),
    checkpoint: vi.fn(),
    rollback: vi.fn(() => true),
    restore: vi.fn(),
    restoreReadFenceState: vi.fn(),
    beginReadEpoch: vi.fn(),
    bindConversationSession: vi.fn(),
    drainOutOfBandReadInvalidations: vi.fn(() => []),
    noteToolSeen: vi.fn(),
    hasToolSeenInCurrentEpoch: vi.fn(() => true),
    markConversationTouched: vi.fn(() => {
      cursor = 1;
    }),
  } as any;
};

describe("agenticLoop context pressure recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triggers context recovery when usage crosses threshold before non-finish tool execution", async () => {
    const vfsSession = createVfsSession();
    checkpointVfsSession("session-1", vfsSession as any);
    aiHandlerMock.handleAICall.mockResolvedValue({
      text: "",
      usage: {
        promptTokens: 80,
        completionTokens: 5,
        totalTokens: 85,
      },
      functionCalls: [
        {
          id: "call-1",
          name: "vfs_write_file",
          args: { ops: [] },
        },
      ],
    });

    await expect(
      runAgenticLoopRefactored({
        protocol: "openai",
        instance: { id: "provider-1", protocol: "openai" } as any,
        modelId: "model-1",
        systemInstruction: "sys",
        initialContents: [],
        gameState: createGameState(),
        settings: createSettings(),
        sessionId: "session-1",
        vfsSession,
      }),
    ).rejects.toThrow(/CONTEXT_LENGTH_EXCEEDED/);

    expect(toolProcessorMock.executeGenericTool).not.toHaveBeenCalled();
    expect(vfsSession.restore).toHaveBeenCalledTimes(1);
    expect(vfsSession.restoreReadFenceState).toHaveBeenCalledTimes(1);
  });

  it("does not interrupt when finish tool is present in the same high-usage round", async () => {
    const vfsSession = createVfsSession();
    checkpointVfsSession("session-1", vfsSession as any);
    aiHandlerMock.handleAICall.mockResolvedValue({
      text: "",
      usage: {
        promptTokens: 80,
        completionTokens: 5,
        totalTokens: 85,
      },
      functionCalls: [
        {
          id: "call-finish",
          name: "vfs_finish_turn",
          args: {
            userAction: "next",
            assistant: { narrative: "new narrative", choices: [{ text: "A" }] },
          },
        },
      ],
    });

    toolProcessorMock.executeGenericTool.mockImplementation((name: string) => {
      if (name === "vfs_finish_turn") {
        vfsSession.markConversationTouched();
      }
      return { success: true };
    });

    const result = await runAgenticLoopRefactored({
      protocol: "openai",
      instance: { id: "provider-1", protocol: "openai" } as any,
      modelId: "model-1",
      systemInstruction: "sys",
      initialContents: [],
      gameState: createGameState(),
      settings: createSettings(),
      sessionId: "session-1",
      vfsSession,
    });

    expect(result.response.narrative).toBe("new narrative");
    expect(toolProcessorMock.executeGenericTool).toHaveBeenCalledTimes(1);
    expect(toolProcessorMock.executeGenericTool.mock.calls[0]?.[0]).toBe(
      "vfs_finish_turn",
    );
  });
});
