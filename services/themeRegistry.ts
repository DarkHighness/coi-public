import themeStyles from "../src/resources/theme_styles.json";

const THEME_STYLES: Record<string, string> = themeStyles as Record<
  string,
  string
>;

/**
 * Get the visual style description for a given theme key.
 * @param themeKey The theme key (e.g., 'fantasy', 'scifi')
 * @returns The style description string, or undefined if not found.
 */
export const getThemeStyle = (themeKey: string): string | undefined => {
  return THEME_STYLES[themeKey];
};

/**
 * Get all loaded theme keys.
 */
export const getLoadedThemes = (): string[] => {
  return Object.keys(THEME_STYLES);
};
