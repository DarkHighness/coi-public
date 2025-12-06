import type { UnifiedMessage } from "../../types.ts";

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

export const CompressionLevel = {
  NONE: 0,
  MODERATE: 1,
  HEAVY: 2,
  EXTREME: 3,
} as const;

export type CompressionLevel = typeof CompressionLevel[keyof typeof CompressionLevel];

/**
 * Compresses context by truncating large tool outputs.
 * This is "Level 1" compression - low impact, high return for data-heavy tools.
 */
export function truncateToolOutputs(
  messages: UnifiedMessage[]
): UnifiedMessage[] {
  console.log(`[ContextCompressor] Truncating tool outputs...`);
  return messages.map((msg) => {
    // Handle "tool" role messages (OpenAI style)
    if (msg.role === "tool") {
      return {
        ...msg,
        content: msg.content.map((part) => {
          if (part.type === "tool_result" && typeof part.toolResult.content === "string") {
            const content = part.toolResult.content;
            if (content.length > 500) {
              return {
                ...part,
                toolResult: {
                  ...part.toolResult,
                  content: content.substring(0, 500) + "... (truncated output)",
                },
              };
            }
          }
          return part;
        }),
      };
    }
    return msg;
  });
}
