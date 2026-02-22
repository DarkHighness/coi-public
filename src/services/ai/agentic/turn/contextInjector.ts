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
import { describeSkillPolicyPaths } from "../../../skills/skillPolicies";

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

const hasPathSeenInCurrentEpoch = (
  vfsSession: VfsSession,
  path: string,
): boolean => {
  const currentPath = toCurrentReadablePath(path);
  if (vfsSession.hasToolSeenInCurrentEpoch(currentPath)) {
    return true;
  }

  if (currentPath.startsWith("current/")) {
    const relativePath = currentPath.slice("current/".length);
    if (relativePath && vfsSession.hasToolSeenInCurrentEpoch(relativePath)) {
      return true;
    }
  }

  return false;
};

const preloadRequiredSkills = (
  history: UnifiedMessage[],
  vfsSession: VfsSession,
  requiredPaths: string[],
  label: "command" | "preset",
): string[] => {
  if (requiredPaths.length === 0) return [];

  const injectedByHistory = new Set<string>();
  for (const message of history) {
    const text = message.content.find((part) => part.type === "text")?.text;
    if (!text || !text.includes('<file path="')) continue;
    const matches = text.matchAll(/<file path="([^"]+)">/g);
    for (const match of matches) {
      const path = match[1]?.trim();
      if (path) {
        injectedByHistory.add(path);
      }
    }
  }

  const preloaded: string[] = [];
  const injectedInThisPass = new Set<string>();
  for (const skillPath of requiredPaths) {
    const currentPath = toCurrentReadablePath(skillPath);
    if (injectedInThisPass.has(currentPath)) {
      continue;
    }
    if (
      hasPathSeenInCurrentEpoch(vfsSession, skillPath) &&
      injectedByHistory.has(currentPath)
    ) {
      continue;
    }
    injectedInThisPass.add(currentPath);

    const file = vfsSession.readFile(skillPath);
    if (file && typeof file.content === "string" && file.content.trim()) {
      history.push(
        createUserMessage(
          `<file path="${currentPath}">\n${file.content}\n</file>`,
        ),
      );
      vfsSession.noteToolSeen(skillPath);
      injectedByHistory.add(currentPath);
      preloaded.push(skillPath);
    }
  }

  if (preloaded.length > 0) {
    console.log(
      `[SkillPreload] Pre-injected ${preloaded.length}/${requiredPaths.length} ${label} skills`,
    );
  }

  return preloaded;
};

interface PlayerSkillPolicyStatus {
  requiredSkillPaths?: string[];
  recommendedSkillPaths?: string[];
  forbiddenSkillPaths?: string[];
  ignoredForbiddenSkillPaths?: string[];
}

const compactSkillDescription = (
  description: string,
  maxLength: number = 96,
): string => {
  const normalized = description.trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
};

const formatSkillPolicyLines = (paths: string[]): string[] =>
  describeSkillPolicyPaths(paths).map((entry) => {
    const compactDescription = compactSkillDescription(entry.description);
    return compactDescription
      ? `- \`${entry.currentPath}\` — ${entry.title} (${compactDescription})`
      : `- \`${entry.currentPath}\` — ${entry.title}`;
  });

const injectPlayerSkillPolicyStatus = (
  history: UnifiedMessage[],
  policy?: PlayerSkillPolicyStatus,
): void => {
  const required = policy?.requiredSkillPaths || [];
  const recommended = policy?.recommendedSkillPaths || [];
  const forbidden = policy?.forbiddenSkillPaths || [];
  const ignoredForbidden = policy?.ignoredForbiddenSkillPaths || [];

  if (
    required.length === 0 &&
    recommended.length === 0 &&
    forbidden.length === 0 &&
    ignoredForbidden.length === 0
  ) {
    return;
  }

  const lines: string[] = [
    "[SYSTEM: PLAYER SKILLS POLICY]",
    "Apply player-configured SKILLS policy for this session:",
  ];

  if (required.length > 0) {
    lines.push(
      "- REQUIRED (auto-preloaded at session start):",
      ...formatSkillPolicyLines(required),
      "  (Do not spend extra read calls unless you need additional sections beyond injected context.)",
    );
  }
  if (recommended.length > 0) {
    lines.push(
      "- RECOMMENDED (soft guidance, read when scene context matches):",
      ...formatSkillPolicyLines(recommended),
    );
  }
  if (forbidden.length > 0) {
    lines.push(
      "- FORBIDDEN (hard gate): never call read tools on these skill files in this session:",
      ...formatSkillPolicyLines(forbidden),
    );
  }
  if (ignoredForbidden.length > 0) {
    lines.push(
      "- NOTE: These forbidden entries are ignored because hard runtime/preset gates require them:",
      ...formatSkillPolicyLines(ignoredForbidden),
    );
  }

  history.push(createUserMessage(lines.join("\n")));
};

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
  return preloadRequiredSkills(history, vfsSession, requiredPaths, "command");
}

/**
 * Pre-load required preset skill files into conversation context.
 * Same behavior as command skill preload, but for active preset profiles.
 */
export function preloadPresetSkills(
  history: UnifiedMessage[],
  vfsSession: VfsSession,
  requiredPaths: string[],
): string[] {
  return preloadRequiredSkills(history, vfsSession, requiredPaths, "preset");
}

/**
 * Inject command skill gate status. If all skills are pre-loaded, tells the AI
 * they are already available. If some are missing, lists remaining reads.
 */
