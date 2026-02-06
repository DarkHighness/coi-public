import { describe, expect, it } from "vitest";
import {
  injectBudgetStatus,
  injectNoToolCallError,
  injectNormalTurnInstruction,
  injectReadyConsequences,
  injectSudoModeInstruction,
} from "../contextInjector";

const getText = (message: any): string =>
  message?.content?.find((part: any) => part.type === "text")?.text ?? "";

describe("contextInjector", () => {
  it("injects sudo and turn instructions as user messages", () => {
    const history: any[] = [];

    injectSudoModeInstruction(history);
    injectNormalTurnInstruction(history, "vfs_commit_turn", false);
    injectNormalTurnInstruction(history, "vfs_commit_turn", true);

    expect(history).toHaveLength(3);
    expect(history.every((msg) => msg.role === "user")).toBe(true);
    expect(getText(history[0])).toContain("FORCE UPDATE MODE");
    expect(getText(history[1])).toContain("[SYSTEM: TOOL USAGE INSTRUCTION]");
    expect(getText(history[2])).toContain("[SYSTEM: CLEANUP MODE TOOL INSTRUCTION]");
  });

  it("injects budget and no-tool-call messages", () => {
    const history: any[] = [];

    injectBudgetStatus(
      history,
      {
        toolCallsUsed: 9,
        toolCallsMax: 10,
        retriesUsed: 0,
        retriesMax: 3,
        loopIterationsUsed: 4,
        loopIterationsMax: 20,
      },
      "vfs_commit_turn",
    );
    injectNoToolCallError(history, "vfs_commit_turn");

    expect(getText(history[0])).toContain("[SYSTEM: BUDGET STATUS]");
    expect(getText(history[0])).toContain("budget_status");
    expect(getText(history[1])).toContain("NO_TOOL_CALL");
  });

  it("keeps ready consequences injection as no-op", () => {
    const history: any[] = [];
    injectReadyConsequences(history);
    expect(history).toHaveLength(0);
  });
});
