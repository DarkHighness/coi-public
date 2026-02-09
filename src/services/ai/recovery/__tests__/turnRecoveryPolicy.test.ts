import { describe, expect, it } from "vitest";
import {
  ContextOverflowError,
  HistoryCorruptedError,
} from "@/services/ai/contextCompressor";
import {
  TURN_RECOVERY_MAX_DURATION_MS,
  TURN_RECOVERY_TRANSIENT_DELAYS_MS,
  classifyTurnError,
  getTurnRecoveryPlan,
  isTurnRecoveryRetryable,
} from "../turnRecoveryPolicy";

describe("turnRecoveryPolicy", () => {
  it("classifies history and context errors", () => {
    expect(classifyTurnError(new HistoryCorruptedError(new Error("bad history")))).toBe(
      "history",
    );
    expect(classifyTurnError(new Error("INVALID_ARGUMENT: malformed payload"))).toBe(
      "history",
    );
    expect(classifyTurnError(new Error("MALFORMED_TOOL_CALL: invalid json"))).toBe(
      "unknown",
    );

    expect(classifyTurnError(new ContextOverflowError(new Error("too many tokens")))).toBe(
      "context",
    );
    expect(classifyTurnError(new Error("context_length_exceeded"))).toBe(
      "context",
    );
  });

  it("classifies turn_not_committed and transient errors", () => {
    expect(classifyTurnError(new Error("TURN_NOT_COMMITTED: agent exhausted"))).toBe(
      "turn_not_committed",
    );
    expect(classifyTurnError(new Error("429 rate limit exceeded"))).toBe(
      "transient",
    );
    expect(classifyTurnError(new Error("socket hang up"))).toBe("transient");
  });

  it("builds graded retry plans and retryable marker", () => {
    expect(TURN_RECOVERY_MAX_DURATION_MS).toBe(12_000);
    expect(TURN_RECOVERY_TRANSIENT_DELAYS_MS).toEqual([300, 1200]);

    expect(getTurnRecoveryPlan("transient")).toEqual({
      kind: "transient",
      maxRollbackRetries: 0,
      maxSessionResetRetries: 0,
      transientBackoffMs: [300, 1200],
    });

    expect(getTurnRecoveryPlan("history")).toEqual({
      kind: "history",
      maxRollbackRetries: 1,
      maxSessionResetRetries: 1,
      transientBackoffMs: [],
    });

    expect(isTurnRecoveryRetryable("unknown")).toBe(false);
    expect(isTurnRecoveryRetryable("turn_not_committed")).toBe(true);
  });
});
