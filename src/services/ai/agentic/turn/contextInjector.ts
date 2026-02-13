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
import { formatLoopSkillBaseline } from "../../../prompts/skills/loopSkillBaseline";

// ============================================================================
// System Message Injection
// ============================================================================

/**
 * Inject SUDO mode instruction
 */
export function injectSudoModeInstruction(
  history: UnifiedMessage[],
  ragEnabled: boolean = true,
): void {
  const baseline = formatLoopSkillBaseline("turn");
  history.push(
    createUserMessage(sudoModeInstruction({ toolsetId: "turn", ragEnabled })),
  );
  history.push(
    createUserMessage(
      [
        "[SYSTEM: COMMAND SKILL REQUIRED]",
        "Soft gate baseline (advisory, not blocking):",
        ...baseline,
        "Before any non-read tool call, read: `current/skills/commands/runtime/sudo/SKILL.md`",
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
  contextMeta?: {
    forkId?: number;
    turnNumber?: number;
    mode?: "normal" | "cleanup";
  },
  ragEnabled: boolean = true,
): void {
  history.push(
    createUserMessage(
      (isCleanupMode ? cleanupTurnInstruction : normalTurnInstruction)({
        finishToolName,
        ragEnabled,
      }),
    ),
  );

  if (isCleanupMode) {
    const cleanupBaseline = formatLoopSkillBaseline("cleanup");
    history.push(
      createUserMessage(
        [
          "[SYSTEM: COMMAND SKILL REQUIRED]",
          "Soft gate baseline before cleanup mutation (advisory, not blocking):",
          ...cleanupBaseline,
        ].join("\n"),
      ),
    );

    history.push(
      createUserMessage(
        [
          "[SYSTEM: CLEANUP CONSISTENCY ANCHOR]",
          "Cleanup is a maintenance turn, not a story rewrite.",
          `- Target forkId: ${
            typeof contextMeta?.forkId === "number" ? contextMeta.forkId : "unknown"
          }`,
          `- Target turnNumber: ${
            typeof contextMeta?.turnNumber === "number"
              ? contextMeta.turnNumber
              : "unknown"
          }`,
          "- Read `current/conversation/index.json` first, then only read/write current fork conversation files.",
          "- NEVER read from or mutate other forks while cleaning this fork.",
          "- Preserve narrative continuity with existing world state and conversation files.",
          "- Do NOT fabricate new lore/conflicts unrelated to deduplication/consolidation.",
          "- Verify entities via read-only VFS tools before mutation (vfs_ls / vfs_search / vfs_read).",
          "- Keep player-visible log narrative generic; do not leak hidden truths.",
          "- Structured error recovery (when tool returns { success:false, code, error }):",
          "  1) Do NOT finish while the error is unresolved.",
          "  2) Classify by code (scope/path/order/schema/content), then fix exactly that cause.",
          "  3) Re-read minimum anchors (conversation/index + affected files), then retry one corrected call.",
          "  4) If the same code repeats twice, narrow scope and report blocker instead of forcing progress.",
        ].join("\n"),
      ),
    );
  }

  const modeSkillLines: string[] = ["[SYSTEM: MODE SKILL GUIDANCE]"];
  if (!isCleanupMode) {
    const turnBaseline = formatLoopSkillBaseline("turn");
    modeSkillLines.push(
      "Soft gate (advisory, not blocking) for normal turns:",
      ...turnBaseline,
      "If these skill files are unavailable, continue and keep tool usage protocol-compliant.",
    );
  }
  if (modeFlags?.godMode) {
    modeSkillLines.push(
      "You are currently in God mode.",
      "Hub first: `current/skills/commands/runtime/SKILL.md`",
      "Read: `current/skills/commands/runtime/god/SKILL.md`",
    );
  }
  if (modeFlags?.unlockMode) {
    modeSkillLines.push(
      "Unlock mode is currently ON.",
      "Hub first: `current/skills/commands/runtime/SKILL.md`",
      "Read: `current/skills/commands/runtime/unlock/SKILL.md`",
    );
  }

  if (modeSkillLines.length > 1) {
    history.push(createUserMessage(modeSkillLines.join("\n")));
  }

  if (requiredPresetSkillPaths.length > 0) {
    const lines = [
      "[SYSTEM: PRESET SKILLS ACTIVE]",
      "Hub first: `current/skills/presets/runtime/SKILL.md`",
      "Before non-read tool calls, load active preset skills:",
      ...requiredPresetSkillPaths.map((path) => `- \`current/${path}\``),
    ];
    history.push(createUserMessage(lines.join("\n")));
  }

  if (requiredPresetSkillRequirements.length > 0) {
    const lines = [
      "[SYSTEM: PRESET PROFILES ACTIVE]",
      "Apply active profile mapping by tag (custom_context > save_profile > theme_default):",
      ...requiredPresetSkillRequirements.map(
        (entry) =>
          `- <${entry.tag}> profile=${entry.profile} source=${entry.source} skill=\`current/${entry.path}\``,
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
  invalidations: Array<
    | {
        path: string;
        changeType: "added" | "deleted" | "modified";
      }
    | {
        from: string;
        to: string;
        changeType: "moved";
      }
  >,
): void {
  if (!invalidations.length) {
    return;
  }

  const lines = invalidations.map((entry) => {
    if (entry.changeType === "moved") {
      const from = entry.from.startsWith("current/") ? entry.from : `current/${entry.from}`;
      const to = entry.to.startsWith("current/") ? entry.to : `current/${entry.to}`;
      return `- ${from} -> ${to} (moved)`;
    }
    const currentPath = entry.path.startsWith("current/")
      ? entry.path
      : `current/${entry.path}`;
    return `- ${currentPath} (${entry.changeType})`;
  });

  history.push(
    createUserMessage(
      [
        "[SYSTEM: EXTERNAL_FILE_CHANGES]",
        "Files you already read in this epoch were changed externally:",
        ...lines,
        "If you need to edit any listed file again, re-read it first via vfs_read/vfs_read.",
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
