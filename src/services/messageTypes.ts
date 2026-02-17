/**
 * Unified Message Types for AI Service
 *
 * This module provides a provider-agnostic message format that can be
 * converted to/from Gemini, OpenAI, and other provider formats.
 */

import type { JsonObject, ToolArguments } from "../types";

// --- Role Types ---

export type MessageRole = "system" | "user" | "assistant" | "tool";

// --- Content Part Types ---

export interface TextPart {
  type: "text";
  text: string;
}

export interface ImagePart {
  type: "image";
  mimeType: string; // e.g., "image/jpeg", "image/png"
  data: string; // base64 encoded image data (without data URL prefix)
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
    args: ToolArguments;
    thoughtSignature?: string; // Gemini's thought signature for tool calls
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

export interface ReasoningPart {
  type: "reasoning";
  reasoning: string;
}

export type MessagePart =
  | TextPart
  | ImagePart
  | AudioPart
  | ToolCallPart
  | ToolResponsePart
  | ReasoningPart;

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

export const createToolCallMessage = (
  toolCalls: Array<{
    id: string;
    name: string;
    arguments: ToolArguments;
    thoughtSignature?: string; // Required for Gemini 3 models
  }>,
  textContent?: string,
  reasoningContent?: string, // Reasoning/thinking content from providers
): UnifiedMessage => {
  const content: MessagePart[] = [];

  // Add reasoning content if present (from OpenAI o1/o3, Claude Extended Thinking, etc.)
  if (reasoningContent) {
    content.push({ type: "reasoning", reasoning: reasoningContent });
  }

  // Add text content if present (important for Claude and other models that return text with tool calls)
  if (textContent) {
    content.push({ type: "text", text: textContent });
  }

  // Add tool calls
  for (const tc of toolCalls) {
    content.push({
      type: "tool_use" as const,
      toolUse: {
        id: tc.id,
        name: tc.name,
        args: tc.arguments,
        thoughtSignature: tc.thoughtSignature, // Include for Gemini 3 models
      },
    });
  }

  return { role: "assistant", content };
};

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
  args: ToolArguments;
  thoughtSignature?: string; // Gemini's thought signature for tool calls
}

export interface AIGenerationResult {
  // If the model returned tool calls
  toolCalls?: ToolCallResult[];
  // If the model returned text/JSON
  content?: unknown;
  // Raw response for logging
  raw: unknown;
}

// --- Provider DTO Types ---

type GeminiMessageRole = "user" | "model" | "function";

interface GeminiFunctionResponseDto {
  id?: string;
  name?: string;
  response?: { content?: unknown };
}

interface GeminiFunctionCallDto {
  id?: string;
  name: string;
  args?: ToolArguments;
}

interface GeminiTextPartDto {
  text: string;
}

interface GeminiInlineDataPartDto {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

interface GeminiFunctionCallPartDto {
  functionCall: GeminiFunctionCallDto;
  thoughtSignature?: string;
}

interface GeminiFunctionResponsePartDto {
  functionResponse: GeminiFunctionResponseDto;
}

type GeminiPartDto =
  | GeminiTextPartDto
  | GeminiInlineDataPartDto
  | GeminiFunctionCallPartDto
  | GeminiFunctionResponsePartDto;

interface GeminiMessageDto {
  role: GeminiMessageRole;
  parts: GeminiPartDto[];
}

interface OpenAIVisionTextPartDto {
  type: "text";
  text: string;
}

interface OpenAIVisionImagePartDto {
  type: "image_url";
  image_url: { url: string };
}

type OpenAIVisionPartDto = OpenAIVisionTextPartDto | OpenAIVisionImagePartDto;

interface OpenAIToolCallDto {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
    thought_signature?: string;
  };
  extra_content?: {
    google?: {
      thought_signature?: string;
    };
  };
}

interface OpenAIBaseMessageDto {
  role: MessageRole;
  content?: string | null | OpenAIVisionPartDto[];
  tool_call_id?: string;
  tool_calls?: OpenAIToolCallDto[];
  name?: string;
}

type OpenAIMessageDto = OpenAIBaseMessageDto;

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const parseToolArguments = (
  rawValue: unknown,
  source: string,
): ToolArguments => {
  if (rawValue === undefined) {
    return {};
  }
  if (isRecord(rawValue)) {
    return rawValue;
  }
  throw new Error(`[messageTypes] Invalid tool args from ${source}`);
};

