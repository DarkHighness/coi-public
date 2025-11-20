
import { GameResponse, StorySegment, AISettings, CharacterStatus, Relationship, StoryOutline, ModelInfo, TokenUsage, LogEntry } from "../types";
import {
  GeminiConfig,
  generateGeminiJson,
  generateGeminiImage,
  generateGeminiVideo,
  generateGeminiSpeech,
  fetchGeminiModels,
  validateGeminiConnection
} from "./providers/geminiProvider";
import { OpenAIConfig, fetchOpenAICompletion, generateOpenAIImage, generateOpenAISpeech, fetchOpenAIModels, validateOpenAIConnection } from "./providers/openaiProvider";
import { DEFAULTS, DEFAULT_OPENAI_BASE_URL, TRANSLATIONS } from "../utils/constants";
import { gameResponseSchema, translationSchema, storyOutlineSchema, summarySchema } from "./schemas";
import { getEnvApiKey } from "../utils/env";
import {
  getAdventureSystemInstruction,
  getSceneImagePrompt,
  getItemDescriptionPrompt,
  getTranslationPrompt,
  getOutlinePrompt,
  getSummaryPrompt
} from "./prompts";
import { toOpenAIStrictSchema } from "../utils/openAISchemaConverter";
import { THEMES } from "../utils/constants/themes"; // Keep for fallback if needed, or remove if fully migrated. Keeping for now just in case.

let geminiConfig: GeminiConfig = { apiKey: getEnvApiKey(), baseUrl: undefined };
let openaiConfig: OpenAIConfig = { apiKey: "", baseUrl: "", modelId: "" };
let currentSettings: AISettings = JSON.parse(JSON.stringify(DEFAULTS));

export const updateAIConfig = (settings: AISettings) => {
  currentSettings = settings;
  const geminiBase = settings.gemini.baseUrl ? settings.gemini.baseUrl.replace(/\/+$/, "") : undefined;
  geminiConfig = { apiKey: settings.gemini.apiKey || getEnvApiKey(), baseUrl: geminiBase };


  const openaiBase = settings.openai.baseUrl ? settings.openai.baseUrl.replace(/\/+$/, "") : DEFAULT_OPENAI_BASE_URL;
  openaiConfig = { apiKey: settings.openai.apiKey || "", baseUrl: openaiBase, modelId: "" };
};

const getProviderConfig = (func: 'story' | 'image' | 'video' | 'audio' | 'translation' | 'lore') => {
  const config = currentSettings[func];
  return { provider: config.provider, modelId: config.modelId, enabled: config.enabled !== false };
};

// --- Helpers ---

const createLogEntry = (
  provider: string,
  model: string,
  endpoint: string,
  req: any,
  res: any,
  usage?: TokenUsage
): LogEntry => ({
  id: Date.now().toString() + Math.random().toString(36).substring(7),
  timestamp: Date.now(),
  provider,
  model,
  endpoint,
  request: req,
  response: res,
  usage
});

const getLangCode = (language: string): 'en' | 'zh' => {
  if (language.toLowerCase().includes('chinese') || language.toLowerCase().includes('zh')) return 'zh';
  return 'en';
};

// --- API Functions ---

export const getModels = async (provider: 'gemini' | 'openai'): Promise<ModelInfo[]> => {
  if (provider === 'gemini') return await fetchGeminiModels(geminiConfig);
  return await fetchOpenAIModels({ ...openaiConfig, apiKey: currentSettings.openai.apiKey || '' });
};

export const validateConnection = async (provider: 'gemini' | 'openai'): Promise<{ isValid: boolean; error?: string }> => {
  try {
    if (provider === 'gemini') {
      await validateGeminiConnection(geminiConfig);
    } else {
      await validateOpenAIConnection({ ...openaiConfig, apiKey: currentSettings.openai.apiKey || '' });
    }
    return { isValid: true };
  } catch (e: any) {
    console.error(`Validation failed for ${provider}`, e);
    return { isValid: false, error: e.message };
  }
};

