/**
 * ==========================================================================
 * Core Atom: System Messages
 * ==========================================================================
 *
 * Messages injected into the conversation history by contextInjector.
 */
import type { Atom } from "../types";
import {
  VFS_TOOLSETS,
  formatVfsToolCapabilitiesForPrompt,
  formatVfsToolsForPrompt,
} from "../../../vfsToolsets";
import type { VfsToolsetId } from "../../../vfsToolsets";
import { defineAtom } from "../../trace/runtime";

export interface SystemMessageInput {
  finishToolName?: string;
  readyConsequences?: string[];
  budgetPrompt?: string;
  toolsetId?: VfsToolsetId;
  ragEnabled?: boolean;
}

export interface RetconAckSystemMessageInput {
  pendingHash: string;
  pendingReason?: string;
}

const PATH_MODEL_BLOCK = [
  "- Canonical paths: `shared/**` and `forks/{forkId}/**`.",
  "- Alias paths: `current/**` are accepted and auto-resolved to canonical active-fork/shared locations.",
].join("\n   ");

const PERMISSION_MODEL_BLOCK = [
  "- `immutable_readonly` is always read-only (`shared/system/skills/**`, `shared/system/refs/**`; alias views `skills/**`, `refs/**`).",
  "- `default_editable` is writable by default for AI.",
  "- `elevated_editable` requires one-time user-confirmed token in `/god` or `/sudo`.",
  "- `finish_guarded` is writable only through finish protocol tools.",
  "- Resource templates enforce operation-level contracts (e.g. conversation=`finish_commit`, summary=`finish_summary`, rewrite=`history_rewrite`).",
].join("\n   ");

const CONVERSATION_GUARD_LINE =
  "**DO NOT** write finish-guarded conversation/summary paths (`shared/narrative/conversation/*.json`, `forks/{activeFork}/story/conversation/**`, `forks/{activeFork}/story/summary/state.json`; alias `current/conversation/**`, `current/summary/state.json`) via generic write/edit/merge/move/delete tools.";

const gateSemanticCapabilityText = (
  capabilityText: string,
  ragEnabled: boolean,
): string => {
  if (ragEnabled) return capabilityText;

  return capabilityText
    .replaceAll("text/fuzzy/regex/semantic", "text/fuzzy/regex")
    .replaceAll("(optionally semantic)", "")
    .replaceAll("/semantic", "")
    .replaceAll("semantic, when available", "");
};

/**
 * SUDO Mode Instruction
 */
export const sudoModeInstruction: Atom<SystemMessageInput> = defineAtom(
  {
    atomId: "atoms/core/systemMessages#sudoModeInstruction",
    source: "atoms/core/systemMessages.ts",
    exportName: "sudoModeInstruction",
  },
  (input) => {
    const { toolsetId = "turn", ragEnabled = true } = input || {};
    const capabilityText = gateSemanticCapabilityText(
      formatVfsToolCapabilitiesForPrompt(VFS_TOOLSETS[toolsetId].tools),
      ragEnabled,
    );

    return `[SYSTEM: FORCE UPDATE MODE (/sudo)]
This is a **GM COMMAND**. You must:
1. The user action is already prefixed with **[SUDO]**. Treat it as a forced elevated update payload, while still respecting immutable/finish policy constraints.
2. Use **VFS-only tools** (this loop's allowlist):
   ${formatVfsToolsForPrompt(VFS_TOOLSETS[toolsetId].tools)}
3. Respect this **TOOL CAPABILITY CONTRACT** (runtime source of truth):
   ${capabilityText}
4. **PATH MODEL**:
   ${PATH_MODEL_BLOCK}
5. **PERMISSION MODEL**:
   ${PERMISSION_MODEL_BLOCK}
6. **SKILL PREFLIGHT (ENFORCED)**: Before first non-read mutation, read current/skills/commands/runtime/SKILL.md, current/skills/commands/runtime/sudo/SKILL.md, current/skills/core/protocols/SKILL.md, and current/skills/craft/writing/SKILL.md.
7. **SKILL DISCOVERY (RECOMMENDED)**: Read current/skills/index.json and load additional relevant skill docs (1-3) for this exact command domain before major writes.
8. **BATCH TOOL CALLS**: You can and SHOULD call multiple tools in a single turn.
9. Apply changes decisively - if the command contradicts existing mutable lore, **OVERWRITE IT** (immutable zones remain protected by policy).
10. **FINISH RULE**: Your LAST tool call must be \`vfs_commit_turn\`.
11. ${CONVERSATION_GUARD_LINE}
`;
  },
);

