import type { FontScaleLevel } from "../types";

export const FONT_SCALE_BY_LEVEL: Record<FontScaleLevel, number> = {
  1: 0.6,
  2: 0.8,
  3: 1,
  4: 1.2,
  5: 1.4,
};

export const DEFAULT_FONT_SCALE_LEVEL: FontScaleLevel = 3;

const isFontScaleLevel = (value: unknown): value is FontScaleLevel =>
  value === 1 || value === 2 || value === 3 || value === 4 || value === 5;

export const normalizeFontScaleLevel = (
  value: unknown,
  fallback: FontScaleLevel = DEFAULT_FONT_SCALE_LEVEL,
): FontScaleLevel => (isFontScaleLevel(value) ? value : fallback);

export const resolveFontScale = (
  level: unknown,
  fallback: FontScaleLevel = DEFAULT_FONT_SCALE_LEVEL,
): number => FONT_SCALE_BY_LEVEL[normalizeFontScaleLevel(level, fallback)];
