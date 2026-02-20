import { StoryThemeConfig } from "../../types";
import { CategoryKey } from "../../utils/constants/themeCategories";

export type ThemeSortMode =
  | "category"
  | "nameAsc"
  | "nameDesc"
  | "favoritesFirst"
  | "recentFirst"
  | "ipFirst"
  | "nonIpFirst"
  | "relevance";

export const THEME_SORT_OPTIONS: ThemeSortMode[] = [
  "category",
  "nameAsc",
  "nameDesc",
  "favoritesFirst",
  "recentFirst",
  "ipFirst",
  "nonIpFirst",
  "relevance",
];

export interface ThemeUsageStats {
  count: number;
  lastUsedAt: number;
}

export interface ThemeFilterIndexItem {
  key: string;
  index: number;
  name: string;
  nameLower: string;
  narrativeStyleLower: string;
  narrativePreview: string;
  categories: readonly string[];
  primaryCategoryRank: number;
  isIpTheme: boolean;
}

const CATEGORY_PRIORITY: CategoryKey[] = [
  "all",
  "ancient",
  "modern",
  "fantasy",
  "wuxia",
  "scifi",
  "suspense",
  "game",
  "novel",
  "movie",
  "chinese_short_drama",
];

const CATEGORY_RANK = new Map<string, number>(
  CATEGORY_PRIORITY.map((category, index) => [category, index]),
);

const IP_THEME_PATTERN = /《[^》]+》/;
const THEME_NAME_COLLATOR = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});
const NARRATIVE_PREVIEW_MAX_CHARS = 220;

