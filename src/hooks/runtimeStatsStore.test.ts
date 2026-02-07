import { beforeEach, describe, expect, it, vi } from "vitest";

const indexedDbMock = vi.hoisted(() => ({
  saveMetadata: vi.fn(async () => undefined),
  loadMetadata: vi.fn(async () => null),
}));

vi.mock("../utils/indexedDB", () => ({
  saveMetadata: indexedDbMock.saveMetadata,
  loadMetadata: indexedDbMock.loadMetadata,
}));

import {
  loadRuntimeStats,
  persistRuntimeStats,
  runtimeStatsKey,
} from "./runtimeStatsStore";

describe("runtimeStatsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes runtime stats to runtime_stats:<slotId>", async () => {
    await persistRuntimeStats("slot-42", {
      tokenUsage: {
        promptTokens: 12,
        completionTokens: 8,
        totalTokens: 20,
        cacheRead: 3,
        cacheWrite: 1,
      },
      logs: [
        {
          id: "log-1",
          timestamp: 1,
          provider: "openai",
          model: "gpt-x",
          endpoint: "turn",
        },
      ],
    } as any);

    expect(indexedDbMock.saveMetadata).toHaveBeenCalledTimes(1);
    expect(indexedDbMock.saveMetadata).toHaveBeenCalledWith(
      "runtime_stats:slot-42",
      expect.objectContaining({
        tokenUsage: expect.objectContaining({ totalTokens: 20 }),
        logs: expect.arrayContaining([
          expect.objectContaining({ id: "log-1", endpoint: "turn" }),
        ]),
      }),
    );
  });

  it("reads runtime stats from runtime_stats:<slotId>", async () => {
    indexedDbMock.loadMetadata.mockResolvedValueOnce({
      tokenUsage: {
        promptTokens: 9,
        completionTokens: 6,
        totalTokens: 15,
      },
      logs: [
        {
          id: "log-a",
          timestamp: 2,
          provider: "anthropic",
          model: "claude",
          endpoint: "summary",
        },
      ],
    });

    const result = await loadRuntimeStats("slot-77");

    expect(indexedDbMock.loadMetadata).toHaveBeenCalledTimes(1);
    expect(indexedDbMock.loadMetadata).toHaveBeenCalledWith(
      "runtime_stats:slot-77",
    );
    expect(result.tokenUsage.totalTokens).toBe(15);
    expect(result.logs[0]?.id).toBe("log-a");
  });

  it("exports deterministic metadata key", () => {
    expect(runtimeStatsKey("abc")).toBe("runtime_stats:abc");
  });
});

