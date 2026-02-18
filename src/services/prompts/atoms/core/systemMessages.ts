/**
 * ==========================================================================
 * Core Atom: System Messages
 * ==========================================================================
 *
 * Messages injected into the conversation history by contextInjector.
 * These are per-turn reinforcements — full tool/path/permission rules
 * live in the toolUsage system prompt atom. Keep these brief.
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

const CONVERSATION_GUARD_SHORT =
  "**DO NOT** write finish-guarded conversation/summary paths (`current/conversation/**`, `current/summary/state.json`) via generic write tools.";

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
This is a **GM COMMAND**. The user action is already prefixed with **[SUDO]**. Treat it as a forced elevated update payload, while still respecting immutable/finish policy constraints.

**TOOLS**:
${formatToolListForPrompt(toolsetId)}
${capabilityText}
- \`vfs_vm\` = batch orchestration. When used, it MUST be the only top-level tool call in that response. Use exactly one JavaScript script (not pseudo-tool JSON text), and do not use \`globalThis\`/\`window\`/\`import\`/\`eval\`/\`Function\`. Runtime caps are fixed by system: max 32 inner tool calls (bounded by current loop budget), script length max 16000 chars.

**SKILLS**:
- **PREFLIGHT**: Read: current/skills/commands/runtime/SKILL.md, current/skills/commands/runtime/sudo/SKILL.md, current/skills/core/protocols/SKILL.md, current/skills/craft/writing/SKILL.md.

**EXECUTION**: Apply changes decisively — if the command contradicts mutable lore, OVERWRITE IT (immutable zones remain protected).

**FINISH**: Your LAST tool call must be \`vfs_finish_turn\`. Args shape: \`{ assistant: { narrative: "<string>", choices: [...] }, retconAck?: { summary: "<string>" } }\`.
- ${CONVERSATION_GUARD_SHORT}
- On tool retry success, append \`[code] cause -> fix\` to \`current/world/soul.md\` § \`## Tool Usage Hints\`.
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
      toolsetId ??
      (finishToolName === "vfs_finish_soul" ? "playerRate" : "turn");
    const isPlayerRateToolset = resolvedToolsetId === "playerRate";
    const resolvedFinishToolName =
      finishToolName ||
      vfsToolRegistry.getToolset(resolvedToolsetId).finishToolName;
    const capabilityText = gateSemanticCapabilityText(
      vfsToolRegistry.formatCapabilitiesForPrompt(resolvedToolsetId),
      ragEnabled,
    );

    return `[SYSTEM: TOOL USAGE INSTRUCTION]
You are in AGENTIC MODE (VFS-only).

**TOOLS**:
${formatToolListForPrompt(resolvedToolsetId)}
${capabilityText}
- \`vfs_vm\` = batch orchestration. When used, it MUST be the only top-level tool call in that response. Scripts must be JavaScript (not pseudo-tool JSON text), must not use \`globalThis\`/\`window\`/\`import\`/\`eval\`/\`Function\`.

**SKILLS**:
- **PREFLIGHT (ENFORCED)**: Before first mutation, read: current/skills/commands/runtime/SKILL.md, the active command protocol ("turn" or "player-rate"), current/skills/core/protocols/SKILL.md, current/skills/craft/writing/SKILL.md.

**DATA ACCESS**:
- Inspect before mutating. Atmosphere refs: \`current/refs/atmosphere/\` (alias of \`shared/system/refs/atmosphere/\`).
- Markdown: prefer \`vfs_read_markdown\` with section selectors; \`vfs_read_lines\` when selectors unknown.
- Large JSON: prefer \`vfs_read_json\` with narrow \`pointers\` (\`pointers\` is REQUIRED); avoid broad full-file \`vfs_read_chars\`.
- Large text (especially \`current/session/<session_uid>.jsonl\`): use bounded \`vfs_read_lines\`.
- Check existing files before adding new entities (NO DUPLICATES).

**STATE**:
${
  isPlayerRateToolset
    ? "- **SOUL-ONLY UPDATE**: For `[Player Rate]`, only update `current/world/soul.md` and/or `current/world/global/soul.md` via `vfs_finish_soul`.\n- In `[Player Rate]` loops, do not mutate `current/outline/story_outline/plan.md`.\n- **NO PLOT PROGRESSION**: Do not advance visible story nodes or produce new choices."
    : "- **STATE CHANGES = FILE CHANGES**: Update world state under `current/world/**` and maintain `current/outline/story_outline/plan.md` continuity (writable, not read-only). Soul docs are `default_editable` — refine proactively when evidence emerges.\n- Plan continuity: read `current/outline/story_outline/plan.md` first; incremental edits for minor drift, full rewrite for major branch fracture. Keep aligned with `current/outline/outline.json`.\n- **CONSEQUENCES**: If PENDING CONSEQUENCES are shown, update relevant world files directly.\n- **STATE → FILE MAP**: NPC mood/relationship → `{npc_id}.json` visible.mood + hidden fields; NPC location → `{npc_id}.json` /currentLocation; quest progress → `quests/{quest_id}.json`; protagonist conditions → player profile conditions array; location change → update BOTH NPC file AND location file for consistency."
}
- Identity contract: \`notes.md\` + \`soul.md\` are AI-to-AI self-notes (you writing to your future self), not player-facing text.

**FINISH**:
- Your LAST tool call must be \`${resolvedFinishToolName}\`. Args shape: \`{ assistant: { narrative: "<string>", choices: [...] }, retconAck?: { summary: "<string>" } }\`.
- **EFFICIENCY**: Do NOT place read-only tools before finish unless they support same-response mutations.
- **WRITE FAILURE REPAIR MODE (TARGETED)**: Prioritize repairing failed writable targets. Block finish ONLY for blocking errors (\`WRITE_EXISTING_TARGET_RETRY_REQUIRED\` / \`FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE\`). Non-blocking failures may proceed.
- **NO COMMIT SPAM**: Do not repeat \`${resolvedFinishToolName}\` while blocking failures remain.
- **CONVERSATION WRITE GUARD**: ${CONVERSATION_GUARD_SHORT}
- **DO NOT**: call \`${resolvedFinishToolName}\` more than once per response; read the same file twice in one turn unless \`[SYSTEM: EXTERNAL_FILE_CHANGES]\` triggered; mutate conversation/* or summary/* via generic write tools (finish-guarded); emit empty narrative or choices with identical outcomes.

<examples>
- Example (${isPlayerRateToolset ? "inspect → soul commit" : "inspect → edit → finish"}):
  ${
    isPlayerRateToolset
      ? "1) `vfs_read_markdown` on `current/world/soul.md` and `current/world/global/soul.md` (prefer `headings`/`indices`)\n  2) `vfs_finish_soul` with `{ currentSoul?, globalSoul? }` (at least one)\n  3) Do not emit new plot node content in this loop"
      : "1) `vfs_search` within `current/world/` and/or `current/outline/story_outline/plan.md` for target anchors\n  2) Use `vfs_patch_json` / `vfs_merge_json` (or `vfs_write_file` when creating) for world updates; use `vfs_write_markdown` for incremental `plan.md` updates or `vfs_write_file` for full `plan.md` rewrite when fracture is major\n  3) `" +
        resolvedFinishToolName +
        '` with `{ assistant: { narrative: "...", choices: [...] }, retconAck?: { summary: "..." } }` as the LAST call'
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

**TOOLS**:
${formatToolListForPrompt("cleanup")}
${capabilityText}
- \`vfs_vm\` = batch orchestration. When used, it MUST be the only top-level tool call in that response. Use exactly one JavaScript script (not pseudo-tool JSON text), and do not use \`globalThis\`/\`window\`/\`import\`/\`eval\`/\`Function\`. Runtime caps are fixed by system: max 32 inner tool calls (bounded by current loop budget), script length max 16000 chars.

**SKILLS**:
- **PREFLIGHT (ENFORCED)**: Read: current/skills/commands/runtime/SKILL.md, current/skills/commands/runtime/cleanup/SKILL.md, current/skills/core/protocols/SKILL.md, current/skills/craft/writing/SKILL.md.

**WORKFLOW**:
1. Use \`vfs_ls\` / \`vfs_search\` / read tools to locate and verify duplicate candidates. For large JSON, prefer pointer/line scoped reads; avoid broad full-file char reads.
2. Apply fixes with write tools.
3. Your LAST tool call must be \`${finishToolName || "vfs_finish_turn"}\`. Args shape: \`{ assistant: { narrative: "<string>", choices: [...] }, retconAck?: { summary: "<string>" } }\`.

**GUARDS**:
- **EFFICIENCY**: Do NOT issue read-only tools before finish unless they support same-response mutations.
- **WRITE FAILURE REPAIR MODE (TARGETED)**: Repair failed targets first; finish blocked only by blocking errors (\`WRITE_EXISTING_TARGET_RETRY_REQUIRED\` / \`FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE\`).
- **CONVERSATION WRITE GUARD**: ${CONVERSATION_GUARD_SHORT}

<examples>
- Example (find duplicates → fix → finish):
  1) \`vfs_ls\`/\`vfs_search\` to gather candidate files
  2) Read tools to verify duplicates
  3) Write tools to resolve
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
    return `[SYSTEM: PENDING CONSEQUENCES]\nReady to trigger:\n${list}\n\nUpdate relevant world files under \`current/world/**\` to apply these consequences.`;
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
      `[SYSTEM: RETCON_ACK_REQUIRED]\nCustom rules changed and continuity ACK is required before finishing the turn.\nInclude \`retconAck\` in your finish call:\n- summary: short in-world continuity adjustment\nReason: ${pendingReason || "customRules"}.`,
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
    `[ERROR: NO_TOOL_CALL] You provided text but failed to invoke any tools. In this agentic loop, you MUST call at least one \`vfs_*\` tool to progress. Inspect with read tools, then end the turn with \`${finishToolName || "vfs_finish_turn"}\` as the LAST tool call. Bare text is not allowed.`,
);