/**
 * Normal Turn Instruction
 */
export const normalTurnInstruction: Atom<SystemMessageInput> = defineAtom(
  {
    atomId: "atoms/core/systemMessages#normalTurnInstruction",
    source: "atoms/core/systemMessages.ts",
    exportName: "normalTurnInstruction",
  },
  ({ finishToolName, toolsetId, ragEnabled = true }) => {
    const resolvedToolsetId =
      toolsetId ?? (finishToolName === "vfs_commit_soul" ? "playerRate" : "turn");
    const isPlayerRateToolset = resolvedToolsetId === "playerRate";
    const resolvedFinishToolName =
      finishToolName || VFS_TOOLSETS[resolvedToolsetId].finishToolName;
    const capabilityText = gateSemanticCapabilityText(
      formatVfsToolCapabilitiesForPrompt(VFS_TOOLSETS[resolvedToolsetId].tools),
      ragEnabled,
    );

    return `[SYSTEM: TOOL USAGE INSTRUCTION]
You are in AGENTIC MODE (VFS-only).
1. You may ONLY use \`vfs_*\` tools. No other tools exist.
   AVAILABLE TOOLS in this loop:
   ${formatVfsToolsForPrompt(VFS_TOOLSETS[resolvedToolsetId].tools)}
2. Respect this **TOOL CAPABILITY CONTRACT**:
   ${capabilityText}
3. **PATH MODEL**:
   ${PATH_MODEL_BLOCK}
4. **PERMISSION MODEL**:
   ${PERMISSION_MODEL_BLOCK}
5. **SKILL PREFLIGHT (ENFORCED)**: Before first non-read mutation, read current/skills/commands/runtime/SKILL.md, the active command protocol skill ("turn" or "player-rate"), current/skills/core/protocols/SKILL.md, and current/skills/craft/writing/SKILL.md.
6. **SKILL DISCOVERY (RECOMMENDED)**: Read current/skills/index.json and load additional relevant skill docs (1-3) before non-trivial writes.
7. **INSPECT FIRST**: Use \`vfs_ls\`, \`vfs_schema\`, \`vfs_read\` (chars/lines/json), and \`vfs_search\` before changing files.
   - Atmosphere reference data is available under \`shared/system/refs/atmosphere/\` (alias: \`current/refs/atmosphere/\`).
   - For large JSON, prefer \`vfs_read\` with \`mode: "json"\` + narrow \`pointers\` or \`mode: "lines"\`; avoid broad full-file char reads.
8. ${
      isPlayerRateToolset
        ? "**SOUL-ONLY UPDATE**: For `[Player Rate]`, only update `current/world/soul.md` and/or `current/world/global/soul.md` by calling `vfs_commit_soul`."
        : "**STATE CHANGES = FILE CHANGES**: Update world JSON under `forks/{activeFork}/story/world/**` (alias: `current/world/**`) with `vfs_write` using `write_file` / `patch_json` / `merge_json`. Soul docs (`current/world/soul.md`, `current/world/global/soul.md`) are writable and may be proactively refined via `vfs_write` when evidence is strong."
    }
9. **FINISH RULE**: Your LAST tool call must be \`${resolvedFinishToolName}\`.
10. **EFFICIENCY RULE (STRICT)**: If this response will finish, do NOT place read-only tools (\`vfs_ls\`/\`vfs_schema\`/\`vfs_read\`/\`vfs_search\`) immediately before finish unless they are directly required to perform OR verify same-response mutations (e.g. read back a just-edited file to confirm a merge/delete result). Pure read-only→finish batches are treated as waste.
11. **WRITE FAILURE REPAIR MODE**: If a writable write fails, your next calls must repair those failed targets (inspect+retry same targets). Do NOT call \`${resolvedFinishToolName}\` until they succeed.
12. **NO COMMIT SPAM**: Repeating \`${resolvedFinishToolName}\` while failed writable targets remain unresolved is invalid.
13. **CONVERSATION WRITE GUARD**: ${CONVERSATION_GUARD_LINE}
14. **BATCH TOOL CALLS**: Combine related writes in one call when possible.
15. **NO DUPLICATES**: Check existing files before adding new entities.
16. ${
      isPlayerRateToolset
        ? "**NO PLOT PROGRESSION**: `[Player Rate]` loops must not advance visible story nodes or produce new choices."
        : "**CONSEQUENCES**: If PENDING CONSEQUENCES are shown, update relevant world files directly."
    }

<examples>
- Example (${isPlayerRateToolset ? "inspect → soul commit" : "inspect → edit → finish"}):
  ${
    isPlayerRateToolset
      ? "1) `vfs_read` `current/world/soul.md` and `current/world/global/soul.md`\n  2) `vfs_commit_soul` with `{ currentSoul?, globalSoul? }` (at least one)\n  3) Do not emit new plot node content in this loop"
      : "1) `vfs_search` within `current/world/` (or canonical fork world path) for a name/ID\n  2) `vfs_write` to patch the exact JSON pointer(s)\n  3) `" +
        resolvedFinishToolName +
        "` with { userAction, assistant: { narrative, choices } } as the LAST call"
  }
</examples>
`;
  },
);

/**
 * Cleanup Turn Instruction
 */
export const cleanupTurnInstruction: Atom<SystemMessageInput> = defineAtom(
  {
    atomId: "atoms/core/systemMessages#cleanupTurnInstruction",
    source: "atoms/core/systemMessages.ts",
    exportName: "cleanupTurnInstruction",
  },
  ({ finishToolName, ragEnabled = true }) => {
    const capabilityText = gateSemanticCapabilityText(
      formatVfsToolCapabilitiesForPrompt(VFS_TOOLSETS.cleanup.tools),
      ragEnabled,
    );

    return `[SYSTEM: CLEANUP MODE TOOL INSTRUCTION]
You are in CLEANUP MODE (VFS-only).
1. You may ONLY use \`vfs_*\` tools. No other tools exist.
   AVAILABLE TOOLS in this loop:
   ${formatVfsToolsForPrompt(VFS_TOOLSETS.cleanup.tools)}
2. Respect this **TOOL CAPABILITY CONTRACT**:
   ${capabilityText}
3. **PATH MODEL**:
   ${PATH_MODEL_BLOCK}
4. **PERMISSION MODEL**:
   ${PERMISSION_MODEL_BLOCK}
5. **SKILL PREFLIGHT (ENFORCED)**: Before first non-read mutation, read current/skills/commands/runtime/SKILL.md, current/skills/commands/runtime/cleanup/SKILL.md, current/skills/core/protocols/SKILL.md, and current/skills/craft/writing/SKILL.md.
6. **SKILL DISCOVERY (RECOMMENDED)**: Read current/skills/index.json and load additional relevant skill docs (1-3) before non-trivial cleanup edits.
7. **READ-ONLY FIRST**: Use \`vfs_ls\` / \`vfs_search\` / \`vfs_read\` to locate and verify duplicate candidates.
   - For large JSON, prefer pointer/line scoped reads instead of broad full-file char reads.
8. **APPLY FIXES**: Use \`vfs_write\` (\`patch_json\` / \`merge_json\`) / \`vfs_move\` / \`vfs_delete\` as needed.
9. **FINISH**: Your LAST tool call must be \`${finishToolName || "vfs_commit_turn"}\`.
10. **EFFICIENCY RULE (STRICT)**: Do NOT issue read-only tools immediately before finish unless they are directly required to perform OR verify same-response mutations (e.g. read back a just-edited file to confirm a merge/delete result). Pure read-only→finish batches are treated as waste.
11. **WRITE FAILURE REPAIR MODE**: If a writable write fails, next calls must repair those failed targets first; do not finish until resolved.
12. **CONVERSATION WRITE GUARD**: ${CONVERSATION_GUARD_LINE}

<examples>
- Example (find duplicates → fix → finish):
  1) \`vfs_ls\`/ \`vfs_search\` to gather candidate files
  2) \`vfs_read\` each candidate to verify duplicates
  3) \`vfs_write\` (\`patch_json\` / \`merge_json\`) / \`vfs_move\` / \`vfs_delete\` to resolve
  4) \`${finishToolName || "vfs_commit_turn"}\` as the LAST call
</examples>
`;
  },
);

/**
 * Pending Consequences Message
 */
export const pendingConsequencesMessage: Atom<SystemMessageInput> = defineAtom(
  {
    atomId: "atoms/core/systemMessages#pendingConsequencesMessage",
    source: "atoms/core/systemMessages.ts",
    exportName: "pendingConsequencesMessage",
  },
  ({ readyConsequences }) => {
    if (!readyConsequences || readyConsequences.length === 0) return "";
    const list = readyConsequences.join("\n");
    return `[SYSTEM: PENDING CONSEQUENCES]\nReady to trigger:\n${list}\n\nUpdate relevant world files under \`forks/{activeFork}/story/world/**\` (alias: \`current/world/**\`) to apply these consequences.`;
  },
);

/**
 * Budget Status Message
 */
export const budgetStatusMessage: Atom<SystemMessageInput> = defineAtom(
  {
    atomId: "atoms/core/systemMessages#budgetStatusMessage",
    source: "atoms/core/systemMessages.ts",
    exportName: "budgetStatusMessage",
  },
  ({ budgetPrompt }) => `[SYSTEM: BUDGET STATUS]\n${budgetPrompt}`,
);

/**
 * Retcon ACK required message
 */
export const retconAckRequiredMessage: Atom<RetconAckSystemMessageInput> =
  defineAtom(
    {
      atomId: "atoms/core/systemMessages#retconAckRequiredMessage",
      source: "atoms/core/systemMessages.ts",
      exportName: "retconAckRequiredMessage",
    },
    ({ pendingHash, pendingReason }) =>
      `[SYSTEM: RETCON_ACK_REQUIRED]\nCustom rules changed and continuity ACK is required before finishing the turn.\nInclude \`retconAck\` in your finish call:\n- hash: "${pendingHash}"\n- summary: short in-world continuity adjustment\nReason: ${pendingReason || "customRules"}.\nUse \`vfs_commit_turn\` with matching \`retconAck.hash\`.`,
  );

/**
 * No Tool Call Error Message
 */
export const noToolCallError: Atom<SystemMessageInput> = defineAtom(
  {
    atomId: "atoms/core/systemMessages#noToolCallError",
    source: "atoms/core/systemMessages.ts",
    exportName: "noToolCallError",
  },
  ({ finishToolName }) =>
    `[ERROR: NO_TOOL_CALL] You provided text but failed to invoke any tools. In this agentic loop, you MUST call at least one \`vfs_*\` tool to progress. Inspect with \`vfs_ls\`/\`vfs_read\`, then end the turn with \`${finishToolName || "vfs_commit_turn"}\` as the LAST tool call. Bare text is not allowed.`,
);
