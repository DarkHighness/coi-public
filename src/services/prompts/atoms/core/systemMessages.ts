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
This is a **GM COMMAND**. You must:
1. The user action is already prefixed with **[SUDO]**. Treat it as a forced elevated update payload, while still respecting immutable/finish policy constraints.
2. **AVAILABLE TOOLS** (this loop's allowlist):
   ${formatToolListForPrompt(toolsetId)}
3. **TOOL CAPABILITY CONTRACT**:
   ${capabilityText}
4. **SKILL PREFLIGHT**: Before first mutation, read: current/skills/commands/runtime/SKILL.md, current/skills/commands/runtime/sudo/SKILL.md, current/skills/core/protocols/SKILL.md, current/skills/craft/writing/SKILL.md.
5. **SKILL DISCOVERY (RECOMMENDED, SESSION-SCOPED)**: On cold start, read current/skills/index.json and load 1-3 relevant skills. Reuse across turns; re-read only on \`[SYSTEM: EXTERNAL_FILE_CHANGES]\` or insufficient scope.
6. **BATCH TOOL CALLS**: For dependent multi-step orchestration, use \`vfs_vm\`.
   - If you use \`vfs_vm\`, it MUST be the only top-level tool call in that assistant response.
   - \`vfs_vm\` scripts must be JavaScript (not pseudo-tool JSON text), and must not use \`globalThis\`/\`window\`/\`import\`/\`eval\`/\`Function\`.
7. Apply changes decisively — if the command contradicts mutable lore, **OVERWRITE IT** (immutable zones remain protected).
8. **FINISH RULE**: Your LAST tool call must be \`vfs_finish_turn\`.
   - Use args shape: \`{ assistant: { narrative: "<string>", choices: [...] }, retconAck?: { summary: "<string>" } }\`.
9. ${CONVERSATION_GUARD_SHORT}
10. On tool retry success, append \`[code] cause -> fix\` to \`current/world/soul.md\` under \`## Tool Usage Hints\`.
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
2. **TOOL CAPABILITY CONTRACT**:
   ${capabilityText}
3. **SKILL PREFLIGHT (ENFORCED)**: Before first non-read mutation, read current/skills/commands/runtime/SKILL.md, the active command protocol skill ("turn" or "player-rate"), current/skills/core/protocols/SKILL.md, and current/skills/craft/writing/SKILL.md.
4. **SKILL DISCOVERY (RECOMMENDED, SESSION-SCOPED)**: Once per session (cold start/rebuild), read current/skills/index.json and load additional relevant skill docs (1-3). Reuse them across turns; do not re-read by default. Re-read only when \`[SYSTEM: EXTERNAL_FILE_CHANGES]\` explicitly signals external updates, prior read scope is insufficient, or recovery explicitly requires re-read. Your own successful writes do not require automatic re-read.
5. **INSPECT FIRST**: Use read tools before mutations.
   - Atmosphere refs: \`shared/system/refs/atmosphere/\` (alias: \`current/refs/atmosphere/\`).
   - For markdown: prefer \`vfs_read_markdown\` with section selectors; \`vfs_read_lines\` when selectors unknown.
   - For large JSON: prefer \`vfs_read_json\` with narrow \`pointers\`; avoid broad full-file \`vfs_read_chars\`.
   - For large text (especially \`current/conversation/session.jsonl\`): use bounded \`vfs_read_lines\`.
   - In \`vfs_read_json\`, \`pointers\` is REQUIRED.
6. ${
      isPlayerRateToolset
        ? "**SOUL-ONLY UPDATE**: For `[Player Rate]`, only update `current/world/soul.md` and/or `current/world/global/soul.md` by calling `vfs_finish_soul`."
        : "**STATE CHANGES = FILE CHANGES**: Update world state under `current/world/**` and maintain `current/outline/story_outline/plan.md` continuity (writable in normal turns, not read-only). Soul docs are `default_editable` and may be proactively refined when evidence emerges."
    }
   - Identity contract: \`notes.md\` + \`soul.md\` files are AI-to-AI self-notes (you writing to your future self), not player-facing raw text.
   ${
     isPlayerRateToolset
       ? "- In `[Player Rate]` loops, do not mutate `current/outline/story_outline/plan.md`."
       : "- Plan continuity mode (normal turns): read `current/outline/story_outline/plan.md` first; use incremental edits for minor drift (checklist/progress/milestones), and full `plan.md` rewrite for major branch fracture. Keep it aligned with `current/outline/outline.json` and current world facts."
   }
7. **FINISH RULE**: Your LAST tool call must be \`${resolvedFinishToolName}\`.
   - For \`vfs_finish_turn\`, use args shape: \`{ assistant: { narrative: "<string>", choices: [...] }, retconAck?: { summary: "<string>" } }\`.
8. **EFFICIENCY RULE (STRICT)**: Do NOT place read-only tools immediately before finish unless they are directly required to perform OR verify same-response mutations.
9. **WRITE FAILURE REPAIR MODE (TARGETED)**: If a writable write fails, prioritize repairing failed targets. Block finish ONLY for blocking errors (\`WRITE_EXISTING_TARGET_RETRY_REQUIRED\` / \`FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE\`). Non-blocking failures may proceed.
    - After repair succeeds, append one concise \`[code] cause -> fix\` bullet to \`current/world/soul.md\` under \`## Tool Usage Hints\`.
10. **NO COMMIT SPAM**: Repeating \`${resolvedFinishToolName}\` while blocking failed targets remain unresolved is invalid.
11. **CONVERSATION WRITE GUARD**: ${CONVERSATION_GUARD_SHORT}
12. **BATCH TOOL CALLS**: For dependent multi-step orchestration, use \`vfs_vm\`.
    - If you use \`vfs_vm\`, it MUST be the only top-level tool call in that assistant response.
    - \`vfs_vm\` scripts must be JavaScript (not pseudo-tool JSON text), and must not use \`globalThis\`/\`window\`/\`import\`/\`eval\`/\`Function\`.
13. **NO DUPLICATES**: Check existing files before adding new entities.
14. ${
      isPlayerRateToolset
        ? "**NO PLOT PROGRESSION**: `[Player Rate]` loops must not advance visible story nodes or produce new choices."
        : "**CONSEQUENCES**: If PENDING CONSEQUENCES are shown, update relevant world files directly."
    }

<examples>
- Example (${isPlayerRateToolset ? "inspect → soul commit" : "inspect → edit → finish"}):
  ${
    isPlayerRateToolset
      ? "1) `vfs_read_markdown` on `current/world/soul.md` and `current/world/global/soul.md` (prefer `headings`/`indices`)\n  2) `vfs_finish_soul` with `{ currentSoul?, globalSoul? }` (at least one)\n  3) Do not emit new plot node content in this loop"
      : "1) `vfs_search` within `current/world/` and/or `current/outline/story_outline/plan.md` for target anchors\n  2) Use `vfs_patch_json` / `vfs_merge_json` (or `vfs_write_file` when creating) for world updates; use `vfs_write_markdown` for incremental `plan.md` updates or `vfs_write_file` for full `plan.md` rewrite when fracture is major\n  3) `" +
        resolvedFinishToolName +
        "` with `{ assistant: { narrative: \"...\", choices: [...] }, retconAck?: { summary: \"...\" } }` as the LAST call"
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
2. **TOOL CAPABILITY CONTRACT**:
   ${capabilityText}
3. **SKILL PREFLIGHT (ENFORCED)**: Before first non-read mutation, read current/skills/commands/runtime/SKILL.md, current/skills/commands/runtime/cleanup/SKILL.md, current/skills/core/protocols/SKILL.md, and current/skills/craft/writing/SKILL.md.
4. **SKILL DISCOVERY (RECOMMENDED, SESSION-SCOPED)**: Once per session (cold start/rebuild), read current/skills/index.json and load additional relevant skill docs (1-3). Reuse them across turns; do not re-read by default. Re-read only when \`[SYSTEM: EXTERNAL_FILE_CHANGES]\` explicitly signals external updates, prior read scope is insufficient, or recovery explicitly requires re-read. Your own successful writes do not require automatic re-read.
5. **READ FIRST**: Use \`vfs_ls\` / \`vfs_search\` / read tools to locate and verify duplicate candidates.
   - For large JSON, prefer pointer/line scoped reads instead of broad full-file char reads.
6. **APPLY FIXES**: Use write tools as needed.
   - For dependent multi-step orchestration, use \`vfs_vm\`.
   - If you use \`vfs_vm\`, it MUST be the only top-level tool call in that assistant response.
   - \`vfs_vm\` scripts must be JavaScript (not pseudo-tool JSON text), and must not use \`globalThis\`/\`window\`/\`import\`/\`eval\`/\`Function\`.
7. **FINISH**: Your LAST tool call must be \`${finishToolName || "vfs_finish_turn"}\`.
   - If finishing with \`vfs_finish_turn\`, use \`{ assistant: { narrative: "<string>", choices: [...] }, retconAck?: { summary: "<string>" } }\`.
8. **EFFICIENCY RULE (STRICT)**: Do NOT issue read-only tools immediately before finish unless they are directly required to perform OR verify same-response mutations.
9. **WRITE FAILURE REPAIR MODE (TARGETED)**: If a writable write fails, next calls should repair failed targets first, but finish is blocked only by blocking errors (\`WRITE_EXISTING_TARGET_RETRY_REQUIRED\` / \`FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE\`).
    - After repair succeeds, append one concise \`[code] cause -> fix\` bullet to \`current/world/soul.md\` under \`## Tool Usage Hints\`.
10. **CONVERSATION WRITE GUARD**: ${CONVERSATION_GUARD_SHORT}

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
