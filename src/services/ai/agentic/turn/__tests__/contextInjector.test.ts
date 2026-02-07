import { describe, expect, it } from "vitest";
import {
  injectBudgetStatus,
  injectNoToolCallError,
  injectNormalTurnInstruction,
  injectReadyConsequences,
  injectRetconAckRequired,
  injectSudoModeInstruction,
} from "../contextInjector";

const getText = (message: any): string =>
  message?.content?.find((part: any) => part.type === "text")?.text ?? "";

describe("contextInjector", () => {
  it("injects sudo and turn instructions as user messages", () => {
    const history: any[] = [];

    injectSudoModeInstruction(history);
    injectNormalTurnInstruction(history, "vfs_commit_turn", false, {
      godMode: true,
      unlockMode: true,
    });
    injectNormalTurnInstruction(history, "vfs_commit_turn", true, {
      godMode: false,
      unlockMode: false,
    });

    expect(history).toHaveLength(6);
    expect(history.every((msg) => msg.role === "user")).toBe(true);
    expect(getText(history[0])).toContain("FORCE UPDATE MODE");
    expect(getText(history[1])).toContain("COMMAND SKILL REQUIRED");
    expect(getText(history[2])).toContain("[SYSTEM: TOOL USAGE INSTRUCTION]");
    expect(getText(history[3])).toContain("MODE SKILL GUIDANCE");
    expect(getText(history[3])).toContain("You are currently in God mode.");
    expect(getText(history[3])).toContain("commands/god/SKILL.md");
    expect(getText(history[3])).toContain("commands/unlock/SKILL.md");
    expect(getText(history[4])).toContain("[SYSTEM: CLEANUP MODE TOOL INSTRUCTION]");
    expect(getText(history[5])).toContain("COMMAND SKILL REQUIRED");
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


  it("injects retcon ack required system message", () => {
    const history: any[] = [];

    injectRetconAckRequired(history, "hash_123", "customRules");

    expect(history).toHaveLength(1);
    expect(getText(history[0])).toContain("RETCON_ACK_REQUIRED");
    expect(getText(history[0])).toContain("hash_123");
    expect(getText(history[0])).toContain("retconAck");
  });

  it("keeps ready consequences injection as no-op", () => {
    const history: any[] = [];
    injectReadyConsequences(history);
    expect(history).toHaveLength(0);
  });
});