const parseToolArgumentsText = (
  rawText: string,
  source: string,
): ToolArguments => {
  try {
    return parseToolArguments(JSON.parse(rawText), source);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown parse error";
    throw new Error(
      `[messageTypes] Failed to parse tool args from ${source}: ${message}`,
    );
  }
};

// --- Conversion Functions ---

/**
 * Convert UnifiedMessage array to Gemini format
 */
export const toGeminiFormat = (
  messages: UnifiedMessage[],
): GeminiMessageDto[] => {
  return messages
    .filter((m) => m.role !== "system") // System is handled separately in Gemini
    .map((msg): GeminiMessageDto => {
      // Handle tool response messages - each response becomes a separate message part
      if (msg.role === "tool") {
        return {
          role: "function" as const,
          parts: msg.content
            .filter((p): p is ToolResponsePart => p.type === "tool_result")
            .map((p) => ({
              functionResponse: {
                id: p.toolResult.id,
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
        const parts: GeminiPartDto[] = [];

        // Include text content if present (some models return text with tool calls)
        const textParts = msg.content
          .filter((p): p is TextPart => p.type === "text")
          .map((p) => ({ text: p.text }));
        parts.push(...textParts);

        // Include tool calls
        const toolParts = msg.content
          .filter((p): p is ToolCallPart => p.type === "tool_use")
          .map((p) => {
            const part: GeminiFunctionCallPartDto = {
              functionCall: {
                id: p.toolUse.id,
                name: p.toolUse.name,
                args: p.toolUse.args,
              },
            };
            // Include thoughtSignature if present
            if (p.toolUse.thoughtSignature) {
              part.thoughtSignature = p.toolUse.thoughtSignature;
            }
            return part;
          });
        parts.push(...toolParts);

        return {
          role: "model",
          parts,
        };
      }

      // Handle text messages
      const textParts = msg.content
        .filter((p): p is TextPart => p.type === "text")
        .map((p) => ({ text: p.text }));

      // Handle image parts for vision API - now using standard mimeType/data format
      const imageParts = msg.content
        .filter((p): p is ImagePart => p.type === "image")
        .map((p) => ({
          inlineData: {
            mimeType: p.mimeType,
            data: p.data,
          },
        }))
        .filter((p) => p.inlineData.data); // Filter out empty data

      const allParts = [...imageParts, ...textParts];

      // Validate that we have at least one part
      if (allParts.length === 0) {
        console.warn(
          "[toGeminiFormat] Message with no parts, adding empty text to prevent API error:",
          msg,
        );
        allParts.push({ text: "" });
      }

      const mappedRole: GeminiMessageRole =
        msg.role === "assistant" ? "model" : "user";

      return {
        role: mappedRole,
        parts: allParts as GeminiPartDto[],
      };
    })
    .filter((msg) => msg.parts && msg.parts.length > 0); // Filter out messages with empty parts
};

/**
 * Convert UnifiedMessage array to OpenAI format
 */
export const toOpenAIFormat = (
  messages: UnifiedMessage[],
): OpenAIMessageDto[] => {
  const result: OpenAIMessageDto[] = [];

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
        .map((p) => {
          const toolCall: OpenAIToolCallDto = {
            id: p.toolUse.id,
            type: "function",
            function: {
              name: p.toolUse.name,
              arguments: JSON.stringify(p.toolUse.args),
            },
          };
          // Include thought_signature if present (for Gemini 3 compatibility via OpenAI proxy)
          // Gemini 3 uses extra_content.google.thought_signature format
          if (p.toolUse.thoughtSignature) {
            toolCall.extra_content = {
              google: {
                thought_signature: p.toolUse.thoughtSignature,
              },
            };
          }
          return toolCall;
        });

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

    // Handle regular messages (text and/or images)
    const textParts = msg.content.filter(
      (p): p is TextPart => p.type === "text",
    );
    const imageParts = msg.content.filter(
      (p): p is ImagePart => p.type === "image",
    );

    // If we have images, use vision content format (array)
    if (imageParts.length > 0) {
      const contentArray: OpenAIVisionPartDto[] = [];

      // Add text content first
      for (const tp of textParts) {
        contentArray.push({ type: "text", text: tp.text });
      }

      // Add image content - construct data URL from mimeType/data
      for (const ip of imageParts) {
        const dataUrl = `data:${ip.mimeType};base64,${ip.data}`;
        contentArray.push({
          type: "image_url",
          image_url: { url: dataUrl },
        });
      }

      result.push({
        role: msg.role,
        content: contentArray,
      });
    } else {
      // Text only - use simple string content
      const textContent = textParts.map((p) => p.text).join("\n");
      result.push({
        role: msg.role,
        content: textContent,
      });
    }
  }

  return result;
};

/**
 * Convert Gemini format to UnifiedMessage array
 */
export const fromGeminiFormat = (
  geminiMessages: unknown[],
): UnifiedMessage[] => {
  return geminiMessages.map((rawMsg) => {
    const msg = isRecord(rawMsg) ? rawMsg : {};
    const rawRole = readString(msg.role);
    const role =
      rawRole === "model"
        ? "assistant"
        : rawRole === "function"
          ? "tool"
          : ((rawRole || "user") as MessageRole);

    const content: MessagePart[] = [];
    const parts = Array.isArray(msg.parts) ? msg.parts : [];

    for (const rawPart of parts) {
      if (!isRecord(rawPart)) continue;

      const text = readString(rawPart.text);
      if (text) {
        content.push({ type: "text", text });
      }

      const functionCall = isRecord(rawPart.functionCall)
        ? rawPart.functionCall
        : null;
      if (functionCall) {
        const functionName = readString(functionCall.name) || "";
        content.push({
          type: "tool_use",
          toolUse: {
            id: readString(functionCall.id) || `call_${functionName}`,
            name: functionName,
            args: parseToolArguments(
              functionCall.args,
              `Gemini functionCall(${functionName})`,
            ),
            thoughtSignature: readString(rawPart.thoughtSignature),
          },
        });
      }

      const functionResponse = isRecord(rawPart.functionResponse)
        ? rawPart.functionResponse
        : null;
      if (functionResponse) {
        const functionName = readString(functionResponse.name) || "unknown";
        const response = isRecord(functionResponse.response)
          ? functionResponse.response
          : null;
        content.push({
          type: "tool_result",
          toolResult: {
            id: readString(functionResponse.id) || `call_${functionName}`,
            name: functionName,
            content: response?.content,
          },
        });
      }
    }

    return { role, content };
  });
};

/**
 * Convert OpenAI format to UnifiedMessage array
 */
export const fromOpenAIFormat = (
  openaiMessages: unknown[],
): UnifiedMessage[] => {
  const parseMaybeJson = (value: unknown): unknown => {
    if (typeof value !== "string") return value;

    const trimmed = value.trim();
    if (!trimmed) return value;

    // Only parse structured JSON payloads that were previously stringified
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      return value;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  };

  return openaiMessages.map((rawMsg) => {
    const msg = isRecord(rawMsg) ? rawMsg : {};
    const roleValue = readString(msg.role) || "user";
    const content: MessagePart[] = [];

    // Handle tool messages
    if (roleValue === "tool") {
      content.push({
        type: "tool_result",
        toolResult: {
          id: readString(msg.tool_call_id) || "",
          name: readString(msg.name) || "unknown", // OpenAI tool messages don't always have name
          content: parseMaybeJson(msg.content),
        },
      });
      return { role: "tool" as MessageRole, content };
    }

    // Handle assistant messages with tool calls
    if (roleValue === "assistant") {
      const assistantText = readString(msg.content);
      if (assistantText) {
        content.push({ type: "text", text: assistantText });
      }
      const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
      for (const rawToolCall of toolCalls) {
        if (!isRecord(rawToolCall)) continue;
        const functionData = isRecord(rawToolCall.function)
          ? rawToolCall.function
          : null;
        if (!functionData) continue;

        const functionName = readString(functionData.name) || "";
        const argsText = readString(functionData.arguments);
        if (!argsText) {
          throw new Error(
            `[messageTypes] Missing tool arguments for OpenAI function call: ${functionName}`,
          );
        }
        const extraContent = isRecord(rawToolCall.extra_content)
          ? rawToolCall.extra_content
          : null;
        const googleExtra =
          extraContent && isRecord(extraContent.google)
            ? extraContent.google
            : null;

        content.push({
          type: "tool_use",
          toolUse: {
            id: readString(rawToolCall.id) || `call_${functionName}`,
            name: functionName,
            args: parseToolArgumentsText(
              argsText,
              `OpenAI function call(${functionName})`,
            ),
            // Extract thought_signature if present (Gemini via OpenAI proxy)
            // Gemini 3 uses extra_content.google.thought_signature format
            thoughtSignature:
              readString(googleExtra?.thought_signature) ||
              readString(functionData.thought_signature),
          },
        });
      }
      return { role: "assistant" as MessageRole, content };
    }

    // Handle regular messages
    const textContent = readString(msg.content);
    if (textContent) {
      content.push({ type: "text", text: textContent });
    }

    return { role: roleValue as MessageRole, content };
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
