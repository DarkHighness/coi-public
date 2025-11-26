import OpenAI from "openai";
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { ModelInfo, EmbeddingTaskType } from "../../types";
import { parseModelCapabilities } from "../modelUtils";
import { convertJsonSchemaToOpenAIObject } from "../schemaUtils";

export interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  modelId: string;
}

const getClient = (config: OpenAIConfig) => {
  return new OpenAI({
    apiKey: config.apiKey || "dummy", // SDK requires key, even if empty/dummy for custom endpoints
    baseURL: config.baseUrl,
    dangerouslyAllowBrowser: true,
  });
};

export const validateConnection = async (
  config: OpenAIConfig,
): Promise<void> => {
  try {
    const client = getClient(config);
    await client.models.list();
  } catch (e: any) {
    throw new Error(e.message || "Failed to connect to OpenAI API");
  }
};

export const getModels = async (config: OpenAIConfig): Promise<ModelInfo[]> => {
  try {
    const client = getClient(config);
    const list = await client.models.list();
    return list.data.map((m: any) => {
      const id = m.id.toLowerCase();
      const capabilities = {
        text: false,
        image: false,
        video: false,
        audio: false,
        tools: false,
        parallelTools: false,
      };

      // 1. Try to detect from OpenRouter-style fields
      const parsedCaps = parseModelCapabilities(m);
      if (parsedCaps.text) capabilities.text = true;
      if (parsedCaps.image) capabilities.image = true;
      if (parsedCaps.audio) capabilities.audio = true;
      if (parsedCaps.video) capabilities.video = true;
      if (parsedCaps.tools) capabilities.tools = true;
      if (parsedCaps.parallelTools) capabilities.parallelTools = true;

      // 2. Fallback to ID heuristics if no capabilities detected yet (or to augment)
      const hasExplicitInfo =
        capabilities.text ||
        capabilities.image ||
        capabilities.video ||
        capabilities.audio;

      if (!hasExplicitInfo) {
        // Image
        if (
          id.includes("dall-e") ||
          id.includes("stable-diffusion") ||
          id.includes("flux") ||
          id.includes("midjourney") ||
          id.includes("image")
        ) {
          capabilities.image = true;
        }
        // Audio
        if (
          id.includes("tts") ||
          id.includes("whisper") ||
          id.includes("audio")
        ) {
          capabilities.audio = true;
        }
        // Video
        if (
          id.includes("sora") ||
          id.includes("video") ||
          id.includes("runway") ||
          id.includes("luma")
        ) {
          capabilities.video = true;
        }

        // Text (Default)
        // If it's not explicitly another modality, or if it matches known LLM patterns
        if (capabilities.image || capabilities.audio || capabilities.video) {
          // If it has other capabilities, check if it's also text (multimodal)
          if (
            id.startsWith("gpt") ||
            id.includes("chat") ||
            id.includes("claude") ||
            id.includes("gemini") ||
            id.includes("llama") ||
            id.includes("mistral")
          ) {
            capabilities.text = true;
          }
        } else {
          // If no other capability detected, assume text
          capabilities.text = true;
        }
      }

      return {
        id: m.id,
        name: m.name || m.id,
        capabilities,
      };
    });
  } catch (e) {
    console.warn("Failed to list OpenAI models", e);
    return [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    ];
  }
};

interface Tool {
  name: string;
  description?: string;
  parameters: any; // JSON Schema object
}

interface GenerateContentOptions {
  thinkingLevel?: "low" | "medium" | "high";
  mediaResolution?: "low" | "medium" | "high";
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
  onChunk?: (text: string) => void;
  tools?: Tool[];
}

interface ContentPart {
  text?: string;
  functionCall?: {
    id?: string;
    name: string;
    args: Record<string, any>;
  };
  functionResponse?: {
    id?: string;
    response: Record<string, any>;
  };
  [key: string]: any; // For other potential parts like inline_data
}

