/**
 * Context Injector
 *
 * Handles injection of system messages into conversation history.
 */

import type { CustomRulesAckPendingReason, UnifiedMessage } from "../../../../types";
import { createUserMessage } from "../../../messageTypes";
import { generateBudgetPrompt, BudgetState } from "../budgetUtils";
import {
  sudoModeInstruction,
  normalTurnInstruction,
  cleanupTurnInstruction,
  budgetStatusMessage,
  noToolCallError,
  retconAckRequiredMessage,
} from "../../../prompts/atoms/core";

// ============================================================================
// System Message Injection
// ============================================================================

/**
 * Inject SUDO mode instruction
 */
export function injectSudoModeInstruction(
  history: UnifiedMessage[],
): void {
  history.push(createUserMessage(sudoModeInstruction({ toolsetId: "turn" })));
  history.push(
    createUserMessage(
      [
        "[SYSTEM: COMMAND SKILL REQUIRED]",
        "Before any non-read tool call, read: `current/skills/commands/sudo/SKILL.md`",
      ].join("\n"),
    ),
  );
}

/**
 * Inject normal turn instruction
 */
export function injectNormalTurnInstruction(
  history: UnifiedMessage[],
  finishToolName: string,
  isCleanupMode: boolean = false,
  modeFlags?: { godMode?: boolean; unlockMode?: boolean },
): void {
  history.push(
    createUserMessage(
      (isCleanupMode ? cleanupTurnInstruction : normalTurnInstruction)({
        finishToolName,
      }),
    ),
  );

  if (isCleanupMode) {
    history.push(
      createUserMessage(
        [
          "[SYSTEM: COMMAND SKILL REQUIRED]",
          "Before any cleanup mutation, read: `current/skills/commands/cleanup/SKILL.md`",
        ].join("\n"),
      ),
    );
  }

  const modeSkillLines: string[] = ["[SYSTEM: MODE SKILL GUIDANCE]"];
  if (modeFlags?.godMode) {
    modeSkillLines.push(
      "You are currently in God mode.",
      "Read: `current/skills/commands/god/SKILL.md`",
    );
  }
  if (modeFlags?.unlockMode) {
    modeSkillLines.push(
      "Unlock mode is currently ON.",
      "Read: `current/skills/commands/unlock/SKILL.md`",
    );
  }

  if (modeSkillLines.length > 1) {
    history.push(createUserMessage(modeSkillLines.join("\n")));
  }
}

/**
 * Inject retcon acknowledgement requirement when custom rules changed.
 */
export function injectRetconAckRequired(
  history: UnifiedMessage[],
  pendingHash: string,
  pendingReason?: CustomRulesAckPendingReason,
): void {
  history.push(
    createUserMessage(
      retconAckRequiredMessage({
        pendingHash,
        pendingReason,
      }),
    ),
  );
}

/**
 * Inject ready consequences from causal chains
 */
export function injectReadyConsequences(
  history: UnifiedMessage[],
): void {
  void history;
}

/**
 * Inject budget status message
 */
export function injectBudgetStatus(
  history: UnifiedMessage[],
  budgetState: BudgetState,
  finishToolName: string,
): void {
  const budgetPrompt = generateBudgetPrompt(budgetState, finishToolName);
  history.push(createUserMessage(budgetStatusMessage({ budgetPrompt })));
}

/**
 * Inject no tool call error message
 */
export function injectNoToolCallError(
  history: UnifiedMessage[],
  finishToolName: string,
): void {
  history.push(createUserMessage(noToolCallError({ finishToolName })));
}
