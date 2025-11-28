/**
 * ============================================================================
 * OpenRouter Provider - Hybrid Implementation
 * ============================================================================
 *
 * Uses @openrouter/sdk for:
 * - Model listing (getModels)
 * - Embedding model listing (getEmbeddingModels)
 *
 * Uses native Fetch API for:
 * - Content generation (streaming + structured outputs)
 * - Image generation
 * - Speech generation
 * - Embedding generation
 */

import openRouterModels from "../../src/resources/openrouter.json";
import type { EmbeddingTaskType, TokenUsage } from "../../types";
import { parseModelCapabilities } from "../modelUtils";
import { generateSpeech as generateOpenAISpeech } from "./openaiProvider";

import {
  OpenRouterConfig,
  OpenAIConfig,
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
  getAspectRatio,
} from "./types";

// Re-export OpenRouterConfig for consumers
export type { OpenRouterConfig } from "./types";
import {
  zodToOpenAIResponseFormat,
  zodToOpenAISchema,
  zodToGemini,
  createGeminiTool,
  isGeminiModel,
} from "../zodCompiler";
import type { ZodTypeAny } from "zod";

// ============================================================================
// Response Types (Compatible with OpenAI API)
// ============================================================================

interface OpenRouterChatCompletion {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterChatChunk {
  id: string;
  choices: Array<{
    delta: {
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Content Generation Response (Compatible Format) */
export interface OpenRouterContentGenerationResponse {
  result:
    | { functionCalls?: ToolCallResult[] }
    | Record<string, unknown>
    | string;
  usage: TokenUsage;
  raw: unknown;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createHeaders(config: OpenRouterConfig): HeadersInit {
  return {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
    "X-Title": "CoI Game", // Optional: Add your app name
  };
}

// ============================================================================
// Connection Validation
// ============================================================================

/**
 * Validate OpenRouter API Connection
 */
export async function validateConnection(
  config: OpenRouterConfig,
): Promise<void> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: createHeaders(config),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new AIProviderError(
      `Failed to connect to OpenRouter API: ${message}`,
      "openrouter",
      undefined,
      error,
    );
  }
}

// ============================================================================
// Model Listing (Using SDK)
// ============================================================================

/**
 * Get available OpenRouter models using local JSON
 */
export async function getModels(
  _config: OpenRouterConfig,
): Promise<ModelInfo[]> {
  try {
    return openRouterModels.data.map((m) => {
      const capabilities = inferModelCapabilities({
        id: m.slug,
        name: m.name || m.slug,
        ...m,
      });

      return {
        id: m.slug,
        name: m.name || m.slug,
        capabilities,
      };
    });
  } catch (error) {
    console.warn("Failed to list OpenRouter models via local JSON:", error);
    return [];
  }
}

/**
 * Infer model capabilities
 */
function inferModelCapabilities(modelData: {
  id: string;
  name?: string;
  [key: string]: unknown;
}): ModelCapabilities {
  const parsedCaps = parseModelCapabilities(modelData);

  const capabilities: ModelCapabilities = {
    text: parsedCaps.text ?? true,
    image: parsedCaps.image ?? false,
    video: parsedCaps.video ?? false,
    audio: parsedCaps.audio ?? false,
    tools: parsedCaps.tools ?? false,
    parallelTools: parsedCaps.parallelTools ?? false,
  };

  const id = modelData.id.toLowerCase();

  // Heuristic inference based on ID
  if (
    !capabilities.image &&
    (id.includes("vision") ||
      id.includes("claude-3") ||
      id.includes("gpt-4") ||
      id.includes("gemini") ||
      id.includes("llava") ||
      id.includes("vl"))
  ) {
    capabilities.image = true;
  }

  if (
    !capabilities.tools &&
    (id.includes("gpt-4") ||
      id.includes("gpt-3.5-turbo") ||
      id.includes("claude-3") ||
      id.includes("mistral-large") ||
      id.includes("gemini-1.5") ||
      id.includes("command-r"))
  ) {
    capabilities.tools = true;
  }

  return capabilities;
}

// ============================================================================
// Content Generation
// ============================================================================

/**
 * Generate content (chat/tool calls)
 */
export async function generateContent(
  config: OpenRouterConfig,
  model: string,
  systemInstruction: string,
  contents: UnifiedMessage[],
  schema?: ZodTypeAny,
  options?: GenerateContentOptions,
): Promise<OpenRouterContentGenerationResponse> {
  // 检测是否为 Gemini 模型
  const isGemini = isGeminiModel(model);

  // Convert messages
  const messages = convertToOpenAIMessages(systemInstruction, contents);

  // Convert tools - 如果是 Gemini 模型，使用 Gemini 格式
  const tools = options?.tools
    ? isGemini
      ? options.tools.map((t) =>
          createGeminiTool(t.name, t.description, t.parameters),
        )
      : convertToOpenAITools(options.tools)
    : undefined;

  // Build request body
  const requestBody: Record<string, unknown> = {
    model,
    messages,
    temperature: options?.temperature,
    top_p: options?.topP,
    top_k: options?.topK,
    min_p: options?.minP,
    stream: !!options?.onChunk,
    tools,
    tool_choice: tools ? "auto" : undefined,
  };

  // Add schema - 如果是 Gemini 模型且有 schema，使用 Gemini schema 格式
  if (schema) {
    requestBody.response_format = isGemini
      ? { type: "json_schema", schema: zodToGemini(schema) }
      : zodToOpenAIResponseFormat(schema);
  }

  console.log(
    `[OpenRouter] Starting generation with model: ${model}, stream: ${!!options?.onChunk}, tools: ${tools ? "yes" : "no"}, isGemini: ${isGemini}`,
  );

  if (isGemini && schema) {
    console.log(
      "[OpenRouter] Detected Gemini model, using Gemini schema format:",
      JSON.stringify(requestBody.response_format, null, 2),
    );
  }

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: createHeaders(config),
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AIProviderError(
        errorData.error?.message || `OpenRouter API Error: ${response.status}`,
        "openrouter",
      );
    }

    if (options?.onChunk) {
      return handleStreamingResponse(response, options.onChunk, schema);
    } else {
      return handleNonStreamingResponse(response, schema);
    }
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new AIProviderError(
      `OpenRouter generation failed: ${message}`,
      "openrouter",
      undefined,
      error,
    );
  }
}

/**
 * Handle non-streaming response
 */
async function handleNonStreamingResponse(
  response: Response,
  schema?: ZodTypeAny,
): Promise<OpenRouterContentGenerationResponse> {
  const data = (await response.json()) as OpenRouterChatCompletion;
  const choice = data.choices[0];
  const message = choice?.message;
  const content = message?.content || "";

  let toolCalls: ToolCallResult[] = [];
  if (message?.tool_calls) {
    toolCalls = message.tool_calls.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));
  }

  if (choice?.finish_reason === "content_filter") {
    throw new SafetyFilterError("openrouter");
  }

  const usage: TokenUsage = {
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    totalTokens: data.usage?.total_tokens || 0,
  };

  console.log(`[OpenRouter] Generation complete. Usage:`, usage);

  if (toolCalls.length > 0) {
    return {
      result: { functionCalls: toolCalls },
      usage,
      raw: data,
    };
  }

  if (schema && content) {
    try {
      const cleanedContent = content.replace(/```json\n?|```/g, "").trim();
      return { result: JSON.parse(cleanedContent), usage, raw: data };
    } catch (error) {
      console.error(`[OpenRouter] Failed to parse JSON content:`, content);
      throw new JSONParseError("openrouter", content.substring(0, 500), error);
    }
  }

  return { result: content, usage, raw: data };
}

