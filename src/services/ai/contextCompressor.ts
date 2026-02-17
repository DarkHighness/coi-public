/**
 * ============================================================================
 * Context Overflow Handler
 * ============================================================================
 *
 * 核心原则：
 * - 不截断工具输出或任何内容
 * - 当上下文溢出时，抛出错误让调用方触发 History 重建
 * - History 重建会创建新的 Summary 并重新开始
 */

/**
 * Checks if an error is a context length/token limit error.
 */
const getErrorMessage = (error: unknown): string =>
  error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message ?? "")
    : "";

export function isContextLengthError(error: unknown): boolean {
  if (!error) return false;
  const msg = getErrorMessage(error).toLowerCase();

  // Common patterns for different providers
  return (
    // OpenAI
    msg.includes("context_length_exceeded") ||
    msg.includes("maximum context length") ||
    // Gemini
    msg.includes("token limit") ||
    msg.includes("limit_exceeded") ||
    // General
    msg.includes("too many tokens") ||
    msg.includes("input too long")
  );
}

/**
 * Checks if an error is an INVALID_ARGUMENT error that requires History rebuild.
 * This typically happens when the conversation history becomes corrupted or
 * incompatible (e.g., after schema changes, tool definition changes, etc.)
 */
export function isInvalidArgumentError(error: unknown): boolean {
  if (!error) return false;
  const msg = getErrorMessage(error).toLowerCase();

  // Common patterns for INVALID_ARGUMENT errors
  return (
    // Gemini
    msg.includes("invalid_argument") ||
    msg.includes("invalid argument") ||
    // OpenAI
    msg.includes("invalid_request_error") ||
    msg.includes("invalid request") ||
    // General history/message corruption errors
    msg.includes("does not match schema") ||
    msg.includes("unexpected role") ||
    msg.includes("invalid message") ||
    msg.includes("invalid content")
  );
}

/**
 * Checks if an error requires History rebuild (context overflow OR invalid argument)
 */
export function requiresHistoryRebuild(error: unknown): boolean {
  return isContextLengthError(error) || isInvalidArgumentError(error);
}

/**
 * Context Overflow Error - thrown when context exceeds provider limits.
 * Caller should handle by triggering History rebuild (session manager clears history on overflow).
 */
export class ContextOverflowError extends Error {
  constructor(originalError: Error) {
    super(`CONTEXT_LENGTH_EXCEEDED: ${originalError.message}`);
    this.name = "ContextOverflowError";
  }
}

/**
 * History Corrupted Error - thrown when conversation history is invalid.
 * Caller should handle by clearing and rebuilding the History.
 */
export class HistoryCorruptedError extends Error {
  constructor(originalError: Error) {
    super(`HISTORY_CORRUPTED: ${originalError.message}`);
    this.name = "HistoryCorruptedError";
  }
}
