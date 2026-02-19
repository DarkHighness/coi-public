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
   * Optional prompt token estimate for the current request.
   */
  promptTokenEstimate?: number;
}
