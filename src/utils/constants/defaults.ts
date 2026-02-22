import {
  CharacterStatus,
  AISettings,
  LanguageCode,
  ProviderManagement,
} from "../../types";

export const DEFAULT_CHARACTER: CharacterStatus = {
  name: "Initializing...",
  title: "Loading...",
  skills: [],
  conditions: [],
  hiddenTraits: [],
  status: "Pending",
  appearance: "Loading...",
  race: "",
  gender: "",
};

export const LANG_MAP: Record<LanguageCode, string> = {
  en: "English",
  zh: "Chinese (Simplified)",
};

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
      openaiApiMode: "response",
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
      openaiApiMode: "response",
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
  modelContextWindows: {},
  learnedModelContextWindows: {},
  learnedModelContextSuccessStreaks: {},
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
  lore: {
    providerId: "provider-1",
    modelId: "gemini-2.5-flash",
    enabled: true,
  },
  language: "zh",
  imageTimeout: 60, // 60 seconds
  lockEnvTheme: false,
  fixedEnvTheme: undefined, // No fixed theme by default
  disableEnvironmentalEffects: false,
  storyFontScaleLevel: 3,
  actionPanelFontScaleLevel: 3,
  typewriterSpeed: 10, // Default: 10ms per character
  stackItemsPerPage: 10, // Default: 10 items per page in stack layout (must be even)
  stackShowOutline: true, // Default: show outline in stack mode
  exportIncludeUserActions: false, // Default: don't include user/command in export
  // RAG Embedding Settings
  // Note: modelId is empty by default - user must select a model based on their provider
  // Different providers support different embedding models (e.g., Gemini: text-embedding-004, OpenAI: text-embedding-3-small)
  embedding: {
    enabled: false,
    runtime: "local_transformers",
    providerId: "provider-1",
    modelId: "", // No default - must be selected based on provider's available models
    local: {
      backend: "transformers_js",
      model: "use-lite-512",
      transformersModel: "Xenova/all-MiniLM-L6-v2",
      backendOrder: ["webgpu", "webgl", "cpu"],
      deviceOrder: ["webgpu", "wasm", "cpu"],
      batchSize: 8,
      quantized: true,
    },
    dimensions: 384, // Local transformers default embedding dimension
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
      maxRagStorageMB: 512, // Reclaimable RAG storage budget (MB)
    },
  },
  extra: {
    autoCompactEnabled: true,
    autoCompactThreshold: 0.7,
    vfsReadTokenBudgetPercent: 0.1,
    sessionHistoryLruLimit: 64,
    providerManagedMaxTokens: true,
    forceAutoToolChoice: true,
    toolCallCarousel: true,
    vfsVmExperimentalEnabled: false,
    visualMaxAgenticRounds: 3,
    visualMaxToolCalls: 24,
    visualRetryLimit: 3,
    culturePreference: "follow_story_setting",
    customInstructionEnabled: false,
    customInstruction: "",
    systemDefaultInjectionEnabled: true,
    narrativeStylePreset: "theme",
    worldDispositionPreset: "theme",
    playerMalicePreset: "theme",
    playerMaliceIntensity: "standard",
  },
};
