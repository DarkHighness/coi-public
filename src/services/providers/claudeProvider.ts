/**
 * ============================================================================
 * Claude Provider - Anthropic SDK 实现
 * ============================================================================
 *
 * 使用官方 @anthropic-ai/sdk，提供完整的类型安全支持。
 * 包括：内容生成、工具调用、流式输出
 *
 * 注意：Claude 不支持图片生成、视频生成、语音合成、嵌入向量生成
 */

import { jsonrepair } from "jsonrepair";
import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  MessageCreateParams,
  ContentBlock,
  TextBlock,
  ToolUseBlock,
  Message,
  MessageStreamEvent,
  Tool,
} from "@anthropic-ai/sdk/resources/messages";

import type { TokenUsage } from "../../types";

import {
  ModelInfo,
  ModelCapabilities,
  GenerateContentOptions,
  ImageGenerationResponse,
  SpeechGenerationResponse,
  SpeechGenerationOptions,
  EmbeddingModelInfo,
  EmbeddingResponse,
  ToolCallResult,
  UnifiedMessage,
  TextContentPart,
  ToolCallContentPart,
  ToolResponseContentPart,
  SafetyFilterError,
  JSONParseError,
  AIProviderError,
  MalformedToolCallError,
} from "./types";
import { zodToClaudeCompatibleSchema } from "../zodCompiler";
import type { ZodTypeAny } from "zod";
import { withRetry, validateSchema, cleanJsonContent } from "./utils";

// ============================================================================
// Configuration Types
// ============================================================================

/** Claude Provider 配置 */
export interface ClaudeConfig {
  apiKey: string;
  baseUrl?: string;
}

// ============================================================================
// Response Types (兼容旧 API)
// ============================================================================

/** 内容生成响应 (兼容格式) */
export interface ClaudeContentGenerationResponse {
  result: { functionCalls?: ToolCallResult[] } | Record<string, unknown>;
  usage: TokenUsage;
  raw: Message | AsyncIterable<MessageStreamEvent>;
}

// ============================================================================
// Client Factory
// ============================================================================

/**
 * 创建 Claude 客户端实例
 */
export function createClaudeClient(config: ClaudeConfig): Anthropic {
  if (!config.apiKey) {
    throw new AIProviderError("Claude API key is required", "claude");
  }

  return new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    dangerouslyAllowBrowser: true,
  });
}

// ============================================================================
// Connection Validation
// ============================================================================

/**
 * 验证 Claude API 连接
 */