export const generateStoryOutline = async (
  theme: string,
  language: string,
  customContext?: string
): Promise<{ outline: StoryOutline, log: LogEntry }> => {
  const { provider, modelId } = getProviderConfig('story');

  const langCode = getLangCode(language);
  const t = TRANSLATIONS[langCode];
  const themeData = t.themes[theme] || t.themes.fantasy;

  const prompt = getOutlinePrompt(theme, language, customContext, themeData.backgroundTemplate);
  const sys = "You are a master storyteller. Output strictly valid JSON.";

  let result, usage, raw;

  if (provider === 'openai') {
    const specificConfig = { ...openaiConfig, modelId: modelId };
    const schema = toOpenAIStrictSchema(storyOutlineSchema);
    ({ result, usage, raw } = await fetchOpenAICompletion(specificConfig, sys, [{ role: "user", content: prompt }], schema));
    const log = createLogEntry('openai', modelId, 'chat/completions', { system: sys, prompt }, raw, usage);
    return { outline: result, log };
  } else {
    // ... gemini implementation
    ({ result, usage, raw } = await generateGeminiJson(geminiConfig, modelId, [{ role: 'user', parts: [{ text: prompt }] }], sys, storyOutlineSchema));
    const log = createLogEntry('gemini', modelId, 'generateContent', { system: sys, prompt }, raw, usage);
    return { outline: result, log };
  }
};

export const summarizeContext = async (textToSummarize: string, language: string): Promise<{ summary: string, log: LogEntry }> => {
  const { provider, modelId } = getProviderConfig('story');
  const prompt = getSummaryPrompt(textToSummarize, language);
  const sys = "You are a diligent scribe. Output strictly valid JSON.";

  let result, usage, raw;
  try {
    if (provider === 'openai') {
      const specificConfig = { ...openaiConfig, modelId: modelId };
      const schema = toOpenAIStrictSchema(summarySchema);
      ({ result, usage, raw } = await fetchOpenAICompletion(specificConfig, sys, [{ role: "user", content: prompt }], schema));
      const log = createLogEntry('openai', modelId, 'chat/completions', { prompt }, raw, usage);
      return { summary: result.summary, log };
    } else {
      // ... gemini implementation
      ({ result, usage, raw } = await generateGeminiJson(geminiConfig, modelId, [{ role: 'user', parts: [{ text: prompt }] }], sys, summarySchema));
      const log = createLogEntry('gemini', modelId, 'generateContent', { prompt }, raw, usage);
      return { summary: result.summary, log };
    }
  } catch (e) {
    console.error("Summary failed", e);
    return { summary: "", log: createLogEntry(provider, modelId, 'summary', { error: e }, null) };
  }
};

export const generateAdventureTurn = async (
  recentHistory: StorySegment[],
  accumulatedSummary: string,
  outline: StoryOutline | null,
  userAction: string,
  language: string = 'English',
  themeKey?: string
): Promise<{ response: GameResponse, log: LogEntry, usage: TokenUsage }> => {

  const { provider, modelId } = getProviderConfig('story');

  const langCode = getLangCode(language);
  const t = TRANSLATIONS[langCode];
  const themeData = themeKey ? t.themes[themeKey] : undefined;

  // Fallback or use data
  const narrativeStyle = themeData?.narrativeStyle || "Standard adventure tone.";
  const example = themeData?.example;

  const systemInstruction = getAdventureSystemInstruction(language, outline, accumulatedSummary, narrativeStyle, example);


  let result, usage, raw;

  if (provider === 'openai') {
    const messages = recentHistory.map(seg => ({
      role: seg.role === 'model' ? 'assistant' : 'user',
      content: seg.text
    }));
    messages.push({ role: 'user', content: userAction });
    const specificConfig = { ...openaiConfig, modelId: modelId };
    const schema = toOpenAIStrictSchema(gameResponseSchema);

    ({ result, usage, raw } = await fetchOpenAICompletion(specificConfig, systemInstruction, messages, schema));
    const log = createLogEntry('openai', modelId, 'chat/completions', { systemInstruction, messages }, raw, usage);
    return { response: result, log, usage };
  } else {
    // ... gemini implementation
    const historyParts = recentHistory.map(seg => ({
      role: seg.role,
      parts: [{ text: seg.text }]
    }));
    const contents = [...historyParts, { role: 'user', parts: [{ text: userAction }] }];

    ({ result, usage, raw } = await generateGeminiJson(geminiConfig, modelId, contents, systemInstruction, gameResponseSchema));
    const log = createLogEntry('gemini', modelId, 'generateContent', { systemInstruction, contents }, raw, usage);
    return { response: result, log, usage };
  }
};

