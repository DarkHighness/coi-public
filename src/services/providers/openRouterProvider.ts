/**
 * ============================================================================
 * OpenRouter Provider - SDK Implementation
 * ============================================================================
 *
 * Uses @openrouter/sdk for all API interactions:
 * - Model listing (getModels, getEmbeddingModels)
 * - Content generation (streaming + structured outputs)
 * - Tool calls
 * - Image generation
 * - Speech generation (delegation to OpenAI provider)
 * - Embedding generation
 */
import { OpenRouter } from "@openrouter/sdk";
import * as models from "@openrouter/sdk/models";
import { jsonrepair } from "jsonrepair";
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
  zodToGemini,
  createGeminiTool,
  createOpenRouterTool,
  isGeminiModel,
} from "../zodCompiler";
import type { ZodTypeAny } from "zod";
import { withRetry, validateSchema, cleanJsonContent } from "./utils";
// ============================================================================
// SDK Client Creation
// ============================================================================
/**
 * Create OpenRouter SDK client instance
 */
function createClient(config: OpenRouterConfig): OpenRouter {
  return new OpenRouter({
    apiKey: config.apiKey,
  });
}
/**
 * Create request options with custom headers for OpenRouter
 */
function createRequestOptions(): any {
  return {
    fetchOptions: {
      headers: {
        "HTTP-Referer":
          typeof window !== "undefined" ? window.location.origin : "",
        "X-Title": "CoI Game",
      },
    },
  };
}
// ============================================================================
// Response Types
// ============================================================================
/** Content Generation Response */
export interface OpenRouterContentGenerationResponse {
  result:
    | { functionCalls?: ToolCallResult[] }
    | Record<string, unknown>
    | string;
  usage: TokenUsage;
  raw: unknown;
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
    const client = createClient(config);
    await client.models.list();
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
// Credits & Balance
// ============================================================================
export interface OpenRouterCredits {
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
}
/**
 * Get OpenRouter account credits (balance information)
 */
export async function getCredits(
  config: OpenRouterConfig,
): Promise<OpenRouterCredits> {
  try {
    const client = createClient(config);
    const response = await client.credits.getCredits();
    const data = response as any;
    // Parse the response to get credit information
    const totalCredits = data.data?.totalCredits || data.totalCredits || 0;
    const usedCredits = data.data?.usedCredits || data.usedCredits || 0;
    const remainingCredits = totalCredits - usedCredits;
    return {
      totalCredits,
      usedCredits,
      remainingCredits,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new AIProviderError(
      `Failed to fetch OpenRouter credits: ${message}`,
      "openrouter",
      undefined,
      error,
    );
  }
}
// ============================================================================
// Model Listing
// ============================================================================
/**
 * Get available OpenRouter models using SDK
 */
export async function getModels(
  config: OpenRouterConfig,
): Promise<ModelInfo[]> {
  try {
    const client = createClient(config);
    const response = await client.models.list();
    const data = response as any;
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid response format from models.list()");
    }
    return data.data.map((m: any) => {
      const capabilities = inferModelCapabilities({
        id: m.id || m.slug,
        name: m.name || m.id || m.slug,
        ...m,
      });
      return {
        id: m.id || m.slug,
        name: m.name || m.id || m.slug,
        capabilities,
      };
    });
  } catch (error) {
    console.warn("Failed to list OpenRouter models via SDK:", error);
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
 * Generate content (chat/tool calls) using SDK
 */
export async function generateContent(
  config: OpenRouterConfig,
  model: string,
  systemInstruction: string,
  contents: UnifiedMessage[],
  schema?: ZodTypeAny,
  options?: GenerateContentOptions,
): Promise<OpenRouterContentGenerationResponse> {
  return withRetry(
    async () => {
      const client = createClient(config);
      const isGemini = isGeminiModel(model);
      // Convert messages
      const messages = convertToOpenAIMessages(systemInstruction, contents);
      // Convert tools
      const tools = options?.tools
        ? isGemini
          ? options.tools.map((t) =>
              createGeminiTool(t.name, t.description, t.parameters),
            )
          : convertToOpenRouterTools(options.tools)
        : undefined;

      // Convert toolChoice
      let toolChoice: any = undefined;
      if (tools && tools.length > 0) {
        if (options?.toolChoice === "required") {
          toolChoice = "required";
        } else if (options?.toolChoice === "none") {
          toolChoice = "none";
        } else if (
          options?.toolChoice &&
          typeof options.toolChoice === "object"
        ) {
          toolChoice = {
            type: "function",
            function: { name: options.toolChoice.name },
          };
        } else {
          toolChoice = "auto";
        }
      }

      // Build request parameters
      const requestParams: any = {
        model,
        messages,
        temperature: options?.temperature,
        topP: options?.topP,
        topK: options?.topK,
        minP: options?.minP,
        stream: !!options?.onChunk,
        tools,
        toolChoice,
      };

      // 添加 reasoning_effort 参数 (OpenAI reasoning 模型或兼容模式)
      // OpenRouter 会自动将 reasoning_effort 转换为各 provider 的原生格式
      if (options?.reasoningEffort || options?.thinkingLevel) {
        const reasoningParam = options?.reasoningEffort || options?.thinkingLevel;
        if (reasoningParam) {
          requestParams.reasoning_effort = reasoningParam;
        }
      }

      // Add schema for structured output (only when no tools are present)
      if (schema && (!tools || tools.length === 0)) {
        const openAIFormat = zodToOpenAIResponseFormat(schema);
        requestParams.responseFormat = isGemini
          ? { type: "json_schema", schema: zodToGemini(schema) }
          : {
              type: openAIFormat.type,
              jsonSchema: openAIFormat.json_schema, // Convert to camelCase for SDK
            };
      }

      console.log(
        `[OpenRouter] Starting generation with model: ${model}, stream: ${!!options?.onChunk}, tools: ${requestParams.tools ? "yes" : "no"}, isGemini: ${isGemini}`,
      );
      if (isGemini && schema && !tools && requestParams.responseFormat) {
        console.log(
          "[OpenRouter] Detected Gemini model, using Gemini schema format:",
          JSON.stringify(requestParams.responseFormat, null, 2),
        );
      }
      try {
        if (options?.onChunk) {
          // Streaming response
          return await handleStreamingResponse(
            client,
            requestParams,
            options.onChunk,
            schema,
          );
        } else {
          // Non-streaming response
          return await handleNonStreamingResponse(
            client,
            requestParams,
            schema,
          );
        }
      } catch (error) {
        if (error instanceof AIProviderError) throw error;
        const message =
          error instanceof Error ? error.message : "Unknown error";
        throw new AIProviderError(
          `OpenRouter generation failed: ${message}`,
          "openrouter",
          undefined,
          error,
        );
      }
    },
    3,
    1000,
    "openrouter",
  );
}
/**
 * Handle non-streaming response using SDK
 */
async function handleNonStreamingResponse(
  client: OpenRouter,
  params: any,
  schema?: ZodTypeAny,
): Promise<OpenRouterContentGenerationResponse> {
  const response = await client.chat.send(params, createRequestOptions());
  const data = response as any;
  const choice = data.choices?.[0];
  const message = choice?.message;
  const content = message?.content || "";
  let toolCalls: ToolCallResult[] = [];
  if (message?.toolCalls) {
    toolCalls = message.toolCalls.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      // Extract thought_signature if present (Gemini via OpenRouter)
      thoughtSignature: tc.function.thought_signature,
    }));
  }
  if (choice?.finishReason === "content_filter") {
    throw new SafetyFilterError("openrouter");
  }
  const usage: TokenUsage = {
    promptTokens: data.usage?.promptTokens || 0,
    completionTokens: data.usage?.completionTokens || 0,
    totalTokens: data.usage?.totalTokens || 0,
    cacheRead: data.usage?.cacheReadInputTokens || 0,
    cacheWrite: data.usage?.cacheCreationInputTokens || 0,
  };