/**
 * Handle streaming response
 */
async function handleStreamingResponse(
  response: Response,
  onChunk: (text: string) => void,
  schema?: ZodTypeAny,
): Promise<OpenRouterContentGenerationResponse> {
  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let content = "";
  let usage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
  const accumulatedToolCalls: Map<
    number,
    { id: string; name: string; arguments: string }
  > = new Map();

  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith("data: ")) continue;

        const dataStr = trimmedLine.slice(6);
        if (dataStr === "[DONE]") continue;

        try {
          const chunk = JSON.parse(dataStr) as OpenRouterChatChunk;

          const choice = chunk.choices[0];
          const delta = choice?.delta;

          if (delta?.content) {
            content += delta.content;
            onChunk(delta.content);
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const index = tc.index;
              const existing = accumulatedToolCalls.get(index);

              if (existing) {
                if (tc.function?.arguments) {
                  existing.arguments += tc.function.arguments;
                }
              } else {
                accumulatedToolCalls.set(index, {
                  id: tc.id || `tool_${index}`,
                  name: tc.function?.name || "",
                  arguments: tc.function?.arguments || "",
                });
              }
            }
          }

          if (chunk.usage) {
            usage = {
              promptTokens: chunk.usage.prompt_tokens || 0,
              completionTokens: chunk.usage.completion_tokens || 0,
              totalTokens: chunk.usage.total_tokens || 0,
            };
          }
        } catch (e) {
          console.warn("Failed to parse SSE chunk:", e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const toolCalls: ToolCallResult[] = [];
  for (const [, tc] of accumulatedToolCalls) {
    try {
      toolCalls.push({
        id: tc.id,
        name: tc.name,
        args: JSON.parse(tc.arguments || "{}") as Record<string, unknown>,
      });
    } catch (parseError) {
      console.error(
        `[OpenRouter] Failed to parse tool call arguments:`,
        tc.arguments,
      );
      throw new MalformedToolCallError("openrouter", tc.name, tc.arguments);
    }
  }

  console.log(`[OpenRouter] Stream complete. Usage:`, usage);

  if (toolCalls.length > 0) {
    return {
      result: { functionCalls: toolCalls },
      usage,
      raw: null, // Raw stream not retained
    };
  }

  // Parse JSON if schema is provided
  if (schema && content) {
    try {
      const cleanedContent = content.replace(/```json\n?|```/g, "").trim();
      return { result: JSON.parse(cleanedContent), usage, raw: null };
    } catch (error) {
      console.error(`[OpenRouter] Failed to parse JSON content:`, content);
      throw new JSONParseError("openrouter", content.substring(0, 500), error);
    }
  }

  return { result: content, usage, raw: null };
}

/**
 * Convert messages to OpenAI format
 */
function convertToOpenAIMessages(
  systemInstruction: string,
  messages: UnifiedMessage[],
): any[] {
  const result: any[] = [{ role: "system", content: systemInstruction }];

  for (const msg of messages) {
    if (msg.role === "tool") {
      for (const part of msg.content) {
        if (part.type === "tool_response") {
          const tr = part as ToolResponseContentPart;
          result.push({
            role: "tool",
            tool_call_id: tr.toolCallId,
            content:
              typeof tr.content === "string"
                ? tr.content
                : JSON.stringify(tr.content),
          });
        }
      }
      continue;
    }

    if (msg.role === "assistant") {
      const toolCallParts = msg.content.filter(
        (p): p is ToolCallContentPart => p.type === "tool_call",
      );

      if (toolCallParts.length > 0) {
        const textContent = msg.content
          .filter((p): p is TextContentPart => p.type === "text")
          .map((p) => p.text)
          .join("\n");

        result.push({
          role: "assistant",
          content: textContent || null,
          tool_calls: toolCallParts.map((p) => ({
            id: p.id,
            type: "function",
            function: {
              name: p.name,
              arguments: JSON.stringify(p.arguments),
            },
          })),
        });
        continue;
      }
    }

    const textContent = msg.content
      .filter((p): p is TextContentPart => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    result.push({
      role: msg.role,
      content: textContent,
    });
  }

  return result;
}

/**
 * Convert tools to OpenAI format
 */
import { createOpenRouterTool } from "../zodCompiler";

/**
 * Convert tools to OpenAI format (actually OpenRouter format now)
 */
function convertToOpenAITools(tools: GenerateContentOptions["tools"]): any[] {
  return (tools || []).map((tool) =>
    createOpenRouterTool(tool.name, tool.description, tool.parameters),
  );
}

// ============================================================================
// Image Generation
// ============================================================================

interface OpenRouterImageResponse {
  choices?: Array<{
    message?: {
      images?: Array<{ image_url: { url: string } }>;
      content?: string;
    };
  }>;
  data?: Array<{ url: string }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate Image
 */
export async function generateImage(
  config: OpenRouterConfig,
  model: string,
  prompt: string,
  resolution: string = "1024x1024",
): Promise<ImageGenerationResponse> {
  const aspectRatio = getAspectRatio(resolution);

  // Gemini models use chat completion API for images
  if (model.toLowerCase().includes("gemini")) {
    const chatBody = {
      model,
      messages: [{ role: "user", content: prompt }],
      image_config: { aspect_ratio: aspectRatio },
    };

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: createHeaders(config),
        body: JSON.stringify(chatBody),
      },
    );

    if (!response.ok) {
      throw new AIProviderError(
        `OpenRouter API Error: ${response.status}`,
        "openrouter",
      );
    }

    const result = (await response.json()) as OpenRouterImageResponse;

    if (result.choices?.[0]?.message?.images?.length) {
      return {
        url: result.choices[0].message.images[0].image_url.url,
        raw: result,
        usage: result.usage
          ? {
              promptTokens: result.usage.prompt_tokens,
              completionTokens: result.usage.completion_tokens,
              totalTokens: result.usage.total_tokens,
            }
          : undefined,
      };
    }

    const content = result.choices?.[0]?.message?.content;
    const urlMatch = content?.match(/https?:\/\/[^\s)]+/);
    if (urlMatch) {
      return { url: urlMatch[0], raw: result };
    }

    throw new AIProviderError("No image generated", "openrouter");
  }

  // Other models use images/generations API
  let size = resolution;
  if (model.toLowerCase().includes("dall-e-3")) {
    if (["1:1"].includes(aspectRatio)) size = "1024x1024";
    else if (["2:3", "3:4", "4:5", "9:16"].includes(aspectRatio))
      size = "1024x1792";
    else size = "1792x1024";
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/images/generations",
    {
      method: "POST",
      headers: createHeaders(config),
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size,
      }),
    },
  );

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new AIProviderError(
      err.error?.message || `OpenRouter Image API Error: ${response.status}`,
      "openrouter",
    );
  }

  const result = (await response.json()) as OpenRouterImageResponse;
  return {
    url: result.data?.[0]?.url || null,
    raw: result,
  };
}

