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
}) =>
  `[ERROR: NO_TOOL_CALL] You provided text but failed to invoke any tools. In this agentic loop, you MUST call at least one tool to progress. Use \`search_tool\` to load more state or \`${finishToolName}\` to finalize the narrative. Bare text is not allowed.`;

export default noToolCallError;
