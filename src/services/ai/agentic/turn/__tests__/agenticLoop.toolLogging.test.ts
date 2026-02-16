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
      turnRetryLimit: 3,
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
  const existingMutablePaths = new Set<string>([
    "world/global.json",
    "world/notes.md",
  ]);
  const existingReadonlyPaths = new Set<string>([
    "skills/commands/runtime/SKILL.md",
  ]);

  return {
    snapshot: () => snapshots[Math.min(cursor, snapshots.length - 1)],
    readFile: vi.fn((path: string) => {
      const normalized = String(path || "").replace(/^current\//, "");
      if (existingMutablePaths.has(normalized)) {
        return {
          path: `current/${normalized}`,
          contentType: normalized.endsWith(".json")
            ? "application/json"
            : "text/markdown",
          content: normalized.endsWith(".json") ? "{}" : "",
        };
      }
      if (existingReadonlyPaths.has(normalized)) {
        return {
          path: `current/${normalized}`,
          contentType: "text/markdown",
          content: "# read-only",
        };
      }
      return null;
    }),
    checkpoint: vi.fn(),
    rollback: vi.fn(() => true),
    beginReadEpoch: vi.fn(),
    bindConversationSession: vi.fn(),
    drainOutOfBandReadInvalidations: vi.fn(() => []),
    noteToolSeen: vi.fn(),
    markConversationTouched: vi.fn(() => {
      cursor = 1;
    }),
    hasToolSeenInCurrentEpoch: vi.fn(() => true),
  } as any;
};