export async function validateConnection(config: ClaudeConfig): Promise<void> {
  try {
    const client = createClaudeClient(config);
    // 使用 list models API 验证连接
    await client.models.list({ limit: 1 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new AIProviderError(
      `Failed to connect to Claude API: ${message}`,
      "claude",
      undefined,
      error,
    );
  }
}

// ============================================================================
// Model Listing
// ============================================================================

/**
 * 获取可用的 Claude 模型列表
 *
 * 注意：Claude API 不提供模型列表端点，返回预定义的模型列表
 */
export async function getModels(config: ClaudeConfig): Promise<ModelInfo[]> {
  try {
    const client = createClaudeClient(config);
    const response = await client.models.list({ limit: 100 });

    return response.data.map((model) => ({
      id: model.id,
      name: model.display_name,
      capabilities: {
        text: true,
        image: false, // Claude API currently doesn't support image generation
        video: false,
        audio: false,
        tools: true,
        parallelTools: true,
      },
    }));
  } catch (error) {
    console.warn("[Claude] Failed to fetch models, using defaults:", error);
    return getDefaultModels();
  }
}

/**
 * 默认模型列表
 */
function getDefaultModels(): ModelInfo[] {
  return [
    {
      id: "claude-sonnet-4-5-20250929",
      name: "Claude Sonnet 4.5",
      capabilities: {
        text: true,
        image: false,
        video: false,
        audio: false,
        tools: true,
        parallelTools: true,
      },
    },
    {
      id: "claude-haiku-4-5-20251001",
      name: "Claude Haiku 4.5",
      capabilities: {
        text: true,
        image: false,
        video: false,
        audio: false,
        tools: true,
        parallelTools: true,
      },
    },
    {
      id: "claude-opus-4-5-20251101",
      name: "Claude Opus 4.5",
      capabilities: {
        text: true,
        image: false,
        video: false,
        audio: false,
        tools: true,
        parallelTools: true,
      },
    },
    {
      id: "claude-opus-4-1-20250805",
      name: "Claude Opus 4.1",
      capabilities: {
        text: true,
        image: false,
        video: false,
        audio: false,
        tools: true,
        parallelTools: true,
      },
    },
    {
      id: "claude-sonnet-4-20250514",
      name: "Claude Sonnet 4",
      capabilities: {
        text: true,
        image: false,
        video: false,
        audio: false,
        tools: true,
        parallelTools: true,
      },
    },
    {
      id: "claude-3-7-sonnet-20250219",
      name: "Claude 3.7 Sonnet",
      capabilities: {
        text: true,
        image: false,
        video: false,
        audio: false,
        tools: true,
        parallelTools: true,
      },
    },
    {
      id: "claude-opus-4-20250514",
      name: "Claude Opus 4",
      capabilities: {
        text: true,
        image: false,
        video: false,
        audio: false,
        tools: true,
        parallelTools: true,
      },
    },
    {
      id: "claude-3-5-haiku-20241022",
      name: "Claude 3.5 Haiku",
      capabilities: {
        text: true,
        image: false,
        video: false,
        audio: false,
        tools: true,
        parallelTools: true,
      },
    },
    {
      id: "claude-3-haiku-20240307",
      name: "Claude 3 Haiku",
      capabilities: {
        text: true,
        image: false,
        video: false,
        audio: false,
        tools: true,
        parallelTools: true,
      },
    },
  ];
}

// ============================================================================
// Content Generation
// ============================================================================

/**
 * 生成内容（对话/工具调用）
 */
/**
 * 生成内容（对话/工具调用）
 */
export async function generateContent(
  config: ClaudeConfig,
  model: string,
  systemInstruction: string,
  contents: UnifiedMessage[],
  schema?: ZodTypeAny,
  options?: GenerateContentOptions,
): Promise<ClaudeContentGenerationResponse> {
  return withRetry(
    async () => {
      const client = createClaudeClient(config);

      // 转换消息格式
      const messages = convertToClaudeMessages(contents);

      // 转换工具定义 (Claude 使用与 OpenAI 相似的格式)
      let tools = options?.tools
        ? convertToolsForClaude(options.tools)
        : undefined;
      let useToolCallForSchema = false;
      let toolChoice: { type: "tool"; name: string } | undefined;

      // forceToolCallMode: wrap schema as a tool instead of relying on JSON output
      if (schema && options?.forceToolCallMode) {
        const schemaObj = zodToClaudeCompatibleSchema(schema);
        const schemaAsTool = {
          name: "structured_output",
          description: "Return the structured output according to the schema. You MUST call this tool to provide your response.",
          input_schema: {
            type: "object" as const,
            properties: (schemaObj.properties || {}) as Record<string, unknown>,
            ...(schemaObj.required && schemaObj.required.length > 0 ? { required: schemaObj.required } : {}),
          },
        };

        if (tools && tools.length > 0) {
          // Add to existing tools
          tools = [...tools, schemaAsTool];
          // Keep toolChoice undefined to allow model to choose
        } else {
          // Create new tools array and force calling this tool
          tools = [schemaAsTool];
          toolChoice = { type: "tool", name: "structured_output" };
        }

        useToolCallForSchema = true;
        console.log("[Claude] Using forceToolCallMode: schema wrapped as tool, added to tools array");
      }

      if (tools && tools.length > 0) {
        console.log(
          "[Claude] Tool definitions:",
          JSON.stringify(tools.slice(0, 2), null, 2),
        );
        // Log full request for debugging
        console.log("[Claude] Full tools count:", tools.length);
      }

      // 计算 thinking budget
      let thinking: { type: "enabled"; budget_tokens: number } | undefined;
      if (options?.thinkingLevel) {
        const budgetMap = {
          low: 2048,
          medium: 4096,
          high: 8192,
        };
        thinking = {
          type: "enabled",
          budget_tokens: budgetMap[options.thinkingLevel] || 2048,
        };
      }

      // Chain of Thought prompt for tool use (Sonnet/Haiku) - skip for forceToolCallMode
      let finalSystemInstruction = systemInstruction;

      // Add structured output instruction if forceToolCallMode is enabled
      if (useToolCallForSchema) {
        const structuredOutputInstruction = `\n\n[IMPORTANT: You MUST use the "structured_output" tool to return your response in the required format. Do not output JSON directly in your response - always use the tool call.]`;
        finalSystemInstruction = systemInstruction + structuredOutputInstruction;
      } else if (
        tools &&
        tools.length > 0 &&
        (model.includes("sonnet") || model.includes("haiku"))
      ) {
        const cotPrompt = `
Answer the user's request using relevant tools (if they are available). Before calling a tool, do some analysis. First, think about which of the provided tools is the relevant tool to answer the user's request. Second, go through each of the required parameters of the relevant tool and determine if the user has directly provided or given enough information to infer a value. When deciding if the parameter can be inferred, carefully consider all the context to see if it supports a specific value. If all of the required parameters are present or can be reasonably inferred, proceed with the tool call. BUT, if one of the values for a required parameter is missing, DO NOT invoke the function (not even with fillers for the missing params) and instead, ask the user to provide the missing parameters. DO NOT ask for more information on optional parameters if it is not provided.
`;
        finalSystemInstruction = `${systemInstruction}\n\n${cotPrompt}`;
      }

      // 构建请求参数
      const requestParams: MessageCreateParams = {
        model,
        max_tokens: thinking ? 64000 : 8192, // Thinking 模式需要更大的 max_tokens
        system: finalSystemInstruction,
        messages,
        // Thinking 模式下不能使用 temperature (必须为 1.0 或不传，SDK 默认处理)
        // 但为了兼容非 thinking 模式，我们只在非 thinking 时传递 temperature
        ...(thinking
          ? { thinking }
          : { temperature: options?.temperature ?? 1.0 }),
        top_p: options?.topP,
        tools,
        tool_choice: toolChoice,
      };

      let content = "";
      let toolCalls: ToolCallResult[] = [];
      let usage: TokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };
      let rawResponse: Message | AsyncIterable<MessageStreamEvent>;

      console.log(
        `[Claude] Starting generation with model: ${model}, stream: ${!!options?.onChunk}, tools: ${tools ? "yes" : "no"}`,
      );

      // Debug: 打印完整请求参数
      console.log(
        "[Claude] Full request params:",
        JSON.stringify(requestParams, null, 2),
      );

      if (options?.onChunk) {
        // 流式生成
        const stream = await client.messages.create({
          ...requestParams,
          stream: true,
        });

        rawResponse = stream;

        // 累积工具调用信息
        const accumulatedToolCalls: Map<
          number,
          { id: string; name: string; input: string }
        > = new Map();

        let currentToolIndex = -1;

        for await (const event of stream) {
          // 处理不同类型的事件
          if (event.type === "content_block_start") {
            const block = event.content_block;
            if (block.type === "tool_use") {
              currentToolIndex++;
              accumulatedToolCalls.set(currentToolIndex, {
                id: block.id,
                name: block.name,
                input: "",
              });
            }
          } else if (event.type === "content_block_delta") {
            const delta = event.delta;
            if (delta.type === "text_delta") {
              // 文本内容
              content += delta.text;
              options.onChunk(delta.text);
            } else if (delta.type === "input_json_delta") {
              // 工具调用参数（增量）
              const existing = accumulatedToolCalls.get(currentToolIndex);
              if (existing) {
                existing.input += delta.partial_json;
              }
            }
          } else if (event.type === "message_delta") {
            // 更新使用量
            if (event.usage) {
              usage.completionTokens = event.usage.output_tokens || 0;
            }
          } else if (event.type === "message_start") {
            // 初始使用量
            if (event.message.usage) {
              usage.promptTokens = event.message.usage.input_tokens || 0;
              usage.cacheWrite =
                (event.message.usage as any).cache_creation_input_tokens || 0;
              usage.cacheRead =
                (event.message.usage as any).cache_read_input_tokens || 0;
            }
          }
        }

        // 解析累积的工具调用
        for (const [, tc] of accumulatedToolCalls) {
          try {
            toolCalls.push({
              id: tc.id,
              name: tc.name,
              args: JSON.parse(tc.input || "{}") as Record<string, unknown>,
            });
          } catch (parseError) {
            console.error(
              `[Claude] Failed to parse tool call arguments:`,
              tc.input,
            );
            throw new MalformedToolCallError("claude", tc.name, tc.input);
          }
        }

        usage.totalTokens = usage.promptTokens + usage.completionTokens;
      } else {
        // 非流式生成
        const response = await client.messages.create({
          ...requestParams,
          stream: false,
        });

        rawResponse = response;

        // 处理响应内容
        for (const block of response.content) {
          if (block.type === "text") {
            content += (block as TextBlock).text;
          } else if (block.type === "tool_use") {
            const toolBlock = block as ToolUseBlock;
            toolCalls.push({
              id: toolBlock.id,
              name: toolBlock.name,
              args: toolBlock.input as Record<string, unknown>,
            });
          }
        }

        // 检查停止原因
        handleStopReason(response.stop_reason, response.stop_sequence);

        usage = {
          promptTokens: response.usage.input_tokens || 0,
          completionTokens: response.usage.output_tokens || 0,
          totalTokens:
            (response.usage.input_tokens || 0) +
            (response.usage.output_tokens || 0),
          cacheWrite: (response.usage as any).cache_creation_input_tokens || 0,
          cacheRead: (response.usage as any).cache_read_input_tokens || 0,
        };
      }

      console.log(`[Claude] Generation complete. Usage:`, usage);

      // If using tool call mode for schema, extract the structured result from tool call args
      if (useToolCallForSchema && toolCalls.length > 0) {
        const structuredOutputCall = toolCalls.find(tc => tc.name === "structured_output");
        if (structuredOutputCall) {
          const result = structuredOutputCall.args;
          if (schema) {
            validateSchema(result, schema, "claude");
          }
          console.log("[Claude] Extracted structured output from tool call");
          return { result, usage, raw: rawResponse };
        }
      }

      // 如果有工具调用，返回工具调用结果
      if (toolCalls.length > 0) {
        return {
          result: { functionCalls: toolCalls },
          usage,
          raw: rawResponse,
        };
      }

      // 没有内容也没有工具调用
      if (!content) {
        throw new AIProviderError("No content returned from Claude", "claude");
      }

      // 如果有 schema，解析 JSON
      if (schema) {
        try {
          const cleanedContent = cleanJsonContent(content);
          const result = JSON.parse(jsonrepair(cleanedContent));
          // Schema Validation
          validateSchema(result, schema, "claude");
          return { result, usage, raw: rawResponse };
        } catch (error) {
          console.error(`[Claude] Failed to parse JSON content:`, content);
          // If it's already a SchemaValidationError, rethrow it
          if (error instanceof AIProviderError) {
            throw error;
          }
          throw new JSONParseError("claude", content.substring(0, 500), error);
        }
      }

      // 返回纯文本
      return { result: { narrative: content }, usage, raw: rawResponse };
    },
    3,
    1000,
    "claude",
  );
}

/**
 * 处理停止原因
 */
function handleStopReason(
  stopReason: string | null,
  stopSequence?: string | null,
): void {
  if (stopReason === "max_tokens") {
    console.warn("[Claude] Generation stopped: max_tokens reached");
  } else if (stopReason === "stop_sequence") {
    console.log(`[Claude] Generation stopped by sequence: ${stopSequence}`);
  }
  // Claude 没有明确的 safety filter，但可能在 error 中体现
}

/**
 * 转换消息到 Claude 格式
 */
function convertToClaudeMessages(messages: UnifiedMessage[]): MessageParam[] {
  const result: MessageParam[] = [];

  for (const msg of messages) {
    // 跳过 system 消息（已在顶层处理）
    if (msg.role === "system") {
      continue;
    }

    // 处理工具响应消息
    if (msg.role === "tool") {
      // Claude 要求工具响应必须跟在 assistant 的 tool_use 之后
      // 我们需要将工具响应转换为 user 消息
      const toolContents: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
      }> = [];

      for (const part of msg.content) {
        // Fix: Check for "tool_result" (from messageTypes.ts) not "tool_response"
        if (part.type === "tool_result") {
          const tr = part as {
            type: "tool_result";
            toolResult: { id: string; content: unknown };
          };
          toolContents.push({
            type: "tool_result",
            tool_use_id: tr.toolResult.id,
            content:
              typeof tr.toolResult.content === "string"
                ? tr.toolResult.content
                : JSON.stringify(tr.toolResult.content),
          });
        }
      }

      if (toolContents.length > 0) {
        result.push({
          role: "user",
          content: toolContents,
        });
      }
      continue;
    }

    // 处理助手消息（可能包含工具调用）
    if (msg.role === "assistant") {
      const toolCallParts = msg.content.filter(
        (p): p is ToolCallContentPart => p.type === "tool_use",
      );

      if (toolCallParts.length > 0) {
        const textContent = msg.content
          .filter((p): p is TextContentPart => p.type === "text")
          .map((p) => p.text)
          .join("\n");

        const content: Array<
          | { type: "text"; text: string }
          | { type: "tool_use"; id: string; name: string; input: unknown }
        > = [];

        // 添加文本内容（如果有）
        if (textContent) {
          content.push({ type: "text", text: textContent });
        }

        // 添加工具调用
        for (const tc of toolCallParts) {
          content.push({
            type: "tool_use",
            id: tc.toolUse.id,
            name: tc.toolUse.name,
            input: tc.toolUse.args,
          });
        }

        result.push({
          role: "assistant",
          content,
        });
        continue;
      }
    }

    // 处理普通文本消息
    const textContent = msg.content
      .filter((p): p is TextContentPart => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    if (textContent) {
      result.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: textContent,
      });
    }
  }

  return result;
}

