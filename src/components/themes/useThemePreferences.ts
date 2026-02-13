import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeSortMode, ThemeUsageStats } from "./themeSort";

const THEME_SORT_MODE_KEY = "chronicles_theme_sort_mode";
const THEME_FAVORITES_KEY = "chronicles_theme_favorites";
const THEME_USAGE_KEY = "chronicles_theme_usage";

const isThemeSortMode = (value: unknown): value is ThemeSortMode => {
  return (
    value === "category" ||
    value === "nameAsc" ||
    value === "nameDesc" ||
    value === "favoritesFirst" ||
    value === "recentFirst" ||
    value === "ipFirst" ||
    value === "nonIpFirst" ||
    value === "relevance"
  );
};

const readStoredSortMode = (): ThemeSortMode => {
  try {
    const raw = localStorage.getItem(THEME_SORT_MODE_KEY);
    if (!raw) return "category";
    return isThemeSortMode(raw) ? raw : "category";
  } catch {
    return "category";
  }
};

const readStoredFavorites = (): string[] => {
  try {
    const raw = localStorage.getItem(THEME_FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
};

const readStoredUsage = (): Record<string, ThemeUsageStats> => {
  try {
    const raw = localStorage.getItem(THEME_USAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const usage: Record<string, ThemeUsageStats> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object") continue;
      const countRaw = (value as { count?: unknown }).count;
      const lastUsedAtRaw = (value as { lastUsedAt?: unknown }).lastUsedAt;

      const count =
        typeof countRaw === "number" &&
        Number.isFinite(countRaw) &&
        countRaw > 0
          ? Math.floor(countRaw)
          : 0;
      const lastUsedAt =
        typeof lastUsedAtRaw === "number" &&
        Number.isFinite(lastUsedAtRaw) &&
        lastUsedAtRaw > 0
          ? Math.floor(lastUsedAtRaw)
          : 0;

      if (!count && !lastUsedAt) continue;
      usage[key] = { count, lastUsedAt };
    }

    return usage;
  } catch {
    return {};
  }
};

export const useThemePreferences = () => {
  const [sortMode, setSortModeState] = useState<ThemeSortMode>(() =>
    readStoredSortMode(),
  );
  const [favoriteThemeKeys, setFavoriteThemeKeys] = useState<string[]>(() =>
    readStoredFavorites(),
  );
  const [usageByTheme, setUsageByTheme] = useState<
    Record<string, ThemeUsageStats>
  >(() => readStoredUsage());

  useEffect(() => {
    try {
      localStorage.setItem(THEME_SORT_MODE_KEY, sortMode);
    } catch {
      // ignore
    }
  }, [sortMode]);

  useEffect(() => {
    try {
      localStorage.setItem(
        THEME_FAVORITES_KEY,
        JSON.stringify(favoriteThemeKeys),
      );
    } catch {
      // ignore
    }
  }, [favoriteThemeKeys]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_USAGE_KEY, JSON.stringify(usageByTheme));
    } catch {
      // ignore
    }
  }, [usageByTheme]);

  const favoriteSet = useMemo(
    () => new Set(favoriteThemeKeys),
    [favoriteThemeKeys],
  );

  const setSortMode = useCallback((mode: ThemeSortMode) => {
    setSortModeState(mode);
  }, []);

  const toggleFavoriteTheme = useCallback((themeKey: string) => {
    setFavoriteThemeKeys((previous) => {
      if (previous.includes(themeKey)) {
        return previous.filter((key) => key !== themeKey);
      }
      return [...previous, themeKey];
    });
  }, []);

  const markThemeUsed = useCallback((themeKey: string) => {
    setUsageByTheme((previous) => {
      const current = previous[themeKey] ?? { count: 0, lastUsedAt: 0 };
      return {
        ...previous,
        [themeKey]: {
          count: current.count + 1,
          lastUsedAt: Date.now(),
        },
      };
    });
  }, []);

  return {
    sortMode,
    setSortMode,
    favoriteThemeKeys,
    favoriteSet,
    toggleFavoriteTheme,
    usageByTheme,
    markThemeUsed,
  };
};