describe("agenticLoop tool logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows conversation reads while still forbidding conversation writes via generic tools", async () => {
    const vfsSession = createVfsSession();

    aiHandlerMock.handleAICall.mockResolvedValueOnce({
      text: "",
      usage: {
        promptTokens: 5,
        completionTokens: 3,
        totalTokens: 8,
      },
      functionCalls: [
        {
          id: "call-read-session",
          name: "vfs_read_lines",
          args: {
            path: "current/conversation/session.jsonl",
            startLine: 1,
            lineCount: 50,
          },
        },
        {
          id: "call-write-world",
          name: "vfs_write_file",
          args: {
            path: "current/world/notes.md",
            content: "updated",
            contentType: "text/markdown",
          },
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
      sessionId: "session-1",
      vfsSession,
    });

    expect(result.response.narrative).toBe("new narrative");
    expect(aiHandlerMock.handleAICall).toHaveBeenCalledTimes(1);
    expect(
      toolProcessorMock.executeGenericTool.mock.calls.map((call) => call[0]),
    ).toEqual(["vfs_read_lines", "vfs_write_file", "vfs_finish_turn"]);

    const conversationWriteForbiddenLog = result.logs.find((log) =>
      String((log as any).toolOutput?.error || "").includes(
        "CONVERSATION_WRITE_FORBIDDEN",
      ),
    );
    expect(conversationWriteForbiddenLog).toBeUndefined();
  });

  it("allows finish execution when only non-write tools failed earlier in batch", async () => {
    const vfsSession = createVfsSession();

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
            id: "call-read-fail",
            name: "vfs_read_chars",
            args: { path: "current/world/global.json" },
          },
          {
            id: "call-write-pass",
            name: "vfs_write_file",
            args: {
              ops: [
                {
                  op: "write_file",
                  path: "current/world/notes.md",
                  content: "ok",
                  contentType: "text/markdown",
                },
              ],
            },
          },
          {
            id: "call-finish-blocked",
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
      if (name === "vfs_read_chars") {
        return { success: false, error: "read failed", code: "READ_FAILED" };
      }

      if (name === "vfs_write_file") {
        return { success: true };
      }

      if (name === "vfs_finish_turn") {
        vfsSession.markConversationTouched();
        return { success: true };
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
    expect(aiHandlerMock.handleAICall).toHaveBeenCalledTimes(1);
    expect(toolProcessorMock.executeGenericTool).toHaveBeenCalledTimes(3);
    expect(
      toolProcessorMock.executeGenericTool.mock.calls.map((call) => call[0]),
    ).toEqual(["vfs_read_chars", "vfs_write_file", "vfs_finish_turn"]);

    const blockedFinishLog = result.logs.find(
      (log) =>
        log.endpoint === "tool_execution" &&
        log.toolName === "vfs_finish_turn" &&
        String((log as any).toolOutput?.error || "").includes(
          "FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE",
        ),
    );
    expect(blockedFinishLog).toBeUndefined();
  });

  it("blocks finish until failed write targets are retried successfully", async () => {
    const vfsSession = createVfsSession();

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
            id: "call-write-fail",
            name: "vfs_write_file",
            args: {
              ops: [
                {
                  op: "write_file",
                  path: "current/world/global.json",
                  content: "{}",
                  contentType: "application/json",
                },
              ],
            },
          },
          {
            id: "call-finish-blocked-1",
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
            id: "call-finish-blocked-2",
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
            id: "call-write-ok",
            name: "vfs_write_file",
            args: {
              path: "current/world/global.json",
              content: "{}",
              contentType: "application/json",
            },
          },
          {
            id: "call-finish-ok",
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

    let writeAttempt = 0;
    toolProcessorMock.executeGenericTool.mockImplementation((name: string) => {
      if (name === "vfs_write_file") {
        writeAttempt += 1;
        if (writeAttempt === 1) {
          return {
            success: false,
            error: "must read file before overwrite",
            code: "INVALID_ACTION",
          };
        }
        return { success: true };
      }

      if (name === "vfs_finish_turn") {
        vfsSession.markConversationTouched();
        return { success: true };
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
    expect(aiHandlerMock.handleAICall).toHaveBeenCalledTimes(3);
    expect(
      toolProcessorMock.executeGenericTool.mock.calls.map((call) => call[0]),
    ).toEqual(["vfs_write_file", "vfs_write_file", "vfs_finish_turn"]);

    const writeBlockedLog = result.logs.find(
      (log) =>
        log.endpoint === "tool_execution" &&
        log.toolName === "vfs_finish_turn" &&
        String((log as any).toolOutput?.error || "").includes(
          "FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE",
        ),
    );
    expect(writeBlockedLog).toBeDefined();
    expect(String((writeBlockedLog as any)?.toolOutput?.error || "")).toContain(
      "unknown-write-target",
    );
  });

  it("executes later write calls even if an earlier write fails in the same batch", async () => {
    const vfsSession = createVfsSession();

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
            id: "call-write-fail-global",
            name: "vfs_write_file",
            args: {
              path: "current/world/global.json",
              content: "{}",
              contentType: "application/json",
            },
          },
          {
            id: "call-write-pass-notes",
            name: "vfs_write_file",
            args: {
              path: "current/world/notes.md",
              content: "ok",
              contentType: "text/markdown",
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
            id: "call-write-retry-global",
            name: "vfs_write_file",
            args: {
              path: "current/world/global.json",
              content: "{}",
              contentType: "application/json",
            },
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

    let globalWriteAttempts = 0;
    toolProcessorMock.executeGenericTool.mockImplementation(
      (name: string, args: Record<string, unknown>) => {
        if (name === "vfs_write_file") {
          const path = String(args.path ?? "");
          if (path === "current/world/global.json") {
            globalWriteAttempts += 1;
            if (globalWriteAttempts === 1) {
              return {
                success: false,
                error: "must read file before overwrite",
                code: "INVALID_ACTION",
              };
            }
          }
          return { success: true };
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
      sessionId: "session-write-independence",
      vfsSession,
    });

    expect(result.response.narrative).toBe("new narrative");
    expect(aiHandlerMock.handleAICall).toHaveBeenCalledTimes(2);
    expect(
      toolProcessorMock.executeGenericTool.mock.calls.map((call) => call[0]),
    ).toEqual([
      "vfs_write_file",
      "vfs_write_file",
      "vfs_write_file",
      "vfs_finish_turn",
    ]);

    const writeLogs = result.logs.filter(
      (log) => log.endpoint === "tool_execution" && log.toolName === "vfs_write_file",
    );
    expect(writeLogs.length).toBeGreaterThanOrEqual(3);
    expect(
      writeLogs.some(
        (log) =>
          String((log as any).toolInput?.path || "") ===
            "current/world/notes.md" && (log as any).toolOutput?.success === true,
      ),
    ).toBe(true);
    expect(
      writeLogs.some(
        (log) =>
          String((log as any).toolInput?.path || "") ===
            "current/world/global.json" &&
          String((log as any).toolOutput?.error || "").includes(
            "WRITE_EXISTING_TARGET_RETRY_REQUIRED",
          ),
      ),
    ).toBe(true);
  });

  it("does not block finish for unrecoverable write failures and emits guidance", async () => {
    const vfsSession = createVfsSession();

    aiHandlerMock.handleAICall.mockResolvedValueOnce({
      text: "",
      usage: {
        promptTokens: 5,
        completionTokens: 3,
        totalTokens: 8,
      },
      functionCalls: [
          {
            id: "call-write-immutable",
            name: "vfs_write_file",
            args: {
              path: "current/skills/commands/runtime/SKILL.md",
              content: "x",
              contentType: "text/markdown",
            },
          },
        {
          id: "call-finish-ok",
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
      if (name === "vfs_write_file") {
        return {
          success: false,
          error: "read-only path",
          code: "IMMUTABLE_READONLY",
        };
      }
      if (name === "vfs_finish_turn") {
        vfsSession.markConversationTouched();
        return { success: true };
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
    expect(aiHandlerMock.handleAICall).toHaveBeenCalledTimes(1);
    expect(
      toolProcessorMock.executeGenericTool.mock.calls.map((call) => call[0]),
    ).toEqual(["vfs_write_file", "vfs_finish_turn"]);

    const blockedFinishLog = result.logs.find(
      (log) =>
        log.endpoint === "tool_execution" &&
        log.toolName === "vfs_finish_turn" &&
        String((log as any).toolOutput?.error || "").includes(
          "FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE",
        ),
    );
    expect(blockedFinishLog).toBeUndefined();

    const writeLog = result.logs.find(
      (log) => log.endpoint === "tool_execution" && log.toolName === "vfs_write_file",
    );
    expect(String((writeLog as any)?.toolOutput?.error || "")).toContain(
      "WRITE_UNRECOVERABLE_NON_BLOCKING",
    );
    expect(String((writeLog as any)?.toolOutput?.error || "")).toContain(
      "current/skills/commands/runtime/SKILL.md",
    );
  });

  it("does not block finish for missing-target write failures and emits warning", async () => {
    const vfsSession = createVfsSession();

    aiHandlerMock.handleAICall.mockResolvedValueOnce({
      text: "",
      usage: {
        promptTokens: 5,
        completionTokens: 3,
        totalTokens: 8,
      },
      functionCalls: [
          {
            id: "call-write-missing-target",
            name: "vfs_patch_json",
            args: {
              path: "current/world/newly-created/profile.json",
              patch: [{ op: "replace", path: "/foo", value: "bar" }],
            },
          },
        {
          id: "call-finish-ok",
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
      if (name === "vfs_patch_json") {
        return {
          success: false,
          error: "file not found",
          code: "NOT_FOUND",
        };
      }
      if (name === "vfs_finish_turn") {
        vfsSession.markConversationTouched();
        return { success: true };
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
    expect(aiHandlerMock.handleAICall).toHaveBeenCalledTimes(1);
    expect(
      toolProcessorMock.executeGenericTool.mock.calls.map((call) => call[0]),
    ).toEqual(["vfs_patch_json", "vfs_finish_turn"]);

    const blockedFinishLog = result.logs.find(
      (log) =>
        log.endpoint === "tool_execution" &&
        log.toolName === "vfs_finish_turn" &&
        String((log as any).toolOutput?.error || "").includes(
          "FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE",
        ),
    );
    expect(blockedFinishLog).toBeUndefined();

    const writeLog = result.logs.find(
      (log) => log.endpoint === "tool_execution" && log.toolName === "vfs_patch_json",
    );
    expect(String((writeLog as any)?.toolOutput?.error || "")).toContain(
      "WRITE_NON_EXISTENT_TARGET_NON_BLOCKING",
    );
    expect(String((writeLog as any)?.toolOutput?.error || "")).toContain(
      "current/world/newly-created/profile.json",
    );
  });

  it("uses non-blocking failure guidance for new-target write errors that are not NOT_FOUND", async () => {
    const vfsSession = createVfsSession();

    aiHandlerMock.handleAICall.mockResolvedValueOnce({
      text: "",
      usage: {
        promptTokens: 5,
        completionTokens: 3,
        totalTokens: 8,
      },
      functionCalls: [
        {
          id: "call-write-invalid-data",
          name: "vfs_write_file",
          args: {
            path: "current/world/newly-created/kno_phantom_sniper.json",
            content: "{}",
            contentType: "application/json",
          },
        },
        {
          id: "call-finish-ok",
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
      if (name === "vfs_write_file") {
        return {
          success: false,
          error: "schema validation failed",
          code: "INVALID_DATA",
        };
      }
      if (name === "vfs_finish_turn") {
        vfsSession.markConversationTouched();
        return { success: true };
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
    expect(aiHandlerMock.handleAICall).toHaveBeenCalledTimes(1);
    expect(
      toolProcessorMock.executeGenericTool.mock.calls.map((call) => call[0]),
    ).toEqual(["vfs_write_file", "vfs_finish_turn"]);

    const blockedFinishLog = result.logs.find(
      (log) =>
        log.endpoint === "tool_execution" &&
        log.toolName === "vfs_finish_turn" &&
        String((log as any).toolOutput?.error || "").includes(
          "FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE",
        ),
    );
    expect(blockedFinishLog).toBeUndefined();

    const writeLog = result.logs.find(
      (log) => log.endpoint === "tool_execution" && log.toolName === "vfs_write_file",
    );
    const writeError = String((writeLog as any)?.toolOutput?.error || "");
    expect(writeError).toContain("WRITE_NON_BLOCKING_FAILURE");
    expect(writeError).toContain(
      "current/world/newly-created/kno_phantom_sniper.json",
    );
    expect(writeError).not.toContain("WRITE_NON_EXISTENT_TARGET_NON_BLOCKING");
  });

  it("soft-blocks read-only batches before finish to avoid token waste", async () => {
    const vfsSession = createVfsSession();

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
            id: "call-read",
            name: "vfs_read_chars",
            args: { path: "current/world/global.json" },
          },
          {
            id: "call-finish-blocked",
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
            id: "call-finish-ok",
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
      sessionId: "session-1",
      vfsSession,
    });

    expect(result.response.narrative).toBe("new narrative");
    expect(aiHandlerMock.handleAICall).toHaveBeenCalledTimes(2);
    expect(
      toolProcessorMock.executeGenericTool.mock.calls.map((call) => call[0]),
    ).toEqual(["vfs_read_chars", "vfs_finish_turn"]);

    const historyText = JSON.stringify(result._conversationHistory);
    expect(historyText).toContain("PRE_FINISH_READ_ONLY_SEQUENCE");
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
          id: "call-1-write",
          name: "vfs_write_file",
          args: {
            ops: [
              {
                op: "write_file",
                path: "current/world/notes.md",
                content: "ok",
                contentType: "text/markdown",
              },
            ],
          },
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
      if (name === "vfs_write_file") {
        return { success: true };
      }
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

    const toolLogs = result.logs.filter(
      (log) => log.endpoint === "tool_execution",
    );
    expect(toolLogs).toHaveLength(2);
    expect(toolLogs.map((log) => log.toolName)).toEqual([
      "vfs_write_file",
      "vfs_finish_turn",
    ]);
  });
});
