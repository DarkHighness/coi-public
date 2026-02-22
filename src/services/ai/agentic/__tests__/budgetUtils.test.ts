import { describe, expect, it } from "vitest";
import {
  checkBudgetExhaustion,
  createBudgetState,
  generateBudgetPrompt,
  getBudgetSummary,
  incrementIterations,
  incrementRetries,
  incrementToolCalls,
} from "../budgetUtils";

describe("budgetUtils", () => {
  it("creates budget state with loop defaults and custom overrides", () => {
    const summaryDefaults = createBudgetState({ extra: {} } as any, {
      loopType: "summary",
    });
    const visualDefaults = createBudgetState({ extra: {} } as any, {
      loopType: "visual",
    });

    expect(summaryDefaults).toMatchObject({
      toolCallsMax: 90,
      retriesMax: 5,
      loopIterationsMax: 25,
      toolCallsUsed: 0,
      retriesUsed: 0,
      loopIterationsUsed: 0,
    });
    expect(visualDefaults).toMatchObject({
      toolCallsMax: 24,
      retriesMax: 3,
      loopIterationsMax: 3,
      toolCallsUsed: 0,
      retriesUsed: 0,
      loopIterationsUsed: 0,
    });

    const overrides = createBudgetState(
      {
        extra: {
          maxToolCalls: 7,
          turnRetryLimit: 2,
          maxAgenticRounds: 5,
        },
      } as any,
      { loopType: "turn" },
    );

    expect(overrides).toMatchObject({
      toolCallsMax: 7,
      retriesMax: 2,
      loopIterationsMax: 5,
    });

    const visualOverrides = createBudgetState(
      {
        extra: {
          visualMaxToolCalls: 11,
          visualMaxAgenticRounds: 4,
          visualRetryLimit: 1,
        },
      } as any,
      { loopType: "visual" },
    );

    expect(visualOverrides).toMatchObject({
      toolCallsMax: 11,
      retriesMax: 1,
      loopIterationsMax: 4,
    });
  });

  it("renders LAST_CHANCE prompt with forced finish action", () => {
    const prompt = generateBudgetPrompt(
      {
        toolCallsUsed: 49,
        toolCallsMax: 50,
        retriesUsed: 1,
        retriesMax: 3,
        loopIterationsUsed: 19,
        loopIterationsMax: 20,
      },
      "vfs_finish_turn",
    );

    expect(prompt).toContain('level="LAST_CHANCE"');
    expect(prompt).toContain("Your ONLY allowed tool call is");
    expect(prompt).toContain("`vfs_finish_turn`");
    expect(prompt).toContain("as the LAST tool call");
  });

  it("detects budget exhaustion reason by priority", () => {
    expect(
      checkBudgetExhaustion({
        toolCallsUsed: 10,
        toolCallsMax: 10,
        retriesUsed: 0,
        retriesMax: 3,
        loopIterationsUsed: 0,
        loopIterationsMax: 20,
      }),
    ).toMatchObject({ exhausted: true, reason: "tool_calls" });

    expect(
      checkBudgetExhaustion({
        toolCallsUsed: 1,
        toolCallsMax: 10,
        retriesUsed: 3,
        retriesMax: 3,
        loopIterationsUsed: 0,
        loopIterationsMax: 20,
      }),
    ).toMatchObject({ exhausted: true, reason: "retries" });

    expect(
      checkBudgetExhaustion({
        toolCallsUsed: 1,
        toolCallsMax: 10,
        retriesUsed: 1,
        retriesMax: 3,
        loopIterationsUsed: 20,
        loopIterationsMax: 20,
      }),
    ).toMatchObject({ exhausted: true, reason: "loop_iterations" });
  });

  it("increments counters and returns human-readable summary", () => {
    const state = {
      toolCallsUsed: 0,
      toolCallsMax: 10,
      retriesUsed: 0,
      retriesMax: 3,
      loopIterationsUsed: 0,
      loopIterationsMax: 20,
    };

    incrementToolCalls(state, 2);
    incrementRetries(state);
    incrementIterations(state);

    expect(state).toMatchObject({
      toolCallsUsed: 2,
      retriesUsed: 1,
      loopIterationsUsed: 1,
    });
    expect(getBudgetSummary(state)).toBe(
      "Tools: 2/10, Retries: 1/3, Iterations: 1/20",
    );
  });
});
