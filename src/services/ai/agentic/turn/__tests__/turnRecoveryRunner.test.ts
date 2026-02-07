import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeTurnWithRecovery, getRecoveryTrace } from "../turnRecoveryRunner";

const createError = (message: string): Error => new Error(message);

describe("executeTurnWithRecovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recovers history errors with rollback attempt", async () => {
    const execute = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(createError("INVALID_ARGUMENT: malformed content"))
      .mockResolvedValueOnce("ok");

    const rollbackToAnchor = vi.fn().mockReturnValue(true);
    const resetSession = vi.fn();

    const result = await executeTurnWithRecovery({
      execute,
      rollbackToAnchor,
      resetSession,
      sleep: async () => {},
    });

    expect(result.result).toBe("ok");
    expect(result.recovery.recovered).toBe(true);
    expect(result.recovery.kind).toBe("history");
    expect(result.recovery.finalLevel).toBe(1);
    expect(rollbackToAnchor).toHaveBeenCalledTimes(1);
    expect(resetSession).not.toHaveBeenCalled();
  });

  it("falls back to session reset when rollback retry still fails", async () => {
    const execute = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(createError("INVALID_ARGUMENT: malformed content"))
      .mockRejectedValueOnce(createError("INVALID_ARGUMENT: malformed content"))
      .mockResolvedValueOnce("ok-after-reset");

    const rollbackToAnchor = vi.fn().mockReturnValue(true);
    const resetSession = vi.fn().mockResolvedValue(undefined);

    const result = await executeTurnWithRecovery({
      execute,
      rollbackToAnchor,
      resetSession,
      sleep: async () => {},
    });

    expect(result.result).toBe("ok-after-reset");
    expect(result.recovery.recovered).toBe(true);
    expect(result.recovery.finalLevel).toBe(2);
    expect(resetSession).toHaveBeenCalledTimes(1);
  });

  it("applies transient backoff retries", async () => {
    const execute = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(createError("429 rate limit"))
      .mockRejectedValueOnce(createError("socket hang up"))
      .mockResolvedValueOnce("ok-after-transient");

    const rollbackToAnchor = vi.fn();
    const resetSession = vi.fn();
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await executeTurnWithRecovery({
      execute,
      rollbackToAnchor,
      resetSession,
      sleep,
    });

    expect(result.result).toBe("ok-after-transient");
    expect(result.recovery.kind).toBe("transient");
    expect(result.recovery.finalLevel).toBe(1);
    expect(sleep).toHaveBeenNthCalledWith(1, 300);
    expect(sleep).toHaveBeenNthCalledWith(2, 1200);
    expect(rollbackToAnchor).not.toHaveBeenCalled();
    expect(resetSession).not.toHaveBeenCalled();
  });

  it("annotates unrecoverable failures with recovery trace", async () => {
    const execute = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(createError("fatal: unknown"));

    await expect(
      executeTurnWithRecovery({
        execute,
        rollbackToAnchor: vi.fn(),
        resetSession: vi.fn(),
        sleep: async () => {},
      }),
    ).rejects.toSatisfy((error: unknown) => {
      const trace = getRecoveryTrace(error);
      return !!trace && trace.recovered === false && trace.kind === "unknown";
    });
  });
});
