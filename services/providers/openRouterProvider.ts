import { OpenRouter } from "@openrouter/sdk";
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { parseModelCapabilities } from "../modelUtils";
import { ModelInfo, EmbeddingTaskType } from "../../types";
import { generateSpeech as generateOpenAISpeech } from "./openaiProvider";
import { convertJsonSchemaToOpenAIObject } from "../schemaUtils";

export interface OpenRouterConfig {
  apiKey: string;
}

const getClient = (config: OpenRouterConfig) => {
  return new OpenRouter({
    apiKey: config.apiKey,
  });
};

export const validateConnection = async (
  config: OpenRouterConfig,
): Promise<void> => {
  try {
    const client = getClient(config);
    await client.models.list();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    throw new Error(message || "Failed to connect to OpenRouter API");
  }
};

export const getModels = async (
  config: OpenRouterConfig,
): Promise<ModelInfo[]> => {
  try {
    const client = getClient(config);
    const response = await client.models.list();

    // The SDK response structure has a 'data' property which is the array of models
    return response.data.map((m: any) => {
      const parsedCaps = parseModelCapabilities(m);

      const capabilities = {
        text: parsedCaps.text ?? true, // v1 models are generally text capable
        image: parsedCaps.image ?? false,
        video: parsedCaps.video ?? false,
        audio: parsedCaps.audio ?? false,
        tools: parsedCaps.tools ?? false,
        parallelTools: parsedCaps.parallelTools ?? false,
      };

      // Heuristics based on model ID (slug)
      const id = m.id.toLowerCase();
      const name = (m.name || "").toLowerCase();

      // Image Capability (Augment if not detected by parseModelCapabilities)
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

      // Tools Capability (Augment if not detected)
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

      return {
        id: m.id,
        name: m.name || m.id,
        capabilities,
      };
    });
  } catch (e: unknown) {
    console.warn("Failed to list OpenRouter models", e);
    return [];
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
  config: OpenRouterConfig,
  model: string,
  systemInstruction: string,
  contents: ContentItem[],
  schema?: any, // Keeping schema as any for now due to its dynamic nature
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

  // Map contents to messages
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

  // Prepare body for SDK
  // The SDK's chat.send takes a body object similar to OpenAI's
  const body: ChatCompletionCreateParams = {
    model: model,
    messages: messages,
    temperature: options?.temperature,
    top_p: options?.topP,
    // @ts-ignore - top_k/min_p might not be in standard OpenAI types but supported by OpenRouter
    top_k: options?.topK,
    min_p: options?.minP,
    stream: !!options?.onChunk,
    tools: openAITools,
    tool_choice: openAITools ? "auto" : undefined,
  };

  if (schema) {
    if (!schema.type && schema.schema) {
      body.response_format = {
        type: "json_schema",
        json_schema: schema,
      };
    } else {
      body.response_format = {
        type: "json_schema",
        json_schema: {
          name: "response",
          strict: true,
          schema: schema,
        },
      };
    }
  }

  try {
    // Use the SDK to send the request
    // @ts-ignore - SDK types might be slightly different or strict
    const response = await client.chat.send(body);

    let content = "";
    let usage: CompletionUsage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };
    let rawResult:
      | ChatCompletion
      | ChatCompletionChunk
      | AsyncIterable<ChatCompletionChunk> =
      response as unknown as ChatCompletion;
    let toolCalls: { id: string; name: string; args: Record<string, any> }[] =
      [];

    if (options?.onChunk) {
      // Handle streaming response from SDK
      // If the SDK returns a stream when stream: true is passed
      // We need to check if response is iterable
      if (Symbol.asyncIterator in response) {
        const stream = response as AsyncIterable<ChatCompletionChunk>;
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content || "";
          if (delta) {
            content += delta;
            options.onChunk(delta);
          }

          if (chunk.usage) {
            usage = {
              prompt_tokens: chunk.usage.prompt_tokens || 0,
              completion_tokens: chunk.usage.completion_tokens || 0,
              total_tokens: chunk.usage.total_tokens || 0,
            };
          }
          rawResult = chunk; // Keep the last chunk as rawResult for streaming
        }
      } else {
        // Fallback if SDK doesn't stream as expected or returns a non-stream response despite stream: true
        // This might happen if SDK doesn't support streaming yet or handles it differently
        // We'll treat it as a complete response
        const result = response as unknown as ChatCompletion;
        rawResult = result;
        const choice = result.choices[0];
        const message = choice?.message;
        content = message?.content || "";
        if (options.onChunk) options.onChunk(content);

        if (message?.tool_calls) {
          toolCalls = message.tool_calls.map((tc: any) => ({
            id: tc.id || "",
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments),
          }));
        }

        usage = {
          prompt_tokens: result.usage?.prompt_tokens || 0,
          completion_tokens: result.usage?.completion_tokens || 0,
          total_tokens: result.usage?.total_tokens || 0,
        };
      }
    } else {
      // Handle non-streaming response
      const result = response as unknown as ChatCompletion;
      rawResult = result;
      const choice = result.choices[0];
      const message = choice?.message;
      content = message?.content || "";

      if (message?.tool_calls) {
        toolCalls = message.tool_calls.map((tc: any) => ({
          id: tc.id || "",
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments),
        }));
      }

      if (choice?.finish_reason === "content_filter") {
        throw new Error(
          "OpenRouter content generation failed: Content filter triggered.",
        );
      }

      usage = {
        prompt_tokens: result.usage?.prompt_tokens || 0,
        completion_tokens: result.usage?.completion_tokens || 0,
        total_tokens: result.usage?.total_tokens || 0,
      };
    }

    // If we have tool calls, return them
    if (toolCalls.length > 0) {
      return { result: { functionCalls: toolCalls }, usage, raw: rawResult };
    }

    if (schema) {
      try {
        const cleanedContent = content.replace(/```json\n?|```/g, "").trim();
        return { result: JSON.parse(cleanedContent), usage, raw: rawResult };
      } catch (e) {
        console.error("Failed to parse OpenRouter JSON", content);
        throw new Error("Failed to parse AI response as JSON.");
      }
    }

    return { result: content, usage, raw: rawResult };
  } catch (e: any) {
    console.error("OpenRouter generation failed", e);
    throw new Error(e.message || "OpenRouter generation failed");
  }
};

