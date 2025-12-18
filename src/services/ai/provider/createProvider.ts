import type { ProviderInstance } from "../../../types";

import type { ZodTypeAny } from "zod";

import type {
  GeminiConfig,
  OpenAIConfig,
  OpenRouterConfig,
  ClaudeConfig,
} from "../../providers/types";

import {
  generateContent as generateGeminiContent,
  generateImage as generateGeminiImage,
  generateVideo as generateGeminiVideo,
  generateSpeech as generateGeminiSpeech,
  generateEmbedding as generateGeminiEmbedding,
  fromUnifiedMessages as fromUnifiedToGemini,
} from "../../providers/geminiProvider";

import {
  generateContent as generateOpenAIContent,
  generateImage as generateOpenAIImage,
  generateSpeech as generateOpenAISpeech,
  generateEmbedding as generateOpenAIEmbedding,
} from "../../providers/openaiProvider";

import {
  generateContent as generateOpenRouterContent,
  generateImage as generateOpenRouterImage,
  generateSpeech as generateOpenRouterSpeech,
  generateEmbedding as generateOpenRouterEmbedding,
} from "../../providers/openRouterProvider";

import {
  generateContent as generateClaudeContent,
  generateEmbedding as generateClaudeEmbedding,
} from "../../providers/claudeProvider";

import { createProviderConfig } from "./registry";
import type {
  ProviderBase,
  ProviderModelCapabilities,
  ChatGenerateRequest,
  ChatGenerateResponse,
  ImageGenerateRequest,
  ImageGenerateResponse,
  SpeechGenerateRequest,
  SpeechGenerateResponse,
  VideoGenerateRequest,
  VideoGenerateResponse,
  EmbeddingGenerateRequest,
  EmbeddingGenerateResponse,
} from "./interfaces";

function ensureSchema(schema?: ZodTypeAny): ZodTypeAny | undefined {
  return schema;
}

