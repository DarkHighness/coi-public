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
      maxToolCalls: 50,
      maxAgenticRounds: 20,
      maxErrorRetries: 3,
    },
    embedding: { enabled: false },
  }) as any;

const createGameState = () =>
  ({
    forkId: 0,
    turnNumber: 3,
    godMode: false,
    unlockMode: false,
  }) as any;

const createVfsSession = (hasSeenSkill: boolean) => {
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
    rollback: vi.fn(() => true),
    beginReadEpoch: vi.fn(),
    bindConversationSession: vi.fn(),
    drainOutOfBandReadInvalidations: vi.fn(() => []),
    noteToolSeen: vi.fn(),
    hasToolSeenInCurrentEpoch: vi.fn((path: string) =>
      hasSeenSkill && path === "skills/commands/sudo/SKILL.md",
    ),
    markConversationTouched: vi.fn(() => {
      cursor = 1;
    }),
  } as any;
};

describe("agenticLoop command skill gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks non-read tools in sudo mode when required skill not read", async () => {
    const vfsSession = createVfsSession(false);

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
          name: "vfs_edit",
          args: { edits: [] },
        },
      ],
    });

    const onToolCallsUpdate = vi.fn();

    toolProcessorMock.executeGenericTool.mockImplementation((name: string) => {
      if (name === "vfs_read") {
        return { success: true, path: "current/skills/commands/sudo/SKILL.md" };
      }
      return { success: true };
    });

    aiHandlerMock.handleAICall
      .mockResolvedValueOnce({
        text: "",
        usage: {
          promptTokens: 5,
          completionTokens: 3,
          totalTokens: 8,
        },
        functionCalls: [
          {
            id: "call-1-read",
            name: "vfs_read",
            args: { path: "current/skills/commands/sudo/SKILL.md" },
          },
        ],
      })
      .mockResolvedValueOnce({
        text: "",
        usage: {
          promptTokens: 5,
          completionTokens: 3,
          totalTokens: 8,
        },
        functionCalls: [
          {
            id: "call-2-edit",
            name: "vfs_edit",
            args: { edits: [] },
          },
        ],
      });

    const runPromise = runAgenticLoopRefactored({
      protocol: "openai",
      instance: { id: "provider-1", protocol: "openai" } as any,
      modelId: "model-1",
      systemInstruction: "sys",
      initialContents: [],
      gameState: createGameState(),
      settings: createSettings(),
      sessionId: "session-1",
      vfsSession,
      isSudoMode: true,
      onToolCallsUpdate,
    });

    await expect(runPromise).rejects.toThrow(/TURN_NOT_COMMITTED/);

    expect(aiHandlerMock.handleAICall).toHaveBeenCalledTimes(20);
    const onlyReadCalls = toolProcessorMock.executeGenericTool.mock.calls.every(
      (call) => call[0] === "vfs_read",
    );
    expect(onlyReadCalls).toBe(true);
  });

  it("allows non-read tools in sudo mode after skill is read", async () => {
    const vfsSession = createVfsSession(true);

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
          name: "vfs_edit",
          args: { edits: [] },
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
      sessionId: "session-2",
      vfsSession,
      isSudoMode: true,
    });

    expect(result.response.narrative).toBe("new narrative");
    expect(toolProcessorMock.executeGenericTool).toHaveBeenCalled();
  });
});
