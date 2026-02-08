/**
 * Context Injector
 *
 * Handles injection of system messages into conversation history.
 */

import type { CustomRulesAckPendingReason, UnifiedMessage } from "../../../../types";
import type { ActivePresetSkillRequirement } from "../../utils";
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
  requiredPresetSkillPaths: string[] = [],
  requiredPresetSkillRequirements: ActivePresetSkillRequirement[] = [],
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

  if (requiredPresetSkillPaths.length > 0) {
    const lines = [
      "[SYSTEM: PRESET SKILLS ACTIVE]",
      "Before non-read tool calls, load active preset skills:",
      ...requiredPresetSkillPaths.map((path) => `- current/${path}`),
    ];
    history.push(createUserMessage(lines.join("\n")));
  }

  if (requiredPresetSkillRequirements.length > 0) {
    const lines = [
      "[SYSTEM: PRESET PROFILES ACTIVE]",
      "Apply active profile mapping by tag (custom_context > save_profile > theme_default):",
      ...requiredPresetSkillRequirements.map(
        (entry) =>
          `- <${entry.tag}> profile=${entry.profile} source=${entry.source} skill=current/${entry.path}`,
      ),
    ];
    history.push(createUserMessage(lines.join("\n")));
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
 * Inject one-shot reminder for files that were read in this epoch
 * and then mutated out-of-band (for example via StateEditor).
 */
export function injectOutOfBandReadInvalidations(
  history: UnifiedMessage[],
  invalidations: Array<{
    path: string;
    changeType: "added" | "deleted" | "modified";
  }>,
): void {
  if (!invalidations.length) {
    return;
  }

  const lines = invalidations.map(({ path, changeType }) => {
    const currentPath = path.startsWith("current/") ? path : `current/${path}`;
    return `- ${currentPath} (${changeType})`;
  });

  history.push(
    createUserMessage(
      [
        "[SYSTEM: EXTERNAL_FILE_CHANGES]",
        "Files you already read in this epoch were changed externally:",
        ...lines,
        "If you need to edit any listed file again, re-read it first via vfs_read/vfs_read_many.",
        "If a file is not needed for this turn, you do not need to re-read it.",
      ].join("\n"),
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
