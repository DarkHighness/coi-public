/**
 * ==========================================================================
 * Core Atom: System Messages
 * ==========================================================================
 *
 * Messages injected into the conversation history by contextInjector.
 */
import type { Atom } from "../types";
import { vfsToolRegistry } from "../../../vfs/tools";
import type { VfsToolsetId } from "../../../vfs/tools";
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

const formatToolListForPrompt = (toolsetId: VfsToolsetId): string =>
  vfsToolRegistry
    .getToolset(toolsetId)
    .tools.map((name) => `- \`${name}\``)
    .join("\n");

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
      vfsToolRegistry.formatCapabilitiesForPrompt(toolsetId),
      ragEnabled,
    );

    return `[SYSTEM: FORCE UPDATE MODE (/sudo)]
This is a **GM COMMAND**. You must:
1. The user action is already prefixed with **[SUDO]**. Treat it as a forced elevated update payload, while still respecting immutable/finish policy constraints.
2. Use **VFS-only tools** (this loop's allowlist):
   ${formatToolListForPrompt(toolsetId)}
3. Respect this **TOOL CAPABILITY CONTRACT** (runtime source of truth):
   ${capabilityText}
4. **PATH MODEL**:
   ${PATH_MODEL_BLOCK}
5. **PERMISSION MODEL**:
   ${PERMISSION_MODEL_BLOCK}
6. **SKILL PREFLIGHT (ENFORCED)**: Before first non-read mutation, read current/skills/commands/runtime/SKILL.md, current/skills/commands/runtime/sudo/SKILL.md, current/skills/core/protocols/SKILL.md, and current/skills/craft/writing/SKILL.md.
7. **SKILL DISCOVERY (RECOMMENDED, SESSION-SCOPED)**: Once per session (cold start/rebuild), read current/skills/index.json and load additional relevant skill docs (1-3). Reuse them across turns; re-read only when requirements change.
8. **BATCH TOOL CALLS**: You can and SHOULD call multiple tools in a single turn.
9. Apply changes decisively - if the command contradicts existing mutable lore, **OVERWRITE IT** (immutable zones remain protected by policy).
10. **FINISH RULE**: Your LAST tool call must be \`vfs_finish_turn\`.
11. ${CONVERSATION_GUARD_LINE}
12. When tool recovery succeeds after a prior failure, add one concise \`[code] cause -> fix\` memo to \`current/world/soul.md\` under \`## Tool Usage Hints\` (AI self-note).
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
      toolsetId ?? (finishToolName === "vfs_finish_soul" ? "playerRate" : "turn");
    const isPlayerRateToolset = resolvedToolsetId === "playerRate";
    const resolvedFinishToolName =
      finishToolName || vfsToolRegistry.getToolset(resolvedToolsetId).finishToolName;
    const capabilityText = gateSemanticCapabilityText(
      vfsToolRegistry.formatCapabilitiesForPrompt(resolvedToolsetId),
      ragEnabled,
    );

    return `[SYSTEM: TOOL USAGE INSTRUCTION]
