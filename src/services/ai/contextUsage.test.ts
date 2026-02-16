import { describe, expect, it } from "vitest";
import {
  buildToolCallContextUsageSnapshot,
  resolveVfsReadHardCapChars,
} from "./contextUsage";

describe("contextUsage", () => {
  it("computes vfs read cap from 1% context window with 4 chars/token", () => {
    const fallbackCap = resolveVfsReadHardCapChars(undefined);
    expect(fallbackCap.contextWindowTokens).toBe(32000);
    expect(fallbackCap.hardCapChars).toBe(1280);

    const overriddenCap = resolveVfsReadHardCapChars({
      story: { providerId: "provider-1", modelId: "model-1" },
      providers: { instances: [{ id: "provider-1", protocol: "openai" }] },
      modelContextWindows: { "provider-1::model-1": 100000 },
    } as any);
    expect(overriddenCap.contextWindowTokens).toBe(100000);
    expect(overriddenCap.hardCapChars).toBe(4000);
  });

  it("builds usage snapshot with threshold and ratio metadata", () => {
    const snapshot = buildToolCallContextUsageSnapshot({
      settings: {
        story: { providerId: "provider-1", modelId: "model-1" },
        providers: { instances: [{ id: "provider-1", protocol: "openai" }] },
        modelContextWindows: { "provider-1::model-1": 50000 },
      } as any,
      promptTokens: 26000,
      autoCompactThreshold: 0.7,
    });

    expect(snapshot.contextWindowTokens).toBe(50000);
    expect(snapshot.thresholdTokens).toBe(35000);
    expect(snapshot.usageRatio).toBeCloseTo(0.52, 4);
    expect(snapshot.tokensToThreshold).toBe(9000);
  });
});
