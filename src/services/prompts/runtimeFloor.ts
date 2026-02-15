/**
 * Runtime Floor Prompts
 *
 * Non-overridable protocol constraints that MUST stay at the very front of
 * system instructions.
 */

const TURN_RUNTIME_FLOOR = `<runtime_floor>
You MUST follow these runtime protocol constraints:
- Use native function/tool calling. Do NOT output tool JSON as plain text.
- VFS primer (what "read/search/write" means):
  - Paths like \`current/**\`, \`shared/**\`, \`forks/{id}/**\` are VFS paths.
  - "Read \`some/path\`" means call \`vfs_read({ path: "some/path" })\`.
  - "Search" means \`vfs_search\`; "List" means \`vfs_ls\`; "Schema" means \`vfs_schema\`.
  - "Write/Move/Delete" means \`vfs_write\` / \`vfs_move\` / \`vfs_delete\` (never edit finish-guarded paths with generic mutation tools).
  - Tool docs: \`current/refs/tools/README.md\` + \`current/refs/tools/<tool>.md\`.
- End turns ONLY via \`vfs_commit_turn\`, and it must be the LAST tool call.
- Do NOT write finish-guarded conversation/summary paths (\`shared/narrative/conversation/*.json\`, \`forks/{activeFork}/story/conversation/**\`, \`forks/{activeFork}/story/summary/state.json\`; alias \`current/conversation/**\`, \`current/summary/state.json\`) via generic write/edit/merge/move/delete tools.
- Loop preflight (required before non-read tools):
  1) Read \`current/skills/commands/runtime/SKILL.md\` (hub).
  2) Read the active command protocol skill (\`current/skills/commands/runtime/turn/SKILL.md\` for normal turns, \`current/skills/commands/runtime/cleanup/SKILL.md\` for cleanup, \`current/skills/commands/runtime/sudo/SKILL.md\` for /sudo).
  3) Build a short tool plan: read anchors -> mutate -> verify -> finish.
  4) Keep one finish call, and make it last.
- Hard gate (enforced): before first non-read tool call in this epoch, you MUST read \`current/skills/commands/runtime/SKILL.md\` plus the active command protocol skill for this loop.
- Structured error recovery flow (when a tool returns \`{ success:false, code, error }\`):
  1) Do NOT finish yet.
  2) Fix the cause by \`code\` with the smallest helpful lookup:
     - \`NOT_FOUND\`: \`vfs_ls\` the parent dir, or \`vfs_search\` for the filename.
     - \`INVALID_PARAMS\`: \`vfs_read\` the tool doc (\`current/refs/tools/<tool>.md\`) and retry with schema-valid args.
     - \`INVALID_DATA\`: for JSON targets, run \`vfs_schema\` on the path and align fields/types; \`vfs_read\` existing files before non-additive edits.
     - \`INVALID_ACTION\`: fix tool order/read-before-write/finish-last policy, then retry.
     - \`FINISH_GUARD_REQUIRED\`: use the loop's commit tool (usually \`vfs_commit_turn\`) instead of generic mutation tools.
  3) Re-read the minimum anchor files, then retry one corrected tool call.
  4) If the same \`code\` repeats twice, narrow scope and report the blocker instead of forcing finish.
</runtime_floor>`;

const OUTLINE_RUNTIME_FLOOR = `<runtime_floor>
You MUST follow these outline protocol constraints:
- Use native function/tool calling. Do NOT output tool JSON as plain text.
- VFS primer (what "read/search/write" means):
  - Paths like \`current/**\`, \`shared/**\`, \`forks/{id}/**\` are VFS paths.
  - If VFS tools exist this round, they are for reference lookup only (read-only).
  - "Read \`some/path\`" means call \`vfs_read({ path: "some/path" })\`.
  - "Search" means \`vfs_search\`; "List" means \`vfs_ls\`; "Schema" means \`vfs_schema\`.
  - In other modes, "Write/Move/Delete" would mean \`vfs_write\` / \`vfs_move\` / \`vfs_delete\`. In OUTLINE MODE, do NOT use those tools; submit via the phase tool only.
  - Tool docs: \`current/refs/tools/README.md\` + \`current/refs/tools/<tool>.md\`.
- In each phase, submit ONLY with the phase-specific submit tool provided this round.
- Do NOT combine the phase submit tool with other tools in the same message.
- Read-only tools are optional and for reference lookup only.
- Loop quick-start (recommended):
  1) Read \`current/skills/commands/runtime/SKILL.md\` (hub).
  2) Read \`current/skills/commands/runtime/outline/SKILL.md\` (phase protocol).
  3) Use read-only lookup if needed, then submit exactly one phase tool.
- Soft gate (advisory, not blocking): before first phase submit, prefer reading \`current/skills/commands/runtime/SKILL.md\` and \`current/skills/commands/runtime/outline/SKILL.md\` when available.
- Structured error recovery flow (when the submit tool returns \`{ success:false, code, error }\`): keep phase/tool unchanged, correct payload by error code, and retry the same phase submit tool.
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
