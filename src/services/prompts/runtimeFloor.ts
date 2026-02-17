/**
 * Runtime Floor Prompts
 *
 * Non-overridable protocol constraints that MUST stay at the very front of
 * system instructions.
 */

const TURN_RUNTIME_FLOOR = `<runtime_floor>
You MUST follow these runtime protocol constraints:
- Use native function/tool calling. Do NOT output tool JSON as plain text.
- VFS primer:
  - Paths: \`current/**\`, \`shared/**\`, \`forks/{id}/**\` are VFS paths.
  - Read tools: \`vfs_read_markdown\` (prefer section selectors), \`vfs_read_chars\`, \`vfs_read_lines\` (use for large files with bounded ranges), \`vfs_read_json\` (requires \`pointers\`), \`vfs_ls\` (returns stats/hints), \`vfs_schema\`, \`vfs_search\`.
  - Write tools: \`vfs_write_file\`/\`vfs_append_text\`/\`vfs_edit_lines\`/\`vfs_write_markdown\`/\`vfs_patch_json\`/\`vfs_merge_json\`/\`vfs_move\`/\`vfs_delete\`. Never use these on finish-guarded paths.
  - \`vfs_vm\`: multi-step JavaScript orchestrator. MUST be the only top-level tool call. No recursion, no \`import\`/\`eval\`/\`Function\`/\`globalThis\`/\`window\`. Finish at most once, last.
  - Tool docs: \`current/refs/tools/{toolName}/README.md\` + \`EXAMPLES.md\`; schemas: \`current/refs/tool-schemas/{toolName}/README.md\` + \`PART-xx.md\`.
  - Marker routing: \`[PLAYER_ACTION]\` → world turn, \`[Player Rate]\` → soul files only, \`[SUDO]\` → elevated update.
  - Soul docs (\`current/world/soul.md\`, \`current/world/global/soul.md\`): writable AI-to-AI self-notes for future turns. Update proactively in normal turns; use \`vfs_finish_soul\` in \`[Player Rate]\`.
  - \`**/notes.md\` files: optional AI self-notes, not mandatory pre-read anchors.
- High-frequency schema traps (AVOID):
  - Canonical world entities (\`current/world/{quests|knowledge|timeline|locations|factions|causal_chains}/*.json\`, \`current/world/world_info.json\`) MUST NOT contain root \`unlocked\`/\`unlockReason\`; unlock state belongs in actor views (\`current/world/characters/<actorId>/views/**\`).
  - UI-only fields (\`highlight\`, \`lastAccess\`) belong to \`ui_state:*\` metadata — NEVER write into VFS world/view JSON.
  - Unresolved drafts → \`current/world/placeholders/**/*.md\`; delete draft only after canonical write succeeds.
  - Reference placeholder \`[Display Name]\` is temporary — resolve to canonical ID when identity becomes explicit.
  - Character profile: location → \`/currentLocation\` (NOT \`/visible/currentLocation\`); status/mood → \`/visible/*\`.
  - Never copy merged read-model \`unlocked\` fields back into canonical world writes.
- Finish rule: end each loop via its finish tool as the LAST tool call (\`vfs_finish_turn\` for normal/cleanup/sudo, \`vfs_finish_soul\` for \`[Player Rate]\`). Args for \`vfs_finish_turn\`: \`{ assistant: { narrative, choices }, retconAck?: { summary } }\`.
- Do NOT write finish-guarded conversation/summary paths via generic write tools.
- Loop preflight (hard gate — enforced before first non-read tool call):
  1) Read \`current/skills/commands/runtime/SKILL.md\` (hub).
  2) Read the active command protocol skill (turn/player-rate/cleanup/sudo).
  3) Read soul anchors: \`current/world/soul.md\` + \`current/world/global/soul.md\`.
  4) Plan: read anchors → mutate → verify → finish (one finish call, last).
  5) Cold start: preload required files with reads instead of triggering gate errors.
- Error recovery (when tool returns \`{ success:false, code, error }\`):
  1) Do NOT finish while blocking errors remain (\`WRITE_EXISTING_TARGET_RETRY_REQUIRED\`, \`FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE\`).
  2) Fix by \`code\`:
     - \`NOT_FOUND\`: start from guaranteed root (\`current\`/\`shared\`/\`forks\`) with \`vfs_ls\`, then \`vfs_search\`, then walk parents segment-by-segment (do not assume immediate parent exists).
     - \`INVALID_PARAMS\`: read split tool docs and retry with schema-valid args.
     - \`INVALID_DATA\`: run \`vfs_schema\`, align fields/types. Common fixes: remove root \`unlocked\`/\`unlockReason\` from world entities; location → \`/currentLocation\`; status → \`/visible/status\`; trust schema over merged context fields.
     - \`INVALID_ACTION\`: fix tool order/read-before-write/finish-last, then retry.
     - \`FINISH_GUARD_REQUIRED\`: use the loop's finish tool instead.
  3) Re-read only when recovery needs unseen data or on \`[SYSTEM: EXTERNAL_FILE_CHANGES]\`.
  4) If same \`code\` repeats twice, narrow scope and report blocker.
  5) On retry success, append \`[code] cause -> fix\` to \`current/world/soul.md § Tool Usage Hints\`.
</runtime_floor>`;

const OUTLINE_RUNTIME_FLOOR = `<runtime_floor>
You MUST follow these outline protocol constraints:
- Use native function/tool calling. Do NOT output tool JSON as plain text.
- VFS primer:
  - In OUTLINE MODE, use read-only tools (\`vfs_read_markdown\`/\`vfs_read_chars\`/\`vfs_read_lines\`/\`vfs_read_json\`, \`vfs_schema\`, \`vfs_ls\`, \`vfs_search\`) for schema/contract checks before submit.
  - Prefer \`vfs_read_markdown\` with section selectors; for large files, use bounded \`vfs_read_lines\`.
  - Never call write/move/delete tools in outline mode.
  - Tool docs: \`current/refs/tools/{toolName}/README.md\` + \`EXAMPLES.md\`; schemas: \`current/refs/tool-schemas/{toolName}/README.md\` + \`PART-xx.md\`.
- Submit ONLY with the phase-specific submit tool. Do NOT combine it with other tools.
- Quick-start (recommended):
  1) Read \`current/skills/commands/runtime/SKILL.md\` + \`current/skills/commands/runtime/outline/SKILL.md\`.
  2) Use read-only lookup if needed, then submit exactly one phase tool.
- Error recovery:
  1) Keep phase/tool unchanged.
  2) Fix by code: \`INVALID_PARAMS\` → read tool docs, fix args; \`INVALID_DATA\`/\`READ_LIMIT_EXCEEDED\` → use \`details.hint.nextCalls\`.
  3) Retry same phase submit tool.
</runtime_floor>`;

interface ComposeSystemInstructionOptions {
  runtimeFloor: string;
  systemDefaultInjection?: string;
  customInstruction?: string;
  baseSystemInstruction: string;
}

const cleanBlock = (value?: string): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

export const getTurnRuntimeFloor = (): string => TURN_RUNTIME_FLOOR;

export const getOutlineRuntimeFloor = (): string => OUTLINE_RUNTIME_FLOOR;

export const composeSystemInstruction = (
  options: ComposeSystemInstructionOptions,
): string => {
  const blocks = [
    cleanBlock(options.runtimeFloor),
    cleanBlock(options.systemDefaultInjection),
    cleanBlock(options.customInstruction),
    cleanBlock(options.baseSystemInstruction),
  ].filter((entry) => entry.length > 0);

  return blocks.join("\n\n");
};
