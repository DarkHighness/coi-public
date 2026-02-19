export const NON_STORY_OUTLINE_MAX_OUTPUT_TOKENS = 32_768;
export const STORY_OUTLINE_MAX_OUTPUT_TOKENS = 64_000;

export interface TokenBudgetConfig {
  /**
   * When true (default), providers should omit explicit max-output-token
   * request parameters and let the backend provider choose output limits.
   * Set to false to enable app-side max output token injection/clamping.
   */
  providerManagedMaxTokens?: boolean;
  /**
   * Optional fallback output cap for unknown models.
   * Used only when model-specific max output tokens cannot be resolved.
   */
  maxOutputTokensFallback?: number;
  /**
   * Optional resolved context window for the active provider+model.
   */
  contextWindowTokens?: number;
  /**
   * Optional hard cap for single-round output tokens.
   * Useful for runtime turns where overly large outputs tend to trigger
   * provider-side context overflow retries.
   */
  maxOutputTokensHardCap?: number;
  /**
   * Optional total token estimate for the current request input budget.
   * This should prefer provider-reported `total_tokens` from prior rounds.
   */
  totalTokenEstimate?: number;
  /**
   * Legacy alias for input estimate.
   * Prefer `totalTokenEstimate` when available.
   */
  promptTokenEstimate?: number;
}
