import {
  CharacterStatus,
  AISettings,
  LanguageCode,
  EmbeddingConfig,
  ProviderManagement,
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

// Context Priority System: How many recent/alive entities to include in context
export const RECENT_LIMITS = {
  inventory: 5,
  relationships: 4,
  locations: 3,
  quests: 3,
  knowledge: 4,
  timeline: 5,
} as const;

export const LANG_MAP: Record<LanguageCode, string> = {
  en: "English",
  zh: "Chinese (Simplified)",
};

export const DEFAULT_OPENAI_BASE_URL = "https://openrouter.ai/api/v1";

// Default Provider Instances
export const DEFAULT_PROVIDERS: ProviderManagement = {
  instances: [
    {
      id: "provider-1",
      name: "Google Gemini",
      protocol: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com",
      apiKey: "",
      enabled: false,
      createdAt: Date.now(),
      lastModified: Date.now(),
    },
    {
      id: "provider-2",
      name: "OpenAI",
      protocol: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "",
      enabled: false,
      createdAt: Date.now(),
      lastModified: Date.now(),
    },
    {
      id: "provider-3",
      name: "OpenRouter",
      protocol: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "",
      enabled: false,
      createdAt: Date.now(),
      lastModified: Date.now(),
    },
    {
      id: "provider-4",
      name: "Anthropic Claude",
      protocol: "claude",
      baseUrl: "https://api.anthropic.com",
      apiKey: "",
      enabled: false,
      createdAt: Date.now(),
      lastModified: Date.now(),
    },
  ],
  nextId: 5,
};

// Default Models
export const DEFAULTS: AISettings = {
  providers: DEFAULT_PROVIDERS,
  contextLen: 10, // Summarize after 10 turns
  freshSegmentCount: 4, // Keep 4 fresh segments alongside summary for narrative continuity
  story: {
    providerId: "provider-1",
    modelId: "gemini-2.5-flash",
  },
  script: {
    providerId: "provider-1",
    modelId: "gemini-2.5-flash",
    enabled: true,
  },
  image: {
    providerId: "provider-1",
    modelId: "imagen-4.0-generate-001",
    enabled: true,
    resolution: "1344x768",
  },
  video: {
    providerId: "provider-1",
    modelId: "veo-3.1-fast-generate-preview",
    enabled: true,
  },
  audio: {
    providerId: "provider-1",
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
    providerId: "provider-1",
    modelId: "gemini-2.5-flash",
    enabled: true,
  },
  lore: {
    providerId: "provider-1",
    modelId: "gemini-2.5-flash",
    enabled: true,
  },
  language: "zh",
  imageTimeout: 60, // 60 seconds
  manualImageGen: true, // Auto-generate by default
  enableFallbackBackground: true,
  lockEnvTheme: false,
  disableEnvironmentalEffects: false,
  typewriterSpeed: 15, // Default: 15ms per character
  stackItemsPerPage: 10, // Default: 10 items per page in stack layout (must be even)
  stackShowOutline: true, // Default: show outline in stack mode
  exportIncludeUserActions: false, // Default: don't include user/command in export
  // RAG Embedding Settings
  // Note: modelId is empty by default - user must select a model based on their provider
  // Different providers support different embedding models (e.g., Gemini: text-embedding-004, OpenAI: text-embedding-3-small)
  embedding: {
    enabled: false,
    providerId: "provider-1",
    modelId: "", // No default - must be selected based on provider's available models
    dimensions: undefined, // Will be set when model is selected
    topK: 10,
    similarityThreshold: 0.65,
    // Storage Settings
    storage: {
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
