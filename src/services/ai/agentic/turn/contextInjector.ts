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
import type { VfsSession } from "../../../vfs/vfsSession";
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

const isSessionMirrorPath = (path: string): boolean =>
  /^current\/session\/[^/]+\.jsonl$/i.test(path);

// ============================================================================
// Skill Pre-injection
// ============================================================================

/**
 * Pre-load required command skill files into conversation context.
 * Reads each skill from VFS, injects content as `<file>` messages,
 * and marks them as "seen" so gates are satisfied without explicit reads.
 * Returns the list of paths that were successfully pre-loaded.
 */
export function preloadCommandSkills(
  history: UnifiedMessage[],
  vfsSession: VfsSession,
  requiredPaths: string[],
): string[] {
  if (requiredPaths.length === 0) return [];

  const preloaded: string[] = [];
  for (const skillPath of requiredPaths) {
    const currentPath = toCurrentReadablePath(skillPath);
    const file = vfsSession.readFile(skillPath);
    if (file && typeof file.content === "string" && file.content.trim()) {
      history.push(
        createUserMessage(
          `<file path="${currentPath}">\n${file.content}\n</file>`,
        ),
      );
      vfsSession.noteToolSeen(skillPath);
      preloaded.push(skillPath);
    }
  }

  if (preloaded.length > 0) {
    console.log(
      `[SkillPreload] Pre-injected ${preloaded.length}/${requiredPaths.length} command skills`,
    );
  }

  return preloaded;
}

/**
 * Inject command skill gate status. If all skills are pre-loaded, tells the AI
 * they are already available. If some are missing, lists remaining reads.
 */
export function injectCommandSkillStatus(
  history: UnifiedMessage[],
  requiredPaths: string[],
  preloadedPaths: string[],
): void {
  if (requiredPaths.length === 0) return;

  const preloadedSet = new Set(preloadedPaths.map(toCurrentReadablePath));
  const pending = requiredPaths
    .map(toCurrentReadablePath)
    .filter((p) => !preloadedSet.has(p));

  const lines: string[] = [];

  if (pending.length === 0) {
    lines.push(
      "[SYSTEM: COMMAND SKILLS READY]",
      "All required command skills are pre-loaded in context above. This only satisfies the command-skill gate; preset/read-before-write gates may still require explicit reads in the current epoch.",
    );
  } else {
    lines.push(
      "[SYSTEM: COMMAND SKILL REQUIRED]",
      "Hard gate (enforced): before any non-read tool call in this epoch, read:",
      ...pending.map((p) => `- \`${p}\``),
    );
    if (preloadedPaths.length > 0) {
      lines.push(
        `(${preloadedPaths.length} other skill(s) already pre-loaded in context.)`,
      );
    }
  }

  history.push(createUserMessage(lines.join("\n")));
}

// ============================================================================
// System Message Injection
// ============================================================================

/**
 * Inject SUDO mode instruction
 */
