import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AISettings, ModelInfo, LanguageCode } from "../types";
import { DEFAULTS } from "../utils/constants";
import { getModels } from "../services/aiService";

const STORAGE_KEY = "chronicles_aisettings";
const MODEL_CACHE_KEY = "chronicles_model_cache";

/**
 * Settings Hook - 管理应用设置状态
 *
 * 提供:
 * - 设置的读取和更新
 * - 设置的持久化
 * - 模型列表获取
 * - 语言切换
 * - 主题模式管理
 */
export const useSettings = () => {
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

    // Check and replace translation provider
    if (!isProviderAvailable(settings.translation.providerId)) {
      newSettings.translation = {
        ...settings.translation,
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
    (newSettings: AISettings | Partial<AISettings>) => {
      const isFullSettings = (
        s: AISettings | Partial<AISettings>,
      ): s is AISettings => {
        return "providers" in s && "contextLen" in s && "story" in s;
      };

      const mergedSettings = isFullSettings(newSettings)
        ? newSettings
        : mergeSettings({ ...settingsRef.current, ...newSettings });

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

  return {
    // Settings state
    settings,
    updateSettings,
    resetSettings,

    // Language
    language,
    setLanguage,

    // Theme
    themeMode,
    setThemeMode: setThemeModeValue,
    toggleThemeMode,

    // Models
    providerModels,
    isLoadingModels,
    loadModels,
  };
};

/**
 * Merge saved settings with defaults to ensure all fields exist
 */
function mergeSettings(parsed: Partial<AISettings>): AISettings {
  return {
    ...DEFAULTS,
    ...parsed,
    providers: {
      ...DEFAULTS.providers,
      ...(parsed.providers || {}),
      instances: parsed.providers?.instances || DEFAULTS.providers.instances,
      nextId: parsed.providers?.nextId || DEFAULTS.providers.nextId,
    },
    story: { ...DEFAULTS.story, ...(parsed.story || {}) },
    script: { ...DEFAULTS.script, ...(parsed.script || {}) },
    image: { ...DEFAULTS.image, ...(parsed.image || {}) },
    video: { ...DEFAULTS.video, ...(parsed.video || {}) },
    audio: { ...DEFAULTS.audio, ...(parsed.audio || {}) },
    audioVolume: {
      ...DEFAULTS.audioVolume,
      ...(parsed.audioVolume || {}),
    },
    translation: {
      ...DEFAULTS.translation,
      ...(parsed.translation || {}),
    },
    lore: { ...DEFAULTS.lore, ...(parsed.lore || {}) },
    embedding: {
      ...DEFAULTS.embedding,
      ...(parsed.embedding || {}),
      lru: {
        ...DEFAULTS.embedding.lru,
        ...(parsed.embedding?.lru || {}),
      },
    },
  };
}

export type UseSettingsReturn = ReturnType<typeof useSettings>;