interface ContentItem {
  role: string;
  content?: string;
  parts?: ContentPart[];
  [key: string]: any; // For other potential fields
}

interface CompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export const generateContent = async (
  config: OpenAIConfig,
  model: string,
  systemInstruction: string,
  contents: ContentItem[],
  schema?: any,
  options?: GenerateContentOptions,
): Promise<{
  result: any;
  usage: CompletionUsage | undefined;
  raw:
    | ChatCompletion
    | ChatCompletionChunk
    | AsyncIterable<ChatCompletionChunk>;
}> => {
  const client = getClient(config);

  // Format messages for OpenAI SDK
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemInstruction },
    ...contents.map((c: ContentItem) => {
      if (c.role && c.content) return c as ChatCompletionMessageParam; // Already OpenAI format
      if (c.role && c.parts) {
        // Map Gemini format to OpenAI
        // Handle function calls/responses in history if present
        if (c.parts[0]?.functionCall) {
          return {
            role: "assistant",
            tool_calls: c.parts.map((p: ContentPart) => ({
              id:
                p.functionCall?.id ||
                "call_" + Math.random().toString(36).substr(2, 9), // Use preserved ID or fallback
              type: "function",
              function: {
                name: p.functionCall?.name || "",
                arguments: JSON.stringify(p.functionCall?.args),
              },
            })),
          } as ChatCompletionMessageParam;
        }
        if (c.parts[0]?.functionResponse) {
          return {
            role: "tool",
            tool_call_id: c.parts[0].functionResponse.id || "call_unknown", // Use preserved ID from response
            content: JSON.stringify(c.parts[0].functionResponse.response),
          } as ChatCompletionMessageParam;
        }

        return {
          role: c.role === "model" ? "assistant" : (c.role as "user"),
          content: c.parts.map((p: ContentPart) => p.text).join("\n"),
        } as ChatCompletionMessageParam;
      }
      return c as ChatCompletionMessageParam;
    }),
  ];

  // Map Tools to OpenAI Format
  let openAITools: ChatCompletionTool[] | undefined;
  if (options?.tools) {
    openAITools = options.tools.map((t: Tool) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: convertJsonSchemaToOpenAIObject(t.parameters, false),
      },
    }));
  }

  const response = await client.chat.completions.create({
    model: model,
    messages: messages,
    response_format: schema
      ? { type: "json_schema", json_schema: schema }
      : { type: "json_object" },
    temperature: options?.temperature ?? 0.8,
    top_p: options?.topP,
    stream: !!options?.onChunk,
    tools: openAITools,
    tool_choice: openAITools ? "auto" : undefined,
  });

  let content = "";
  let responseObj:
    | ChatCompletion
    | ChatCompletionChunk
    | AsyncIterable<ChatCompletionChunk> = response;
  let toolCalls: { id: string; name: string; args: Record<string, any> }[] = [];

  if (options?.onChunk) {
    const stream = response as AsyncIterable<ChatCompletionChunk>;
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        content += delta;
        options.onChunk(delta);
      }
      // Note: Streaming tool calls is complex, usually we don't stream tool calls in this simple loop
      // If tool_calls are present in delta, we'd need to accumulate them.
      // For now, assuming non-streaming for tool use or basic streaming for text.
      responseObj = chunk; // Keep last chunk
    }
  } else {
    const completion = response as ChatCompletion;
    responseObj = completion;
    const message = completion.choices[0]?.message;
    content = message?.content || "";

    if (message?.tool_calls) {
      toolCalls = message.tool_calls.map((tc: any) => ({
        id: tc.id, // Preserve the tool call ID for proper request/response matching
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
      }));
    }
  }

  // If streaming, we might not get full usage stats easily from the last chunk in all providers,
  // but OpenAI sometimes sends it in a final chunk with usage field.
  // For now, we'll construct a mock usage if missing or try to extract it.
  // @ts-ignore
  const usageData = responseObj.usage;
  const usage: CompletionUsage = {
    prompt_tokens: usageData?.prompt_tokens || 0,
    completion_tokens: usageData?.completion_tokens || 0,
    total_tokens: usageData?.total_tokens || 0,
  };

  // Basic validation for non-streaming (or if we reconstructed full content)
  if (!options?.onChunk) {
    const choice = (responseObj as ChatCompletion).choices[0];
    if (choice.finish_reason === "content_filter") {
      throw new Error(
        "OpenAI content generation failed: Content filter triggered.",
      );
    }
  }

  // If we have tool calls, return them
  if (toolCalls.length > 0) {
    return { result: { functionCalls: toolCalls }, usage, raw: response };
  }

  if (!content && toolCalls.length === 0)
    throw new Error("No content returned from OpenAI");

  try {
    // Clean JSON before parsing (remove markdown code blocks if present)
    const cleanedContent = content.replace(/```json\n?|```/g, "").trim();
    const result = JSON.parse(cleanedContent);
    return { result, usage, raw: response };
  } catch (e) {
    // If it's not JSON (maybe just narrative text if tools weren't used or model ignored schema), return as is or error
    // If schema was requested, it should be JSON.
    if (schema) {
      console.error("JSON Parse Error", e, "Content:", content);
      throw new Error("Failed to parse AI response as JSON.");
    }
    return { result: { narrative: content }, usage, raw: response };
  }
};