const stripMarkdown = (text: string) =>
  text
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[*_`>#~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

interface ThemeListItem extends ThemeFilterIndexItem {
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt: number;
  relevanceScore: number;
}

interface BuildThemeFilterIndexOptions {
  themes: Record<string, StoryThemeConfig>;
  t: (key: string, options?: JsonObject) => string;
}

interface BuildThemeKeysOptions {
  themeIndex: readonly ThemeFilterIndexItem[];
  selectedCategory: CategoryKey;
  searchQuery: string;
  sortMode: ThemeSortMode;
  favoriteThemeKeys?: Set<string> | string[];
  usageByTheme?: Record<string, ThemeUsageStats | undefined>;
}

const getCategoryRank = (category?: string): number => {
  if (!category) return 999;
  return CATEGORY_RANK.get(category) ?? 999;
};

const getRelevanceScore = (item: ThemeListItem, queryLower: string): number => {
  if (!queryLower) return 0;

  let score = 0;

  if (item.nameLower === queryLower) score += 1000;
  if (item.nameLower.startsWith(queryLower)) score += 600;
  else if (item.nameLower.includes(queryLower)) score += 400;

  if (item.narrativeStyleLower.startsWith(queryLower)) score += 200;
  else if (item.narrativeStyleLower.includes(queryLower)) score += 100;

  return score;
};

const compareByCategoryThenName = (
  left: ThemeListItem,
  right: ThemeListItem,
): number => {
  const categoryDiff = left.primaryCategoryRank - right.primaryCategoryRank;
  if (categoryDiff !== 0) return categoryDiff;

  return THEME_NAME_COLLATOR.compare(left.name, right.name);
};

const withStableFallback = (
  compareFn: (left: ThemeListItem, right: ThemeListItem) => number,
) => {
  return (left: ThemeListItem, right: ThemeListItem): number => {
    const comparison = compareFn(left, right);
    if (comparison !== 0) return comparison;
    return left.index - right.index;
  };
};

export const buildThemeFilterIndex = ({
  themes,
  t,
}: BuildThemeFilterIndexOptions): ThemeFilterIndexItem[] => {
  return Object.keys(themes).map((key, index) => {
    const nameRaw = t(`${key}.name`, { ns: "themes" });
    const narrativeStyleRaw = t(`${key}.narrativeStyle`, {
      ns: "themes",
    });
    const name = typeof nameRaw === "string" ? nameRaw : key;
    const narrativeStyle =
      typeof narrativeStyleRaw === "string" ? narrativeStyleRaw : "";
    const narrativePreview = stripMarkdown(narrativeStyle).slice(
      0,
      NARRATIVE_PREVIEW_MAX_CHARS,
    );

    return {
      key,
      index,
      name,
      nameLower: name.toLowerCase(),
      narrativeStyleLower: narrativeStyle.toLowerCase(),
      narrativePreview,
      categories: themes[key].categories ?? [],
      primaryCategoryRank: getCategoryRank(themes[key].categories?.[0]),
      isIpTheme: Boolean(themes[key].restricted) || IP_THEME_PATTERN.test(name),
    };
  });
};

export const buildFilteredThemeKeys = ({
  themeIndex,
  selectedCategory,
  searchQuery,
  sortMode,
  favoriteThemeKeys,
  usageByTheme,
}: BuildThemeKeysOptions): string[] => {
  const queryLower = searchQuery.trim().toLowerCase();
  const favoriteSet =
    favoriteThemeKeys instanceof Set
      ? favoriteThemeKeys
      : new Set(favoriteThemeKeys ?? []);
  const usageMap = usageByTheme ?? {};

  let items: ThemeListItem[] = themeIndex.map((item) => {
    const usage = usageMap[item.key];
    const usageCount =
      typeof usage?.count === "number" && usage.count > 0 ? usage.count : 0;
    const lastUsedAt =
      typeof usage?.lastUsedAt === "number" && usage.lastUsedAt > 0
        ? usage.lastUsedAt
        : 0;
    return {
      ...item,
      isFavorite: favoriteSet.has(item.key),
      usageCount,
      lastUsedAt,
      relevanceScore: 0,
    };
  });

  if (selectedCategory !== "all") {
    items = items.filter((item) => item.categories.includes(selectedCategory));
  }

  if (queryLower) {
    items = items
      .filter(
        (item) =>
          item.nameLower.includes(queryLower) ||
          item.narrativeStyleLower.includes(queryLower),
      )
      .map((item) => ({
        ...item,
        relevanceScore: getRelevanceScore(item, queryLower),
      }));
  }

  const sortComparator = withStableFallback((left, right) => {
    switch (sortMode) {
      case "nameAsc":
        return THEME_NAME_COLLATOR.compare(left.name, right.name);
      case "nameDesc":
        return THEME_NAME_COLLATOR.compare(right.name, left.name);
      case "favoritesFirst":
        if (left.isFavorite !== right.isFavorite) {
          return left.isFavorite ? -1 : 1;
        }
        if (left.lastUsedAt !== right.lastUsedAt) {
          return right.lastUsedAt - left.lastUsedAt;
        }
        return compareByCategoryThenName(left, right);
      case "recentFirst":
        if (left.lastUsedAt !== right.lastUsedAt) {
          return right.lastUsedAt - left.lastUsedAt;
        }
        if (left.usageCount !== right.usageCount) {
          return right.usageCount - left.usageCount;
        }
        return compareByCategoryThenName(left, right);
      case "ipFirst":
        if (left.isIpTheme !== right.isIpTheme) {
          return left.isIpTheme ? -1 : 1;
        }
        return THEME_NAME_COLLATOR.compare(left.name, right.name);
      case "nonIpFirst":
        if (left.isIpTheme !== right.isIpTheme) {
          return left.isIpTheme ? 1 : -1;
        }
        return THEME_NAME_COLLATOR.compare(left.name, right.name);
      case "relevance":
        if (queryLower && left.relevanceScore !== right.relevanceScore) {
          return right.relevanceScore - left.relevanceScore;
        }
        return compareByCategoryThenName(left, right);
      case "category":
      default:
        return compareByCategoryThenName(left, right);
    }
  });

  return items.sort(sortComparator).map((item) => item.key);
};