export function injectCommandSkillStatus(
  history: UnifiedMessage[],
  requiredPaths: string[],
  satisfiedPaths: string[],
): void {
  if (requiredPaths.length === 0) return;

  const satisfiedSet = new Set(satisfiedPaths.map(toCurrentReadablePath));
  const pending = requiredPaths
    .map(toCurrentReadablePath)
    .filter((p) => !satisfiedSet.has(p));

  const lines: string[] = [];

  if (pending.length === 0) {
    lines.push(
      "[SYSTEM: COMMAND SKILLS READY]",
      "All required command skills are pre-loaded in context above. This only satisfies the command-skill gate; preset/read-before-write gates may still require explicit reads in this session.",
    );
  } else {
    lines.push(
      "[SYSTEM: COMMAND SKILL REQUIRED]",
      "Hard gate (enforced): before any non-read tool call in this session, read:",
      ...pending.map((p) => `- \`${p}\``),
    );
    if (satisfiedPaths.length > 0) {
      lines.push(
        `(${satisfiedPaths.length} other skill(s) already satisfied in this session.)`,
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
  vfsVmEnabled: boolean = false,
  playerSkillPolicyStatus?: PlayerSkillPolicyStatus,
): void {
  history.push(
    createUserMessage(
      sudoModeInstruction({ toolsetId: "turn", ragEnabled, vfsVmEnabled }),
    ),
  );
  injectCommandSkillStatus(
    history,
    requiredCommandSkillPaths,
    preloadedSkillPaths,
  );
  injectPlayerSkillPolicyStatus(history, playerSkillPolicyStatus);
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
  satisfiedCommandSkillPaths: string[] = [],
  requiredCommandSkillPaths: string[] = [],
  satisfiedPresetSkillPaths: string[] = [],
  vfsVmEnabled: boolean = false,
  playerSkillPolicyStatus?: PlayerSkillPolicyStatus,
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
        vfsVmEnabled,
      }),
    ),
  );

  // Use shared skill status (replaces hardcoded skill lists for cleanup/normal/player-rate)
  injectCommandSkillStatus(
    history,
    requiredCommandSkillPaths,
    satisfiedCommandSkillPaths,
  );
  injectPlayerSkillPolicyStatus(history, playerSkillPolicyStatus);

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
  const forbiddenSkillSet = new Set(
    playerSkillPolicyStatus?.forbiddenSkillPaths || [],
  );
  const builtInRecommendations = [
    {
      path: "skills/gm/actor-logic/npc/SKILL.md",
      hint: "NPC interaction/dialogue",
    },
    {
      path: "skills/craft/emotional-empathy/SKILL.md",
      hint: "Emotional/dramatic scene",
    },
    {
      path: "skills/gm/actor-logic/npc-soul/SKILL.md",
      hint: "Complex NPC growth/psychology",
    },
    {
      path: "skills/gm/moral-complexity/SKILL.md",
      hint: "Moral dilemma/gray ethics",
    },
  ];
  const allowedBuiltInRecommendations = builtInRecommendations.filter(
    (entry) => !forbiddenSkillSet.has(entry.path),
  );
  const playerRecommendedPaths = (
    playerSkillPolicyStatus?.recommendedSkillPaths || []
  ).filter((path) => !forbiddenSkillSet.has(path));

  modeSkillLines.push(
    "Do not skip runtime/preset skill preflight above. Non-read tools are hard-blocked until those reads are done.",
    "**DOMAIN SKILL LOADING — OPTIONAL (quality recommendation)**:",
    "Merge AI recommendations + player recommendations below, then read only what is relevant this turn:",
  );

  if (allowedBuiltInRecommendations.length > 0) {
    modeSkillLines.push(
      "- AI recommended reads:",
      ...allowedBuiltInRecommendations.map(
        (entry) =>
          `  - ${entry.hint} → \`vfs_read_chars({ path: "current/${entry.path}" })\``,
      ),
    );
  }

  if (playerRecommendedPaths.length > 0) {
    modeSkillLines.push(
      "- Player recommended reads:",
      ...formatSkillPolicyLines(playerRecommendedPaths).map(
        (line) => `  ${line}`,
      ),
    );
  }

  if (
    allowedBuiltInRecommendations.length === 0 &&
    playerRecommendedPaths.length === 0
  ) {
    modeSkillLines.push(
      "- No optional skill recommendations remain after applying forbidden filters.",
    );
  }

  if (forbiddenSkillSet.size > 0) {
    modeSkillLines.push(
      "- Forbidden skills from player policy are always filtered out from optional recommendations.",
    );
  }

  modeSkillLines.push(
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
    const requiredPresetPaths = requiredPresetSkillPaths.map(
      toCurrentReadablePath,
    );
    const satisfiedPresetSet = new Set(
      satisfiedPresetSkillPaths.map(toCurrentReadablePath),
    );
    const pendingPresetPaths = requiredPresetPaths.filter(
      (path) => !satisfiedPresetSet.has(path),
    );
    const lines =
      pendingPresetPaths.length === 0
        ? [
            "[SYSTEM: PRESET SKILLS READY]",
            "Hub reference: `current/skills/presets/runtime/SKILL.md`",
            "All active preset skills are already satisfied in this session; reuse them and re-read only if scope is insufficient.",
          ]
        : [
            "[SYSTEM: PRESET SKILLS ACTIVE]",
            "Hub first: `current/skills/presets/runtime/SKILL.md`",
            "Before non-read tool calls, load active preset skills:",
            ...pendingPresetPaths.map((path) => `- \`${path}\``),
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
    "Before any non-read tool call in this session, perform these read calls once in current session lifecycle (use vfs_read_markdown when section selectors are known):",
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
