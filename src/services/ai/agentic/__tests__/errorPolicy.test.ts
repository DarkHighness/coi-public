import { describe, expect, it } from "vitest";
import {
  buildMalformedToolCallFeedback,
  classifyAgenticError,
} from "../errorPolicy";

describe("errorPolicy", () => {
  it("classifies transient provider failures as silent_retry", () => {
    const result = classifyAgenticError(new Error("429 rate limit exceeded"));
    expect(result.kind).toBe("silent_retry");
  });

  it("classifies malformed tool calls as model_fixable", () => {
    const result = classifyAgenticError(
      new Error("MALFORMED_TOOL_CALL: tool call args must be valid JSON"),
    );
    expect(result.kind).toBe("model_fixable");
    expect(result.isMalformedToolCall).toBe(true);
  });

  it("classifies context/history corruption as rebuild_required", () => {
    expect(
      classifyAgenticError(new Error("maximum context length exceeded")).kind,
    ).toBe("rebuild_required");

    expect(classifyAgenticError(new Error("invalid request format")).kind).toBe(
      "rebuild_required",
    );
  });

  it("classifies terminal provider failures", () => {
    const result = classifyAgenticError(new Error("safety policy blocked"));
    expect(result.kind).toBe("terminal");
  });

  it("returns unknown for uncategorized errors", () => {
    const result = classifyAgenticError(new Error("unexpected backend panic"));
    expect(result.kind).toBe("unknown");
  });

  it("builds minimal malformed feedback with raw provider error", () => {
    const feedback = buildMalformedToolCallFeedback({
      rawMessage: "invalid tool payload: expected object",
      finishToolName: "vfs_commit_turn",
    });

    expect(feedback).toContain("MALFORMED_TOOL_CALL");
    expect(feedback).toContain(
      "Raw provider error: invalid tool payload: expected object",
    );
    expect(feedback).toContain(
      'If you call "vfs_commit_turn", it must be the LAST tool call.',
    );
  });
});
