import { OpenRouter } from "@openrouter/sdk";
import { parseModelCapabilities } from "../modelUtils";
import { ModelInfo } from "../../types";
import { generateSpeech as generateOpenAISpeech } from "./openaiProvider";

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
}

export const validateConnection = async (
  config: OpenRouterConfig,
): Promise<void> => {
  try {
    const response = await fetch(
      `${config.baseUrl || "https://openrouter.ai/api/v1"}/models`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `OpenRouter API Error: ${response.status} ${response.statusText}`,
      );
    }
  } catch (e: any) {
    throw new Error(e.message || "Failed to connect to OpenRouter API");
  }
};

export const getModels = async (
  config: OpenRouterConfig,
): Promise<ModelInfo[]> => {
  try {
    const response = await fetch(
      `${config.baseUrl || "https://openrouter.ai/api/v1"}/models`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const json = await response.json();

    return json.data.map((m: any) => {
      const capabilities = {
        text: false,
        image: false,
        video: false,
        audio: false,
      };

      // Parse architecture
      const parsedCaps = parseModelCapabilities(m.architecture);
      if (parsedCaps.text) capabilities.text = true;
      if (parsedCaps.image) capabilities.image = true;
      if (parsedCaps.audio) capabilities.audio = true;
      if (parsedCaps.video) capabilities.video = true;
      else {
        // Fallback to ID heuristics if architecture is missing
        const id = m.id.toLowerCase();
        if (
          id.includes("dall-e") ||
          id.includes("stable-diffusion") ||
          id.includes("flux") ||
          id.includes("midjourney")
        )
          capabilities.image = true;
        else capabilities.text = true; // Default to text
      }

      // Ensure at least one capability is true (default to text if nothing else found)
      if (
        !capabilities.text &&
        !capabilities.image &&
        !capabilities.video &&
        !capabilities.audio
      ) {
        capabilities.text = true;
      }

      return {
        id: m.id,
        name: m.name || m.id,
        capabilities,
      };
    });
  } catch (e) {
    console.warn("Failed to list OpenRouter models", e);
    return [];
  }
};

export const generateContent = async (
  config: OpenRouterConfig,
  model: string,
  systemInstruction: string,
  contents: any[],
  schema?: any,
  options?: {
    thinkingLevel?: "low" | "medium" | "high";
    mediaResolution?: "low" | "medium" | "high";
    temperature?: number;
    topP?: number;
    topK?: number;
    minP?: number;
    onChunk?: (text: string) => void;
    tools?: any[]; // Added tools support
  },
): Promise<{ result: any; usage: any; raw: any }> => {
  // Map contents to messages
  const messages = [
    { role: "system", content: systemInstruction },
    ...contents.map((c: any) => {
      if (c.role && c.content) return c; // Already OpenAI format
      if (c.role && c.parts) {
        // Map Gemini format to OpenAI
        // Handle function calls/responses in history if present
        if (c.parts[0].functionCall) {
            return {
                role: "assistant",
                tool_calls: c.parts.map((p: any) => ({
                    id: "call_" + Math.random().toString(36).substr(2, 9),
                    type: "function",
                    function: {
                        name: p.functionCall.name,
                        arguments: JSON.stringify(p.functionCall.args)
                    }
                }))
            };
        }
        if (c.parts[0].functionResponse) {
             return {
                 role: "tool",
                 tool_call_id: "call_" + Math.random().toString(36).substr(2, 9),
                 content: JSON.stringify(c.parts[0].functionResponse.response)
             };
        }

        return {
          role: c.role === "model" ? "assistant" : c.role,
          content: c.parts.map((p: any) => p.text).join("\n"),
        };
      }
      return c;
    }),
  ];

  // Map Tools to OpenAI Format
  let openAITools: any[] | undefined;
  if (options?.tools) {
      openAITools = options.tools.map(t => ({
          type: "function",
          function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters
          }
      }));
  }

  const body: any = {
    model: model,
    messages: messages,
    temperature: options?.temperature,
    top_p: options?.topP,
    top_k: options?.topK,
    min_p: options?.minP,
    stream: !!options?.onChunk,
    tools: openAITools,
    tool_choice: openAITools ? "auto" : undefined
  };

  if (schema) {
    // Check if schema is already in OpenAI format (has 'schema' property but no 'type' at top level, or specific structure)
    // The toOpenAIStrictSchema returns { name: 'response', strict: true, schema: { ... } }
    // Standard JSON Schema has 'type'.

    if (!schema.type && schema.schema) {
      // It's likely already wrapped
      body.response_format = {
        type: "json_schema",
        json_schema: schema,
      };
    } else {
      // It's a raw schema, wrap it
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
    const response = await fetch(
      `${config.baseUrl || "https://openrouter.ai/api/v1"}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `OpenRouter API Error: ${response.status}`,
      );
    }

    let content = "";
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let rawResult: any = {};
    let toolCalls: any[] = [];

    if (options?.onChunk) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (!reader) throw new Error("Failed to read response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line === "data: [DONE]") continue;
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.substring(6));
              const delta = json.choices?.[0]?.delta?.content || "";
              if (delta) {
                content += delta;
                options.onChunk(delta);
              }
              // Capture usage if present in last chunk
              if (json.usage) {
                usage = {
                  promptTokens: json.usage.prompt_tokens || 0,
                  completionTokens: json.usage.completion_tokens || 0,
                  totalTokens: json.usage.total_tokens || 0,
                };
              }
              rawResult = json;
            } catch (e) {
              console.warn("Error parsing stream chunk", e);
            }
          }
        }
      }
    } else {
      const result = await response.json();
      rawResult = result;
      const choice = result.choices[0];
      const message = choice?.message;
      content = message?.content || "";

      if (message?.tool_calls) {
          toolCalls = message.tool_calls.map((tc: any) => ({
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments)
          }));
      }

      if (choice?.finish_reason === "content_filter") {
        throw new Error(
          "OpenRouter content generation failed: Content filter triggered.",
        );
      }

      // Extract Usage
      usage = {
        promptTokens: result.usage?.prompt_tokens || 0,
        completionTokens: result.usage?.completion_tokens || 0,
        totalTokens: result.usage?.total_tokens || 0,
      };
    }

    // If we have tool calls, return them
    if (toolCalls.length > 0) {
        return { result: { functionCalls: toolCalls }, usage, raw: rawResult };
    }

    if (schema) {
      try {
        // Clean JSON before parsing (remove markdown code blocks if present)
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

  const body: any = {
    model: model,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  };

  // Provider-specific handling
  if (model.toLowerCase().includes("gemini")) {
    const chatBody = {
      model: model,
      messages: [{ role: "user", content: prompt }],
      // @ts-ignore
      image_config: { aspect_ratio: aspectRatio },
    };

    const response = await fetch(
      `${config.baseUrl || "https://openrouter.ai/api/v1"}/chat/completions`,
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
      `${config.baseUrl || "https://openrouter.ai/api/v1"}/images/generations`,
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
      baseUrl: config.baseUrl || "https://openrouter.ai/api/v1",
      modelId: model,
    },
    model,
    text,
    voiceName,
    options,
  );
};
