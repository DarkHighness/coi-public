import {
  AISettings,
  LogEntry,
  TokenUsage,
  StorySegment,
  CharacterStatus,
  NPC,
  GameState,
  GameStateSnapshot,
} from "../../types";

import {
  GeminiConfig,
  OpenAIConfig,
  OpenRouterConfig,
  ClaudeConfig,
} from "../providers/types";

import {
  generateImage as generateGeminiImage,
  generateVideo as generateGeminiVideo,
  generateSpeech as generateGeminiSpeech,
} from "../providers/geminiProvider";

import {
  generateImage as generateOpenAIImage,
  generateSpeech as generateOpenAISpeech,
} from "../providers/openaiProvider";

import {
  generateImage as generateOpenRouterImage,
  generateSpeech as generateOpenRouterSpeech,
} from "../providers/openRouterProvider";

import { generateSpeech as generateClaudeSpeech } from "../providers/claudeProvider";

import { getSceneImagePrompt, getVeoScriptPrompt } from "../prompts/index";

import { createProvider } from "./provider/createProvider";

import { getProviderConfig, createLogEntry } from "./utils";
import {
  DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
  resolveModelContextWindowTokens,
} from "../modelContextWindows";
import { NON_STORY_OUTLINE_MAX_OUTPUT_TOKENS } from "../tokenBudget";

// ============================================================================
// Image/Video/Speech Generation
// ============================================================================

/**
 * 生成场景图片
 * @param prompt 图片提示词
 * @param settings 设置对象
 * @param gameState 游戏状态（包含完整的位置、角色、NPC 等信息）
 * @param snapshot 可选的状态快照（用于历史回放）
 */
export const generateSceneImage = async (
  prompt: string,
  settings: AISettings,
  gameState: GameState,
  snapshot?: GameStateSnapshot,
): Promise<{ url: string | null; log: LogEntry; blob?: Blob }> => {
  const providerInfo = getProviderConfig(settings, "image");
  if (!providerInfo || !providerInfo.enabled) {
    return {
      url: null,
      log: createLogEntry({
        provider: "none",
        model: "none",
        endpoint: "image",
        request: { disabled: true },
      }),
    };
  }

  const { instance, config, modelId, resolution } = providerInfo;
  const styledPrompt = getSceneImagePrompt(prompt, gameState, snapshot);
  let url: string | null;
  let usage: TokenUsage | undefined;
  let raw: unknown;
  let blob: Blob | undefined;

  console.log(
    "Generating image for prompt:",
    styledPrompt,
    "with model:",
    modelId,
    "and resolution:",
    resolution,
  );

  if (instance.protocol === "openai") {
    const response = await generateOpenAIImage(
      config as OpenAIConfig,
      modelId,
      styledPrompt,
      resolution,
    );
    url = response.url;
    usage = response.usage;
    raw = response.raw;
  } else if (instance.protocol === "openrouter") {
    const response = await generateOpenRouterImage(
      config as OpenRouterConfig,
      modelId,
      styledPrompt,
      resolution,
    );
    url = response.url;
    usage = response.usage;
    raw = response.raw;
  } else if (instance.protocol === "gemini") {
    const response = await generateGeminiImage(
      config as GeminiConfig,
      modelId,
      styledPrompt,
      resolution,
    );
    url = response.url;
    usage = response.usage;
    raw = response.raw;
  } else {
    throw new Error(
      `Image generation not supported by protocol: ${instance.protocol}`,
    );
  }

  // If we have a URL, try to fetch it as a blob to store in IndexedDB
  if (url) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        blob = await response.blob();
      }
    } catch (error) {
      console.warn("Failed to fetch image blob from URL:", url, error);
    }
  }

  const log = createLogEntry({
    provider: instance.protocol,
    model: modelId,
    endpoint: "generateImage",
    imagePrompt: styledPrompt,
    imageResolution: resolution,
    response: raw,
    usage,
  });
  return { url, log, blob };
};

/**
 * 生成 Veo 视频
 * @param settings 设置对象
 * @param imageBase64 图片的 Base64 编码
 * @param prompt 视频提示词
 */
export const generateVeoVideo = async (
  settings: AISettings,
  imageBase64: string,
  prompt: string,
): Promise<string> => {
  const providerInfo = getProviderConfig(settings, "video");
  if (!providerInfo || !providerInfo.enabled) {
    throw new Error("Video generation is disabled");
  }

  const { instance, config, modelId } = providerInfo;

  if (instance.protocol === "gemini") {
    const { url } = await generateGeminiVideo(
      config as GeminiConfig,
      modelId,
      imageBase64,
      prompt,
    );
    return url;
  }

  throw new Error(
    `Video generation not supported by protocol: ${instance.protocol}`,
  );
};

/**
 * 生成语音
 * @param settings 设置对象
 * @param text 要朗读的文本
 * @param voiceName 声音名称
 * @param narrativeTone 叙事语气
 */