export const generateImage = async (
  config: OpenRouterConfig,
  model: string,
  prompt: string,
  resolution: string = "1024x1024",
): Promise<{ url: string | null; usage?: any; raw?: any }> => {
  // Determine Aspect Ratio / Size based on resolution string
  // Note: The OpenRouter SDK currently exposes `client.generations` which seems to be for retrieving past generations.
  // Explicit image generation creation via SDK is not yet fully documented/verified.
  // We continue to use fetch for now.
  let size = resolution;
  let aspectRatio = "1:1";

  switch (resolution) {
    case "1024x1024":
      aspectRatio = "1:1";
      break;
    case "832x1248":
      aspectRatio = "2:3";
      break;
    case "1248x832":
      aspectRatio = "3:2";
      break;
    case "864x1184":
      aspectRatio = "3:4";
      break;
    case "1184x864":
      aspectRatio = "4:3";
      break;
    case "896x1152":
      aspectRatio = "4:5";
      break;
    case "1152x896":
      aspectRatio = "5:4";
      break;
    case "768x1344":
      aspectRatio = "9:16";
      break;
    case "1344x768":
      aspectRatio = "16:9";
      break;
    case "1536x672":
      aspectRatio = "21:9";
      break;
    default:
      aspectRatio = "1:1";
      break;
  }

  // Provider-specific handling
  if (model.toLowerCase().includes("gemini")) {
    const chatBody = {
      model: model,
      messages: [{ role: "user", content: prompt }],
      // @ts-ignore
      image_config: { aspect_ratio: aspectRatio },
    };

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
        },
        body: JSON.stringify(chatBody),
      },
    );

    if (!response.ok)
      throw new Error(`OpenRouter API Error: ${response.status}`);
    const result = await response.json();

    if (
      result.choices &&
      result.choices[0].message.images &&
      result.choices[0].message.images.length > 0
    ) {
      return {
        url: result.choices[0].message.images[0].image_url.url,
        raw: result,
        usage: result.usage,
      };
    }
    // Fallback if it returns text url
    const content = result.choices[0]?.message?.content;
    const urlMatch = content?.match(/https?:\/\/[^\s)]+/);
    if (urlMatch) return { url: urlMatch[0], raw: result, usage: result.usage };

    throw new Error("No image generated");
  } else {
    // Standard OpenAI/Other uses size
    if (model.toLowerCase().includes("dall-e-3")) {
      if (aspectRatio === "1:1") size = "1024x1024";
      else if (["2:3", "3:4", "4:5", "9:16"].includes(aspectRatio))
        size = "1024x1792";
      else if (["3:2", "4:3", "5:4", "16:9", "21:9"].includes(aspectRatio))
        size = "1792x1024";
      else size = "1024x1024";
    }

    const imageBody: any = {
      model: model,
      prompt: prompt,
      n: 1,
      size: size,
      // response_format: "b64_json" // OpenRouter might not support b64_json for all models
    };

    const response = await fetch(
      "https://openrouter.ai/api/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
        },
        body: JSON.stringify(imageBody),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err.error?.message || `OpenRouter Image API Error: ${response.status}`,
      );
    }

    const result = await response.json();
    return {
      url: result.data[0].url,
      raw: result,
      usage: undefined,
    };
  }
};

