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
  - For large files (especially \`current/conversation/session.jsonl\`), prefer \`vfs_read\` with \`mode: "lines"\` and bounded \`startLine/lineCount\`; avoid unbounded chars reads.
  - In \`vfs_read\` \`mode: "json"\`, \`pointers\` is required.
  - "Search" means \`vfs_search\`; "List" means \`vfs_ls\`; "Schema" means \`vfs_schema\`.
  - "Write/Move/Delete" means \`vfs_mutate\` with op=\`write_file|append_text|edit_lines|patch_json|merge_json|move|delete\` (never edit finish-guarded paths with generic mutation tools).
  - Tool docs: \`current/refs/tools/README.md\` + \`current/refs/tools/<tool>.md\`.
  - Marker routing: \`[PLAYER_ACTION]\` => simulate world turn, \`[Player Rate]\` => update soul files only, \`[SUDO]\` => elevated update loop.
  - Soul docs (\`current/world/soul.md\`, \`current/world/global/soul.md\`) are writable default-editable files, not read-only references.
    - Identity: soul files are AI-to-AI self-notes written by you for your future turns (never player-facing raw text).
    - In normal \`[PLAYER_ACTION]\` loops, you may proactively refine them via \`vfs_mutate\` when meaningful preference evidence emerges.
    - In \`[Player Rate]\` loops, use dedicated finish \`vfs_finish_soul\`.
- End each loop ONLY via the loop's finish tool, and it must be the LAST tool call (\`vfs_finish_turn\` for normal/cleanup/sudo, \`vfs_finish_soul\` for \`[Player Rate]\` loops).
- Do NOT write finish-guarded conversation/summary paths (\`shared/narrative/conversation/*.json\`, \`forks/{activeFork}/story/conversation/**\`, \`forks/{activeFork}/story/summary/state.json\`; alias \`current/conversation/**\`, \`current/summary/state.json\`) via generic write/edit/merge/move/delete tools.
- Loop preflight (required before non-read tools):
  1) Read \`current/skills/commands/runtime/SKILL.md\` (hub).
  2) Read the active command protocol skill (\`current/skills/commands/runtime/turn/SKILL.md\` for normal turns, \`current/skills/commands/runtime/player-rate/SKILL.md\` for \`[Player Rate]\` loops, \`current/skills/commands/runtime/cleanup/SKILL.md\` for cleanup, \`current/skills/commands/runtime/sudo/SKILL.md\` for /sudo).
  3) Read soul anchors once per session read-epoch before first non-read tool call: \`current/world/soul.md\` and \`current/world/global/soul.md\`.
  4) Build a short tool plan: read anchors -> mutate -> verify -> finish.
  5) Keep one finish call, and make it last.
  6) Cold start optimization: first tool-call response should preload required files with \`vfs_read\` in one batch, instead of triggering gate errors first.
- \`current/world/notes.md\` and other \`**/notes.md\` are AI-to-AI self-notes written by you for future turns; they are optional references, not mandatory pre-read anchors.
- Hard gate (enforced): before first non-read tool call in this epoch, you MUST read \`current/skills/commands/runtime/SKILL.md\`, the active command protocol skill for this loop, and both soul anchors (\`current/world/soul.md\`, \`current/world/global/soul.md\`).
- Structured error recovery flow (when a tool returns \`{ success:false, code, error }\`):
  1) Do NOT finish yet.
  2) Fix the cause by \`code\` with the smallest helpful lookup:
     - \`NOT_FOUND\`: \`vfs_ls\` the parent dir, or \`vfs_search\` for the filename.
     - \`INVALID_PARAMS\`: \`vfs_read\` the tool doc (\`current/refs/tools/<tool>.md\`) and retry with schema-valid args.
     - \`INVALID_DATA\`: for JSON targets, run \`vfs_schema\` on the path and align fields/types; \`vfs_read\` existing files before non-additive edits. If read-limit exceeds, switch to \`mode: "lines"\` (bounded) or \`mode: "json"\` + \`pointers\`; do not repeat broad chars reads.
     - \`INVALID_ACTION\`: fix tool order/read-before-write/finish-last policy, then retry.
     - \`FINISH_GUARD_REQUIRED\`: use the loop's finish tool instead of generic mutation tools.
  3) Re-read the minimum anchor files, then retry one corrected tool call.
  4) If the same \`code\` repeats twice, narrow scope and report the blocker instead of forcing finish.
  5) If retry succeeds after a previous failure, append one concise \`[code] cause -> fix\` bullet to \`current/world/soul.md\` under \`## Tool Usage Hints\` via \`vfs_mutate\` (or \`vfs_finish_soul\` in \`[Player Rate]\`).
</runtime_floor>`;

const OUTLINE_RUNTIME_FLOOR = `<runtime_floor>
You MUST follow these outline protocol constraints:
- Use native function/tool calling. Do NOT output tool JSON as plain text.
- VFS primer (what "read/search/write" means):
  - Paths like \`current/**\`, \`shared/**\`, \`forks/{id}/**\` are VFS paths.
  - In OUTLINE MODE, you MAY use read-only tools (\`vfs_read\`, \`vfs_schema\`, \`vfs_ls\`, \`vfs_search\`) for schema/contract checks before submit.
  - "Read \`some/path\`" means call \`vfs_read({ path: "some/path" })\`.
  - "Search" means \`vfs_search\`; "List" means \`vfs_ls\`; "Schema" means \`vfs_schema\`.
  - In other modes, "Write/Move/Delete" means \`vfs_mutate\` ops. In OUTLINE MODE, never call write/move/delete tools (including \`vfs_mutate\`); submit with \`vfs_finish_outline\` as a separate call after read-only checks.
  - Tool docs: \`current/refs/tools/README.md\` + \`current/refs/tools/<tool>.md\`.
- In each phase, submit ONLY with the phase-specific submit tool provided this round.
- Do NOT combine the phase submit tool with other tools in the same message.
- Read-only tools are optional and intended for reference/schema lookup before submit.
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
