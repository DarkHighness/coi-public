import { describe, expect, it } from "vitest";
import {
  annotateToolCallsWithStage,
  formatToolCallSummary,
  pickLatestToolCallRuntimeStage,
} from "./toolCallPresentation";

describe("toolCallPresentation", () => {
  it("formats read tool calls with path and range hints", () => {
    const label = formatToolCallSummary({
      name: "vfs_read_lines",
      input: {
        path: "current/world/notes.md",
        startLine: 10,
        lineCount: 20,
      },
      output: null,
      timestamp: Date.now(),
    } as any);

    expect(label).toContain("read");
    expect(label).toContain("world/notes.md");
    expect(label).toContain("L10+20");
  });

  it("annotates runtime stage and resolves latest stage", () => {
    const calls = annotateToolCallsWithStage(
      [
        {
          name: "vfs_ls",
          input: {},
          output: null,
          timestamp: Date.now(),
        },
      ] as any,
      "cleanup",
    );

    expect(calls[0]?.runtimeStage).toBe("cleanup");
    expect(pickLatestToolCallRuntimeStage(calls as any)).toBe("cleanup");
  });
});
