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

interface MockVfsSnapshotFile {
  path: string;
  contentType: string;
  content: string;
}

type MockVfsSnapshot = Record<string, MockVfsSnapshotFile>;

const createVfsSession = (hasSeenSkill: boolean, seenSkillPaths?: string[]) => {
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
  const defaultSeenPaths = [
    "skills/commands/runtime/SKILL.md",
    "skills/commands/runtime/turn/SKILL.md",
    "skills/commands/runtime/player-rate/SKILL.md",
    "skills/commands/runtime/sudo/SKILL.md",
    "skills/commands/runtime/cleanup/SKILL.md",
    "skills/core/protocols/SKILL.md",
    "skills/craft/writing/SKILL.md",
    "skills/commands/runtime/god/SKILL.md",
    "skills/commands/runtime/unlock/SKILL.md",
    "workspace/SOUL.md",
    "workspace/USER.md",
    "skills/presets/runtime/narrative-style/SKILL.md",
    "skills/gm/actor-logic/npc/SKILL.md",
  ];

  return {
    snapshot: () => snapshots[Math.min(cursor, snapshots.length - 1)],
    checkpoint: vi.fn(),
    rollback: vi.fn(() => true),
    beginReadEpoch: vi.fn(),
    bindConversationSession: vi.fn(),
    drainOutOfBandReadInvalidations: vi.fn(() => []),
    noteToolSeen: vi.fn(),
    readFile: vi.fn((path: string) =>
      path.endsWith("SKILL.md")
        ? {
            content: `# Skill\nMock skill content for ${path}`,
            contentType: "text/markdown",
          }
        : null,
    ),
    hasToolSeenInCurrentEpoch: vi.fn((path: string) => {
      if (!hasSeenSkill) return false;
      return new Set(seenSkillPaths ?? defaultSeenPaths).has(path);
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

  it("does not re-list preloaded command skills in cold-start read hints", async () => {
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
          id: "call-finish",
          name: "vfs_finish_turn",
          args: {
            userAction: "next",
            assistant: {
              narrative: "done",
              choices: [],
            },
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

    await runAgenticLoopRefactored({
      protocol: "openai",
      instance: { id: "provider-1", protocol: "openai" } as any,
      modelId: "model-1",
      systemInstruction: "sys",
      initialContents: [],
      gameState: createGameState(),
      settings: createSettings(),
      sessionId: "session-cold-start-read-hints",
      vfsSession,
    });

    const firstAiCall = aiHandlerMock.handleAICall.mock.calls[0]?.[0] as any;
    const conversationHistory = (firstAiCall?.conversationHistory ??
      []) as any[];
    const coldStartMessage = conversationHistory.find((message) => {
      const text = message?.content?.find(
        (part: any) => part?.type === "text" && typeof part?.text === "string",
      )?.text;
      return (
        typeof text === "string" &&
        text.includes("[SYSTEM: COLD START REQUIRED READS]")
      );
    });

    const coldStartText =
      coldStartMessage?.content?.find((part: any) => part?.type === "text")
        ?.text ?? "";

    expect(coldStartText).toContain("current/session/lineage.json");
    expect(coldStartText).not.toContain(
      "current/skills/commands/runtime/SKILL.md",
    );
    expect(coldStartText).not.toContain(
      "current/skills/commands/runtime/turn/SKILL.md",
    );
    expect(coldStartText).not.toContain(
      "current/skills/core/protocols/SKILL.md",
    );
    expect(coldStartText).not.toContain(
      "current/skills/craft/writing/SKILL.md",
    );
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
          name: "vfs_write_file",
          args: { ops: [] },
        },
      ],
    });

    const onToolCallsUpdate = vi.fn();

    toolProcessorMock.executeGenericTool.mockImplementation((name: string) => {
      if (name === "vfs_read_chars") {
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
            name: "vfs_read_chars",
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
            name: "vfs_write_file",
            args: { ops: [] },
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
      (call) => call[0] === "vfs_read_chars",
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
        sessionId: "session-normal-gate",
        vfsSession,
      }),
    ).rejects.toThrow(/TURN_NOT_COMMITTED/);

    expect(aiHandlerMock.handleAICall).toHaveBeenCalledTimes(20);
    expect(toolProcessorMock.executeGenericTool).not.toHaveBeenCalled();
  });

  it("blocks vfs_vm before preflight reads are satisfied", async () => {
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
          id: "call-vm-preflight",
          name: "vfs_vm",
          args: {
            scripts: [
              "async function main(ctx) { console.log({ step: 'preflight-check' }); return null; }",
            ],
          },
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
        sessionId: "session-vm-preflight-gate",
        vfsSession,
      }),
    ).rejects.toThrow(/TURN_NOT_COMMITTED/);

    expect(aiHandlerMock.handleAICall).toHaveBeenCalledTimes(20);
    expect(toolProcessorMock.executeGenericTool).not.toHaveBeenCalled();
  });

  it("blocks mixed batches that include vfs_vm with other top-level calls", async () => {
    const vfsSession = createVfsSession(true);

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
            id: "call-vm-mixed",
            name: "vfs_vm",
            args: {
              scripts: [
                "async function main(ctx) { console.log('vm-batch'); }",
              ],
            },
          },
          {
            id: "call-read-mixed",
            name: "vfs_read_chars",
            args: { path: "current/workspace/SOUL.md" },
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
            id: "call-finish",
            name: "vfs_finish_turn",
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

    toolProcessorMock.executeGenericTool.mockResolvedValue({ success: true });

    await runAgenticLoopRefactored({
      protocol: "openai",
      instance: { id: "provider-1", protocol: "openai" } as any,
      modelId: "model-1",
      systemInstruction: "sys",
      initialContents: [],
      gameState: createGameState(),
      settings: createSettings(),
      sessionId: "session-vm-mixed-batch",
      vfsSession,
    });

    expect(toolProcessorMock.executeGenericTool).toHaveBeenCalledTimes(1);
    expect(toolProcessorMock.executeGenericTool.mock.calls[0]?.[0]).toBe(
      "vfs_finish_turn",
    );
  });

  it("allows read-only inspection tools in cold start even when runtime skills are unread", async () => {
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
          id: "call-readonly-search",
          name: "vfs_search",
          args: { query: "soul", path: "current/world" },
        },
      ],
    });

    toolProcessorMock.executeGenericTool.mockResolvedValue({
      success: true,
      data: { results: [] },
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
        sessionId: "session-readonly-cold-start",
        vfsSession,
      }),
    ).rejects.toThrow(/TURN_NOT_COMMITTED/);

    expect(aiHandlerMock.handleAICall).toHaveBeenCalledTimes(20);
    expect(toolProcessorMock.executeGenericTool).toHaveBeenCalled();
    const onlyReadOnlyCalls =
      toolProcessorMock.executeGenericTool.mock.calls.every(
        (call) => call[0] === "vfs_search",
      );
    expect(onlyReadOnlyCalls).toBe(true);
  });

  it("blocks non-read tools in player-rate mode when player-rate skill is unread", async () => {
    const vfsSession = createVfsSession(true, [
      "skills/commands/runtime/SKILL.md",
      "skills/commands/runtime/turn/SKILL.md",
    ]);

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
        initialContents: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: '[Player Rate] {"turnId":"fork-0/turn-2","vote":"down"}',
              },
            ],
          } as any,
        ],
        gameState: createGameState(),
        settings: createSettings(),
        sessionId: "session-rate-gate",
        vfsSession,
      }),
    ).rejects.toThrow(/TURN_NOT_COMMITTED/);

    expect(toolProcessorMock.executeGenericTool).not.toHaveBeenCalled();
    expect(vfsSession.hasToolSeenInCurrentEpoch).toHaveBeenCalledWith(
      "skills/commands/runtime/player-rate/SKILL.md",
    );
  });

  it("finishes player-rate loop via vfs_end_turn without creating conversation turn", async () => {
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
          id: "call-rate-finish",
          name: "vfs_end_turn",
          args: {
            currentSoul:
              "# Player Soul (This Save)\n\n## Guidance For AI\n- keep concise.\n",
          },
        },
      ],
    });

    toolProcessorMock.executeGenericTool.mockResolvedValue({
      success: true,
      data: {
        updated: ["current/workspace/SOUL.md"],
      },
    });

    const result = await runAgenticLoopRefactored({
      protocol: "openai",
      instance: { id: "provider-1", protocol: "openai" } as any,
      modelId: "model-1",
      systemInstruction: "sys",
      initialContents: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: '[Player Rate] {"turnId":"fork-0/turn-2","vote":"down"}',
            },
          ],
        } as any,
      ],
      gameState: createGameState(),
      settings: createSettings(),
      sessionId: "session-rate-finish",
      vfsSession,
    });

    expect(result.response.narrative).toBe("");
    expect(toolProcessorMock.executeGenericTool).toHaveBeenCalledWith(
      "vfs_end_turn",
      expect.anything(),
      expect.anything(),
    );
  });

  it("does not block non-read tools on SOUL/USER read state", async () => {
    const vfsSession = createVfsSession(true, [
      "skills/commands/runtime/SKILL.md",
      "skills/commands/runtime/turn/SKILL.md",
      "skills/core/protocols/SKILL.md",
      "skills/craft/writing/SKILL.md",
    ]);

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
        sessionId: "session-soul-gate",
        vfsSession,
      }),
    ).rejects.toThrow(/TURN_NOT_COMMITTED/);

    expect(toolProcessorMock.executeGenericTool).toHaveBeenCalledWith(
      "vfs_write_file",
      expect.anything(),
      expect.anything(),
    );
  });

  it("keeps mixed batches executable without SOUL_NOT_READ gating", async () => {
    const seenPaths = [
      "skills/commands/runtime/SKILL.md",
      "skills/commands/runtime/turn/SKILL.md",
      "skills/core/protocols/SKILL.md",
      "skills/craft/writing/SKILL.md",
      "skills/gm/actor-logic/npc/SKILL.md",
    ];
    const vfsSession = createVfsSession(true, seenPaths);

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
            id: "call-write-before-soul",
            name: "vfs_write_file",
            args: { ops: [] },
          },
          {
            id: "call-read-soul",
            name: "vfs_read_lines",
            args: {
              path: "current/workspace/SOUL.md",
              startLine: 1,
              lineCount: 20,
            },
          },
          {
            id: "call-read-global-soul",
            name: "vfs_read_lines",
            args: {
              path: "current/workspace/USER.md",
              startLine: 1,
              lineCount: 20,
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        text: "",
        usage: {
          promptTokens: 4,
          completionTokens: 2,
          totalTokens: 6,
        },
        functionCalls: [
          {
            id: "call-write-after-soul",
            name: "vfs_write_file",
            args: { ops: [] },
          },
          {
            id: "call-finish",
            name: "vfs_finish_turn",
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

    toolProcessorMock.executeGenericTool.mockImplementation(
      (name: string, args: Record<string, unknown>) => {
        if (name === "vfs_read_lines") {
          const path = String(args.path ?? "");
          if (path === "current/workspace/SOUL.md") {
            seenPaths.push("workspace/SOUL.md");
          } else if (path === "current/workspace/USER.md") {
            seenPaths.push("workspace/USER.md");
          }
          return { success: true, path };
        }

        if (name === "vfs_finish_turn") {
          vfsSession.markConversationTouched();
          return { success: true };
        }

        return { success: true };
      },
    );

    const result = await runAgenticLoopRefactored({
      protocol: "openai",
      instance: { id: "provider-1", protocol: "openai" } as any,
      modelId: "model-1",
      systemInstruction: "sys",
      initialContents: [],
      gameState: createGameState(),
      settings: createSettings(),
      sessionId: "session-soul-mixed-batch",
      vfsSession,
    });

    expect(result.response.narrative).toBe("new narrative");
    expect(aiHandlerMock.handleAICall).toHaveBeenCalledTimes(2);
    expect(
      toolProcessorMock.executeGenericTool.mock.calls.map((call) => call[0]),
    ).toEqual([
      "vfs_write_file",
      "vfs_read_lines",
      "vfs_read_lines",
      "vfs_write_file",
      "vfs_finish_turn",
    ]);

    const soulReadLogs = result.logs.filter(
      (log) =>
        log.endpoint === "tool_execution" && log.toolName === "vfs_read_lines",
    );
    expect(soulReadLogs).toHaveLength(2);
    expect(
      soulReadLogs.every((log) => (log as any).toolOutput?.success === true),
    ).toBe(true);
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
          name: "vfs_write_file",
          args: { ops: [] },
        },
        {
          id: "call-2",
          name: "vfs_finish_turn",
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
          name: "vfs_read_chars",
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

  it("preloads unread preset skills and avoids preset gate retries", async () => {
    const seenPaths = [
      "skills/commands/runtime/SKILL.md",
      "skills/commands/runtime/turn/SKILL.md",
      "skills/core/protocols/SKILL.md",
      "skills/craft/writing/SKILL.md",
    ];
    const vfsSession = createVfsSession(true, seenPaths);

    (vfsSession.noteToolSeen as any).mockImplementation((path: string) => {
      const normalized = String(path || "").replace(/^current\//, "");
      if (!seenPaths.includes(normalized)) {
        seenPaths.push(normalized);
      }
    });

    aiHandlerMock.handleAICall.mockResolvedValue({
      text: "",
      usage: {
        promptTokens: 5,
        completionTokens: 3,
        totalTokens: 8,
      },
      functionCalls: [
        {
          id: "call-write",
          name: "vfs_write_file",
          args: { ops: [] },
        },
        {
          id: "call-finish",
          name: "vfs_finish_turn",
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
      sessionId: "session-preset-preload",
      vfsSession,
      requiredPresetSkillPaths: ["skills/presets/runtime/culture/SKILL.md"],
    });

    expect(result.response.narrative).toBe("new narrative");
    expect(
      toolProcessorMock.executeGenericTool.mock.calls.map((call) => call[0]),
    ).toEqual(["vfs_write_file", "vfs_finish_turn"]);
    expect(vfsSession.noteToolSeen).toHaveBeenCalledWith(
      "skills/presets/runtime/culture/SKILL.md",
    );

    const firstAiCall = aiHandlerMock.handleAICall.mock.calls[0]?.[0] as any;
    const conversationHistory = (firstAiCall?.conversationHistory ??
      []) as any[];
    const presetFileMessage = conversationHistory.find((message) => {
      const text = message?.content?.find(
        (part: any) => part?.type === "text" && typeof part?.text === "string",
      )?.text;
      return (
        typeof text === "string" &&
        text.includes('path="current/skills/presets/runtime/culture/SKILL.md"')
      );
    });
    expect(presetFileMessage).toBeDefined();
  });

  it("blocks non-read tools when culture preset skill is required but unread", async () => {
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
          id: "call-culture-blocked",
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
        sessionId: "session-culture-preset-gate",
        vfsSession,
        requiredPresetSkillPaths: [
          "skills/presets/runtime/culture/SKILL.md",
          "skills/presets/runtime/culture-japanese/SKILL.md",
        ],
      }),
    ).rejects.toThrow(/TURN_NOT_COMMITTED/);

    expect(toolProcessorMock.executeGenericTool).not.toHaveBeenCalled();
  });

  it("allows non-read tools after required culture preset skills are read", async () => {
    const vfsSession = createVfsSession(true, [
      "skills/commands/runtime/SKILL.md",
      "skills/commands/runtime/turn/SKILL.md",
      "skills/core/protocols/SKILL.md",
      "skills/craft/writing/SKILL.md",
      "workspace/SOUL.md",
      "workspace/USER.md",
      "skills/presets/runtime/culture/SKILL.md",
      "skills/presets/runtime/culture-japanese/SKILL.md",
    ]);

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
          name: "vfs_write_file",
          args: { ops: [] },
        },
        {
          id: "call-2",
          name: "vfs_finish_turn",
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
      sessionId: "session-culture-preset-pass",
      vfsSession,
      requiredPresetSkillPaths: [
        "skills/presets/runtime/culture/SKILL.md",
        "skills/presets/runtime/culture-japanese/SKILL.md",
      ],
    });

    expect(result.response.narrative).toBe("new narrative");
    expect(toolProcessorMock.executeGenericTool).toHaveBeenCalled();
  });

  it("auto-preloads player required skills instead of waiting for AI read calls", async () => {
    const seenPaths = [
      "skills/commands/runtime/SKILL.md",
      "skills/commands/runtime/turn/SKILL.md",
      "skills/core/protocols/SKILL.md",
      "skills/craft/writing/SKILL.md",
    ];
    const vfsSession = createVfsSession(true, seenPaths);
    const settings = createSettings();
    settings.extra.skillReadPolicies = {
      "skills/gm/moral-complexity/SKILL.md": "required",
    };

    (vfsSession.noteToolSeen as any).mockImplementation((path: string) => {
      const normalized = String(path || "").replace(/^current\//, "");
      if (!seenPaths.includes(normalized)) {
        seenPaths.push(normalized);
      }
    });

    aiHandlerMock.handleAICall.mockResolvedValue({
      text: "",
      usage: {
        promptTokens: 5,
        completionTokens: 3,
        totalTokens: 8,
      },
      functionCalls: [
        {
          id: "call-write",
          name: "vfs_write_file",
          args: { ops: [] },
        },
        {
          id: "call-finish",
          name: "vfs_finish_turn",
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
      settings,
      sessionId: "session-policy-required-preload",
      vfsSession,
    });

    expect(result.response.narrative).toBe("new narrative");
    expect(
      toolProcessorMock.executeGenericTool.mock.calls.map((call) => call[0]),
    ).toEqual(["vfs_write_file", "vfs_finish_turn"]);
    expect(vfsSession.noteToolSeen).toHaveBeenCalledWith(
      "skills/gm/moral-complexity/SKILL.md",
    );

    const firstAiCall = aiHandlerMock.handleAICall.mock.calls[0]?.[0] as any;
    const conversationHistory = (firstAiCall?.conversationHistory ??
      []) as any[];
    const requiredSkillFileMessage = conversationHistory.find((message) => {
      const text = message?.content?.find(
        (part: any) => part?.type === "text" && typeof part?.text === "string",
      )?.text;
      return (
        typeof text === "string" &&
        text.includes('path="current/skills/gm/moral-complexity/SKILL.md"')
      );
    });
    expect(requiredSkillFileMessage).toBeDefined();
  });

  it("preloads required skills once per session and reuses persisted context", async () => {
    const seenPaths: string[] = [];
    const vfsSession = createVfsSession(true, seenPaths);

    (vfsSession.noteToolSeen as any).mockImplementation((path: string) => {
      const normalized = String(path || "").replace(/^current\//, "");
      if (!seenPaths.includes(normalized)) {
        seenPaths.push(normalized);
      }
    });

    aiHandlerMock.handleAICall.mockResolvedValue({
      text: "",
      usage: {
        promptTokens: 5,
        completionTokens: 3,
        totalTokens: 8,
      },
      functionCalls: [
        {
          id: "call-finish",
          name: "vfs_finish_turn",
          args: {
            userAction: "next",
            assistant: {
              narrative: "done",
              choices: [],
            },
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

    const first = await runAgenticLoopRefactored({
      protocol: "openai",
      instance: { id: "provider-1", protocol: "openai" } as any,
      modelId: "model-1",
      systemInstruction: "sys",
      initialContents: [],
      gameState: createGameState(),
      settings: createSettings(),
      sessionId: "session-skill-preload-1",
      vfsSession,
    });

    const second = await runAgenticLoopRefactored({
      protocol: "openai",
      instance: { id: "provider-1", protocol: "openai" } as any,
      modelId: "model-1",
      systemInstruction: "sys",
      initialContents: first._conversationHistory,
      gameState: createGameState(),
      settings: createSettings(),
      sessionId: "session-skill-preload-2",
      vfsSession,
    });

    const getPathCount = (history: any[], path: string): number =>
      history
        .map(
          (message) =>
            message?.content?.find(
              (part: any) =>
                part?.type === "text" && typeof part?.text === "string",
            )?.text ?? "",
        )
        .join("\n")
        .split(`path="${path}"`).length - 1;

    const firstAiCall = aiHandlerMock.handleAICall.mock.calls[0]?.[0] as any;
    const secondAiCall = aiHandlerMock.handleAICall.mock.calls[1]?.[0] as any;
    const firstHistory = (firstAiCall?.conversationHistory ?? []) as any[];
    const secondHistory = (secondAiCall?.conversationHistory ?? []) as any[];

    expect(
      getPathCount(firstHistory, "current/skills/commands/runtime/SKILL.md"),
    ).toBe(1);
    expect(
      getPathCount(secondHistory, "current/skills/commands/runtime/SKILL.md"),
    ).toBe(1);
    expect(first.response).toBeDefined();
    expect(second.response).toBeDefined();
  });

  it("blocks read calls for skills forbidden by player policy even when AI recommends them", async () => {
    const vfsSession = createVfsSession(true);
    const settings = createSettings();
    settings.extra.skillReadPolicies = {
      "skills/gm/actor-logic/npc/SKILL.md": "forbidden",
    };

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
            id: "call-forbidden-read",
            name: "vfs_read_chars",
            args: { path: "current/skills/gm/actor-logic/npc/SKILL.md" },
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
            id: "call-finish",
            name: "vfs_finish_turn",
            args: {
              userAction: "next",
              assistant: {
                narrative: "done",
                choices: [],
              },
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

    await runAgenticLoopRefactored({
      protocol: "openai",
      instance: { id: "provider-1", protocol: "openai" } as any,
      modelId: "model-1",
      systemInstruction: "sys",
      initialContents: [],
      gameState: createGameState(),
      settings,
      sessionId: "session-forbidden-skill-read",
      vfsSession,
    });

    expect(toolProcessorMock.executeGenericTool).not.toHaveBeenCalledWith(
      "vfs_read_chars",
      expect.anything(),
      expect.anything(),
    );

    const firstAiCall = aiHandlerMock.handleAICall.mock.calls[0]?.[0] as any;
    const conversationHistory = (firstAiCall?.conversationHistory ??
      []) as any[];
    const modeGuidanceText = conversationHistory
      .map(
        (message: any) =>
          message?.content?.find(
            (part: any) =>
              part?.type === "text" && typeof part?.text === "string",
          )?.text,
      )
      .find(
        (text: unknown): text is string =>
          typeof text === "string" &&
          text.includes("[SYSTEM: MODE SKILL GUIDANCE]"),
      );

    expect(modeGuidanceText).toContain(
      "filtered out from optional recommendations",
    );
    expect(modeGuidanceText).not.toContain(
      "current/skills/gm/actor-logic/npc/SKILL.md",
    );
  });
});