export const generateSceneImage = async (prompt: string): Promise<{ url: string | null, log: LogEntry }> => {
  const { provider, modelId, enabled } = getProviderConfig('image');
  if (!enabled) return { url: null, log: createLogEntry('none', 'none', 'image', { disabled: true }, null) };

  const styledPrompt = getSceneImagePrompt(prompt);
  let url, usage, raw;

  if (provider === 'openai') {
     const specificConfig = { ...openaiConfig, modelId: modelId };
     ({ url, usage, raw } = await generateOpenAIImage(specificConfig, styledPrompt));
     const log = createLogEntry('openai', modelId, 'images/generations', { prompt: styledPrompt }, raw, usage);
     return { url, log };
  } else {
     ({ url, usage, raw } = await generateGeminiImage(geminiConfig, modelId, styledPrompt));
     const log = createLogEntry('gemini', modelId, 'generateImages', { prompt: styledPrompt }, raw, usage);
     return { url, log };
  }
};

export const getItemDescription = async (item: string, context: string, language: string): Promise<{ description: string; lore: string }> => {
  const { provider, modelId } = getProviderConfig('lore');
  const prompt = getItemDescriptionPrompt(item, context, language);
  const sys = "You are a creative game writer. Output valid JSON.";

  try {
    let result;
    if (provider === 'openai') {
       const specificConfig = { ...openaiConfig, modelId: modelId };
       // Note: getItemDescription doesn't have a strict schema defined in schemas.ts yet, it returns any.
       // For now, we might need to define one or fallback to json_object if no schema passed.
       // But fetchOpenAICompletion now expects schema or defaults to json_object if undefined.
       // Let's use json_object for now as there is no schema imported for this.
       ({ result } = await fetchOpenAICompletion(specificConfig, sys, [{ role: "user", content: prompt }]));
    } else {
       ({ result } = await generateGeminiJson(geminiConfig, modelId, [{role: 'user', parts: [{ text: prompt }]}], sys));
    }
    return result;
  } catch (e) {
    return { description: "A mysterious object.", lore: "Origins unknown." };
  }
};

export const translateGameContent = async (
  segments: StorySegment[],
  inventory: string[],
  currentQuest: string,
  character: CharacterStatus,
  relationships: Relationship[],
  targetLanguage: string
): Promise<{ segments: any[]; inventory: string[]; currentQuest: string; character: CharacterStatus; relationships: Relationship[] }> => {

  const { provider, modelId } = getProviderConfig('translation');
  const payload = {
      segments: segments.map(s => ({ id: s.id, text: s.text, choices: s.choices })),
      inventory,
      currentQuest,
      character,
      relationships
  };
  const prompt = getTranslationPrompt(targetLanguage, JSON.stringify(payload));
  const sys = "Translator. Output valid JSON.";

  try {
    let result;
    if (provider === 'openai') {
       const specificConfig = { ...openaiConfig, modelId: modelId };
       const schema = toOpenAIStrictSchema(translationSchema);
       ({ result } = await fetchOpenAICompletion(specificConfig, sys, [{ role: "user", content: prompt }], schema));
    } else {
      ({ result } = await generateGeminiJson(geminiConfig, modelId, [{ role: 'user', parts: [{ text: prompt }]}], sys, translationSchema));
    }
    return result;
  } catch (error) {
    // Fallback: return original
    return payload as any;
  }
};

export const generateVeoVideo = async (imageBase64: string, prompt: string): Promise<string> => {
  const { provider, modelId, enabled } = getProviderConfig('video');
  if (!enabled) throw new Error("Disabled");
  if (provider === 'openai') throw new Error("Not supported");
  const { url } = await generateGeminiVideo(geminiConfig, modelId, imageBase64, prompt);
  return url;
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
  const { provider, modelId, enabled } = getProviderConfig('audio');
  if (!enabled) throw new Error("Disabled");

  if (provider === 'openai') {
     const specificConfig = { ...openaiConfig, modelId: modelId };
     const { audio } = await generateOpenAISpeech(specificConfig, text);
     return audio;
  } else {
     const { audio } = await generateGeminiSpeech(geminiConfig, modelId, text, voiceName);
     return audio;
  }
};