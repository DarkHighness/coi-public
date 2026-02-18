import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeGenericTool } from "../toolCallProcessor";

const handlerMocks = vi.hoisted(() => ({
  hasHandler: vi.fn(),
  dispatchToolCall: vi.fn(),
}));

vi.mock("@/services/tools/handlers", () => ({
  hasHandler: handlerMocks.hasHandler,
  dispatchToolCall: handlerMocks.dispatchToolCall,
}));

const createContext = () => ({
  loopState: {
    accumulatedResponse: { narrative: "" },
    changedEntities: new Map<string, string>(),
    vfsSession: {},
    budgetState: {
      toolCallsMax: 20,
      toolCallsUsed: 4,
    },
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
  });

  it("dispatches to handler with normalized tool context when handler exists", () => {
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
      code: "UNKNOWN",
    });
  });
});