export const generateVideo = async (
  config: OpenRouterConfig,
  model: string,
  imageBase64: string,
  prompt: string,
): Promise<{ url: string; usage?: any; raw?: any }> => {
  throw new Error(
    "Video generation is not supported by OpenRouter provider yet.",
  );
};

export const generateSpeech = async (
  config: OpenRouterConfig,
  model: string,
  text: string,
  voiceName: string = "alloy",
  options?: {
    speed?: number;
    format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
    instructions?: string;
  },
): Promise<{ audio: ArrayBuffer; usage?: any; raw?: any }> => {
  // SDK doesn't seem to support audio yet, fallback to OpenAI provider
  return generateOpenAISpeech(
    {
      apiKey: config.apiKey,
      baseUrl: "https://openrouter.ai/api/v1",
      modelId: model,
    },
    model,
    text,
    voiceName,
    options,
  );
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
 * Get available embedding models from OpenRouter API
 */
export const getEmbeddingModels = async (
  config: OpenRouterConfig,
): Promise<EmbeddingModelInfo[]> => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const json = await response.json();
    const embeddingModels: EmbeddingModelInfo[] = [];

    for (const model of json.data) {
      const id = model.id.toLowerCase();
      // Check for embedding models
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
        let dimensions = 1024; // Default

        // Try to guess dimensions from name
        if (id.includes("small") || id.includes("light")) dimensions = 384;
        if (id.includes("base")) dimensions = 768;
        if (id.includes("large")) dimensions = 1024;

        // Specific overrides
        if (id.includes("text-embedding-3-small")) dimensions = 1536;
        if (id.includes("text-embedding-3-large")) dimensions = 3072;
        if (
          id.includes("embed-english-v3") ||
          id.includes("embed-multilingual-v3")
        )
          dimensions = 1024;
        if (
          id.includes("embed-english-light-v3") ||
          id.includes("embed-multilingual-light-v3")
        )
          dimensions = 384;
        if (id.includes("nomic-embed")) dimensions = 768;
        if (id.includes("gecko")) dimensions = 768;

        embeddingModels.push({
          id: model.id,
          name: model.name || model.id,
          dimensions,
        });
      }
    }

    if (embeddingModels.length === 0) {
      // Fallback to known embedding models
      return [
        {
          id: "openai/text-embedding-3-small",
          name: "OpenAI Text Embedding 3 Small",
          dimensions: 1536,
        },
        {
          id: "openai/text-embedding-3-large",
          name: "OpenAI Text Embedding 3 Large",
          dimensions: 3072,
        },
        {
          id: "cohere/embed-english-v3.0",
          name: "Cohere Embed English v3",
          dimensions: 1024,
        },
        {
          id: "cohere/embed-multilingual-v3.0",
          name: "Cohere Embed Multilingual v3",
          dimensions: 1024,
        },
      ];
    }

    return embeddingModels;
  } catch (e) {
    console.warn("Failed to list OpenRouter embedding models", e);
    return [
      {
        id: "openai/text-embedding-3-small",
        name: "OpenAI Text Embedding 3 Small",
        dimensions: 1536,
      },
      {
        id: "openai/text-embedding-3-large",
        name: "OpenAI Text Embedding 3 Large",
        dimensions: 3072,
      },
      {
        id: "cohere/embed-english-v3.0",
        name: "Cohere Embed English v3",
        dimensions: 1024,
      },
      {
        id: "cohere/embed-multilingual-v3.0",
        name: "Cohere Embed Multilingual v3",
        dimensions: 1024,
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
 * Generate embeddings using OpenRouter API (OpenAI-compatible)
 */
export const generateEmbedding = async (
  config: OpenRouterConfig,
  modelId: string,
  texts: string[],
  dimensions?: number,
  taskType?: EmbeddingTaskType,
): Promise<EmbeddingResult> => {
  const client = getClient(config);

  try {
    const response = await client.embeddings.generate({
      model: modelId,
      input: texts,
      encodingFormat: "float" as any, // Cast to match SDK enum if needed
      dimensions: dimensions,
    });

    // The SDK response structure matches the API response
    // response.data is an array of embedding objects
    // @ts-ignore - SDK types might need adjustment
    const data = response.data;

    const embeddings = data
      .sort((a: any, b: any) => a.index - b.index)
      .map((item: any) => new Float32Array(item.embedding));

    return {
      embeddings,
      usage: {
        // @ts-ignore
        promptTokens:
          response.usage?.promptTokens || response.usage?.prompt_tokens || 0,
        // @ts-ignore
        totalTokens:
          response.usage?.totalTokens || response.usage?.total_tokens || 0,
      },
    };
  } catch (e: any) {
    console.error("OpenRouter embedding failed", e);
    throw new Error(e.message || "OpenRouter embedding failed");
  }
};
