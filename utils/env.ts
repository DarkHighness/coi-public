/**
 * Centralized environment variable access.
 * Prioritizes process.env.API_KEY, then process.env.GEMINI_API_KEY.
 */
export const getEnvApiKey = (): string | undefined => {
  return process.env.API_KEY || process.env.GEMINI_API_KEY;
};
