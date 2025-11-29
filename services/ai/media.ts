import {
  AISettings,
  LogEntry,
  TokenUsage,
  StorySegment,
  CharacterStatus,
  Relationship,
  ImageGenerationContext,
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

import { translationSchema } from "../schemas";

import {
  getSceneImagePrompt,
  getTranslationPrompt,
  getVeoScriptPrompt,
} from "../prompts/index";

import { GenerateContentResult, generateContentUnified } from "./core";

import { getProviderConfig, createLogEntry } from "./utils";

import { GameState } from "../../types";

// ============================================================================
// Image/Video/Speech Generation
// ============================================================================

/**
 * 生成场景图片
 * @param prompt 图片提示词
 * @param settings 设置对象
 * @param context 图片生成上下文
 */
export const generateSceneImage = async (
  prompt: string,
  settings: AISettings,
  context: ImageGenerationContext,
): Promise<{ url: string | null; log: LogEntry }> => {
  const providerInfo = getProviderConfig(settings, "image");
  if (!providerInfo || !providerInfo.enabled) {
    return {
      url: null,
      log: createLogEntry("none", "none", "image", { disabled: true }, null),
    };
  }

  const { instance, config, modelId, resolution } = providerInfo;
  const styledPrompt = getSceneImagePrompt(prompt, context);
  let url: string | null;
  let usage: TokenUsage | undefined;
  let raw: unknown;

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

  const log = createLogEntry(
    instance.protocol,
    modelId,
    "generateImage",
    { prompt: styledPrompt, resolution },
    raw,
    usage,
  );
  return { url, log };
};

/**
 * 翻译游戏内容
 * @param settings 设置对象
 * @param segments 故事片段
 * @param inventory 物品清单
 * @param character 角色状态
 * @param relationships 关系列表
 * @param targetLanguage 目标语言
 */
export const translateGameContent = async (
  settings: AISettings,
  segments: StorySegment[],
  inventory: string[],
  character: CharacterStatus,
  relationships: Relationship[],
  targetLanguage: string,
): Promise<{
  segments: StorySegment[];
  inventory: string[];
  character: CharacterStatus;
  relationships: Relationship[];
}> => {
  const providerInfo = getProviderConfig(settings, "translation");
  if (!providerInfo) {
    throw new Error("Translation provider not configured");
  }
  const { instance, modelId } = providerInfo;

  // 提取需要翻译的文本字段
  const segmentsToTranslate = segments.map((s) => ({
    id: s.id,
    text: s.text,
    choices: s.choices,
  }));

  const payload = {
    segments: segmentsToTranslate,
    inventory,
    character,
    relationships,
  };

  const prompt = getTranslationPrompt(targetLanguage, JSON.stringify(payload));
  const sys =
    "Professional translator. Translate all text fields while preserving JSON structure and IDs. Maintain tone and style appropriate to the content. Output valid JSON.";
  const contents = [{ role: "user", parts: [{ text: prompt }] }];

  try {
    const { result } = await generateContentUnified(
      instance.protocol,
      modelId,
      sys,
      contents,
      translationSchema,
      { settings }, // ✅ 添加缺失的 settings
    );

    // 合并翻译结果和原始 segments
    const translatedPayload = result as {
      segments: Array<{ id: string; text: string; choices: string[] }>;
      inventory: string[];
      character: CharacterStatus;
      relationships: Relationship[];
    };

    const mergedSegments = segments.map((originalSeg) => {
      const translated = translatedPayload.segments.find(
        (t) => t.id === originalSeg.id,
      );
      if (translated) {
        return {
          ...originalSeg,
          text: translated.text,
          choices: translated.choices,
        };
      }
      return originalSeg;
    });

    return {
      segments: mergedSegments,
      inventory: translatedPayload.inventory,
      character: translatedPayload.character,
      relationships: translatedPayload.relationships,
    };
  } catch (error) {
    // Fallback: return original
    return { segments, inventory, character, relationships };
  }
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
): Promise<string> => {
  const prompt = getVeoScriptPrompt(gameState, history, language);

  const providerInfo = getProviderConfig(settings, "script");
  if (!providerInfo) {
    throw new Error("Script provider not configured");
  }
  const { instance, modelId } = providerInfo;
  const sys =
    "You are an AWARD-WINNING cinematographer and visionary director. Transform the narrative into a publication-ready video generation script with professional cinematographic detail. Output the structured script directly.";
  const contents = [{ role: "user", parts: [{ text: prompt }] }];

  try {
    const { result } = await generateContentUnified(
      instance.protocol,
      modelId,
      sys,
      contents,
      undefined, // no schema for script generation
      { settings }, // ✅ 添加缺失的 settings
    );
    // result should be the text string since no schema was provided
    return typeof result === "string" ? result : JSON.stringify(result);
  } catch (e: unknown) {
    console.error("Veo script generation failed", e);
    return "Failed to generate script.";
  }
};
