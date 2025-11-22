import { CharacterStatus, AISettings, LanguageCode } from "../../types";

export const INITIAL_PROMPT =
  "Begin the adventure. Create a setting and character introduction.";

export const DEFAULT_CHARACTER: CharacterStatus = {
  name: "Initializing...",
  title: "Loading...",
  attributes: [],
  skills: [],
  status: "Pending",
  appearance: "Loading...",
};

export const LANG_MAP: Record<LanguageCode, string> = {
  en: "English",
  zh: "Chinese (Simplified)",
};

export const DEFAULT_OPENAI_BASE_URL = "https://openrouter.ai/api/v1";

// Default Models
export const DEFAULTS: AISettings = {
  gemini: {
    apiKey: undefined,
    baseUrl: undefined,
  },
  openai: {
    apiKey: undefined,
    baseUrl: DEFAULT_OPENAI_BASE_URL,
  },
  openrouter: {
    apiKey: undefined,
    baseUrl: "https://openrouter.ai/api/v1",
  },
  contextLen: 10, // Summarize after 10 turns
  story: {
    provider: "gemini",
    modelId: "gemini-3-pro-preview",
  },
  script: {
    provider: "gemini",
    modelId: "gemini-3-pro-preview",
    enabled: true,
  },
  image: {
    provider: "gemini",
    modelId: "imagen-4.0-generate-001",
    enabled: true,
    resolution: "512x512",
  },
  video: {
    provider: "gemini",
    modelId: "veo-3.1-fast-generate-preview",
    enabled: true,
  },
  audio: {
    provider: "gemini",
    modelId: "gemini-2.5-flash-preview-tts",
    enabled: true,
  },
  audioVolume: {
    bgmVolume: 0.5,
    bgmMuted: false,
    ttsVolume: 1.0,
    ttsMuted: false,
  },
  translation: {
    provider: "gemini",
    modelId: "gemini-2.5-flash",
    enabled: true,
  },
  lore: {
    provider: "gemini",
    modelId: "gemini-2.5-flash",
    enabled: true,
  },
  language: "en",
  imageTimeout: 60, // 60 seconds
  manualImageGen: false, // Auto-generate by default
};
