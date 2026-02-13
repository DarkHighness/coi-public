import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  dispatchToolCall,
  dispatchToolCallAsync,
  getRegisteredToolNames,
  hasHandler,
  registerHandlerByName,
  registerToolHandler,
  trackChangedEntity,
} from "../toolHandlerRegistry";

const makeUniqueName = (seed: string) =>
  `${seed}_${Math.random().toString(36).slice(2, 9)}`;

describe("toolHandlerRegistry", () => {
  it("registers handler by tool definition and dispatches", () => {
    const toolName = makeUniqueName("test_tool");
    const tool = {
      name: toolName,
      description: "demo",
      parameters: z.object({ value: z.string() }),
    } as any;

    registerToolHandler(tool, (args) => ({
      success: true,
      echoed: args.value,
    }));

    expect(hasHandler(toolName)).toBe(true);
    expect(getRegisteredToolNames()).toContain(toolName);

    const result = dispatchToolCall(
      toolName,
      { value: "x" },
      { vfsSession: {} as any },
    );
    expect(result).toEqual({ success: true, echoed: "x" });
  });

  it("returns unknown-tool error and wraps execution exceptions", () => {
    const missing = dispatchToolCall(
      makeUniqueName("missing_tool"),
      {},
      { vfsSession: {} as any },
    );
    expect(missing).toEqual({
      success: false,
      error: expect.stringContaining("Unknown tool"),
      code: "UNKNOWN_TOOL",
    });

    const throwingTool = makeUniqueName("throwing_tool");
    registerHandlerByName(throwingTool, () => {
      throw new Error("boom");
    });

    const errorResult = dispatchToolCall(
      throwingTool,
      {},
      { vfsSession: {} as any },
    );

    expect(errorResult).toEqual({
      success: false,
      error: "Tool execution failed: boom",
      code: "EXECUTION_ERROR",
    });
  });

  it("awaits async handlers via dispatchToolCallAsync", async () => {
    const asyncTool = makeUniqueName("async_tool");
    registerHandlerByName(asyncTool, async (args) => ({ ok: true, args }));

    const result = await dispatchToolCallAsync(
      asyncTool,
      { id: 1 },
      { vfsSession: {} as any },
    );

    expect(result).toEqual({ ok: true, args: { id: 1 } });
  });

  it("dispatches prefixed tool names by stripping known prefixes", () => {
    const toolName = makeUniqueName("prefixed_tool");
    registerHandlerByName(toolName, (args) => ({ success: true, args }));

    expect(hasHandler(`default_api:${toolName}`)).toBe(true);
    expect(hasHandler(`functions.${toolName}`)).toBe(true);
    expect(hasHandler(`tool:${toolName}`)).toBe(true);
    expect(hasHandler(`default_api:functions.${toolName}`)).toBe(true);

    const resultA = dispatchToolCall(
      `default_api:${toolName}`,
      { ok: "a" },
      { vfsSession: {} as any },
    );
    const resultB = dispatchToolCall(
      `functions.${toolName}`,
      { ok: "b" },
      { vfsSession: {} as any },
    );
    const resultC = dispatchToolCall(
      `default_api:functions.${toolName}`,
      { ok: "c" },
      { vfsSession: {} as any },
    );

    expect(resultA).toEqual({ success: true, args: { ok: "a" } });
    expect(resultB).toEqual({ success: true, args: { ok: "b" } });
    expect(resultC).toEqual({ success: true, args: { ok: "c" } });
  });

  it("tracks changed entities only on successful id-bearing result", () => {
    const changed = new Map<string, string>();

    trackChangedEntity(
      changed,
      { success: true, data: { id: "npc:1" } },
      "npc",
    );
    trackChangedEntity(
      changed,
      { success: true, data: { name: "NoId" } },
      "npc",
    );
    trackChangedEntity(
      changed,
      { success: false, data: { id: "npc:2" } },
      "npc",
    );

    expect(Array.from(changed.entries())).toEqual([["npc:1", "npc"]]);
  });
});
