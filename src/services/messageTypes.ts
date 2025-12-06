/**
 * Unified Message Types for AI Service
 *
 * This module provides a provider-agnostic message format that can be
 * converted to/from Gemini, OpenAI, and other provider formats.
 */

// --- Role Types ---

export type MessageRole = "system" | "user" | "assistant" | "tool";

// --- Content Part Types ---

// --- Content Part Types ---

export interface TextPart {
  type: "text";
  text: string;
}

export interface ImagePart {
  type: "image";
  image: { url: string };
}

export interface AudioPart {
  type: "audio";
  audio: { url: string };
}

export interface ToolCallPart {
  type: "tool_use";
  toolUse: {
    id: string;
    name: string;
    args: Record<string, unknown>;
  };
}

export interface ToolResponsePart {
  type: "tool_result";
  toolResult: {
    id: string;
    name: string;
    content: unknown;
    isError?: boolean;
  };
}

export type MessagePart =
  | TextPart
  | ImagePart
  | AudioPart
  | ToolCallPart
  | ToolResponsePart;

// --- Message Types ---

export interface UnifiedMessage {
  role: MessageRole;
  content: MessagePart[];
}

// --- Helper Functions ---

export const createTextMessage = (
  role: MessageRole,
  text: string,
): UnifiedMessage => ({
  role,
  content: [{ type: "text", text }],
});

export const createUserMessage = (text: string): UnifiedMessage =>
  createTextMessage("user", text);

export const createAssistantMessage = (text: string): UnifiedMessage =>
  createTextMessage("assistant", text);

export const createSystemMessage = (text: string): UnifiedMessage =>
  createTextMessage("system", text);

export const createToolCallMessage = (
  toolCalls: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>,
): UnifiedMessage => ({
  role: "assistant",
  content: toolCalls.map((tc) => ({
    type: "tool_use" as const,
    toolUse: {
      id: tc.id,
      name: tc.name,
      args: tc.arguments,
    },
  })),
});

export const createToolResponseMessage = (
  responses: Array<{ toolCallId: string; name: string; content: unknown }>,
): UnifiedMessage => ({
  role: "tool",
  content: responses.map((r) => ({
    type: "tool_result" as const,
    toolResult: {
      id: r.toolCallId,
      name: r.name,
      content: r.content,
    },
  })),
});

// --- Tool Call Result (from AI response) ---