/**
 * 转换工具定义到 Claude 格式
 *
 * 根据 Anthropic 官方文档：
 * - Claude 使用 input_schema 而不是 parameters
 * - Claude 支持 strict: true 用于保证 schema 一致性
 * - Claude 不支持 additionalProperties 字段
 */
function convertToolsForClaude(
  tools: Array<{ name: string; description: string; parameters: ZodTypeAny }>,
): Tool[] {
  return tools.map((tool) => {
    // 使用 Claude 兼容的 schema 处理器
    // - 使用简单类型 "string" 而不是数组 ["string", "null"]
    // - 不包含 additionalProperties
    const schema = zodToClaudeCompatibleSchema(tool.parameters);

    // 构建 input_schema，只有在有必填字段时才包含 required
    const inputSchema: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    } = {
      type: "object" as const,
      properties: (schema.properties || {}) as Record<string, unknown>,
    };

    // 只有在有必填字段时才添加 required
    if (schema.required && schema.required.length > 0) {
      inputSchema.required = schema.required;
    }

    return {
      name: tool.name,
      description: tool.description,
      input_schema: inputSchema,
    };
  });
}

/**
 * 递归移除 schema 中的 additionalProperties 字段
 */
function removeAdditionalProperties(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "additionalProperties") {
      continue; // 跳过 additionalProperties
    }
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = removeAdditionalProperties(
        value as Record<string, unknown>,
      );
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "object" && item !== null
          ? removeAdditionalProperties(item as Record<string, unknown>)
          : item,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ============================================================================