export const generateImage = async (
  config: OpenAIConfig,
  model: string,
  prompt: string,
  resolution: string = "1024x1024",
): Promise<{ url: string | null; usage?: CompletionUsage; raw?: any }> => {
  const client = getClient(config);

  let size: any = resolution;

  // DALL-E 3 requires specific sizes
  if (model?.includes("dall-e-3")) {
    // Map new resolutions to DALL-E 3 supported sizes
    // Portrait: 2:3, 3:4, 4:5, 9:16 -> 1024x1792
    if (["832x1248", "864x1184", "896x1152", "768x1344"].includes(resolution)) {
      size = "1024x1792";
    }
    // Landscape: 3:2, 4:3, 5:4, 16:9, 21:9 -> 1792x1024
    else if (
      ["1248x832", "1184x864", "1152x896", "1344x768", "1536x672"].includes(
        resolution,
      )
    ) {
      size = "1792x1024";
    }
    // Square: 1:1 -> 1024x1024
    else {
      size = "1024x1024";
    }
  } else {
    // DALL-E 2 only supports squares (256, 512, 1024)
    // Since our UI only provides non-standard squares or high-res rectangles, we default to 1024x1024
    size = "1024x1024";
  }

  const response = await client.images.generate({
    model: model || "dall-e-3",
    prompt: prompt,
    n: 1,
    size: size,
    response_format: "b64_json",
  });

  const b64 = response.data[0]?.b64_json;
  const url = b64 ? `data:image/png;base64,${b64}` : null;

  // OpenAI Image generation doesn't return standard token usage, but we can log the request
  return {
    url,
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    raw: response,
  };
};

export const generateVideo = async (
  config: OpenAIConfig,
  model: string,
  imageBase64: string,
  prompt: string,
): Promise<{ url: string; usage?: any; raw?: any }> => {
  throw new Error("Video generation is not supported by OpenAI provider yet.");
};