export interface ToolCallResult {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface AIGenerationResult {
  // If the model returned tool calls
  toolCalls?: ToolCallResult[];
  // If the model returned text/JSON
  content?: unknown;
  // Raw response for logging
  raw: unknown;
}

// --- Conversion Functions ---

/**
 * Convert UnifiedMessage array to Gemini format
 */
export const toGeminiFormat = (messages: UnifiedMessage[]): any[] => {
  return messages
    .filter((m) => m.role !== "system") // System is handled separately in Gemini
    .map((msg) => {
      // Handle tool response messages - each response becomes a separate message part
      if (msg.role === "tool") {
        return {
          role: "function",
          parts: msg.content
            .filter((p): p is ToolResponsePart => p.type === "tool_result")
            .map((p) => ({
              functionResponse: {
                name: p.toolResult.name,
                response: { content: p.toolResult.content },
              },
            })),
        };
      }

      // Handle assistant messages with tool calls
      if (
        msg.role === "assistant" &&
        msg.content.some((p) => p.type === "tool_use")
      ) {
        return {
          role: "model",
          parts: msg.content
            .filter((p): p is ToolCallPart => p.type === "tool_use")
            .map((p) => ({
              functionCall: {
                id: p.toolUse.id,
                name: p.toolUse.name,
                args: p.toolUse.args,
              },
            })),
        };
      }

      // Handle text messages
      const textParts = msg.content
        .filter((p): p is TextPart => p.type === "text")
        .map((p) => ({ text: p.text }));

      return {
        role: msg.role === "assistant" ? "model" : msg.role,
        parts: textParts,
      };
    });
};

/**
 * Convert UnifiedMessage array to OpenAI format
 */
export const toOpenAIFormat = (messages: UnifiedMessage[]): any[] => {
  const result: any[] = [];

  for (const msg of messages) {
    // Handle tool response messages - each response is a separate message in OpenAI
    if (msg.role === "tool") {
      for (const part of msg.content) {
        if (part.type === "tool_result") {
          result.push({
            role: "tool",
            tool_call_id: part.toolResult.id,
            content:
              typeof part.toolResult.content === "string"
                ? part.toolResult.content
                : JSON.stringify(part.toolResult.content),
          });
        }
      }
      continue;
    }

    // Handle assistant messages with tool calls
    if (
      msg.role === "assistant" &&
      msg.content.some((p) => p.type === "tool_use")
    ) {
      const toolCalls = msg.content
        .filter((p): p is ToolCallPart => p.type === "tool_use")
        .map((p) => ({
          id: p.toolUse.id,
          type: "function",
          function: {
            name: p.toolUse.name,
            arguments: JSON.stringify(p.toolUse.args),
          },
        }));

      // Check if there's also text content
      const textContent = msg.content
        .filter((p): p is TextPart => p.type === "text")
        .map((p) => p.text)
        .join("\n");

      result.push({
        role: "assistant",
        content: textContent || null,
        tool_calls: toolCalls,
      });
      continue;
    }

    // Handle regular text messages
    const textContent = msg.content
      .filter((p): p is TextPart => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    result.push({
      role: msg.role,
      content: textContent,
    });
  }

  return result;
};

/**
 * Convert Gemini format to UnifiedMessage array
 */
export const fromGeminiFormat = (geminiMessages: any[]): UnifiedMessage[] => {
  return geminiMessages.map((msg) => {
    const role =
      msg.role === "model"
        ? "assistant"
        : msg.role === "function"
          ? "tool"
          : (msg.role as MessageRole);

    const content: MessagePart[] = [];

    if (msg.parts) {
      for (const part of msg.parts) {
        if (part.text) {
          content.push({ type: "text", text: part.text });
        }
        if (part.functionCall) {
          content.push({
            type: "tool_use",
            toolUse: {
              id: part.functionCall.id || `call_${part.functionCall.name}`,
              name: part.functionCall.name,
              args: part.functionCall.args || {},
            },
          });
        }
        if (part.functionResponse) {
          content.push({
            type: "tool_result",
            toolResult: {
              id:
                part.functionResponse.id ||
                `call_${part.functionResponse.name}`,
              name: part.functionResponse.name || "unknown",
              content: part.functionResponse.response?.content,
            },
          });
        }
      }
    }

    return { role, content };
  });
};

/**
 * Convert OpenAI format to UnifiedMessage array
 */
export const fromOpenAIFormat = (openaiMessages: any[]): UnifiedMessage[] => {
  return openaiMessages.map((msg) => {
    const content: MessagePart[] = [];

    // Handle tool messages
    if (msg.role === "tool") {
      content.push({
        type: "tool_result",
        toolResult: {
          id: msg.tool_call_id,
          name: msg.name || "unknown", // OpenAI tool messages don't always have name
          content: msg.content,
        },
      });
      return { role: "tool" as MessageRole, content };
    }

    // Handle assistant messages with tool calls
    if (msg.role === "assistant") {
      if (msg.content) {
        content.push({ type: "text", text: msg.content });
      }
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          content.push({
            type: "tool_use",
            toolUse: {
              id: tc.id,
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments || "{}"),
            },
          });
        }
      }
      return { role: "assistant" as MessageRole, content };
    }

    // Handle regular messages
    if (msg.content) {
      content.push({ type: "text", text: msg.content });
    }

    return { role: msg.role as MessageRole, content };
  });
};

/**
 * Extract system instruction from UnifiedMessage array
 */
export const extractSystemInstruction = (
  messages: UnifiedMessage[],
): string => {
  const systemMessages = messages.filter((m) => m.role === "system");
  return systemMessages
    .flatMap((m) => m.content)
    .filter((p): p is TextPart => p.type === "text")
    .map((p) => p.text)
    .join("\n\n");
};

/**
 * Get messages without system messages
 */
export const getContentMessages = (
  messages: UnifiedMessage[],
): UnifiedMessage[] => {
  return messages.filter((m) => m.role !== "system");
};
