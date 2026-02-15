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
      turnRetryLimit: 3,
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
    hasToolSeenInCurrentEpoch: vi.fn((path: string) => {
      if (!hasSeenSkill) return false;
      return new Set([
        "skills/commands/runtime/SKILL.md",
        "skills/commands/runtime/turn/SKILL.md",
        "skills/commands/runtime/sudo/SKILL.md",
        "skills/commands/runtime/cleanup/SKILL.md",
        "skills/commands/runtime/god/SKILL.md",
        "skills/commands/runtime/unlock/SKILL.md",
        "skills/presets/runtime/narrative-style/SKILL.md",
      ]).has(path);
    }),
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
          name: "vfs_write",
          args: { edits: [] },
        },
      ],
    });

    const onToolCallsUpdate = vi.fn();

    toolProcessorMock.executeGenericTool.mockImplementation((name: string) => {
      if (name === "vfs_read") {
        return {
          success: true,
          path: "current/skills/commands/runtime/sudo/SKILL.md",
        };
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
            args: { path: "current/skills/commands/runtime/sudo/SKILL.md" },
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
            name: "vfs_write",
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

  it("blocks non-read tools in normal mode when runtime skills are unread", async () => {
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
          name: "vfs_write",
          args: { edits: [] },
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
        sessionId: "session-normal-gate",
        vfsSession,
      }),
    ).rejects.toThrow(/TURN_NOT_COMMITTED/);

    expect(aiHandlerMock.handleAICall).toHaveBeenCalledTimes(20);
    expect(toolProcessorMock.executeGenericTool).not.toHaveBeenCalled();
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
          name: "vfs_write",
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

  it("blocks cross-fork path references during cleanup turns", async () => {
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
          id: "call-cross-fork-read",
          name: "vfs_read",
          args: { path: "conversation/turns/fork-3/turn-1.json" },
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
        sessionId: "session-cleanup-cross-fork",
        vfsSession,
        isCleanupMode: true,
      }),
    ).rejects.toThrow(/TURN_NOT_COMMITTED/);

    expect(toolProcessorMock.executeGenericTool).not.toHaveBeenCalled();
  });

  it("blocks non-read tools when preset skill is required but unread", async () => {
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
          name: "vfs_write",
          args: { edits: [] },
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
        sessionId: "session-preset-gate",
        vfsSession,
        requiredPresetSkillPaths: [
          "skills/presets/runtime/narrative-style/SKILL.md",
        ],
      }),
    ).rejects.toThrow(/TURN_NOT_COMMITTED/);

    expect(aiHandlerMock.handleAICall).toHaveBeenCalledTimes(20);
    expect(toolProcessorMock.executeGenericTool).not.toHaveBeenCalled();
  });
});