  // 提取 reasoning content (如果存在)
  let reasoningContent = "";
  if (message?.reasoning_content) {
    reasoningContent = message.reasoning_content;
  }

  console.log(`[OpenRouter] Generation complete. Usage:`, usage);

  if (toolCalls.length > 0) {
    const toolResult: any = {
      functionCalls: toolCalls,
      // 保留 content 以便在下次请求时包含
      content: content || undefined,
    };
    if (reasoningContent) {
      toolResult._reasoning = reasoningContent;
    }
    return {
      result: toolResult,
      usage,
      raw: data,
    };
  }
  if (schema && content) {
    try {
      const cleanedContent = cleanJsonContent(content);
      const result = JSON.parse(jsonrepair(cleanedContent));
      validateSchema(result, schema, "openrouter");
      if (reasoningContent) {
        return { result: { ...result, _reasoning: reasoningContent }, usage, raw: data };
      }
      return { result, usage, raw: data };
    } catch (error) {
      console.error(`[OpenRouter] Failed to parse JSON content:`, content);
      if (error instanceof AIProviderError) {
        throw error;
      }
      throw new JSONParseError("openrouter", content.substring(0, 500), error);
    }
  }
  // 返回纯文本
  const result: any = { content };
  if (reasoningContent) {
    result._reasoning = reasoningContent;
  }
  return { result, usage, raw: data };
}
/**
 * Handle streaming response using SDK
 */
