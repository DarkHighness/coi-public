/**
 * Context Injector
 *
 * Handles injection of system messages into conversation history.
 */

import type {
  CustomRulesAckPendingReason,
  UnifiedMessage,
} from "../../../../types";
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

const toCurrentReadablePath = (path: string): string => {
  const normalized = path.trim().replace(/^\/+/, "");
  if (!normalized) return "current";
  if (
    normalized.startsWith("current/") ||
    normalized.startsWith("shared/") ||
    normalized.startsWith("forks/")
  ) {
    return normalized;
  }
  return `current/${normalized}`;
};

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
  history.push(
    createUserMessage(sudoModeInstruction({ toolsetId: "turn", ragEnabled })),
  );
  history.push(
    createUserMessage(
      [
        "[SYSTEM: COMMAND SKILL REQUIRED]",
        "Hard gate (enforced): before any non-read tool call in this epoch, read:",
        "- `current/skills/commands/runtime/SKILL.md`",
        "- `current/skills/commands/runtime/sudo/SKILL.md`",
        "- `current/skills/core/protocols/SKILL.md`",
        "- `current/skills/craft/writing/SKILL.md`",
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
  normalCommandProtocol: "turn" | "player-rate" = "turn",
): void {
  history.push(
    createUserMessage(
      (isCleanupMode ? cleanupTurnInstruction : normalTurnInstruction)({
        finishToolName,
        toolsetId:
          isCleanupMode
            ? "cleanup"
            : normalCommandProtocol === "player-rate"
              ? "playerRate"
              : "turn",
        ragEnabled,
      }),
    ),
  );

  if (isCleanupMode) {
    history.push(
      createUserMessage(
        [
          "[SYSTEM: COMMAND SKILL REQUIRED]",
          "Hard gate (enforced): before any non-read tool call in this epoch, read:",
          "- `current/skills/commands/runtime/SKILL.md`",
          "- `current/skills/commands/runtime/cleanup/SKILL.md`",
          "- `current/skills/core/protocols/SKILL.md`",
          "- `current/skills/craft/writing/SKILL.md`",
        ].join("\n"),
      ),
    );

    history.push(
      createUserMessage(
        [
          "[SYSTEM: CLEANUP CONSISTENCY ANCHOR]",
          "Cleanup is a maintenance turn, not a story rewrite.",
          `- Target forkId: ${
            typeof contextMeta?.forkId === "number"
              ? contextMeta.forkId
              : "unknown"
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
          "- Verify entities via read-only VFS tools before mutation (vfs_ls / vfs_search / vfs_read_markdown/vfs_read_chars/vfs_read_lines/vfs_read_json).",
          "- Keep player-visible log narrative generic; do not leak hidden truths.",
          "- Session efficiency: do not repeatedly read the same files across turns; reuse already-read context unless file content changed or recovery requires a targeted re-read.",
          "- Structured error recovery (when tool returns { success:false, code, error }):",
          "  1) Do NOT finish while the error is unresolved.",
          "  2) Map code to action:",
          "     - INVALID_PARAMS / INVALID_DATA: read docs/schema, then correct payload.",
          "     - INVALID_ACTION / FORCED_FINISH / MULTIPLE_FINISH_CALLS / FINISH_NOT_LAST: fix call order, keep one finish last.",
          "     - WRITE_EXISTING_TARGET_RETRY_REQUIRED / FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE: repair mode (retry failed required writes first).",
          "     - CROSS_FORK_ACCESS_BLOCKED: remove non-target fork paths.",
          "  3) Re-read minimum anchors: `current/conversation/index.json` + files named in the error/retry targets, then retry one corrected call.",
          "  4) If the same code repeats twice, narrow scope and report blocker instead of forcing progress.",
        ].join("\n"),
      ),
    );
  }

  if (!isCleanupMode) {
    const activeCommandSkillPath =
      normalCommandProtocol === "player-rate"
        ? "current/skills/commands/runtime/player-rate/SKILL.md"
        : "current/skills/commands/runtime/turn/SKILL.md";
    const commandSkillLines: string[] = [
      "[SYSTEM: COMMAND SKILL REQUIRED]",
      "Hard gate (enforced): before any non-read tool call in this epoch, read:",
      "- `current/skills/commands/runtime/SKILL.md`",
      `- \`${activeCommandSkillPath}\``,
      "- `current/skills/core/protocols/SKILL.md`",
      "- `current/skills/craft/writing/SKILL.md`",
    ];
    if (modeFlags?.godMode && normalCommandProtocol !== "player-rate") {
      commandSkillLines.push(
        "- `current/skills/commands/runtime/god/SKILL.md` (god mode active)",
      );
    }
    if (modeFlags?.unlockMode && normalCommandProtocol !== "player-rate") {
      commandSkillLines.push(
        "- `current/skills/commands/runtime/unlock/SKILL.md` (unlock mode active)",
      );
    }
    history.push(createUserMessage(commandSkillLines.join("\n")));
  }

  if (!isCleanupMode && normalCommandProtocol === "player-rate") {
    history.push(
      createUserMessage(
        [
          "[SYSTEM: PLAYER RATE MODE]",
          "This loop is triggered by `[Player Rate]` feedback.",
          "- Treat payload as feedback ingestion, not protagonist action simulation.",
          "- Update only `current/world/soul.md` and `current/world/global/soul.md` when evidence is meaningful.",
          "- Finish this loop with `vfs_finish_soul` (provide `currentSoul` and/or `globalSoul`).",
          "- Keep visible plot progression unchanged for this isolated feedback loop.",
        ].join("\n"),
      ),
    );
  }

  const modeSkillLines: string[] = ["[SYSTEM: MODE SKILL GUIDANCE]"];
  modeSkillLines.push(
    "Do not skip required skill preflight above. Non-read tools are hard-blocked until those reads are done.",
    "Strongly recommended per session (not every turn):",
    '- `vfs_read_json({ path: "current/skills/index.json", pointers: ["/skills"] })`',
    "- At session cold start/rebuild, select and read 1-3 additional skill files aligned with active domain/theme/mechanics.",
    "- Reuse those skill docs across later turns; re-read only when requirements change or files are updated.",
    "- Session read-cache rule: do not re-read files already read in this conversation session unless they changed, prior read scope was insufficient, or error recovery explicitly requires re-read.",
  );
  if (modeFlags?.godMode && normalCommandProtocol !== "player-rate") {
    modeSkillLines.push(
      "You are currently in God mode.",
      "Apply permissive outcomes with coherent state updates.",
    );
  }
  if (modeFlags?.unlockMode && normalCommandProtocol !== "player-rate") {
    modeSkillLines.push(
      "Unlock mode is currently ON.",
      "Keep hidden/visible layering deterministic.",
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
 * Inject explicit cold-start preload read plan to avoid first-call gate errors.
 */
export function injectColdStartRequiredReads(
  history: UnifiedMessage[],
  requiredReadPaths: string[],
): void {
  const uniquePaths = Array.from(
    new Set(
      (requiredReadPaths || [])
        .map((path) => path.trim())
        .filter((path) => path.length > 0)
        .map(toCurrentReadablePath),
    ),
  );

  if (uniquePaths.length === 0) {
    return;
  }

  const formatPreloadCall = (path: string): string => {
    if (path === "current/conversation/session.jsonl") {
      return `vfs_read_lines({ path: "${path}", startLine: 1, lineCount: 200  })`;
    }
    if (path.startsWith("current/skills/")) {
      return `vfs_read_lines({ path: "${path}", startLine: 1, lineCount: 220  })`;
    }
    if (path.endsWith(".md")) {
      return `vfs_read_lines({ path: "${path}", startLine: 1, lineCount: 180  })`;
    }
    return `vfs_read_chars({ path: "${path}" })`;
  };

  const lines = [
    "[SYSTEM: COLD START REQUIRED READS]",
    "Before any non-read tool call in this loop, perform these read calls once in current read-epoch (use vfs_read_markdown when section selectors are known):",
    ...uniquePaths.map(
      (path, index) => `${index + 1}. \`${formatPreloadCall(path)}\``,
    ),
    'For `current/conversation/session.jsonl`, keep reads line-windowed; do not use unbounded chars mode.',
    "For long skill manuals under `current/skills/**`, prefer bounded line windows first, then expand only if needed.",
    "Run this preload once at session cold start to avoid avoidable gate/retry token waste; do not replay the same reads every turn unless invalidated by file changes.",
  ];

  history.push(createUserMessage(lines.join("\n")));
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
      const from = entry.from.startsWith("current/")
        ? entry.from
        : `current/${entry.from}`;
      const to = entry.to.startsWith("current/")
        ? entry.to
        : `current/${entry.to}`;
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
        "If you need to edit any listed file again, re-read it first via vfs_read_markdown/vfs_read_chars/vfs_read_lines/vfs_read_json.",
        "If a file is not needed for this turn, you do not need to re-read it.",
      ].join("\n"),
    ),
  );
}

/**
 * Inject ready consequences from causal chains
 */
export function injectReadyConsequences(history: UnifiedMessage[]): void {
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
