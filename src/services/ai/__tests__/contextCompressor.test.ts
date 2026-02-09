import { describe, expect, it } from "vitest";
import {
  ContextOverflowError,
  HistoryCorruptedError,
  isContextLengthError,
  isInvalidArgumentError,
  requiresHistoryRebuild,
} from "../contextCompressor";

describe("contextCompressor error classifiers", () => {
  it("detects common context-length error patterns", () => {
    expect(
      isContextLengthError(new Error("maximum context length exceeded")),
    ).toBe(true);
    expect(isContextLengthError(new Error("TOKEN LIMIT reached"))).toBe(true);
    expect(isContextLengthError(new Error("input too long for model"))).toBe(
      true,
    );
    expect(isContextLengthError(new Error("network timeout"))).toBe(false);
    expect(isContextLengthError(null)).toBe(false);
  });

  it("detects invalid-argument/history-corruption patterns", () => {
    expect(
      isInvalidArgumentError(new Error("INVALID_ARGUMENT: malformed payload")),
    ).toBe(true);
    expect(
      isInvalidArgumentError(new Error("does not match schema")),
    ).toBe(true);
    expect(isInvalidArgumentError(new Error("unexpected role sequence"))).toBe(
      true,
    );
    expect(isInvalidArgumentError(new Error("rate limit exceeded"))).toBe(
      false,
    );
    expect(isInvalidArgumentError(new Error("MALFORMED_TOOL_CALL: bad args"))).toBe(
      false,
    );
  });

  it("requires rebuild when either classifier matches", () => {
    expect(
      requiresHistoryRebuild(new Error("context_length_exceeded")),
    ).toBe(true);
    expect(requiresHistoryRebuild(new Error("invalid request format"))).toBe(
      true,
    );
    expect(requiresHistoryRebuild(new Error("temporary outage"))).toBe(false);
  });

  it("wraps original error messages in domain-specific errors", () => {
    const overflow = new ContextOverflowError(new Error("token overflow"));
    const corrupted = new HistoryCorruptedError(
      new Error("invalid message role"),
    );

    expect(overflow.name).toBe("ContextOverflowError");
    expect(overflow.message).toContain("CONTEXT_LENGTH_EXCEEDED");
    expect(overflow.message).toContain("token overflow");

    expect(corrupted.name).toBe("HistoryCorruptedError");
    expect(corrupted.message).toContain("HISTORY_CORRUPTED");
    expect(corrupted.message).toContain("invalid message role");
  });
});
