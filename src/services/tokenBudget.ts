export interface TokenBudgetConfig {
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
