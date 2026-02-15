import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeGenericTool, validateToolArgs } from "../toolCallProcessor";

const handlerMocks = vi.hoisted(() => ({
  hasHandler: vi.fn(),
  dispatchToolCall: vi.fn(),
}));

const providerUtilsMock = vi.hoisted(() => ({
  getToolInfo: vi.fn(() => "mock-schema"),
}));

vi.mock("@/services/tools/handlers", () => ({
  hasHandler: handlerMocks.hasHandler,
  dispatchToolCall: handlerMocks.dispatchToolCall,
}));

vi.mock("@/services/providers/utils", () => ({
  getToolInfo: providerUtilsMock.getToolInfo,
}));

const createContext = () => ({
  loopState: {
    accumulatedResponse: { narrative: "" },
    changedEntities: new Map<string, string>(),
    vfsSession: {},
    requiredCommandSkillPaths: ["skills/commands/runtime/sudo/SKILL.md"],
    requiredPresetSkillPaths: [
      "skills/presets/runtime/narrative-style/SKILL.md",
    ],
  },
  gameState: { forkId: 0 },
  settings: { story: { modelId: "m1" } },
});

describe("toolCallProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    providerUtilsMock.getToolInfo.mockReturnValue("mock-schema");
  });

  it("returns valid for unknown tools in schema validation", () => {
    const result = validateToolArgs("tool_does_not_exist", { any: "value" });
    expect(result).toEqual({ valid: true });
  });

  it("returns detailed validation errors for missing and extra fields", () => {
    const missing = validateToolArgs("vfs_schema", {});
    expect(missing.valid).toBe(false);
    if (missing.valid === false) {
      const err = missing.error as {
        error: string;
        code: string;
        details?: { tool?: string; category?: string; refs?: string[] };
      };
      expect(err.code).toBe("INVALID_PARAMS");
      expect(err.error).toContain("[VALIDATION_ERROR]");
      expect(err.error).toContain("Missing required fields:");
      expect(err.error).toContain("- paths");
      expect(err.error).toContain("mock-schema");
      expect(err.error).toContain("current/refs/tools/vfs_schema.md");
      expect(err.details?.tool).toBe("vfs_schema");
      expect(err.details?.category).toBe("validation");
      expect(err.details?.refs).toContain("current/refs/tools/README.md");
    }

    const extra = validateToolArgs("vfs_ls", {
      path: "current",
      unexpected: true,
    });
    expect(extra.valid).toBe(false);
    if (extra.valid === false) {
      const err = extra.error as { error: string };
      expect(err.error).toContain("Unexpected extra fields");
      expect(err.error).toContain("- unexpected");
    }
  });

  it("dispatches to handler with normalized tool context when valid", () => {
    handlerMocks.hasHandler.mockReturnValue(true);
    handlerMocks.dispatchToolCall.mockReturnValue({ success: true, data: 123 });

    const ctx = createContext();
    const result = executeGenericTool(
      "vfs_ls",
      { path: "current" },
      ctx as any,
    );

    expect(handlerMocks.hasHandler).toHaveBeenCalledWith("vfs_ls");
    expect(handlerMocks.dispatchToolCall).toHaveBeenCalledWith(
      "vfs_ls",
      { path: "current" },
      expect.objectContaining({
        accumulatedResponse: ctx.loopState.accumulatedResponse,
        changedEntities: ctx.loopState.changedEntities,
        gameState: ctx.gameState,
        settings: ctx.settings,
        vfsSession: ctx.loopState.vfsSession,
        requiredCommandSkillPaths: ctx.loopState.requiredCommandSkillPaths,
        requiredPresetSkillPaths: ctx.loopState.requiredPresetSkillPaths,
      }),
    );
    expect(result).toEqual({ success: true, data: 123 });
  });

  it("returns validation error without dispatching handler", () => {
    handlerMocks.hasHandler.mockReturnValue(true);

    const result = executeGenericTool("vfs_schema", {}, createContext() as any);

    expect(handlerMocks.dispatchToolCall).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: false,
      code: "INVALID_PARAMS",
    });
  });

  it("returns unknown-tool error when no handler exists", () => {
    handlerMocks.hasHandler.mockReturnValue(false);

    const result = executeGenericTool(
      "tool_does_not_exist",
      { payload: true },
      createContext() as any,
    );

    expect(result).toEqual({
      success: false,
      error: "Unknown tool: tool_does_not_exist",
    });
  });

  it("rejects legacy vfs_commit_turn.meta payload", () => {
    handlerMocks.hasHandler.mockReturnValue(true);

    const result = executeGenericTool(
      "vfs_commit_turn",
      {
        userAction: "look around",
        assistant: {
          narrative: "You scan the room.",
          choices: [{ text: "Inspect desk" }, { text: "Open door" }],
        },
        meta: {
          playerRate: {
            vote: "up",
            createdAt: Date.now(),
          },
        },
      },
      createContext() as any,
    ) as { success?: boolean; code?: string };

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_PARAMS");
    expect(handlerMocks.dispatchToolCall).not.toHaveBeenCalled();
  });

  it("rejects legacy assistant.userAction nested payload", () => {
    handlerMocks.hasHandler.mockReturnValue(true);

    const result = executeGenericTool(
      "vfs_commit_turn",
      {
        assistant: {
          userAction: "stabilize the power core",
          narrative: "You reroute the power and stop the sparks.",
          choices: [{ text: "Run diagnostics" }, { text: "Leave the room" }],
        },
      },
      createContext() as any,
    ) as { success?: boolean; code?: string };

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_PARAMS");
    expect(handlerMocks.dispatchToolCall).not.toHaveBeenCalled();
  });

  it("rejects empty vfs_commit_soul payload during validation", () => {
    handlerMocks.hasHandler.mockReturnValue(true);

    const result = executeGenericTool(
      "vfs_commit_soul",
      {},
      createContext() as any,
    ) as { success?: boolean; code?: string; error?: string };

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_PARAMS");
    expect(result.error).toContain("currentSoul/globalSoul");
    expect(handlerMocks.dispatchToolCall).not.toHaveBeenCalled();
  });
});
