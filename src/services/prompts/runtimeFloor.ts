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
  - Read tools are split: \`vfs_read_markdown\` / \`vfs_read_chars\` / \`vfs_read_lines\` / \`vfs_read_json\`.
  - For markdown section reads, prefer \`vfs_read_markdown\` with \`headings\` and/or \`indices\`.
  - For large files (especially \`current/conversation/session.jsonl\`), prefer \`vfs_read_lines\` with bounded \`startLine/lineCount\`.
  - \`vfs_read_json\` requires \`pointers\`.
  - \`vfs_ls\` returns \`stats\` (\`chars\`/\`lines\`) and \`hints[]\` for likely-over-budget files.
  - "Search" means \`vfs_search\`; "List" means \`vfs_ls\`; "Schema" means \`vfs_schema\`.
  - Write tools are split: \`vfs_write_file\` / \`vfs_append_text\` / \`vfs_edit_lines\` / \`vfs_write_markdown\` / \`vfs_patch_json\` / \`vfs_merge_json\` / \`vfs_move\` / \`vfs_delete\` (never edit finish-guarded paths with generic write tools).
  - Tool docs are split:
    - Tool overview/examples: \`current/refs/tools/{toolName}/README.md\` + \`current/refs/tools/{toolName}/EXAMPLES.md\`
    - Schema summary/parts: \`current/refs/tool-schemas/{toolName}/README.md\` + \`current/refs/tool-schemas/{toolName}/PART-xx.md\`
    - Indexes: \`current/refs/tools/index.json\` + \`current/refs/tool-schemas/index.json\`
  - Marker routing: \`[PLAYER_ACTION]\` => simulate world turn, \`[Player Rate]\` => update soul files only, \`[SUDO]\` => elevated update loop.
  - Soul docs (\`current/world/soul.md\`, \`current/world/global/soul.md\`) are writable default-editable files, not read-only references.
    - Identity: soul files are AI-to-AI self-notes written by you for your future turns (never player-facing raw text).
    - In normal \`[PLAYER_ACTION]\` loops, you may proactively refine them via writable tools when meaningful preference evidence emerges.
    - In \`[Player Rate]\` loops, use dedicated finish \`vfs_finish_soul\`.
  - High-frequency schema traps (avoid these):
    - Canonical world entities (\`current/world/{quests|knowledge|timeline|locations|factions|causal_chains}/*.json\`, \`current/world/world_info.json\`) MUST NOT contain root \`unlocked\`/\`unlockReason\`; unlock state belongs in actor views (\`current/world/characters/<actorId>/views/**\`).
    - UI-only presentation fields (\`highlight\`, \`lastAccess\`) belong to \`ui_state:*\` metadata and MUST NOT be written into VFS world or view JSON files.
    - Unresolved entity drafts belong in \`current/world/placeholder/**/*.md\`; once promoted to canonical JSON, delete the matching draft note in the same response.
    - Reference placeholder \`[Display Name]\` is temporary. When identity becomes explicit (named mention/encounter/mechanical interaction), resolve to canonical ID in the same turn whenever possible; do not keep stale placeholders across turns.
    - Character profile location updates use root pointer \`/currentLocation\` (NOT \`/visible/currentLocation\`).
    - Character profile status/mood fields live under \`/visible/*\` (for example \`/visible/status\`, not \`/status\`).
    - If any context block shows merged read-model \`unlocked\` fields on world entities, NEVER copy those fields back into canonical world writes.
- End each loop ONLY via the loop's finish tool, and it must be the LAST tool call (\`vfs_finish_turn\` for normal/cleanup/sudo, \`vfs_finish_soul\` for \`[Player Rate]\` loops).
- Do NOT write finish-guarded conversation/summary paths (\`shared/narrative/conversation/*.json\`, \`forks/{activeFork}/story/conversation/**\`, \`forks/{activeFork}/story/summary/state.json\`; alias \`current/conversation/**\`, \`current/summary/state.json\`) via generic write/edit/merge/move/delete tools.
- Loop preflight (required before non-read tools):
  1) Read \`current/skills/commands/runtime/SKILL.md\` (hub).
  2) Read the active command protocol skill (\`current/skills/commands/runtime/turn/SKILL.md\` for normal turns, \`current/skills/commands/runtime/player-rate/SKILL.md\` for \`[Player Rate]\` loops, \`current/skills/commands/runtime/cleanup/SKILL.md\` for cleanup, \`current/skills/commands/runtime/sudo/SKILL.md\` for /sudo).
  3) Read soul anchors once per session read-epoch before first non-read tool call: \`current/world/soul.md\` and \`current/world/global/soul.md\`.
  4) Build a short tool plan: read anchors -> mutate -> verify -> finish.
  5) Keep one finish call, and make it last.
  6) Cold start optimization: first tool-call response should preload required files with read tools instead of triggering gate errors first.
- \`current/world/notes.md\` and other \`**/notes.md\` are AI-to-AI self-notes written by you for future turns; they are optional references, not mandatory pre-read anchors.
- Hard gate (enforced): before first non-read tool call in this epoch, you MUST read \`current/skills/commands/runtime/SKILL.md\`, the active command protocol skill for this loop, and both soul anchors (\`current/world/soul.md\`, \`current/world/global/soul.md\`).
- Structured error recovery flow (when a tool returns \`{ success:false, code, error }\`):
  1) Do NOT finish while blocking errors remain unresolved (hard gates and required-write-retry codes such as \`WRITE_EXISTING_TARGET_RETRY_REQUIRED\` / \`FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE\`).
  2) Fix the cause by \`code\` with the smallest helpful lookup:
     - \`NOT_FOUND\`: \`vfs_ls\` the parent dir, or \`vfs_search\` for the filename.
     - \`INVALID_PARAMS\`: read split docs (\`current/refs/tools/{toolName}/README.md\`, \`current/refs/tools/{toolName}/EXAMPLES.md\`, \`current/refs/tool-schemas/{toolName}/README.md\`) and retry with schema-valid args.
     - \`INVALID_DATA\`: for JSON targets, run \`vfs_schema\` on the path and align fields/types; read existing files before non-additive edits. If read-limit exceeds, use \`details.hint.nextCalls\` for bounded retry; do not repeat broad path-only reads.
       * Common fix map: remove root \`unlocked\`/\`unlockReason\` from canonical world entities and write unlock state in actor views.
       * Common fix map: profile location pointer is \`/currentLocation\` (not \`/visible/currentLocation\`).
       * Common fix map: profile status pointer is \`/visible/status\` (not \`/status\`).
       * Common fix map: if source context includes merged UI/read-model fields, trust \`vfs_schema\` + file read over copied context fields before retrying write.
     - \`INVALID_ACTION\`: fix tool order/read-before-write/finish-last policy, then retry.
     - \`FINISH_GUARD_REQUIRED\`: use the loop's finish tool instead of generic mutation tools.
  3) Re-read only when recovery needs unseen sections/pointers or when \`[SYSTEM: EXTERNAL_FILE_CHANGES]\` explicitly signals external updates; your own successful writes do not require automatic re-read.
  4) Retry one corrected tool call.
  5) If the same \`code\` repeats twice, narrow scope and report the blocker instead of forcing finish.
  6) If retry succeeds after a previous failure, append one concise \`[code] cause -> fix\` bullet to \`current/world/soul.md\` under \`## Tool Usage Hints\` via writable tools (or \`vfs_finish_soul\` in \`[Player Rate]\`).
</runtime_floor>`;