// ============================================================================
// Video Generation (Not Supported)
// ============================================================================

export async function generateVideo(
  _config: OpenRouterConfig,
  _model: string,
  _imageBase64: string,
  _prompt: string,
): Promise<never> {
  throw new AIProviderError(
    "Video generation is not supported by OpenRouter provider",
    "openrouter",
    "UNSUPPORTED",
  );
}

// ============================================================================
// Speech Generation
// ============================================================================

export async function generateSpeech(
  config: OpenRouterConfig,
  model: string,
  text: string,
  voiceName: string = "alloy",
  options?: SpeechGenerationOptions,
): Promise<SpeechGenerationResponse> {
  const openaiConfig: OpenAIConfig = {
    apiKey: config.apiKey,
    baseUrl: "https://openrouter.ai/api/v1",
  };

  return generateOpenAISpeech(openaiConfig, model, text, voiceName, options);
}

// ============================================================================
// Embedding Generation
// ============================================================================

interface EmbeddingAPIResponse {
  data: Array<{ index: number; embedding: number[] }>;
  usage?: { prompt_tokens?: number; total_tokens?: number };
}

/**
 * Get embedding models using local JSON
 */
export async function getEmbeddingModels(
  _config: OpenRouterConfig,
): Promise<EmbeddingModelInfo[]> {
  try {
    const embeddingModels: EmbeddingModelInfo[] = [];

    for (const model of openRouterModels.data) {
      const id = model.slug.toLowerCase();
      if (model.output_modalities.includes("embeddings")) {
        embeddingModels.push({
          id: model.slug,
          name: model.name || model.slug,
          dimensions: guessEmbeddingDimensions(id),
          contextLength: model.context_length,
        });
      }
    }

    if (embeddingModels.length === 0) {
      return getDefaultEmbeddingModels();
    }

    return embeddingModels;
  } catch (error) {
    console.warn(
      "Failed to list OpenRouter embedding models via local JSON:",
      error,
    );
    return getDefaultEmbeddingModels();
  }
}

