import {
  CharacterStatus,
  AISettings,
  LanguageCode,
  EmbeddingConfig,
} from "../../types";

export const INITIAL_PROMPT =
  "Begin the adventure. Create a setting and character introduction.";

export const DEFAULT_CHARACTER: CharacterStatus = {
  name: "Initializing...",
  title: "Loading...",
  attributes: [],
  skills: [],
  conditions: [],
  hiddenTraits: [],
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
    apiKey: "",
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
    resolution: "1344x768",
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
  manualImageGen: true, // Auto-generate by default
  enableFallbackBackground: true,
  lockEnvTheme: false,
  // RAG Embedding Settings
  embedding: {
    enabled: false,
    provider: "gemini",
    modelId: "text-embedding-004",
    dimensions: 768,
    topK: 10,
    similarityThreshold: 0.65,
    // LRU Eviction Settings
    lru: {
      maxMemoryDocuments: 1000, // In-memory cache limit
      maxStorageDocuments: 10000, // Persistent storage limit
      maxDocumentsPerType: 2000, // Per-type limit (story, npc, location, etc.)
      maxVersionsPerEntity: 5, // Per-entity limit (e.g., max 5 versions of item:1)
      maxVersionsAcrossForks: 10, // Max versions across forks
      currentForkBonus: 0.5, // Priority bonus for current fork
      ancestorForkBonus: 0.25, // Priority bonus for ancestor forks
      turnDecayFactor: 0.01, // Priority loss per turn difference
    },
  },
};
