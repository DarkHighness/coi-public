import { describe, expect, it } from "vitest";
import {
  normalizeLogs,
  normalizeTokenUsage,
  parseRuntimeStats,
} from "./runtimeStatsPersistence";

describe("runtime stats persistence", () => {
  it("normalizes invalid token usage values to zero", () => {
    const usage = normalizeTokenUsage({
      promptTokens: 11,
      completionTokens: "bad",
      totalTokens: -1,
      cacheRead: 3,
      cacheWrite: null,
    });

    expect(usage).toEqual({
      promptTokens: 11,
      completionTokens: 0,
      totalTokens: 0,
      cacheRead: 3,
      cacheWrite: 0,
    });
  });

  it("keeps at most 100 log entries and drops non-objects", () => {
    const input = Array.from({ length: 105 }, (_, idx) => ({
      id: `log-${idx}`,
      timestamp: Date.now() + idx,
      provider: "test",
      model: "m",
      endpoint: "turn",
    }));
    const mixed = [...input, "noise", 42, null] as unknown;

    const logs = normalizeLogs(mixed);
    expect(logs).toHaveLength(100);
    expect(logs[0].id).toBe("log-0");
    expect(logs[99].id).toBe("log-99");
  });

  it("parses persisted runtime stats with safe defaults", () => {
    const parsed = parseRuntimeStats({
      tokenUsage: {
        promptTokens: 20,
        completionTokens: 30,
        totalTokens: 50,
        cacheRead: 7,
        cacheWrite: 2,
      },
      logs: [
        {
          id: "l1",
          timestamp: 1,
          provider: "p",
          model: "m",
          endpoint: "turn",
        },
      ],
    });

    expect(parsed.tokenUsage.totalTokens).toBe(50);
    expect(parsed.logs).toHaveLength(1);
    expect(parsed.unlockMode).toBe(false);
    expect(parsed.godMode).toBe(false);

    const fallback = parseRuntimeStats(undefined);
    expect(fallback.tokenUsage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cacheRead: 0,
      cacheWrite: 0,
    });
    expect(fallback.logs).toEqual([]);
    expect(fallback.unlockMode).toBe(false);
    expect(fallback.godMode).toBe(false);
  });

  it("parses unlock/god mode booleans", () => {
    const parsed = parseRuntimeStats({
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      logs: [],
      unlockMode: true,
      godMode: true,
    });

    expect(parsed.unlockMode).toBe(true);
    expect(parsed.godMode).toBe(true);
  });
});
