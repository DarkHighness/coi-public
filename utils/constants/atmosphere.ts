/**
 * Unified Environment System
 *
 * This system unifies the concept of "atmosphere" across:
 * 1. Visual Theme (UI colors, fonts) - previously envTheme
 * 2. Environmental Effects (rain, snow, fog, etc.)
 * 3. Audio Ambience (background sounds)
 *
 * Each StorySegment has a single `atmosphere` field that controls all three.
 *
 * MIGRATION STRATEGY:
 * - Old saves may have `envTheme` and `environment` separately
 * - New saves use unified `atmosphere` field
 * - When atmosphere is present, it takes precedence
 * - When not present, we derive from environment (audio) or envTheme (visual)
 */

import { ENV_THEMES } from "./envThemes";
import type { ThemeConfig } from "../../types";

// All available atmosphere types (matches audio folder names)
export const ATMOSPHERES = [
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

export type Atmosphere = (typeof ATMOSPHERES)[number];

// Visual effect types that can be triggered by atmosphere
export type VisualEffect =
  | "rain"
  | "snow"
  | "fog"
  | "flicker"
  | "embers"
  | "sunny"
  | "dust"
  | null;

// Mapping from atmosphere to visual theme (envTheme key)
const ATMOSPHERE_TO_THEME: Record<Atmosphere, string> = {
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

// Mapping from atmosphere to default visual effect
const ATMOSPHERE_TO_EFFECT: Record<Atmosphere, VisualEffect> = {
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

// Audio file mapping (atmosphere name matches audio folder)
// Audio files are at /audio/{atmosphere}/ambience.mp3

export interface AtmosphereConfig {
  /** The atmosphere key */
  key: Atmosphere;
  /** Visual theme configuration (colors, fonts) */
  theme: ThemeConfig;
  /** Visual theme key for lookup */
  themeKey: string;
  /** Default visual effect */
  defaultEffect: VisualEffect;
  /** Audio file path */
  audioPath: string;
}

/**
 * Get the full configuration for an atmosphere
 */
export function getAtmosphereConfig(atmosphere: string): AtmosphereConfig {
  const normalizedAtmosphere = atmosphere.toLowerCase().trim() as Atmosphere;

  // Check if valid atmosphere
  if (!ATMOSPHERES.includes(normalizedAtmosphere)) {
    console.warn(`Unknown atmosphere: ${atmosphere}, falling back to 'quiet'`);
    return getAtmosphereConfig("quiet");
  }

  const themeKey = ATMOSPHERE_TO_THEME[normalizedAtmosphere];
  const theme = ENV_THEMES[themeKey] || ENV_THEMES.fantasy;

  return {
    key: normalizedAtmosphere,
    theme,
    themeKey,
    defaultEffect: ATMOSPHERE_TO_EFFECT[normalizedAtmosphere],
    audioPath: `/audio/${normalizedAtmosphere}/ambience.mp3`,
  };
}

/**
 * Get visual theme for an atmosphere
 */
export function getThemeForAtmosphere(atmosphere: string): ThemeConfig {
  return getAtmosphereConfig(atmosphere).theme;
}

/**
 * Get the theme key for an atmosphere (for looking up in ENV_THEMES)
 */
export function getThemeKeyForAtmosphere(atmosphere: string): string {
  return getAtmosphereConfig(atmosphere).themeKey;
}

/**
 * Get default visual effect for an atmosphere
 */
export function getEffectForAtmosphere(atmosphere: string): VisualEffect {
  return getAtmosphereConfig(atmosphere).defaultEffect;
}

/**
 * Check if a string is a valid atmosphere
 */
export function isValidAtmosphere(value: string): value is Atmosphere {
  return ATMOSPHERES.includes(value.toLowerCase().trim() as Atmosphere);
}

/**
 * Resolve atmosphere from StorySegment fields (with backward compatibility)
 * Priority: atmosphere > environment > envTheme mapping
 */
export function resolveAtmosphere(
  atmosphere?: string,
  environment?: string,
  envTheme?: string,
): Atmosphere {
  // 1. If atmosphere is directly set and valid, use it
  if (atmosphere && isValidAtmosphere(atmosphere)) {
    return atmosphere.toLowerCase().trim() as Atmosphere;
  }

  // 2. If environment (audio) is set and valid, use it (they share the same values)
  if (environment && isValidAtmosphere(environment)) {
    return environment.toLowerCase().trim() as Atmosphere;
  }

  // 3. Map from envTheme
  if (envTheme) {
    return envThemeToAtmosphere(envTheme);
  }

  // Default fallback
  return "quiet";
}

/**
 * Legacy compatibility: Map old envTheme to nearest atmosphere
 * This is used to migrate old saves that have envTheme but no atmosphere
 */
export function envThemeToAtmosphere(envTheme: string): Atmosphere {
  const normalized = envTheme.toLowerCase().trim();

  // Direct matches (if envTheme happens to be a valid atmosphere)
  if (isValidAtmosphere(normalized)) {
    return normalized as Atmosphere;
  }

  // Map old theme names to atmospheres
  const themeToAtmosphere: Record<string, Atmosphere> = {
    // Visual themes to atmospheres
    fantasy: "forest",
    scifi: "scifi",
    cyberpunk: "city",
    horror: "horror",
    mystery: "rain",
    romance: "quiet",
    royal: "market",
    wuxia: "tavern",
    demonic: "cave",
    ethereal: "mystical",
    modern: "city",
    gold: "market",
    villain: "horror",
    danger: "combat",
    glamour: "city",
    rgb: "city",
    sepia: "tavern",
    rose: "quiet",
    war: "combat",
    sunset: "desert",
    cold: "snow",
    violet: "mystical",
    nature: "forest",
    artdeco: "city",
    intrigue: "city",
    wasteland: "desert",
    patriotic: "combat",
    cyan: "ocean",
    silver: "scifi",
    obsessive: "horror",
    emerald: "forest",
    stone: "cave",
    heartbreak: "rain",
    apocalypse: "storm",
    gothic: "horror",
    interstellar: "scifi",
    academy: "quiet",
  };

  return themeToAtmosphere[normalized] || "quiet";
}

/**
 * Get the default atmosphere for a story theme
 * This handles the transition from defaultEnvTheme (envTheme values) to actual atmosphere values
 *
 * @param themeConfig The story theme configuration
 * @returns The resolved atmosphere value
 */
export function getDefaultAtmosphereForTheme(
  defaultAtmosphere: string,
): Atmosphere {
  // If it's already a valid atmosphere, return it directly
  if (isValidAtmosphere(defaultAtmosphere)) {
    return defaultAtmosphere as Atmosphere;
  }

  // Otherwise, it's an old envTheme value, map it to atmosphere
  return envThemeToAtmosphere(defaultAtmosphere);
}
