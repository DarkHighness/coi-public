/**
 * ============================================================================
 * Turn Atom: No Tool Call Error
 * ============================================================================
 *
 * 无工具调用错误 - 当 AI 未调用任何工具时注入。
 */

import type { Atom } from "../types";

export type NoToolCallErrorInput = {
  finishToolName: string;
};

/**
 * 无工具调用错误
 */
export const noToolCallError: Atom<NoToolCallErrorInput> = ({
  finishToolName,
}) => {
  void finishToolName;
  return `[ERROR: NO_TOOL_CALL] You provided text but failed to invoke any tools. In this agentic loop, you MUST call at least one \`vfs_*\` tool to progress. Inspect with \`vfs_ls\`/\`vfs_read\`, then write or edit files with \`vfs_write\`/\`vfs_edit\` (including \`current/conversation/index.json\` and the current turn file). Bare text is not allowed.`;
};

export default noToolCallError;
