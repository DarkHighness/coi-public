/**
 * Emoji Validation Utility
 *
 * Provides functions to validate emoji characters and ensure only valid emojis
 * are displayed in the UI, with appropriate fallbacks for invalid values.
 */

/**
 * Regex pattern to match valid emoji characters
 * Includes:
 * - Basic emojis (U+1F300-U+1F9FF)
 * - Miscellaneous symbols (U+2600-U+26FF)
 * - Dingbats (U+2700-U+27BF)
 * - Transport symbols (U+1F680-U+1F6FF)
 * - Flags (U+1F1E6-U+1F1FF)
 * - Emoji modifiers (skin tones, gender, etc.)
 * - Zero-width joiners for compound emojis
 */
const EMOJI_REGEX =
  /^(?:[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}])+$/u;

/**
 * Check if a value is a valid emoji
 * @param value - The string to validate
 * @returns true if the value is a valid emoji, false otherwise
 */
export function isValidEmoji(value: string | undefined): boolean {
  if (!value || typeof value !== "string") {
    return false;
  }

  // Trim whitespace
  const trimmed = value.trim();

  // Empty after trim
  if (trimmed.length === 0) {
    return false;
  }

  // Check if it matches the emoji pattern
  return EMOJI_REGEX.test(trimmed);
}

/**
 * Get a valid icon or return a fallback
 * @param icon - The icon value to validate
 * @param fallback - The fallback icon to use if validation fails
 * @returns The icon if valid, otherwise the fallback
 */
export function getValidIcon(
  icon: string | undefined,
  fallback: string,
): string {
  return isValidEmoji(icon) ? icon!.trim() : fallback;
}
