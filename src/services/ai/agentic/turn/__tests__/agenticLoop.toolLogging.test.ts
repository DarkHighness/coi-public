import { describe, expect, it, vi, beforeEach } from "vitest";
import { runAgenticLoopRefactored } from "../agenticLoop";

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
      mediaResolution: "high",
    },
    extra: {
      maxToolCalls: 20,
      maxAgenticRounds: 10,
      maxErrorRetries: 3,
    },
    embedding: { enabled: false },
  }) as any;

const createGameState = () =>
  ({
    forkId: 0,
    turnNumber: 3,
  }) as any;

const createVfsSession = () => {
  const snapshots: Record<string, any>[] = [
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
            narrative: "old",
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
            narrative: "old",
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
    checkpoint: vi.fn(),
    rollback: vi.fn(),
    beginReadEpoch: vi.fn(),
    bindConversationSession: vi.fn(),
    noteToolSeen: vi.fn(),
    hasToolSeenInCurrentEpoch: vi.fn(() => false),
    markConversationTouched: vi.fn(() => {
      cursor = 1;
    }),
  } as any;
};

describe("agenticLoop tool logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records all tool calls including final commit tool", async () => {
    const vfsSession = createVfsSession();

    aiHandlerMock.handleAICall.mockResolvedValue({
      text: "",
      usage: {
        promptTokens: 5,
        completionTokens: 3,
        totalTokens: 8,
      },
      functionCalls: [
        {
          id: "call-1",
          name: "vfs_read",
          args: { path: "current/world/global.json" },
        },
        {
          id: "call-2",
          name: "vfs_commit_turn",
          args: {
            userAction: "next",
            assistant: {
              narrative: "new narrative",
              choices: [{ text: "A" }],
            },
          },
        },
      ],
    });

    toolProcessorMock.executeGenericTool.mockImplementation((name: string) => {
      if (name === "vfs_commit_turn") {
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

    const toolLogs = result.logs.filter((log) => log.endpoint === "tool_execution");
    expect(toolLogs).toHaveLength(2);
    expect(toolLogs.map((log) => log.toolName)).toEqual([
      "vfs_read",
      "vfs_commit_turn",
    ]);
  });
});
