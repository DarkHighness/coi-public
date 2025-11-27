/**
 * Centralized environment variable access.
 * Prioritizes process.env.API_KEY, then process.env.GEMINI_API_KEY.
 */
export const getEnvApiKey = (): string | undefined => {
  return process.env.API_KEY || process.env.GEMINI_API_KEY;
};

/**
 * Check if the app is running in development mode.
 * Uses Vite's import.meta.env.DEV flag.
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV === true;
};

/**
 * Check if the app is running in production mode.
 */
export const isProduction = (): boolean => {
  return import.meta.env.PROD === true;
};
