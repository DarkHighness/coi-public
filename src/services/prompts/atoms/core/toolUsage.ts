/**
 * Core Atom: Tool Usage (Dynamic Tool Loading & Instructions)
 * Content from output_format.ts
 */
import type { Atom } from "../types";

export interface ToolUsageInput {
  finishToolName?: string;
}

export const toolUsage: Atom<ToolUsageInput> = (input) => {
  void input;

  return `
<tool_usage>
  **FILE-ONLY TOOLING (VFS)**:
  - Use \`vfs_ls\`, \`vfs_read\`, \`vfs_search\`, \`vfs_grep\` to inspect.
  - Use \`vfs_write\` to create/replace JSON files.
  - Use \`vfs_edit\` with JSON Patch (RFC 6902) to update existing JSON.
  - Use \`vfs_move\` to rename paths, \`vfs_delete\` to remove files.

  **STATE = FILES**:
  - World state lives under \`current/world/\`.
  - Conversation state lives under \`current/conversation/\`.

  **TURN COMPLETION**:
  - Your LAST tool call must write:
    • \`current/conversation/turns/fork-<id>/turn-<n>.json\`
    • \`current/conversation/index.json\`
  - Prefer batching related writes in a single \`vfs_write\` call.
</tool_usage>
`;
};
