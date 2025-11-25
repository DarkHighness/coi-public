/**
 * Unified Message Types for AI Service
 *
 * This module provides a provider-agnostic message format that can be
 * converted to/from Gemini, OpenAI, and other provider formats.
 */

// --- Role Types ---

export type MessageRole = "system" | "user" | "assistant" | "tool";

// --- Content Part Types ---

export interface TextPart {
  type: "text";
  text: string;
}

export interface ToolCallPart {
  type: "tool_call";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResponsePart {
  type: "tool_response";
  toolCallId: string;
  name: string;
  content: unknown;
}

export type MessagePart = TextPart | ToolCallPart | ToolResponsePart;

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
    type: "tool_call" as const,
    id: tc.id,
    name: tc.name,
    arguments: tc.arguments,
  })),
});

export const createToolResponseMessage = (
  responses: Array<{ toolCallId: string; name: string; content: unknown }>,
): UnifiedMessage => ({
  role: "tool",
  content: responses.map((r) => ({
    type: "tool_response" as const,
    toolCallId: r.toolCallId,
    name: r.name,
    content: r.content,
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
            .filter((p): p is ToolResponsePart => p.type === "tool_response")
            .map((p) => ({
              functionResponse: {
                name: p.name,
                response: { content: p.content },
              },
            })),
        };
      }

      // Handle assistant messages with tool calls
      if (
        msg.role === "assistant" &&
        msg.content.some((p) => p.type === "tool_call")
      ) {
        return {
          role: "model",
          parts: msg.content
            .filter((p): p is ToolCallPart => p.type === "tool_call")
            .map((p) => ({
              functionCall: {
                id: p.id,
                name: p.name,
                args: p.arguments,
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
        if (part.type === "tool_response") {
          result.push({
            role: "tool",
            tool_call_id: part.toolCallId,
            content:
              typeof part.content === "string"
                ? part.content
                : JSON.stringify(part.content),
          });
        }
      }
      continue;
    }

    // Handle assistant messages with tool calls
    if (
      msg.role === "assistant" &&
      msg.content.some((p) => p.type === "tool_call")
    ) {
      const toolCalls = msg.content
        .filter((p): p is ToolCallPart => p.type === "tool_call")
        .map((p) => ({
          id: p.id,
          type: "function",
          function: {
            name: p.name,
            arguments: JSON.stringify(p.arguments),
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
            type: "tool_call",
            id: part.functionCall.id || `call_${part.functionCall.name}`,
            name: part.functionCall.name,
            arguments: part.functionCall.args || {},
          });
        }
        if (part.functionResponse) {
          content.push({
            type: "tool_response",
            toolCallId:
              part.functionResponse.id || `call_${part.functionResponse.name}`,
            name: part.functionResponse.name,
            content: part.functionResponse.response?.content,
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
        type: "tool_response",
        toolCallId: msg.tool_call_id,
        name: "", // OpenAI doesn't include name in tool response
        content: msg.content,
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
            type: "tool_call",
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments || "{}"),
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
