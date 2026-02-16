import { describe, expect, it } from "vitest";
import {
  createError,
  createSuccess,
  mergeToolErrorDetails,
  inferErrorCategoryFromCode,
} from "../toolResult";

describe("toolResult helpers", () => {
  it("creates success envelopes with payload and message", () => {
    expect(createSuccess({ id: "npc:1" }, "updated")).toEqual({
      success: true,
      data: { id: "npc:1" },
      message: "updated",
    });
  });

  it("creates error envelopes with default and custom codes", () => {
    expect(createError("missing")).toEqual({
      success: false,
      error: "missing",
      code: "UNKNOWN",
    });

    expect(createError("bad", "INVALID_DATA")).toEqual({
      success: false,
      error: "bad",
      code: "INVALID_DATA",
    });
  });

  it("keeps oversized error text intact while normalizing whitespace", () => {
    const oversized = `${"x".repeat(900)}\n\n\n${"y".repeat(200)}`;
    const result = createError(oversized, "INVALID_DATA");
    expect(result.error.length).toBeGreaterThan(1000);
    expect(result.error).not.toContain("[truncated]");
    expect(result.error).toContain("\n");
  });

  it("supports structured error details without breaking base fields", () => {
    const result = createError("invalid args", "INVALID_PARAMS", {
      tool: "vfs_read",
      issues: [{ path: "path", code: "missing", message: "Required" }],
      recovery: ["Provide a valid path."],
      refs: ["current/refs/tools/vfs_read.md"],
      batch: { index: 1, total: 2, operation: "read" },
    });

    expect(result).toMatchObject({
      success: false,
      error: "invalid args",
      code: "INVALID_PARAMS",
      details: {
        category: "validation",
        tool: "vfs_read",
        issues: [{ path: "path", code: "missing", message: "Required" }],
        recovery: ["Provide a valid path."],
        refs: ["current/refs/tools/vfs_read.md"],
        batch: { index: 1, total: 2, operation: "read" },
      },
    });
  });

  it("merges details while preserving deduped refs and inferred category", () => {
    const base = createError("blocked", "INVALID_ACTION", {
      refs: ["current/refs/tools/vfs_mutate.md"],
    });
    const merged = mergeToolErrorDetails(base, {
      refs: ["current/refs/tools/vfs_mutate.md", "current/refs/tools/README.md"],
      recovery: ["Read file before write."],
    });

    expect(merged.details?.category).toBe(
      inferErrorCategoryFromCode("INVALID_ACTION"),
    );
    expect(merged.details?.refs).toEqual([
      "current/refs/tools/vfs_mutate.md",
      "current/refs/tools/README.md",
    ]);
    expect(merged.details?.recovery).toEqual(["Read file before write."]);
  });
});
