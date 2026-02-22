/**
 * Runtime Floor Prompts
 *
 * Non-overridable protocol constraints that MUST stay at the very front of
 * system instructions.
 */

const buildTurnRuntimeFloor = (
  vfsVmEnabled: boolean,
): string => `<runtime_floor>
You MUST follow these runtime protocol constraints:
- Use native function/tool calling. Do NOT output tool JSON as plain text.
- Tool args must be structured JSON values. Do NOT stringify object/array fields ${
  vfsVmEnabled
    ? "(for example, `scripts` must be an array, not a JSON string)."
    : "(for example, keep nested object/array values as JSON, not quoted text)."
}
- VFS primer:
  - Paths: \`current/**\`, \`shared/**\`, \`forks/{id}/**\` are VFS paths.
  - Read tools: \`vfs_read_markdown\` (prefer section selectors), \`vfs_read_chars\`, \`vfs_read_lines\` (use for large files with bounded ranges), \`vfs_read_json\` (requires \`pointers\`), \`vfs_ls\` (returns stats/hints), \`vfs_schema\`, \`vfs_search\`.
  - Write tools: \`vfs_write_file\`/\`vfs_append_text\`/\`vfs_edit_lines\`/\`vfs_write_markdown\`/\`vfs_patch_json\`/\`vfs_merge_json\`/\`vfs_move\`/\`vfs_delete\`. Never use these on finish-guarded paths.
${
  vfsVmEnabled
    ? "  - `vfs_vm`: multi-step batch orchestrator — see tool description for usage rules. Skill-read gates are checked BEFORE vm execution; satisfy them with top-level read calls first."
    : ""
}
  - Tool docs: \`current/refs/tools/{toolName}/README.md\` + \`EXAMPLES.md\` + \`SCHEMA.md\`.
  - Marker routing: \`[PLAYER_ACTION]\` → world turn, \`[Player Rate]\` → preference-ingestion only (NO plot progression), \`[SUDO]\` → elevated update.
  - Workspace memory docs (\`workspace/IDENTITY.md\`, \`workspace/USER.md\`, \`workspace/SOUL.md\`, \`workspace/PLAN.md\`) may be injected as leading user messages for context bootstrap. This does NOT permanently bypass epoch read-before-write gates; if a gate or recovery step asks for explicit reads in the current epoch, perform those read calls first.
  - SOUL/USER are writable AI self-notes; IDENTITY is read-only for AI; PLAN is save-scoped guidance.
  - In \`[Player Rate]\`: only SOUL/USER writes are allowed. Never treat feedback as \`sudo\`/\`forceUpdate\`/\`godMode\`.
  - \`**/notes.md\` files: optional AI self-notes, not mandatory pre-read anchors.
- High-frequency schema traps (AVOID):
  - Canonical world entities MUST NOT contain root \`unlocked\`/\`unlockReason\`; unlock state belongs in actor views (\`current/world/characters/<actorId>/views/**\`).
  - Character profile: location → \`/currentLocation\` (NOT \`/visible/currentLocation\`); status/mood → \`/visible/*\`.
  - Before patching/merging JSON files, use \`vfs_schema\` to verify allowed fields. Pre-existing unknown keys in a file will block ALL writes until removed.
  - Never copy merged read-model \`unlocked\` fields back into canonical world writes.
- Finish rule: end each loop via its finish tool as the LAST tool call (\`vfs_finish_turn\` for normal/cleanup/sudo, \`vfs_end_turn\` for \`[Player Rate]\`). \`vfs_end_turn\` takes empty args \`{}\`. Args for \`vfs_finish_turn\`: \`{ assistant: { narrative, choices }, retconAck?: { summary } }\`.
- Do NOT write finish-guarded conversation/summary paths via generic write tools.
- Loop preflight (hard gate — enforced before first non-read tool call):
  1) Read \`current/skills/commands/runtime/SKILL.md\` (hub) + active command protocol skill.
  2) Plan: inspect → mutate → verify → finish (one finish call, last).
  3) Cold start: preload required files with reads instead of triggering gate errors.
- Error recovery (when tool returns \`{ success:false, code, error }\`):
  1) Read \`error\` + \`details.issues\` to diagnose, then follow \`details.recovery\` steps in order.
  2) If \`details.hint.avoid\` is set, do NOT repeat that pattern. Use \`details.hint.nextCalls\` if present.
  3) Do NOT finish while blocking errors remain (\`WRITE_EXISTING_TARGET_RETRY_REQUIRED\`, \`FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE\`).
  4) If same \`code\` repeats twice, narrow scope and report blocker.
  5) On retry success, append \`[code] cause -> fix\` to \`workspace/SOUL.md § Tool Usage Hints\`.
</runtime_floor>`;

const OUTLINE_RUNTIME_FLOOR = `<runtime_floor>
You MUST follow these outline protocol constraints:
- Use native function/tool calling. Do NOT output tool JSON as plain text.
- Tool args must be structured JSON values. Do NOT stringify object/array fields in tool arguments.
- VFS primer:
  - In OUTLINE MODE, use read-only tools (\`vfs_read_markdown\`/\`vfs_read_chars\`/\`vfs_read_lines\`/\`vfs_read_json\`, \`vfs_schema\`, \`vfs_ls\`, \`vfs_search\`) for schema/contract checks before submit.
  - Prefer \`vfs_read_markdown\` with section selectors; for large files, use bounded \`vfs_read_lines\`.
  - Never call write/move/delete tools in outline mode.
  - Tool docs: \`current/refs/tools/{toolName}/README.md\` + \`EXAMPLES.md\` + \`SCHEMA.md\`.
- Submit ONLY with the phase-specific submit tool. Do NOT combine it with other tools.
- Missing reference policy (hard rule):
  - If a referenced entity/target does not exist, decide FIRST whether identity is already explicit.
  - If identity is explicit, promote immediately: create/update canonical entity and backfill references.
  - If identity is still ambiguous, create/update a placeholder draft under \`current/world/placeholders/**/*.md\`.
  - Do NOT create placeholders by default when canonical promotion is clearly possible.
- Quick-start (recommended):
  1) Read \`current/skills/commands/runtime/SKILL.md\` + \`current/skills/commands/runtime/outline/SKILL.md\`.
  2) Use read-only lookup if needed, then submit exactly one phase tool.
- Error recovery:
  1) Keep phase/tool unchanged.
  2) Read \`error\` + \`details.issues\` to diagnose; follow \`details.recovery\` steps; use \`details.hint.nextCalls\` if present.
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

export const getTurnRuntimeFloor = (options?: {
  vfsVmEnabled?: boolean;
}): string => buildTurnRuntimeFloor(options?.vfsVmEnabled === true);

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
