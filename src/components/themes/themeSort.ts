import { StoryThemeConfig } from "../../types";
import { CategoryKey } from "../../utils/constants/themes";

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

interface ThemeListItem {
  key: string;
  index: number;
  name: string;
  nameLower: string;
  narrativeStyleLower: string;
  primaryCategoryRank: number;
  isFavorite: boolean;
  isIpTheme: boolean;
  usageCount: number;
  lastUsedAt: number;
  relevanceScore: number;
}

interface BuildThemeKeysOptions {
  themes: Record<string, StoryThemeConfig>;
  selectedCategory: CategoryKey;
  searchQuery: string;
  sortMode: ThemeSortMode;
  favoriteThemeKeys?: Set<string> | string[];
  usageByTheme?: Record<string, ThemeUsageStats | undefined>;
  t: (key: string, options?: Record<string, unknown>) => string;
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
  collator: Intl.Collator,
): number => {
  const categoryDiff = left.primaryCategoryRank - right.primaryCategoryRank;
  if (categoryDiff !== 0) return categoryDiff;

  return collator.compare(left.name, right.name);
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

export const buildFilteredThemeKeys = ({
  themes,
  selectedCategory,
  searchQuery,
  sortMode,
  favoriteThemeKeys,
  usageByTheme,
  t,
}: BuildThemeKeysOptions): string[] => {
  const queryLower = searchQuery.trim().toLowerCase();
  const favoriteSet =
    favoriteThemeKeys instanceof Set
      ? favoriteThemeKeys
      : new Set(favoriteThemeKeys ?? []);
  const usageMap = usageByTheme ?? {};
  const collator = new Intl.Collator(undefined, {
    sensitivity: "base",
    numeric: true,
  });

  let items: ThemeListItem[] = Object.keys(themes).map((key, index) => {
    const nameRaw = t(`${key}.name`, { ns: "themes" });
    const narrativeStyleRaw = t(`${key}.narrativeStyle`, {
      ns: "themes",
    });
    const name = typeof nameRaw === "string" ? nameRaw : key;
    const narrativeStyle =
      typeof narrativeStyleRaw === "string" ? narrativeStyleRaw : "";
    const usage = usageMap[key];
    const usageCount =
      typeof usage?.count === "number" && usage.count > 0
        ? usage.count
        : 0;
    const lastUsedAt =
      typeof usage?.lastUsedAt === "number" && usage.lastUsedAt > 0
        ? usage.lastUsedAt
        : 0;
    const isIpTheme = Boolean(themes[key].restricted) || IP_THEME_PATTERN.test(name);

    return {
      key,
      index,
      name,
      nameLower: name.toLowerCase(),
      narrativeStyleLower: narrativeStyle.toLowerCase(),
      primaryCategoryRank: getCategoryRank(themes[key].categories?.[0]),
      isFavorite: favoriteSet.has(key),
      isIpTheme,
      usageCount,
      lastUsedAt,
      relevanceScore: 0,
    };
  });

  if (selectedCategory !== "all") {
    items = items.filter((item) =>
      themes[item.key].categories?.includes(selectedCategory),
    );
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
        return collator.compare(left.name, right.name);
      case "nameDesc":
        return collator.compare(right.name, left.name);
      case "favoritesFirst":
        if (left.isFavorite !== right.isFavorite) {
          return left.isFavorite ? -1 : 1;
        }
        if (left.lastUsedAt !== right.lastUsedAt) {
          return right.lastUsedAt - left.lastUsedAt;
        }
        return compareByCategoryThenName(left, right, collator);
      case "recentFirst":
        if (left.lastUsedAt !== right.lastUsedAt) {
          return right.lastUsedAt - left.lastUsedAt;
        }
        if (left.usageCount !== right.usageCount) {
          return right.usageCount - left.usageCount;
        }
        return compareByCategoryThenName(left, right, collator);
      case "ipFirst":
        if (left.isIpTheme !== right.isIpTheme) {
          return left.isIpTheme ? -1 : 1;
        }
        return collator.compare(left.name, right.name);
      case "nonIpFirst":
        if (left.isIpTheme !== right.isIpTheme) {
          return left.isIpTheme ? 1 : -1;
        }
        return collator.compare(left.name, right.name);
      case "relevance":
        if (queryLower && left.relevanceScore !== right.relevanceScore) {
          return right.relevanceScore - left.relevanceScore;
        }
        return compareByCategoryThenName(left, right, collator);
      case "category":
      default:
        return compareByCategoryThenName(left, right, collator);
    }
  });

  return items.sort(sortComparator).map((item) => item.key);
};
