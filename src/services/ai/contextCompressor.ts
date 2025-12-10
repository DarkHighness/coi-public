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
export function isContextLengthError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();

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
 * Context Overflow Error - thrown when context exceeds provider limits.
 * Caller should handle by triggering History rebuild (create Summary, clear activeHistory).
 */
export class ContextOverflowError extends Error {
  constructor(originalError: Error) {
    super(`CONTEXT_LENGTH_EXCEEDED: ${originalError.message}`);
    this.name = "ContextOverflowError";
  }
}