// Image Generation (Not Supported)
// ============================================================================

/**
 * 生成图片 (Claude 不支持)
 */
export async function generateImage(
  _config: ClaudeConfig,
  _model: string,
  _prompt: string,
  _resolution?: string,
): Promise<ImageGenerationResponse> {
  throw new AIProviderError(
    "Image generation is not supported by Claude provider",
    "claude",
    "UNSUPPORTED",
  );
}

// ============================================================================
// Video Generation (Not Supported)
// ============================================================================

/**
 * 生成视频 (Claude 不支持)
 */
export async function generateVideo(
  _config: ClaudeConfig,
  _model: string,
  _imageBase64: string,
  _prompt: string,
): Promise<never> {
  throw new AIProviderError(
    "Video generation is not supported by Claude provider",
    "claude",
    "UNSUPPORTED",
  );
}

// ============================================================================
// Speech Generation (Not Supported)
// ============================================================================

/**
 * 生成语音 (Claude 不支持)
 */
export async function generateSpeech(
  _config: ClaudeConfig,
  _model: string,
  _text: string,
  _voiceName?: string,
  _options?: SpeechGenerationOptions,
): Promise<SpeechGenerationResponse> {
  throw new AIProviderError(
    "Speech generation is not supported by Claude provider",
    "claude",
    "UNSUPPORTED",
  );
}

// ============================================================================
// Embedding Generation (Not Supported)
// ============================================================================

/**
 * 获取嵌入模型列表 (Claude 不支持)
 */
export async function getEmbeddingModels(
  _config: ClaudeConfig,
): Promise<EmbeddingModelInfo[]> {
  return [];
}

/**
 * 生成嵌入向量 (Claude 不支持)
 */
export async function generateEmbedding(
  _config: ClaudeConfig,
  _modelId: string,
  _texts: string[],
  _dimensions?: number,
  _taskType?: string,
): Promise<EmbeddingResponse> {
  throw new AIProviderError(
    "Embedding generation is not supported by Claude provider",
    "claude",
    "UNSUPPORTED",
  );
}

// ============================================================================
// Re-exports for Backward Compatibility
// ============================================================================

export type {
  ModelInfo,
  GenerateContentOptions,
  ImageGenerationResponse,
  SpeechGenerationResponse,
  SpeechGenerationOptions,
  EmbeddingModelInfo,
  EmbeddingResponse,
};

// Alias for backward compatibility
export type { EmbeddingResponse as EmbeddingResult };