const OUTLINE_RUNTIME_FLOOR = `<runtime_floor>
You MUST follow these outline protocol constraints:
- Use native function/tool calling. Do NOT output tool JSON as plain text.
- VFS primer (what "read/search/write" means):
  - Paths like \`current/**\`, \`shared/**\`, \`forks/{id}/**\` are VFS paths.
  - In OUTLINE MODE, you MAY use read-only tools (\`vfs_read_markdown\`/\`vfs_read_chars\`/\`vfs_read_lines\`/\`vfs_read_json\`, \`vfs_schema\`, \`vfs_ls\`, \`vfs_search\`) for schema/contract checks before submit.
  - For markdown docs, prefer \`vfs_read_markdown\` with section selectors (\`headings\`/\`indices\`).
  - For large files/docs, prefer bounded \`vfs_read_lines\`; after \`READ_LIMIT_EXCEEDED\`, do NOT repeat broad path-only reads.
  - "Search" means \`vfs_search\`; "List" means \`vfs_ls\`; "Schema" means \`vfs_schema\`.
  - In other modes, writes use the split write tools. In OUTLINE MODE, never call write/move/delete tools; submit with the current phase submit tool only.
  - Tool docs are split:
    - Tool overview/examples: \`current/refs/tools/{toolName}/README.md\` + \`current/refs/tools/{toolName}/EXAMPLES.md\`
    - Schema summary/parts: \`current/refs/tool-schemas/{toolName}/README.md\` + \`current/refs/tool-schemas/{toolName}/PART-xx.md\`
    - Indexes: \`current/refs/tools/index.json\` + \`current/refs/tool-schemas/index.json\`
- In each phase, submit ONLY with the phase-specific submit tool provided this round.
- Do NOT combine the phase submit tool with other tools in the same message.
- Read-only tools are optional and intended for reference/schema lookup before submit.
- Loop quick-start (recommended):
  1) Read \`current/skills/commands/runtime/SKILL.md\` (hub).
  2) Read \`current/skills/commands/runtime/outline/SKILL.md\` (phase protocol).
  3) Use read-only lookup if needed, then submit exactly one phase tool.
- Soft gate (advisory, not blocking): before first phase submit, prefer reading \`current/skills/commands/runtime/SKILL.md\` and \`current/skills/commands/runtime/outline/SKILL.md\` when available.
- Structured error recovery flow (when the submit tool returns \`{ success:false, code, error }\`):
  1) Keep phase/tool unchanged.
  2) Correct payload by error code:
     - \`INVALID_PARAMS\`: open split tool docs (overview/examples/schema summary), then fix argument types/fields exactly per schema.
     - \`INVALID_DATA\` with \`READ_LIMIT_EXCEEDED\`: use \`details.hint.nextCalls\`; do NOT retry broad path-only reads.
  3) Retry the same phase submit tool after correction.
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
