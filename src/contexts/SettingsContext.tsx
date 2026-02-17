import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { AISettings, ModelInfo, LanguageCode } from "../types";
import { DEFAULTS } from "../utils/constants";
import { getModels } from "../services/aiService";
import { upsertPerModelContextWindowOverride } from "../services/modelContextWindows";

const STORAGE_KEY = "chronicles_aisettings";
const MODEL_CACHE_KEY = "chronicles_model_cache";

interface SettingsContextType {
  settings: AISettings;
  updateSettings: (
    newSettings:
      | AISettings
      | Partial<AISettings>
      | ((prev: AISettings) => AISettings | Partial<AISettings>),
  ) => void;
  resetSettings: () => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  themeMode: "day" | "night" | "system";
  setThemeMode: (mode: "day" | "night" | "system") => void;
  toggleThemeMode: () => void;
  providerModels: Record<string, ModelInfo[]>;
  isLoadingModels: boolean;
  loadModels: (force?: boolean) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error(
      "useSettingsContext must be used within a SettingsProvider",
    );
  }
  return context;
};

/**
 * Merge saved settings with defaults to ensure all fields exist
 */
function mergeSettings(parsed: Partial<AISettings>): AISettings {
  // Remove deprecated fields (kept for backward compatibility in saved JSON).
  const sanitized: Partial<AISettings> & Record<string, unknown> = {
    ...parsed,
  };
  delete sanitized.freshSegmentCount;
  delete sanitized.contextLen;

  if (
    typeof sanitized.maxContextTokens === "number" &&
    Number.isFinite(sanitized.maxContextTokens) &&
    sanitized.maxContextTokens > 0 &&
    parsed.story?.providerId &&
    parsed.story?.modelId
  ) {
    sanitized.modelContextWindows = upsertPerModelContextWindowOverride(
      sanitized.modelContextWindows,
      parsed.story.providerId,
      parsed.story.modelId,
      sanitized.maxContextTokens,
    );
  }
  delete sanitized.maxContextTokens;

  const legacyExtra = parsed.extra || {};
  type LegacyExtraCompat = {
    clearerSearchTool?: unknown;
    customPromptInjection?: unknown;
    promptInjectionEnabled?: unknown;
  };
  const migratedExtra: AISettings["extra"] & LegacyExtraCompat = {
    ...DEFAULTS.extra,
    ...legacyExtra,
  };

  // Migrate legacy prompt injection fields -> custom instruction.
  if (
    migratedExtra.customInstruction == null &&
    typeof migratedExtra.customPromptInjection === "string"
  ) {
    migratedExtra.customInstruction = migratedExtra.customPromptInjection;
  }
  if (
    migratedExtra.customInstructionEnabled == null &&
    typeof migratedExtra.promptInjectionEnabled === "boolean"
  ) {
    migratedExtra.customInstructionEnabled =
      migratedExtra.promptInjectionEnabled;
  }
  // Remove retired setting; kept here only for backward compatibility.
  delete migratedExtra.clearerSearchTool;
  delete migratedExtra.customPromptInjection;
  delete migratedExtra.promptInjectionEnabled;

  return {
    ...DEFAULTS,
    ...sanitized,
    modelContextWindows: {
      ...(DEFAULTS.modelContextWindows || {}),
      ...(sanitized.modelContextWindows || {}),
    },
    learnedModelContextWindows: {
      ...(DEFAULTS.learnedModelContextWindows || {}),
      ...(sanitized.learnedModelContextWindows || {}),
    },
    learnedModelContextSuccessStreaks: {
      ...(DEFAULTS.learnedModelContextSuccessStreaks || {}),
      ...(sanitized.learnedModelContextSuccessStreaks || {}),
    },
    providers: {
      ...DEFAULTS.providers,
      ...(sanitized.providers || {}),
      instances: sanitized.providers?.instances || DEFAULTS.providers.instances,
      nextId: sanitized.providers?.nextId || DEFAULTS.providers.nextId,
    },
    story: { ...DEFAULTS.story, ...(sanitized.story || {}) },
    script: { ...DEFAULTS.script, ...(sanitized.script || {}) },
    image: { ...DEFAULTS.image, ...(sanitized.image || {}) },
    video: { ...DEFAULTS.video, ...(sanitized.video || {}) },
    audio: { ...DEFAULTS.audio, ...(sanitized.audio || {}) },
    audioVolume: {
      ...DEFAULTS.audioVolume,
      ...(sanitized.audioVolume || {}),
    },
    typewriterSpeed: sanitized.typewriterSpeed ?? DEFAULTS.typewriterSpeed,
    stackItemsPerPage:
      sanitized.stackItemsPerPage ?? DEFAULTS.stackItemsPerPage,
    lore: { ...DEFAULTS.lore, ...(sanitized.lore || {}) },
    embedding: {
      ...DEFAULTS.embedding,
      ...(sanitized.embedding || {}),
      lru: {
        ...DEFAULTS.embedding.lru,
        ...(sanitized.embedding?.lru || {}),
      },
    },
    extra: migratedExtra,
  };
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { i18n } = useTranslation();

  // Initialize settings from localStorage
  const [settings, setSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return mergeSettings(parsed);
      } catch (e) {
        console.error("Failed to parse settings", e);
        return DEFAULTS;
      }
    }
    return DEFAULTS;
  });

  // Model cache state
  const [providerModels, setProviderModels] = useState<
    Record<string, ModelInfo[]>
  >({});
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Theme mode state
  const [themeMode, setThemeMode] = useState<"day" | "night" | "system">(() => {
    const saved = localStorage.getItem("chronicles_theme_mode");
    return saved === "day" || saved === "night" || saved === "system"
      ? saved
      : "system";
  });

  // Ref to track current settings for async operations
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Sync language with settings on mount and when settings change
  useEffect(() => {
    // Sync language with i18n
    if (settings.language && settings.language !== i18n.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings, i18n]);

  // Auto-replace unavailable providers with available ones
  useEffect(() => {
    const availableProviders = settings.providers.instances.filter(
      (p) => p.enabled && p.apiKey && p.apiKey.trim() !== "",
    );

    if (availableProviders.length === 0) {
      // No available providers, nothing to do
      return;
    }

    let needsUpdate = false;
    const newSettings = { ...settings };

    // Helper to check if a provider is available
    const isProviderAvailable = (providerId: string) => {
      return availableProviders.some((p) => p.id === providerId);
    };

    // Helper to get first available provider
    const getFirstAvailableProvider = () => {
      return availableProviders[0].id;
    };

    // Check and replace story provider
    if (!isProviderAvailable(settings.story.providerId)) {
      newSettings.story = {
        ...settings.story,
        providerId: getFirstAvailableProvider(),
      };
      needsUpdate = true;
    }

    // Check and replace lore provider
    if (!isProviderAvailable(settings.lore.providerId)) {
      newSettings.lore = {
        ...settings.lore,
        providerId: getFirstAvailableProvider(),
      };
      needsUpdate = true;
    }

    // Check and replace script provider
    if (!isProviderAvailable(settings.script.providerId)) {
      newSettings.script = {
        ...settings.script,
        providerId: getFirstAvailableProvider(),
      };
      needsUpdate = true;
    }

    // Check and replace image provider
    if (!isProviderAvailable(settings.image.providerId)) {
      newSettings.image = {
        ...settings.image,
        providerId: getFirstAvailableProvider(),
      };
      needsUpdate = true;
    }

    // Check and replace video provider
    if (!isProviderAvailable(settings.video.providerId)) {
      newSettings.video = {
        ...settings.video,
        providerId: getFirstAvailableProvider(),
      };
      needsUpdate = true;
    }

    // Check and replace audio provider
    if (!isProviderAvailable(settings.audio.providerId)) {
      newSettings.audio = {
        ...settings.audio,
        providerId: getFirstAvailableProvider(),
      };
      needsUpdate = true;
    }

    // Check and replace embedding provider
    if (
      settings.embedding?.enabled &&
      !isProviderAvailable(settings.embedding.providerId)
    ) {
      newSettings.embedding = {
        ...settings.embedding,
        providerId: getFirstAvailableProvider(),
      };
      needsUpdate = true;
    }

    if (needsUpdate) {
      setSettings(newSettings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    }
  }, [settings.providers.instances]);

  /**
   * Update settings and persist to localStorage
   * Supports both full settings replacement and partial updates
   */
  const updateSettings = useCallback(
    (
      newSettings:
        | AISettings
        | Partial<AISettings>
        | ((prev: AISettings) => AISettings | Partial<AISettings>),
    ) => {
      // Resolve the new settings if it's a function
      const resolvedSettings =
        typeof newSettings === "function"
          ? newSettings(settingsRef.current)
          : newSettings;

      const isFullSettings = (
        s: AISettings | Partial<AISettings>,
      ): s is AISettings => {
        return (
          "providers" in s &&
          "story" in s &&
          "audioVolume" in s &&
          "language" in s
        );
      };

      const mergedSettings = isFullSettings(resolvedSettings)
        ? resolvedSettings
        : mergeSettings({ ...settingsRef.current, ...resolvedSettings });

      setSettings(mergedSettings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedSettings));
    },
    [],
  );

  /**
   * Set language and update settings
   */
  const setLanguage = useCallback(
    (lang: LanguageCode) => {
      const newSettings = { ...settingsRef.current, language: lang };
      updateSettings(newSettings);
      i18n.changeLanguage(lang);
    },
    [updateSettings, i18n],
  );

  /**
   * Reset settings to defaults
   */
  const resetSettings = useCallback(() => {
    setSettings(DEFAULTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS));
    i18n.changeLanguage(DEFAULTS.language);
  }, [i18n]);

  /**
   * Set theme mode
   */
  const setThemeModeValue = useCallback((mode: "day" | "night" | "system") => {
    setThemeMode(mode);
    localStorage.setItem("chronicles_theme_mode", mode);
  }, []);

  /**
   * Toggle through theme modes
   */
  const toggleThemeMode = useCallback(() => {
    const modes: ("day" | "night" | "system")[] = ["day", "night", "system"];
    const nextIndex = (modes.indexOf(themeMode) + 1) % modes.length;
    setThemeModeValue(modes[nextIndex]);
  }, [themeMode, setThemeModeValue]);

  /**
   * Load models for all providers with API keys
   */
  const loadModels = useCallback(async (force: boolean = false) => {
    setIsLoadingModels(true);
    try {
      // Check cache first if not forced
      if (!force) {
        const cached = localStorage.getItem(MODEL_CACHE_KEY);
        if (cached) {
          try {
            const { timestamp, models } = JSON.parse(cached);
            // Cache valid for 24 hours
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
              setProviderModels(models);
              setIsLoadingModels(false);
              return;
            }
          } catch (e) {
            console.warn("Failed to parse model cache", e);
          }
        }
      }

      const currentSettings = settingsRef.current;
      // Load models for all providers with API keys
      const providersWithKeys = currentSettings.providers.instances.filter(
        (p) => p.apiKey && p.apiKey.trim() !== "",
      );

      const modelPromises = providersWithKeys.map(async (provider) => {
        try {
          const models = await getModels(currentSettings, provider.id, force);
          return { providerId: provider.id, models };
        } catch (error) {
          console.error(`Failed to load models for ${provider.name}:`, error);
          return { providerId: provider.id, models: [] };
        }
      });

      const results = await Promise.all(modelPromises);

      const newProviderModels: Record<string, ModelInfo[]> = {};
      results.forEach(({ providerId, models }) => {
        newProviderModels[providerId] = models;
      });

      setProviderModels(newProviderModels);

      // Save to cache
      localStorage.setItem(
        MODEL_CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          models: newProviderModels,
        }),
      );
    } catch (e) {
      console.error("Failed to load models", e);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  // Derived language
  const language = i18n.language as LanguageCode;

  const value = {
    settings,
    updateSettings,
    resetSettings,
    language,
    setLanguage,
    themeMode,
    setThemeMode: setThemeModeValue,
    toggleThemeMode,
    providerModels,
    isLoadingModels,
    loadModels,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
