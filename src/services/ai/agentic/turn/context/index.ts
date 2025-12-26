/**
 * ============================================================================
 * Context Builder Module
 * ============================================================================
 *
 * Unified exports for context building functionality.
 * Provides a clean API for the agentic loop to build context.
 */

// Types
export type {
  WorldFoundation,
  ProtagonistContext,
  DynamicContext,
  TurnMessagesResult,
  InitialContextOptions,
  TurnMessagesOptions,
  SessionInitResult,
  SessionContextOptions,
  ContextBuilderConfig,
} from "./types";

// World Context
export {
  buildWorldFoundation,
  buildProtagonist,
  buildGodModeContext,
} from "./worldContext";

// Message Builder
export { buildInitialContext, buildTurnMessages } from "./messageBuilder";

// Session Context
export {
  setupSession,
  handleRetryDetection,
  createCheckpoint,
  appendToHistory,
} from "./sessionContext";
export type { SessionSetupOptions, SessionSetupResult } from "./sessionContext";
