

import { GameResponse, StorySegment, AISettings, CharacterStatus, Relationship, StoryOutline, ModelInfo, TokenUsage, LogEntry, InventoryItem, Quest } from "../types";
import {
  GeminiConfig,
  generateContent as generateGeminiContent,
  generateImage as generateGeminiImage,
  generateVideo as generateGeminiVideo,
  generateSpeech as generateGeminiSpeech,
  getModels as getGeminiModels,
  validateConnection as validateGeminiConnection
} from "./providers/geminiProvider";
import {
  OpenAIConfig,
  generateContent as generateOpenAIContent,
  generateImage as generateOpenAIImage,
  generateSpeech as generateOpenAISpeech,
  getModels as getOpenAIModels,
  validateConnection as validateOpenAIConnection
} from "./providers/openaiProvider";
import {
  OpenRouterConfig,
  generateContent as generateOpenRouterContent,
  generateImage as generateOpenRouterImage,
  generateSpeech as generateOpenRouterSpeech,
  getModels as getOpenRouterModels,
  validateConnection as validateOpenRouterConnection
} from "./providers/openRouterProvider";
import { DEFAULTS, DEFAULT_OPENAI_BASE_URL } from "../utils/constants";
import { TRANSLATIONS } from "../utils/constants/translations";
import { gameResponseSchema, translationSchema, storyOutlineSchema, summarySchema } from "./schemas";
import { getEnvApiKey } from "../utils/env";
import {
  getCoreSystemInstruction,
  getStaticWorldContext,
  getDynamicStoryContext,
  getSceneImagePrompt,
  getItemDescriptionPrompt,
  getTranslationPrompt,
  getOutlinePrompt,
  getSummaryPrompt,
  getCurrentStateContext
} from "./prompts";
import { toOpenAIStrictSchema } from "../utils/openAISchemaConverter";

let geminiConfig: GeminiConfig = { apiKey: getEnvApiKey(), baseUrl: undefined };
let openaiConfig: OpenAIConfig = { apiKey: "", baseUrl: "", modelId: "" };
let openRouterConfig: OpenRouterConfig = { apiKey: "", baseUrl: "" };
let currentSettings: AISettings = JSON.parse(JSON.stringify(DEFAULTS));

export const updateAIConfig = (settings: AISettings) => {
  currentSettings = settings;
  const geminiBase = settings.gemini.baseUrl ? settings.gemini.baseUrl.replace(/\/+$/, "") : undefined;
  geminiConfig = { apiKey: settings.gemini.apiKey || getEnvApiKey(), baseUrl: geminiBase };

  const openaiBase = settings.openai.baseUrl ? settings.openai.baseUrl.replace(/\/+$/, "") : DEFAULT_OPENAI_BASE_URL;
  openaiConfig = { apiKey: settings.openai.apiKey || "", baseUrl: openaiBase, modelId: "" };

  const openRouterBase = settings.openrouter?.baseUrl ? settings.openrouter.baseUrl.replace(/\/+$/, "") : "https://openrouter.ai/api/v1";
  openRouterConfig = { apiKey: settings.openrouter?.apiKey || "", baseUrl: openRouterBase };
};