export const generateSpeech = async (
  config: OpenAIConfig,
  model: string,
  text: string,
  voiceName: string = "alloy",
  options?: {
    speed?: number;
    format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
    instructions?: string; // For gpt-4o-mini-tts
  },
): Promise<{ audio: ArrayBuffer; usage?: CompletionUsage; raw?: any }> => {
  const client = getClient(config);

  const requestBody: any = {
    model: model || "tts-1",
    input: text,
    voice: voiceName as any,
    response_format: options?.format || "mp3",
    speed: options?.speed || 1.0,
  };

  // Add instructions if supported (gpt-4o-mini-tts)
  if (model === "gpt-4o-mini-tts" && options?.instructions) {
    // Note: The SDK might not fully support 'instructions' yet if it's very new,
    // but we can try passing it. If strict typing fails, we might need to cast or use raw fetch.
    // Based on docs, it's a top-level param.
    // Checking OpenAI Node SDK types might be needed, but let's assume we can pass extra props or cast.
    (requestBody as any).instructions = options.instructions;
  }

  const response = await client.audio.speech.create(requestBody);

  const buffer = await response.arrayBuffer();
  return {
    audio: buffer,
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
};

// ============================================================================
// Embedding Functions
// ============================================================================

export interface EmbeddingModelInfo {
  id: string;
  name: string;
  dimensions?: number;
}

/**
 * Get available embedding models from OpenAI API
 */
export const getEmbeddingModels = async (
  config: OpenAIConfig,
): Promise<EmbeddingModelInfo[]> => {
  try {
    const client = getClient(config);
    const list = await client.models.list();

    const embeddingModels: EmbeddingModelInfo[] = [];
    for (const model of list.data) {
      const id = model.id.toLowerCase();
      if (
        id.includes("embed") ||
        id.includes("bert") ||
        id.includes("nomic") ||
        id.includes("gecko") ||
        id.includes("bge") ||
        id.includes("gte") ||
        id.includes("e5") ||
        id.includes("paraphrase")
      ) {
        let dimensions = 1536; // Default for text-embedding-ada-002

        // Try to guess dimensions from name
        if (id.includes("small") || id.includes("light")) dimensions = 384; // Common for small models
        if (id.includes("base")) dimensions = 768; // Common for base models
        if (id.includes("large")) dimensions = 1024; // Common for large models

        // Specific overrides
        if (id.includes("text-embedding-3-small")) dimensions = 1536;
        if (id.includes("text-embedding-3-large")) dimensions = 3072;
        if (id.includes("nomic-embed")) dimensions = 768;
        if (id.includes("gecko")) dimensions = 768;

        embeddingModels.push({
          id: model.id,
          name: model.id,
          dimensions,
        });
      }
    }

    if (embeddingModels.length === 0) {
      // Fallback to known embedding models
      return [
        {
          id: "text-embedding-3-small",
          name: "Text Embedding 3 Small",
          dimensions: 1536,
        },
        {
          id: "text-embedding-3-large",
          name: "Text Embedding 3 Large",
          dimensions: 3072,
        },
        {
          id: "text-embedding-ada-002",
          name: "Text Embedding Ada 002",
          dimensions: 1536,
        },
      ];
    }

    return embeddingModels;
  } catch (e) {
    console.warn("Failed to list OpenAI embedding models", e);
    return [
      {
        id: "text-embedding-3-small",
        name: "Text Embedding 3 Small",
        dimensions: 1536,
      },
      {
        id: "text-embedding-3-large",
        name: "Text Embedding 3 Large",
        dimensions: 3072,
      },
      {
        id: "text-embedding-ada-002",
        name: "Text Embedding Ada 002",
        dimensions: 1536,
      },
    ];
  }
};

export interface EmbeddingResult {
  embeddings: Float32Array[];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * Generate embeddings using OpenAI API
 */
export const generateEmbedding = async (
  config: OpenAIConfig,
  modelId: string,
  texts: string[],
  dimensions?: number,
  taskType?: EmbeddingTaskType,
): Promise<EmbeddingResult> => {
  const client = getClient(config);

  const body: any = {
    model: modelId,
    input: texts,
    encoding_format: "float",
  };

  if (dimensions) {
    body.dimensions = dimensions;
  }

  const response = await client.embeddings.create(body);

  const embeddings = response.data
    .sort((a: any, b: any) => a.index - b.index)
    .map((item: any) => new Float32Array(item.embedding));

  return {
    embeddings,
    usage: {
      promptTokens: response.usage?.prompt_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    },
  };
};