export function injectSudoModeInstruction(
  history: UnifiedMessage[],
  ragEnabled: boolean = true,
  preloadedSkillPaths: string[] = [],
  requiredCommandSkillPaths: string[] = [],
): void {
  history.push(
    createUserMessage(sudoModeInstruction({ toolsetId: "turn", ragEnabled })),
  );
  injectCommandSkillStatus(
    history,
    requiredCommandSkillPaths,
    preloadedSkillPaths,
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
  preloadedSkillPaths: string[] = [],
  requiredCommandSkillPaths: string[] = [],
): void {
  history.push(
    createUserMessage(
      (isCleanupMode ? cleanupTurnInstruction : normalTurnInstruction)({
        finishToolName,
        toolsetId: isCleanupMode
          ? "cleanup"
          : normalCommandProtocol === "player-rate"
            ? "playerRate"
            : "turn",
        ragEnabled,
      }),
    ),
  );

  // Use shared skill status (replaces hardcoded skill lists for cleanup/normal/player-rate)
  injectCommandSkillStatus(
    history,
    requiredCommandSkillPaths,
    preloadedSkillPaths,
  );

  if (isCleanupMode) {
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
          "- Session efficiency: do not repeatedly read the same files across turns; reuse already-read context.",
          "- Re-read only when the system explicitly provides `[SYSTEM: EXTERNAL_FILE_CHANGES]`, recovery explicitly requires it, or you now need a file section/pointer you have not read yet.",
          "- If the file was edited by your own successful write in this session, do not re-read it by default.",
          "- Structured error recovery (when tool returns { success:false, code, error }):",
          "  1) Follow `details.recovery` steps — they are context-aware and safe to execute in order.",
          "  2) Do NOT finish while blocking errors remain (WRITE_EXISTING_TARGET_RETRY_REQUIRED / FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE).",
          "  3) If the same code repeats twice, narrow scope and report blocker instead of forcing progress.",
        ].join("\n"),
      ),
    );
  }

  if (!isCleanupMode && normalCommandProtocol === "player-rate") {
    history.push(
      createUserMessage(
        [
          "[SYSTEM: PLAYER RATE MODE]",
          "This loop is triggered by `[Player Rate]` feedback.",
          "- Treat payload as feedback ingestion, not protagonist action simulation.",
          "- Update only `workspace/SOUL.md` and `workspace/USER.md` when evidence is meaningful.",
          "- Player-rate is not `sudo` / `forceUpdate` / `godMode`.",
          "- Do not rewrite established world facts or timeline outcomes from rating feedback.",
          "- Finish this loop with `vfs_end_turn` as the LAST tool call (no arguments).",
          "- Keep visible plot progression unchanged for this isolated feedback loop.",
        ].join("\n"),
      ),
    );
  }

  const modeSkillLines: string[] = ["[SYSTEM: MODE SKILL GUIDANCE]"];
  modeSkillLines.push(
    "Do not skip required skill preflight above. Non-read tools are hard-blocked until those reads are done.",
    "**DOMAIN SKILL LOADING — OPTIONAL (quality recommendation)**:",
    "Your system prompt contains the full skill catalog. Pick 1-2 skills matching this turn when scene depth requires it:",
    '- NPC interaction/dialogue → `vfs_read_chars({ path: "current/skills/gm/actor-logic/npc/SKILL.md" })`',
    '- Emotional/dramatic scene → `vfs_read_chars({ path: "current/skills/craft/emotional-empathy/SKILL.md" })`',
    '- Complex NPC growth/psychology → `vfs_read_chars({ path: "current/skills/gm/actor-logic/npc-soul/SKILL.md" })`',
    '- Moral dilemma/gray ethics → `vfs_read_chars({ path: "current/skills/gm/moral-complexity/SKILL.md" })`',
    "Reuse loaded skills across turns; re-read only on `[SYSTEM: EXTERNAL_FILE_CHANGES]` or insufficient scope.",
    "Skip domain skills only for purely mechanical actions (inventory check, simple movement).",
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
    if (isSessionMirrorPath(path)) {
      return `vfs_read_lines({ path: "${path}", startLine: 1, lineCount: 80  })`;
    }
    if (path.startsWith("current/skills/")) {
      return `vfs_read_lines({ path: "${path}", startLine: 1, lineCount: 120  })`;
    }
    if (path.endsWith(".md")) {
      return `vfs_read_lines({ path: "${path}", startLine: 1, lineCount: 90  })`;
    }
    return `vfs_read_chars({ path: "${path}" })`;
  };

  const lines = [
    "[SYSTEM: COLD START REQUIRED READS]",
    "Before any non-read tool call in this loop, perform these read calls once in current read-epoch (use vfs_read_markdown when section selectors are known):",
    ...uniquePaths.map(
      (path, index) => `${index + 1}. \`${formatPreloadCall(path)}\``,
    ),
    "For `current/session/<session_uid>.jsonl`, keep reads line-windowed; do not use unbounded chars mode.",
    "For long skill manuals under `current/skills/**`, prefer bounded line windows first, then expand only if needed.",
    "If a read returns READ_LIMIT_EXCEEDED/READ_LIMIT_HINT, shrink window size first (for example 80 -> 40 lines) before widening scope.",
    "Run this preload once at session cold start to avoid avoidable gate/retry token waste; do not replay the same reads every turn.",
    "Repeat a preload read only when `[SYSTEM: EXTERNAL_FILE_CHANGES]` indicates external updates or when you need additional sections/pointers that were not read.",
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
        "This re-read requirement is triggered by this explicit external-change signal; your own successful writes do not require automatic re-read.",
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