const getProviderConfig = (func: 'story' | 'image' | 'video' | 'audio' | 'translation' | 'lore') => {
  const config = currentSettings[func];
  return {
    provider: config.provider,
    modelId: config.modelId,
    enabled: config.enabled !== false,
    resolution: config.resolution,
    thinkingLevel: config.thinkingLevel,
    mediaResolution: config.mediaResolution
  };
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

// --- Cache ---
interface ModelCacheEntry {
  timestamp: number;
  data: ModelInfo[];
  configHash: string;
}

const modelCache: Record<string, ModelCacheEntry> = {};

// --- API Functions ---

export const getModels = async (provider: 'gemini' | 'openai' | 'openrouter', forceRefresh: boolean = false): Promise<ModelInfo[]> => {
  let config;
  if (provider === 'gemini') config = geminiConfig;
  else if (provider === 'openrouter') config = openRouterConfig;
  else config = { ...openaiConfig, apiKey: currentSettings.openai.apiKey || '' };

  const configHash = JSON.stringify(config);
  const cacheKey = provider;

  // Check cache
  if (!forceRefresh && modelCache[cacheKey] && modelCache[cacheKey].configHash === configHash) {
      return modelCache[cacheKey].data;
  }

  let models: ModelInfo[] = [];
  if (provider === 'gemini') models = await getGeminiModels(geminiConfig);
  else if (provider === 'openrouter') models = await getOpenRouterModels(openRouterConfig);
  else models = await getOpenAIModels(config as OpenAIConfig);

  // Update cache
  modelCache[cacheKey] = {
      timestamp: Date.now(),
      data: models,
      configHash
  };

  return models;
};

export const validateConnection = async (provider: 'gemini' | 'openai' | 'openrouter'): Promise<{ isValid: boolean; error?: string }> => {
  try {
    if (provider === 'gemini') {
      await validateGeminiConnection(geminiConfig);
    } else if (provider === 'openrouter') {
      await validateOpenRouterConnection(openRouterConfig);
    } else {
      await validateOpenAIConnection({ ...openaiConfig, apiKey: currentSettings.openai.apiKey || '' });
    }
    return { isValid: true };
  } catch (e: any) {
    console.error(`Validation failed for ${provider}`, e);
    return { isValid: false, error: e.message };
  }
};

export const filterModels = (models: ModelInfo[], type: 'story' | 'image' | 'video' | 'audio' | 'translation' | 'lore'): ModelInfo[] => {
  let filtered = models;

  if (type === 'image') {
      filtered = models.filter(m => m.capabilities?.image ?? (m.id.includes('imagen') || m.id.includes('dall-e') || m.id.includes('vision')));
  } else if (type === 'video') {
      filtered = models.filter(m => m.capabilities?.video ?? (m.id.includes('veo') || m.id.includes('sora')));
  } else if (type === 'audio') {
      filtered = models.filter(m => m.capabilities?.audio ?? (m.id.includes('gemini') || m.id.includes('tts') || m.id.includes('audio')));
  } else {
      // Text/Story/Lore/Translation
      filtered = models.filter(m => m.capabilities?.text ?? (!m.id.includes('dall-e') && !m.id.includes('tts') && !m.id.includes('veo')));
  }

  return filtered.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
};

// Unified Content Generation Helper
const generateContentUnified = async (
  provider: 'gemini' | 'openai' | 'openrouter',
  modelId: string,
  systemInstruction: string,
  contents: any[],
  schema?: any
): Promise<{ result: any, usage: any, raw: any, log: LogEntry }> => {
  let result, usage, raw;

  // Get options from current settings
  const storyConfig = getProviderConfig('story');
  const options = {
    thinkingLevel: storyConfig.thinkingLevel,
    mediaResolution: storyConfig.mediaResolution
  };

  if (provider === 'gemini') {
    ({ result, usage, raw } = await generateGeminiContent(geminiConfig, modelId, systemInstruction, contents, schema, options));
  } else {
    // Convert schema for OpenAI/OpenRouter
    const openAISchema = schema ? toOpenAIStrictSchema(schema) : undefined;
    const config = provider === 'openai' ? { ...openaiConfig, modelId } : openRouterConfig;

    if (provider === 'openai') {
      ({ result, usage, raw } = await generateOpenAIContent(config as OpenAIConfig, modelId, systemInstruction, contents, openAISchema, options));
    } else {
      ({ result, usage, raw } = await generateOpenRouterContent(config as OpenRouterConfig, modelId, systemInstruction, contents, openAISchema, options));
    }
  }

  const log = createLogEntry(provider, modelId, 'generateContent', { systemInstruction, contents }, raw, usage);
  return { result, usage, raw, log };
};

export const generateStoryOutline = async (
  theme: string,
  language: string,
  customContext?: string,
  tFunc?: (key: string) => any
): Promise<{ outline: StoryOutline, log: LogEntry }> => {
  const { provider, modelId } = getProviderConfig('story');

  let themeDataBackgroundTemplate: string;

  if (tFunc) {
    // Use dynamic translation function from React component
    themeDataBackgroundTemplate = tFunc(`themes.${theme}.backgroundTemplate`) || tFunc(`themes.fantasy.backgroundTemplate`);
  } else {
    // Fallback to static translations
    const langCode = getLangCode(language);
    const t = TRANSLATIONS[langCode];
    themeDataBackgroundTemplate = t.themes[theme]?.backgroundTemplate || t.themes.fantasy.backgroundTemplate;
  }

  const prompt = getOutlinePrompt(theme, language, customContext, themeDataBackgroundTemplate);
  const sys = "You are a master storyteller. Output strictly valid JSON.";
  const contents = [{ role: 'user', parts: [{ text: prompt }] }];

  const { result, log } = await generateContentUnified(provider, modelId, sys, contents, storyOutlineSchema);
  return { outline: result, log };
};

export const summarizeContext = async (textToSummarize: string, language: string): Promise<{ summary: string, log: LogEntry }> => {
  const { provider, modelId } = getProviderConfig('story');
  const prompt = getSummaryPrompt(textToSummarize, language);
  const sys = "You are a diligent scribe. Output strictly valid JSON.";
  const contents = [{ role: 'user', parts: [{ text: prompt }] }];

  try {
    const { result, log } = await generateContentUnified(provider, modelId, sys, contents, summarySchema);
    return { summary: result.summary, log };
  } catch (e: any) {
    console.error("Summary failed", e);
    return { summary: "", log: createLogEntry(provider, modelId, 'summary', { error: e.message }, null) };
  }
};

export const generateAdventureTurn = async (
  recentHistory: StorySegment[],
  accumulatedSummary: string,
  outline: StoryOutline | null,
  inventory: InventoryItem[],
  relationships: Relationship[],
  quests: Quest[],
  userAction: string,
  language: string = 'English',
  themeKey?: string,
  tFunc?: (key: string) => any
): Promise<{ response: GameResponse, log: LogEntry, usage: TokenUsage }> => {

  const { provider, modelId } = getProviderConfig('story');

  let narrativeStyle: string;
  let example: string | undefined;

  if (tFunc && themeKey) {
    // Use dynamic translation function from React component
    narrativeStyle = tFunc(`themes.${themeKey}.narrativeStyle`) || "Standard adventure tone.";
    example = tFunc(`themes.${themeKey}.example`);
  } else if (themeKey) {
    // Fallback to static translations
    const langCode = getLangCode(language);
    const t = TRANSLATIONS[langCode];
    narrativeStyle = t.themes[themeKey]?.narrativeStyle || "Standard adventure tone.";
    example = t.themes[themeKey]?.example;
  } else {
    narrativeStyle = "Standard adventure tone.";
    example = undefined;
  }

  // Split System Instruction for better KV Cache
  const coreSystemInstruction = getCoreSystemInstruction(language, narrativeStyle, example);
  const staticWorldContext = getStaticWorldContext(outline);
  const dynamicStoryContext = getDynamicStoryContext(accumulatedSummary);
  const currentStateContext = getCurrentStateContext(inventory, relationships, quests);

  // Combine system instructions
  const fullSystemInstruction = `${coreSystemInstruction}\n\n${staticWorldContext}`;

  // Construct contents
  const contents = [];

  // Inject dynamic summary if it exists
  if (dynamicStoryContext) {
      contents.push({ role: 'user', parts: [{ text: `[MEMORY RECALL]\n${dynamicStoryContext}` }] });
      contents.push({ role: 'model', parts: [{ text: "Memory accessed." }] });
  }

  // Inject current state
  contents.push({ role: 'user', parts: [{ text: `[CURRENT STATUS]\n${currentStateContext}` }] });
  contents.push({ role: 'model', parts: [{ text: "Status updated." }] });

  // Append History
  contents.push(...recentHistory.map(seg => ({
    role: seg.role,
    parts: [{ text: seg.text }]
  })));

  // Append Current Action
  contents.push({ role: 'user', parts: [{ text: userAction }] });

  const { result, log, usage } = await generateContentUnified(provider, modelId, fullSystemInstruction, contents, gameResponseSchema);
  return { response: result, log, usage };
};

export const generateSceneImage = async (prompt: string): Promise<{ url: string | null, log: LogEntry }> => {
  const { provider, modelId, enabled, resolution } = getProviderConfig('image');
  if (!enabled) return { url: null, log: createLogEntry('none', 'none', 'image', { disabled: true }, null) };

  const styledPrompt = getSceneImagePrompt(prompt);
  let url, usage, raw;

  if (provider === 'openai') {
     ({ url, usage, raw } = await generateOpenAIImage({ ...openaiConfig, modelId }, modelId, styledPrompt, resolution));
  } else if (provider === 'openrouter') {
     ({ url, usage, raw } = await generateOpenRouterImage(openRouterConfig, modelId, styledPrompt, resolution));
  } else {
     ({ url, usage, raw } = await generateGeminiImage(geminiConfig, modelId, styledPrompt, resolution));
  }

  const log = createLogEntry(provider, modelId, 'generateImage', { prompt: styledPrompt, resolution }, raw, usage);
  return { url, log };
};

export const getItemDescription = async (item: string, context: string, language: string): Promise<{ description: string; lore: string }> => {
  const { provider, modelId } = getProviderConfig('lore');
  const prompt = getItemDescriptionPrompt(item, context, language);
  const sys = "You are a creative game writer. Output valid JSON.";
  const contents = [{ role: 'user', parts: [{ text: prompt }] }];

  try {
    // Note: No schema passed here in original code, but we expect JSON.
    // The prompt likely asks for JSON.
    // We can try to pass a schema if we had one, but for now let's rely on the prompt + JSON mode if available.
    // Or we can define a simple schema for item description.
    // For now, let's pass undefined schema and hope the provider returns JSON (Gemini does via responseMimeType, OpenAI via json_object).
    // Actually, generateContentUnified handles schema conversion. If no schema, it defaults to json_object for OpenAI.

    const { result } = await generateContentUnified(provider, modelId, sys, contents);
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
  const contents = [{ role: 'user', parts: [{ text: prompt }] }];

  try {
    const { result } = await generateContentUnified(provider, modelId, sys, contents, translationSchema);
    return result;
  } catch (error) {
    // Fallback: return original
    return payload as any;
  }
};

export const generateVeoVideo = async (imageBase64: string, prompt: string): Promise<string> => {
  const { provider, modelId, enabled } = getProviderConfig('video');
  if (!enabled) throw new Error("Disabled");

  if (provider === 'gemini') {
    const { url } = await generateGeminiVideo(geminiConfig, modelId, imageBase64, prompt);
    return url;
  }

  throw new Error(`Video generation not supported by ${provider}`);
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
  const { provider, modelId, enabled } = getProviderConfig('audio');
  const audioConfig = currentSettings.audio; // Access full config for gender
  if (!enabled) throw new Error("Disabled");

  const options = { gender: audioConfig.gender };

  if (provider === 'openai') {
     const { audio } = await generateOpenAISpeech({ ...openaiConfig, modelId }, modelId, text, voiceName, options);
     return audio;
  } else if (provider === 'openrouter') {
     const { audio } = await generateOpenRouterSpeech(openRouterConfig, modelId, text, voiceName, options);
     return audio;
  } else {
     const { audio } = await generateGeminiSpeech(geminiConfig, modelId, text, voiceName);
     return audio;
  }
};