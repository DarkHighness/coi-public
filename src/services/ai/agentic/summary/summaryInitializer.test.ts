import { describe, expect, it } from "vitest";
import { VFS_TOOLSETS } from "@/services/vfsToolsets";
import {
  accumulateSummaryUsage,
  createSummaryLoopState,
} from "./summaryInitializer";

describe("summaryInitializer", () => {
  it("creates summary loop state with summary-only tools and budgets", () => {
    const state = createSummaryLoopState({
      settings: {
        extra: {
          maxToolCalls: 17,
          summaryRetryLimit: 4,
          maxAgenticRounds: 9,
        },
      },
    } as any);

    expect(state.budgetState).toMatchObject({
      toolCallsUsed: 0,
      toolCallsMax: 17,
      retriesUsed: 0,
      retriesMax: 4,
      loopIterationsUsed: 0,
      loopIterationsMax: 9,
    });

    const allowed = new Set(VFS_TOOLSETS.summary.tools);
    expect(state.activeTools.length).toBeGreaterThan(0);
    expect(state.activeTools.every((tool) => allowed.has(tool.name))).toBe(
      true,
    );
    expect(
      state.activeTools.some((tool) => tool.name === "vfs_commit_summary"),
    ).toBe(true);

    expect(state.totalUsage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
  });

  it("accumulates usage safely and ignores undefined usage", () => {
    const state = createSummaryLoopState({ settings: {} } as any);

    accumulateSummaryUsage(state, {
      promptTokens: 2,
      completionTokens: 3,
      totalTokens: 5,
    });
    accumulateSummaryUsage(state, {
      promptTokens: 1,
      completionTokens: 0,
      totalTokens: 1,
    });
    accumulateSummaryUsage(state, undefined);

    expect(state.totalUsage).toEqual({
      promptTokens: 3,
      completionTokens: 3,
      totalTokens: 6,
    });
  });
});
