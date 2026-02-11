/**
 * Runtime Floor Prompts
 *
 * Non-overridable protocol constraints that MUST stay at the very front of
 * system instructions.
 */

const TURN_RUNTIME_FLOOR = `<runtime_floor>
You MUST follow these runtime protocol constraints:
- Use native function/tool calling. Do NOT output tool JSON as plain text.
- End turns ONLY via \`vfs_commit_turn\`, and it must be the LAST tool call.
- Do NOT write finish-guarded conversation/summary paths (\`shared/narrative/conversation/*.json\`, \`forks/{activeFork}/story/conversation/**\`, \`forks/{activeFork}/story/summary/state.json\`; alias \`current/conversation/**\`, \`current/summary/state.json\`) via generic write/edit/merge/move/delete tools.
- Soft gate (advisory, not blocking): before first non-read mutation, prefer reading \`current/skills/commands/runtime/SKILL.md\` and \`current/skills/commands/runtime/turn/SKILL.md\`.
- Structured error recovery flow (when a tool returns \`{ success:false, code, error }\`):
  1) Do NOT finish yet.
  2) Fix the cause by code category (scope/path/order/schema/content).
  3) Re-read the minimum anchor files, then retry one corrected tool call.
  4) If the same \`code\` repeats twice, narrow scope and report the blocker instead of forcing finish.
</runtime_floor>`;

const OUTLINE_RUNTIME_FLOOR = `<runtime_floor>
You MUST follow these outline protocol constraints:
- Use native function/tool calling. Do NOT output tool JSON as plain text.
- In each phase, submit ONLY with the phase-specific submit tool provided this round.
- Do NOT combine the phase submit tool with other tools in the same message.
- Read-only tools are optional and for reference lookup only.
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