function isEmbeddingModel(id: string): boolean {
  return (
    id.includes("embed") ||
    id.includes("bert") ||
    id.includes("nomic") ||
    id.includes("gecko") ||
    id.includes("bge") ||
    id.includes("gte") ||
    id.includes("e5") ||
    id.includes("paraphrase")
  );
}

function guessEmbeddingDimensions(id: string): number {
  if (id.includes("text-embedding-3-small")) return 1536;
  if (id.includes("text-embedding-3-large")) return 3072;
  if (id.includes("embed-english-v3") || id.includes("embed-multilingual-v3"))
    return 1024;
  if (
    id.includes("embed-english-light-v3") ||
    id.includes("embed-multilingual-light-v3")
  )
    return 384;
  if (id.includes("small") || id.includes("light")) return 384;
  if (id.includes("base")) return 768;
  if (id.includes("large")) return 1024;
  if (id.includes("nomic-embed")) return 768;
  if (id.includes("gecko")) return 768;
  return 1024;
}

function getDefaultEmbeddingModels(): EmbeddingModelInfo[] {
  return [
    {
      id: "openai/text-embedding-3-small",
      name: "OpenAI Text Embedding 3 Small",
      dimensions: 1536,
      contextLength: 8192,
    },
    {
      id: "openai/text-embedding-3-large",
      name: "OpenAI Text Embedding 3 Large",
      dimensions: 3072,
      contextLength: 8192,
    },
  ];
}

/**
 * Generate embeddings
 */
export async function generateEmbedding(
  config: OpenRouterConfig,
  modelId: string,
  texts: string[],
  dimensions?: number,
  _taskType?: EmbeddingTaskType,
): Promise<EmbeddingResponse> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: createHeaders(config),
      body: JSON.stringify({
        model: modelId,
        input: texts,
        dimensions,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = (await response.json()) as EmbeddingAPIResponse;

    const embeddings = data.data
      .sort((a, b) => a.index - b.index)
      .map((item) => new Float32Array(item.embedding));

    return {
      embeddings,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new AIProviderError(
      `OpenRouter embedding failed: ${message}`,
      "openrouter",
      undefined,
      error,
    );
  }
}
