/**
 * Unified Environment System
 *
 * This system unifies the concept of "atmosphere" across:
 * 1. Visual Theme (UI colors, fonts) - envTheme field
 * 2. Audio Ambience (background sounds) - ambience field
 * 3. Environmental Effects (rain, snow, fog, etc.) - derived from ambience
 *
 * Each StorySegment has an `atmosphere` object with:
 * - envTheme: Visual theme key (e.g., "fantasy", "cyberpunk", "horror")
 * - ambience: Audio/environment key (e.g., "forest", "city", "combat")
 */

import { ENV_THEMES } from "./envThemes";
import type { ThemeConfig } from "../../types";

// All available ambience types (matches audio folder names)
export const AMBIENCES = [
  // Nature & Weather
  "forest",
  "desert",
  "ocean",
  "snow",
  "rain",
  "storm",
  "cave",

  // Urban & Social
  "city",
  "market",
  "tavern",

  // Mood & Genre
  "mystical",
  "horror",
  "combat",
  "quiet",

  // Tech & Sci-Fi
  "scifi",
  "dungeon",
] as const;

export type Ambience = (typeof AMBIENCES)[number];

// Visual theme keys (matches envTheme in zodSchemas)
export const ENV_THEME_KEYS = [
  "fantasy",
  "scifi",
  "cyberpunk",
  "horror",
  "mystery",
  "romance",
  "royal",
  "wuxia",
  "demonic",
  "ethereal",
  "modern",
  "gold",
  "villain",
  "sepia",
  "rose",
  "war",
  "sunset",
  "cold",
  "violet",
  "nature",
  "artdeco",
  "intrigue",
  "wasteland",
  "patriotic",
  "cyan",
  "silver",
  "obsidian",
] as const;

export type EnvThemeKey = (typeof ENV_THEME_KEYS)[number];

/** Unified atmosphere object type */
export interface AtmosphereObject {
  envTheme: EnvThemeKey;
  ambience: Ambience;
}

// Visual effect types that can be triggered by ambience
export type VisualEffect =
  | "rain"
  | "snow"
  | "fog"
  | "flicker"
  | "embers"
  | "sunny"
  | "dust"
  | null;

// Mapping from ambience to default visual theme (envTheme key)
const AMBIENCE_TO_THEME: Record<Ambience, EnvThemeKey> = {
  // Nature & Weather
  forest: "nature",
  desert: "gold",
  ocean: "ethereal",
  snow: "cold",
  rain: "mystery",
  storm: "horror",
  cave: "demonic",

  // Urban & Social
  city: "modern",
  market: "gold",
  tavern: "wuxia",

  // Mood & Genre
  mystical: "ethereal",
  horror: "horror",
  combat: "war",
  quiet: "fantasy",

  // Tech & Sci-Fi
  scifi: "scifi",
  dungeon: "horror",
};

// Mapping from ambience to default visual effect
const AMBIENCE_TO_EFFECT: Record<Ambience, VisualEffect> = {
  // Nature & Weather
  forest: "sunny",
  desert: "dust",
  ocean: "fog",
  snow: "snow",
  rain: "rain",
  storm: "rain",
  cave: "fog",

  // Urban & Social
  city: null,
  market: "sunny",
  tavern: "embers",

  // Mood & Genre
  mystical: "fog",
  horror: "flicker",
  combat: "embers",
  quiet: null,

  // Tech & Sci-Fi
  scifi: null,
  dungeon: "flicker",
};

// Audio file mapping (ambience name matches audio folder)
// Audio files are at /audio/{ambience}/ambience.mp3

export interface AtmosphereConfig {
  /** The ambience key (for audio) */
  key: Ambience;
  /** The envTheme key (for visual theme) */
  envTheme: EnvThemeKey;
  /** Visual theme configuration (colors, fonts) */
  theme: ThemeConfig;
  /** Visual theme key for lookup (alias for envTheme) */
  themeKey: string;
  /** Default visual effect */
  defaultEffect: VisualEffect;
  /** Audio file path */
  audioPath: string;
}

/**
 * Normalize atmosphere input to AtmosphereObject
 * Ensures all fields are valid, providing defaults if needed
 * Accepts both old string format and new AtmosphereObject format (including partial)
 */
export function normalizeAtmosphere(
  atmosphere: AtmosphereObject | Partial<AtmosphereObject> | string | undefined | null
): AtmosphereObject {
  // Handle null/undefined
  if (!atmosphere) {
    return { envTheme: "fantasy", ambience: "quiet" };
  }

  // Handle legacy string format (old ambience string)
  if (typeof atmosphere === "string") {
    const ambience = isValidAmbience(atmosphere) ? atmosphere : "quiet";
    const envTheme = AMBIENCE_TO_THEME[ambience] || "fantasy";
    return { envTheme, ambience };
  }

  // Handle object format (including partial)
  const envTheme = isValidEnvTheme(atmosphere.envTheme) ? atmosphere.envTheme : "fantasy";
  const ambience = isValidAmbience(atmosphere.ambience) ? atmosphere.ambience : "quiet";
  return { envTheme, ambience };
}

/**
 * Get the full configuration for an atmosphere
 */
export function getAtmosphereConfig(
  atmosphere: AtmosphereObject | undefined
): AtmosphereConfig {
  const normalized = normalizeAtmosphere(atmosphere);
  const { envTheme, ambience } = normalized;

  const theme = ENV_THEMES[envTheme] || ENV_THEMES.fantasy;

  return {
    key: ambience,
    envTheme,
    theme,
    themeKey: envTheme,
    defaultEffect: AMBIENCE_TO_EFFECT[ambience],
    audioPath: `/audio/${ambience}/ambience.mp3`,
  };
}

/**
 * Get visual theme for an atmosphere
 */
export function getThemeForAtmosphere(
  atmosphere: AtmosphereObject | undefined
): ThemeConfig {
  return getAtmosphereConfig(atmosphere).theme;
}

/**
 * Get the theme key for an atmosphere (for looking up in ENV_THEMES)
 */
export function getThemeKeyForAtmosphere(
  atmosphere: AtmosphereObject | Partial<AtmosphereObject> | string | undefined | null
): string {
  return getAtmosphereConfig(normalizeAtmosphere(atmosphere)).themeKey;
}

/**
 * Get default visual effect for an atmosphere
 */
export function getEffectForAtmosphere(
  atmosphere: AtmosphereObject | undefined
): VisualEffect {
  return getAtmosphereConfig(atmosphere).defaultEffect;
}

/**
 * Check if a string is a valid ambience
 */
export function isValidAmbience(value: string | undefined | null): value is Ambience {
  if (!value || typeof value !== "string") return false;
  return AMBIENCES.includes(value.toLowerCase().trim() as Ambience);
}

/**
 * Check if a string is a valid envTheme
 */
export function isValidEnvTheme(value: string | undefined | null): value is EnvThemeKey {
  if (!value || typeof value !== "string") return false;
  return ENV_THEME_KEYS.includes(value.toLowerCase().trim() as EnvThemeKey);
}

/**
 * Resolve atmosphere ensuring it's a valid AtmosphereObject
 */
export function resolveAtmosphere(
  atmosphere?: AtmosphereObject,
): AtmosphereObject {
  return normalizeAtmosphere(atmosphere);
}

/**
 * Get default atmosphere for a story theme
 */
export function getDefaultAtmosphereForTheme(
  defaultAtmosphere: AtmosphereObject,
): AtmosphereObject {
  return normalizeAtmosphere(defaultAtmosphere);
}