async function handleStreamingResponse(
  client: OpenRouter,
  params: any,
  onChunk: (text: string) => void,
  schema?: ZodTypeAny,
): Promise<OpenRouterContentGenerationResponse> {
  const stream = await client.chat.send(
    { ...params, stream: true },
    createRequestOptions(),
  );
  let content = "";
  let reasoningContent = ""; // 累积 reasoning content
  let usage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
  const accumulatedToolCalls: Map<
    number,
    { id: string; name: string; arguments: string; thoughtSignature?: string }
  > = new Map();
  try {
    for await (const chunk of stream as any) {
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) {
        content += delta.content;
        onChunk(delta.content);
      }
      // 处理 reasoning content
      if (delta?.reasoning_content) {
        reasoningContent += delta.reasoning_content;
      }
      if (delta?.toolCalls) {
        for (const tc of delta.toolCalls) {
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
              thoughtSignature: tc.function?.thought_signature,
            });
          }
        }
      }
      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.promptTokens || 0,
          completionTokens: chunk.usage.completionTokens || 0,
          totalTokens: chunk.usage.totalTokens || 0,
          cacheRead: chunk.usage.cacheReadInputTokens || 0,
          cacheWrite: chunk.usage.cacheCreationInputTokens || 0,
        };
      }
    }
  } catch (e) {
    console.error("Stream processing error:", e);
    throw e;
  }
  const toolCalls: ToolCallResult[] = [];
  for (const [, tc] of accumulatedToolCalls) {
    try {
      toolCalls.push({
        id: tc.id,
        name: tc.name,
        args: JSON.parse(tc.arguments || "{}") as Record<string, unknown>,
        thoughtSignature: tc.thoughtSignature,
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
    const toolResult: any = {
      functionCalls: toolCalls,
      // 保留 content 以便在下次请求时包含
      content: content || undefined,
    };
    if (reasoningContent) {
      toolResult._reasoning = reasoningContent;
    }
    return {
      result: toolResult,
      usage,
      raw: null,
    };
  }
  if (schema && content) {
    try {
      const cleanedContent = cleanJsonContent(content);
      const result = JSON.parse(jsonrepair(cleanedContent));
      validateSchema(result, schema, "openrouter");
      if (reasoningContent) {
        return { result: { ...result, _reasoning: reasoningContent }, usage, raw: null };
      }
      return { result, usage, raw: null };
    } catch (error) {
      console.error(`[OpenRouter] Failed to parse JSON content:`, content);
      if (error instanceof AIProviderError) {
        throw error;
      }
      throw new JSONParseError("openrouter", content.substring(0, 500), error);
    }
  }
  // 返回纯文本
  const result: any = { content };
  if (reasoningContent) {
    result._reasoning = reasoningContent;
  }
  return { result, usage, raw: null };
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
        // Fix: Check for "tool_result" (from messageTypes.ts) not "tool_response"
        if (part.type === "tool_result") {
          const tr = part as {
            type: "tool_result";
            toolResult: { id: string; name: string; content: unknown };
          };
          // OpenRouter SDK uses camelCase format
          result.push({
            role: "tool",
            toolCallId: tr.toolResult.id,
            content:
              typeof tr.toolResult.content === "string"
                ? tr.toolResult.content
                : JSON.stringify(tr.toolResult.content),
          });
        }
      }
      continue;
    }
    if (msg.role === "assistant") {
      const toolCallParts = msg.content.filter(
        (p): p is ToolCallContentPart => p.type === "tool_use",
      );
      if (toolCallParts.length > 0) {
        const textContent = msg.content
          .filter((p): p is TextContentPart => p.type === "text")
          .map((p) => p.text)
          .join("\n");
        // OpenRouter SDK uses camelCase format
        result.push({
          role: "assistant",
          content: textContent || null,
          toolCalls: toolCallParts.map((p) => {
            const toolCall: any = {
              id: p.toolUse.id,
              type: "function",
              function: {
                name: p.toolUse.name,
                arguments: JSON.stringify(p.toolUse.args),
              },
            };
            // Include thought_signature if present (Gemini compatibility)
            if (p.toolUse.thoughtSignature) {
              toolCall.function.thought_signature = p.toolUse.thoughtSignature;
            }
            return toolCall;
          }),
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
 * Convert tools to OpenRouter format
 */
function convertToOpenRouterTools(
  tools: GenerateContentOptions["tools"],
): any[] {
  return (tools || []).map((tool) =>
    createOpenRouterTool(tool.name, tool.description, tool.parameters),
  );
}
// ============================================================================
// Image Generation
// ============================================================================
/**
 * Generate Image using SDK with modalities parameter
 * Supports modern image generation models via chat completions endpoint
 */
export async function generateImage(
  config: OpenRouterConfig,
  model: string,
  prompt: string,
  resolution: string = "1024x1024",
): Promise<ImageGenerationResponse> {
  return generateImageLegacy(config, model, prompt, resolution);

  // Openrouter SDK does not working!!!
  const aspectRatio = getAspectRatio(resolution);
  const client = createClient(config);
  try {
    // Modern approach: Use chat completions with modalities
    // This works for models with "image" in output_modalities (Gemini, Flux, etc.)
    const response = await client.chat.send(
      {
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
        imageConfig: { aspectRatio },
        stream: false,
      } as any,
      createRequestOptions(),
    );
    const data = response as any;
    // Check for images in the response
    if (data.choices?.[0]?.message?.images?.length) {
      return {
        url:
          data.choices[0].message.images[0].imageUrl?.url ||
          data.choices[0].message.images[0].image_url?.url,
        raw: data,
        usage: data.usage
          ? {
              promptTokens:
                data.usage.promptTokens || data.usage.prompt_tokens || 0,
              completionTokens:
                data.usage.completionTokens ||
                data.usage.completion_tokens ||
                0,
              totalTokens:
                data.usage.totalTokens || data.usage.total_tokens || 0,
            }
          : undefined,
      };
    }
    // Fallback: Check if URL is in content (some models)
    const content = data.choices?.[0]?.message?.content;
    const urlMatch = content?.match(/https?:\/\/[^\s)]+/);
    if (urlMatch) {
      return { url: urlMatch[0], raw: data };
    }
    throw new AIProviderError("No image generated in response", "openrouter");
  } catch (error) {
    // For models that don't support modalities, fall back to legacy endpoint
    if (
      error instanceof Error &&
      (error.message.includes("modalities") ||
        error.message.includes("not supported"))
    ) {
      console.warn(
        "[OpenRouter] Model doesn't support modalities, trying legacy images/generations endpoint",
      );
      return generateImageLegacy(config, model, prompt, resolution);
    }
    throw error instanceof AIProviderError
      ? error
      : new AIProviderError(
          `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          "openrouter",
          undefined,
          error,
        );
  }
}
/**
 * Legacy image generation for models using /images/generations endpoint
 * Kept for backward compatibility with DALL-E and similar models
 */
async function generateImageLegacy(
  config: OpenRouterConfig,
  model: string,
  prompt: string,
  resolution: string,
): Promise<ImageGenerationResponse> {
  const aspectRatio = getAspectRatio(resolution);
  let size = resolution;
  // DALL-E specific size handling
  if (model.toLowerCase().includes("dall-e-3")) {
    if (["1:1"].includes(aspectRatio)) size = "1024x1024";
    else if (["2:3", "3:4", "4:5", "9:16"].includes(aspectRatio))
      size = "1024x1792";
    else size = "1792x1024";
  }
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          typeof window !== "undefined" ? window.location.origin : "",
        "X-Title": "CoI Game",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
        imageConfig: { aspectRatio },
      }),
    },
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new AIProviderError(
      err.error?.message || `OpenRouter Image API Error: ${response.status}`,
      "openrouter",
    );
  }
  const result = await response.json();
  return {
    url: result.choices[0].message.images[0].image_url?.url || null,
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
/**
 * Get embedding models using SDK
 */
export async function getEmbeddingModels(
  config: OpenRouterConfig,
): Promise<EmbeddingModelInfo[]> {
  try {
    // First, try using SDK
    const client = createClient(config);
    const response = await client.embeddings.listModels();
    const data = response as any;

    if (!data.data || !Array.isArray(data.data)) {
      console.warn("Invalid response format from embeddings.listModels()");
      throw new Error("Invalid SDK response format");
    }

    const embeddingModels = processEmbeddingModels(data.data);

    if (embeddingModels.length === 0) {
      console.warn("No embedding models found in SDK response");
      throw new Error("No embedding models found");
    }

    console.log(
      `[OpenRouter] Loaded ${embeddingModels.length} embedding models via SDK`,
    );
    return embeddingModels;
  } catch (sdkError) {
    console.warn(
      "Failed to list OpenRouter embedding models via SDK (may be CORS issue):",
      sdkError,
    );

    // Fallback to local JSON file
    try {
      console.log("[OpenRouter] Attempting fallback to local JSON file...");
      const response = await fetch("/resources/openrouter_embedding.json");
      if (!response.ok) {
        throw new Error(`Failed to load local JSON: ${response.status}`);
      }
      const data = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error("Invalid local JSON format");
      }

      if (data.data.length === 0) {
        throw new Error("No embedding models found in local JSON");
      }

      // They are all embedding models in this file
      // Thus, we can directly map them
      const models = data.data.map((m: any) => {
        return {
          id: m.id || m.slug,
          name: m.name || m.id || m.slug,
          dimensions: guessEmbeddingDimensions((m.id || m.slug).toLowerCase()),
          contextLength: m.context_length || m.contextLength || 8192,
        };
      });

      console.log(
        `[OpenRouter] Loaded ${models.length} embedding models from local JSON file`,
      );
      return models;
    } catch (jsonError) {
      console.warn("Failed to load from local JSON file:", jsonError);
      console.log("[OpenRouter] Using default embedding models");
      return getDefaultEmbeddingModels();
    }
  }
}

/**
 * Process raw model data into EmbeddingModelInfo
 */
function processEmbeddingModels(models: any[]): EmbeddingModelInfo[] {
  const embeddingModels: EmbeddingModelInfo[] = [];

  for (const model of models) {
    const id = (model.id || model.slug || "").toLowerCase();

    // Check if this is an embedding model
    if (
      model.output_modalities?.includes("embeddings") ||
      model.modality?.includes("embeddings")
    ) {
      embeddingModels.push({
        id: model.id || model.slug,
        name: model.name || model.id || model.slug,
        dimensions: guessEmbeddingDimensions(id),
        contextLength: model.context_length || model.contextLength || 8192,
      });
    }
  }

  return embeddingModels;
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
 * Generate embeddings using direct fetch API
 * Uses fetch instead of SDK to properly handle CORS headers
 */
export async function generateEmbedding(
  config: OpenRouterConfig,
  modelId: string,
  texts: string[],
  dimensions?: number,
  _taskType?: EmbeddingTaskType,
): Promise<EmbeddingResponse> {
  try {
    const url = "https://openrouter.ai/api/v1/embeddings";

    const requestBody: Record<string, unknown> = {
      model: modelId,
      input: texts,
    };

    if (dimensions) {
      requestBody.dimensions = dimensions;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "HTTP-Referer":
          typeof window !== "undefined" ? window.location.origin : "",
        "X-Title": "CoI Game",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    const embeddings = data.data
      .sort((a: any, b: any) => a.index - b.index)
      .map((item: any) => new Float32Array(item.embedding));

    return {
      embeddings,
      usage: {
        promptTokens:
          data.usage?.prompt_tokens || data.usage?.promptTokens || 0,
        totalTokens: data.usage?.total_tokens || data.usage?.totalTokens || 0,
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
