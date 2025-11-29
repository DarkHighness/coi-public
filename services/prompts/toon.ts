import { encode } from "@toon-format/toon";

/**
 * Encodes data into TOON format for LLM prompts.
 * Wraps the official @toon-format/toon library.
 *
 * @param data The data to encode (object or array).
 * @returns The TOON formatted string.
 */
export const toToon = (data: any): string => {
  if (!data) return "";
  try {
    return encode(data);
  } catch (error) {
    console.warn("Failed to encode data to TOON:", error);
    // Fallback to JSON if TOON encoding fails, to prevent crash
    return JSON.stringify(data, null);
  }
};
