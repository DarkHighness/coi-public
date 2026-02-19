export const CATEGORY_KEYS = [
  "all",
  "ancient",
  "modern",
  "fantasy",
  "suspense",
  "wuxia",
  "scifi",
  "game",
  "novel",
  "movie",
  "chinese_short_drama",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];