You are in AGENTIC MODE (VFS-only).
1. You may ONLY use \`vfs_*\` tools. No other tools exist.
   AVAILABLE TOOLS in this loop:
   ${formatToolListForPrompt(resolvedToolsetId)}
2. Respect this **TOOL CAPABILITY CONTRACT**:
   ${capabilityText}
3. **PATH MODEL**:
   ${PATH_MODEL_BLOCK}
4. **PERMISSION MODEL**:
   ${PERMISSION_MODEL_BLOCK}
5. **SKILL PREFLIGHT (ENFORCED)**: Before first non-read mutation, read current/skills/commands/runtime/SKILL.md, the active command protocol skill ("turn" or "player-rate"), current/skills/core/protocols/SKILL.md, and current/skills/craft/writing/SKILL.md.
6. **SKILL DISCOVERY (RECOMMENDED, SESSION-SCOPED)**: Once per session (cold start/rebuild), read current/skills/index.json and load additional relevant skill docs (1-3). Reuse them across turns; re-read only when requirements change.
7. **INSPECT FIRST**: Use \`vfs_ls\`, \`vfs_schema\`, \`vfs_read_markdown/vfs_read_chars/vfs_read_lines/vfs_read_json\`, and \`vfs_search\` before changing files.
   - Atmosphere reference data is available under \`shared/system/refs/atmosphere/\` (alias: \`current/refs/atmosphere/\`).
   - For markdown docs/notes, prefer \`vfs_read_markdown\` with section selectors (\`headings\`/\`indices\`); use bounded \`vfs_read_lines\` when selectors are unknown.
   - For large JSON, prefer \`vfs_read_json\` with narrow \`pointers\` or bounded \`vfs_read_lines\`; avoid broad full-file \`vfs_read_chars\`.
   - For large text files (especially \`current/conversation/session.jsonl\`), do NOT issue unbounded char reads; start with bounded \`vfs_read_lines\` (\`startLine\`/\`lineCount\`).
   - In \`vfs_read_json\`, \`pointers\` is REQUIRED.
8. ${
      isPlayerRateToolset
        ? "**SOUL-ONLY UPDATE**: For `[Player Rate]`, only update `current/world/soul.md` and/or `current/world/global/soul.md` by calling `vfs_finish_soul`."
        : "**STATE CHANGES = FILE CHANGES**: Update world JSON under `forks/{activeFork}/story/world/**` (alias: `current/world/**`) with split write tools (`vfs_write_file` / `vfs_append_text` / `vfs_edit_lines` / `vfs_write_markdown` / `vfs_patch_json` / `vfs_merge_json` / `vfs_move` / `vfs_delete`). Soul docs (`current/world/soul.md`, `current/world/global/soul.md`) are writable and may be proactively refined via these write tools when evidence is strong."
    }
   - Identity contract: \`notes.md\` + \`soul.md\` files are AI-to-AI self-notes (you writing to your future self), not player-facing raw text.
9. **FINISH RULE**: Your LAST tool call must be \`${resolvedFinishToolName}\`.
   - For \`vfs_finish_turn\`, use exact args shape: \`{ userAction: "<string>", assistant: { narrative: "<string>", choices: [...] } }\`.
   - \`userAction\` MUST be top-level; never nest \`userAction\` inside \`assistant\`.
10. **EFFICIENCY RULE (STRICT)**: If this response will finish, do NOT place read-only tools (\`vfs_ls\`/\`vfs_schema\`/\`vfs_read_markdown/vfs_read_chars/vfs_read_lines/vfs_read_json\`/\`vfs_search\`) immediately before finish unless they are directly required to perform OR verify same-response mutations (e.g. read back a just-edited file to confirm a merge/delete result). Pure read-only→finish batches are treated as waste.
11. **WRITE FAILURE REPAIR MODE**: If a writable write fails, your next calls must repair those failed targets (inspect+retry same targets). Do NOT call \`${resolvedFinishToolName}\` until they succeed.
    - After repair succeeds, append one concise \`[code] cause -> fix\` bullet to \`current/world/soul.md\` under \`## Tool Usage Hints\` (\`vfs_write_file\`/\`vfs_append_text\`/\`vfs_edit_lines\`/\`vfs_write_markdown\`/\`vfs_patch_json\`/\`vfs_merge_json\`/\`vfs_move\`/\`vfs_delete\` in normal turns, \`vfs_finish_soul\` in \`[Player Rate]\`).
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
      ? "1) `vfs_read_markdown` on `current/world/soul.md` and `current/world/global/soul.md` (prefer `headings`/`indices`)\n  2) `vfs_finish_soul` with `{ currentSoul?, globalSoul? }` (at least one)\n  3) Do not emit new plot node content in this loop"
      : "1) `vfs_search` within `current/world/` (or canonical fork world path) for a name/ID\n  2) `vfs_patch_json` / `vfs_merge_json` (or `vfs_write_file` when creating) to update the exact JSON field(s)\n  3) `" +
        resolvedFinishToolName +
        "` with `{ userAction: \"...\", assistant: { narrative: \"...\", choices: [...] } }` as the LAST call (never `assistant.userAction`)"
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
      vfsToolRegistry.formatCapabilitiesForPrompt("cleanup"),
      ragEnabled,
    );

    return `[SYSTEM: CLEANUP MODE TOOL INSTRUCTION]
You are in CLEANUP MODE (VFS-only).
1. You may ONLY use \`vfs_*\` tools. No other tools exist.
   AVAILABLE TOOLS in this loop:
   ${formatToolListForPrompt("cleanup")}
2. Respect this **TOOL CAPABILITY CONTRACT**:
   ${capabilityText}
3. **PATH MODEL**:
   ${PATH_MODEL_BLOCK}
4. **PERMISSION MODEL**:
   ${PERMISSION_MODEL_BLOCK}
5. **SKILL PREFLIGHT (ENFORCED)**: Before first non-read mutation, read current/skills/commands/runtime/SKILL.md, current/skills/commands/runtime/cleanup/SKILL.md, current/skills/core/protocols/SKILL.md, and current/skills/craft/writing/SKILL.md.
6. **SKILL DISCOVERY (RECOMMENDED, SESSION-SCOPED)**: Once per session (cold start/rebuild), read current/skills/index.json and load additional relevant skill docs (1-3). Reuse them across turns; re-read only when requirements change.
7. **READ-ONLY FIRST**: Use \`vfs_ls\` / \`vfs_search\` / \`vfs_read_markdown/vfs_read_chars/vfs_read_lines/vfs_read_json\` to locate and verify duplicate candidates.
   - For large JSON, prefer pointer/line scoped reads instead of broad full-file char reads.
8. **APPLY FIXES**: Use split write tools (\`vfs_write_file\` / \`vfs_append_text\` / \`vfs_edit_lines\` / \`vfs_write_markdown\` / \`vfs_patch_json\` / \`vfs_merge_json\` / \`vfs_move\` / \`vfs_delete\`) as needed.
9. **FINISH**: Your LAST tool call must be \`${finishToolName || "vfs_finish_turn"}\`.
10. **EFFICIENCY RULE (STRICT)**: Do NOT issue read-only tools immediately before finish unless they are directly required to perform OR verify same-response mutations (e.g. read back a just-edited file to confirm a merge/delete result). Pure read-only→finish batches are treated as waste.
11. **WRITE FAILURE REPAIR MODE**: If a writable write fails, next calls must repair those failed targets first; do not finish until resolved.
    - After repair succeeds, append one concise \`[code] cause -> fix\` bullet to \`current/world/soul.md\` under \`## Tool Usage Hints\`.
12. **CONVERSATION WRITE GUARD**: ${CONVERSATION_GUARD_LINE}

<examples>
- Example (find duplicates → fix → finish):
  1) \`vfs_ls\`/ \`vfs_search\` to gather candidate files
  2) \`vfs_read_markdown/vfs_read_chars/vfs_read_lines/vfs_read_json\` each candidate to verify duplicates
  3) \`vfs_write_file\` / \`vfs_append_text\` / \`vfs_edit_lines\` / \`vfs_write_markdown\` / \`vfs_patch_json\` / \`vfs_merge_json\` / \`vfs_move\` / \`vfs_delete\` to resolve
  4) \`${finishToolName || "vfs_finish_turn"}\` as the LAST call
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
      `[SYSTEM: RETCON_ACK_REQUIRED]\nCustom rules changed and continuity ACK is required before finishing the turn.\nInclude \`retconAck\` in your finish call:\n- hash: "${pendingHash}"\n- summary: short in-world continuity adjustment\nReason: ${pendingReason || "customRules"}.\nUse \`vfs_finish_turn\` with matching \`retconAck.hash\`.`,
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
    `[ERROR: NO_TOOL_CALL] You provided text but failed to invoke any tools. In this agentic loop, you MUST call at least one \`vfs_*\` tool to progress. Inspect with \`vfs_ls\`/\`vfs_read_markdown/vfs_read_chars/vfs_read_lines/vfs_read_json\`, then end the turn with \`${finishToolName || "vfs_finish_turn"}\` as the LAST tool call. Bare text is not allowed.`,
);