export function createProvider(instance: ProviderInstance): ProviderBase {
  return {
    protocol: instance.protocol,
    instanceId: instance.id,
    instance,

    async generateChat(
      request: ChatGenerateRequest,
    ): Promise<ChatGenerateResponse> {
      const cfg = createProviderConfig(instance) as
        | GeminiConfig
        | OpenAIConfig
        | OpenRouterConfig
        | ClaudeConfig;

      const options = {
        tools: request.tools,
        toolChoice: request.toolChoice as any,
        temperature: request.temperature,
        topP: request.topP,
        topK: request.topK,
        minP: request.minP,
        thinkingLevel: request.thinkingLevel,
        mediaResolution: request.mediaResolution,
        // streaming ignored by design
      };

      if (instance.protocol === "gemini") {
        // Convert UnifiedMessage[] to Gemini's native Content[] format
        const geminiMessages = fromUnifiedToGemini(request.messages as any);
        const { result, usage, raw } = await generateGeminiContent(
          cfg as GeminiConfig,
          request.modelId,
          request.systemInstruction,
          geminiMessages,
          ensureSchema(request.schema),
          options as any,
        );
        return { result, usage, raw };
      }
      if (instance.protocol === "openai") {
        const { result, usage, raw } = await generateOpenAIContent(
          cfg as OpenAIConfig,
          request.modelId,
          request.systemInstruction,
          request.messages as any,
          ensureSchema(request.schema),
          options as any,
        );
        return { result, usage, raw };
      }
      if (instance.protocol === "openrouter") {
        const { result, usage, raw } = await generateOpenRouterContent(
          cfg as OpenRouterConfig,
          request.modelId,
          request.systemInstruction,
          request.messages as any,
          ensureSchema(request.schema),
          options as any,
        );
        return { result, usage, raw };
      }
      if (instance.protocol === "claude") {
        const { result, usage, raw } = await generateClaudeContent(
          cfg as ClaudeConfig,
          request.modelId,
          request.systemInstruction,
          request.messages as any,
          ensureSchema(request.schema),
          options as any,
        );
        return { result, usage, raw };
      }

      throw new Error(
        `Chat generation not supported by protocol: ${instance.protocol}`,
      );
    },

    async generateImage(
      request: ImageGenerateRequest,
    ): Promise<ImageGenerateResponse> {
      const cfg = createProviderConfig(instance) as
        | GeminiConfig
        | OpenAIConfig
        | OpenRouterConfig
        | ClaudeConfig;

      let url: string | null = null;
      let usage;
      let raw;

      if (instance.protocol === "openai") {
        const res = await generateOpenAIImage(
          cfg as OpenAIConfig,
          request.modelId,
          request.prompt,
          request.resolution,
        );
        url = res.url;
        usage = res.usage;
        raw = res.raw;
      } else if (instance.protocol === "openrouter") {
        const res = await generateOpenRouterImage(
          cfg as OpenRouterConfig,
          request.modelId,
          request.prompt,
          request.resolution,
        );
        url = res.url;
        usage = res.usage;
        raw = res.raw;
      } else if (instance.protocol === "gemini") {
        const res = await generateGeminiImage(
          cfg as GeminiConfig,
          request.modelId,
          request.prompt,
          request.resolution,
        );
        url = res.url;
        usage = res.usage;
        raw = res.raw;
      } else {
        throw new Error(
          `Image generation not supported by protocol: ${instance.protocol}`,
        );
      }

      let blob: Blob | undefined;
      if (url) {
        try {
          const fetched = await fetch(url);
          if (fetched.ok) {
            blob = await fetched.blob();
          }
        } catch {
          // ignore
        }
      }

      return { url, usage, raw, blob };
    },

    async generateVideo(
      request: VideoGenerateRequest,
    ): Promise<VideoGenerateResponse> {
      if (instance.protocol !== "gemini") {
        throw new Error(
          `Video generation not supported by protocol: ${instance.protocol}`,
        );
      }
      const cfg = createProviderConfig(instance) as GeminiConfig;
      const res = await generateGeminiVideo(
        cfg,
        request.modelId,
        request.prompt,
        request.resolution,
      );
      return { url: res.url, usage: res.usage, raw: res.raw };
    },

    async generateSpeech(
      request: SpeechGenerateRequest,
    ): Promise<SpeechGenerateResponse> {
      const cfg = createProviderConfig(instance) as
        | GeminiConfig
        | OpenAIConfig
        | OpenRouterConfig
        | ClaudeConfig;

      if (instance.protocol === "openai") {
        const res = await generateOpenAISpeech(
          cfg as OpenAIConfig,
          request.modelId,
          request.text,
          "alloy",
          {
            speed: request.speed,
            format: request.format,
            instructions: request.instructions,
          },
        );
        return { audio: res.audio, usage: res.usage, raw: res.raw };
      }
      if (instance.protocol === "openrouter") {
        const res = await generateOpenRouterSpeech(
          cfg as OpenRouterConfig,
          request.modelId,
          request.text,
          "alloy",
          {
            speed: request.speed,
            format: request.format,
            instructions: request.instructions,
          },
        );
        return { audio: res.audio, usage: res.usage, raw: res.raw };
      }
      if (instance.protocol === "gemini") {
        const res = await generateGeminiSpeech(
          cfg as GeminiConfig,
          request.modelId,
          request.text,
          "Kore",
          {
            speed: request.speed,
            format: request.format,
            instructions: request.instructions,
          },
        );
        return { audio: res.audio, usage: res.usage, raw: res.raw };
      }

      throw new Error(
        `Speech generation not supported by protocol: ${instance.protocol}`,
      );
    },

    async generateEmbedding(
      request: EmbeddingGenerateRequest,
    ): Promise<EmbeddingGenerateResponse> {
      const cfg = createProviderConfig(instance) as
        | GeminiConfig
        | OpenAIConfig
        | OpenRouterConfig
        | ClaudeConfig;

      if (instance.protocol === "gemini") {
        const res = await generateGeminiEmbedding(
          cfg as GeminiConfig,
          request.modelId,
          request.texts,
          request.dimensions,
          undefined,
        );
        return {
          embeddings: res.embeddings,
          usage: {
            promptTokens: res.usage.promptTokens,
            totalTokens: res.usage.totalTokens,
          },
        };
      }
      if (instance.protocol === "openai") {
        const res = await generateOpenAIEmbedding(
          cfg as OpenAIConfig,
          request.modelId,
          request.texts,
          request.dimensions,
          undefined,
        );
        return {
          embeddings: res.embeddings,
          usage: {
            promptTokens: res.usage.promptTokens,
            totalTokens: res.usage.totalTokens,
          },
        };
      }
      if (instance.protocol === "openrouter") {
        const res = await generateOpenRouterEmbedding(
          cfg as OpenRouterConfig,
          request.modelId,
          request.texts,
          request.dimensions,
          undefined,
        );
        return {
          embeddings: res.embeddings,
          usage: {
            promptTokens: res.usage.promptTokens,
            totalTokens: res.usage.totalTokens,
          },
        };
      }
      if (instance.protocol === "claude") {
        const res = await generateClaudeEmbedding(
          cfg as ClaudeConfig,
          request.modelId,
          request.texts,
          request.dimensions,
          undefined,
        );
        return {
          embeddings: res.embeddings,
          usage: {
            promptTokens: res.usage.promptTokens,
            totalTokens: res.usage.totalTokens,
          },
        };
      }

      throw new Error(
        `Embedding not supported by protocol: ${instance.protocol}`,
      );
    },
  };
}