export const generateSpeech = async (
  settings: AISettings,
  text: string,
  voiceName?: string,
  narrativeTone?: string,
): Promise<ArrayBuffer | null> => {
  const providerInfo = getProviderConfig(settings, "audio");
  if (!providerInfo || !providerInfo.enabled) {
    throw new Error("Audio generation is disabled");
  }

  const { instance, config, modelId } = providerInfo;
  const audioConfig = settings.audio;

  // Default options from settings
  const options: {
    speed: number;
    format: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
    instructions?: string;
  } = {
    speed: audioConfig.speed || 1.0,
    format:
      (audioConfig.format as "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm") ||
      "mp3",
  };

  // Determine target voice
  let targetVoice = voiceName || audioConfig.voice || "alloy";

  // Dynamic Voice Selection based on Tone
  if (!voiceName) {
    if (
      narrativeTone &&
      (instance.protocol === "openai" || instance.protocol === "openrouter")
    ) {
      const tone = narrativeTone.toLowerCase();
      if (
        tone.includes("suspense") ||
        tone.includes("tense") ||
        tone.includes("danger")
      ) {
        targetVoice = "onyx";
      } else if (
        tone.includes("cheerful") ||
        tone.includes("happy") ||
        tone.includes("energetic")
      ) {
        targetVoice = "nova";
      } else if (
        tone.includes("melancholy") ||
        tone.includes("sad") ||
        tone.includes("quiet")
      ) {
        targetVoice = "shimmer";
      } else if (
        tone.includes("calm") ||
        tone.includes("peaceful") ||
        tone.includes("mystical")
      ) {
        targetVoice = "alloy";
      } else if (tone.includes("royal") || tone.includes("authoritative")) {
        targetVoice = "fable";
      }
    }
  }

  // Model-specific handling
  if (modelId === "gpt-4o-mini-tts") {
    // Use instructions for tone
    if (narrativeTone) {
      options.instructions = `Speak in a ${narrativeTone} tone.`;
    }
  }

  try {
    if (instance.protocol === "openai") {
      const { audio } = await generateOpenAISpeech(
        config as OpenAIConfig,
        modelId,
        text,
        targetVoice,
        options,
      );
      return audio;
    } else if (instance.protocol === "openrouter") {
      const { audio } = await generateOpenRouterSpeech(
        config as OpenRouterConfig,
        modelId,
        text,
        targetVoice,
        options,
      );
      return audio;
    } else if (instance.protocol === "gemini") {
      // Gemini
      const geminiOptions = {
        ...options,
        instructions: narrativeTone, // Pass tone directly
      };

      const { audio } = await generateGeminiSpeech(
        config as GeminiConfig,
        modelId,
        text,
        targetVoice,
        geminiOptions,
      );
      return audio;
    } else if (instance.protocol === "claude") {
      const { audio } = await generateClaudeSpeech(
        config as ClaudeConfig,
        modelId,
        text,
        targetVoice,
        options,
      );
      return audio;
    } else {
      throw new Error(
        `Speech generation not supported by protocol: ${instance.protocol}`,
      );
    }
  } catch (error) {
    console.error("Speech generation failed", error);
    return null;
  }
};

/**
 * 生成 Veo 脚本
 * @param settings 设置对象
 * @param gameState 游戏状态
 * @param history 历史片段
 * @param language 语言
 */
export const generateVeoScript = async (
  settings: AISettings,
  gameState: GameState,
  history: StorySegment[],
  language: string = "English",
): Promise<{ script: string; log: LogEntry }> => {
  const prompt = getVeoScriptPrompt(gameState, history, language);

  const providerInfo = getProviderConfig(settings, "script");
  if (!providerInfo) {
    throw new Error("Script provider not configured");
  }
  const {
    instance,
    modelId,
    thinkingEffort,
    mediaResolution,
    temperature,
    topP,
    topK,
    minP,
  } = providerInfo;
  const contextWindowTokens = resolveModelContextWindowTokens({
    settings,
    providerId: instance.id,
    providerProtocol: instance.protocol,
    modelId,
    fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
  }).value;
  const sys =
    "You are an AWARD-WINNING cinematographer and visionary director. Transform the narrative into a publication-ready video generation script with professional cinematographic detail. Output the structured script directly.";
  const contents: unknown[] =
    instance.protocol === "gemini"
      ? ([{ role: "user", parts: [{ text: prompt }] }] as unknown[])
      : ([
          {
            role: "user",
            content: [{ type: "text", text: prompt }],
          },
        ] as unknown[]);

  try {
    const provider = createProvider(instance);
    const { result, usage, raw } = await provider.generateChat({
      modelId,
      systemInstruction: sys,
      messages: contents,
      schema: undefined,
      thinkingEffort,
      mediaResolution,
      temperature,
      topP,
      topK,
      minP,
      tokenBudget: {
        maxOutputTokensFallback: settings.extra?.maxOutputTokensFallback,
        contextWindowTokens,
        maxOutputTokensHardCap: NON_STORY_OUTLINE_MAX_OUTPUT_TOKENS,
      },
    });

    const script = typeof result === "string" ? result : JSON.stringify(result);

    const log = createLogEntry({
      provider: instance.protocol,
      model: modelId,
      endpoint: "generateVeoScript",
      response: raw,
      usage,
    });

    return { script, log };
  } catch (e: unknown) {
    console.error("Veo script generation failed", e);
    const log = createLogEntry({
      provider: instance.protocol,
      model: modelId,
      endpoint: "generateVeoScript",
      response: { error: e instanceof Error ? e.message : String(e) },
    });
    return { script: "Failed to generate script.", log };
  }
};
