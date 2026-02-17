import type {
  ProviderInstance,
  ProviderProtocol,
  TokenUsage,
} from "../../../types";
import type { ZodTypeAny } from "zod";

import type { ZodToolDefinition } from "../../providers/types";

export interface ProviderModelCapabilities {
  supportsTools: boolean;
  supportsParallelTools: boolean;
  supportsImage: boolean;
  supportsVideo: boolean;
  supportsAudio: boolean;
  supportsEmbedding: boolean;
}

export interface ChatGenerateRequest {
  modelId: string;
  systemInstruction: string;
  /** provider-native messages; Provider 层不强制统一格式 */
  messages: unknown[];
  tools?: Array<Pick<ZodToolDefinition, "name" | "description" | "parameters">>;
  toolChoice?:
    | "auto"
    | "required"
    | "none"
    | { type: "function"; name: string };
  schema?: ZodTypeAny;
  /** 不支持 streaming，本项目可忽略 */
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
  maxOutputTokensFallback?: number;
  thinkingEffort?:
    | "xhigh"
    | "high"
    | "medium"
    | "low"
    | "minimal"
    | "none"
    | (string & {});
  mediaResolution?: "low" | "medium" | "high";
}

export interface ChatGenerateResponse {
  result: JsonObject | { functionCalls?: unknown[] } | string;
  usage: TokenUsage;
  raw: unknown;
}

export interface ImageGenerateRequest {
  modelId: string;
  prompt: string;
  resolution?: string;
}

export interface ImageGenerateResponse {
  url: string | null;
  usage?: TokenUsage;
  raw?: unknown;
  blob?: Blob;
}

export interface SpeechGenerateRequest {
  modelId: string;
  text: string;
  speed?: number;
  format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
  instructions?: string;
}

export interface SpeechGenerateResponse {
  audio: ArrayBuffer;
  usage?: TokenUsage;
  raw?: unknown;
}

export interface VideoGenerateRequest {
  modelId: string;
  prompt: string;
  resolution?: string;
}

export interface VideoGenerateResponse {
  url: string;
  usage?: TokenUsage;
  raw?: unknown;
}

export interface EmbeddingGenerateRequest {
  modelId: string;
  texts: string[];
  dimensions?: number;
}

export interface EmbeddingGenerateResponse {
  embeddings: Float32Array[];
  usage: { promptTokens: number; totalTokens: number };
  raw?: unknown;
}

export interface ProviderBase {
  protocol: ProviderProtocol;
  instanceId: string;
  instance: ProviderInstance;

  generateChat(request: ChatGenerateRequest): Promise<ChatGenerateResponse>;

  generateImage?(request: ImageGenerateRequest): Promise<ImageGenerateResponse>;
  generateSpeech?(
    request: SpeechGenerateRequest,
  ): Promise<SpeechGenerateResponse>;
  generateVideo?(request: VideoGenerateRequest): Promise<VideoGenerateResponse>;
  generateEmbedding?(
    request: EmbeddingGenerateRequest,
  ): Promise<EmbeddingGenerateResponse>;
}
