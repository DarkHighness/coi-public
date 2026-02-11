/**
 * ============================================================================
 * Context Builder Types
 * ============================================================================
 *
 * Type definitions for the modular context building system.
 * Provides clear interfaces for each layer of context construction.
 */

import type { GameState, AISettings, StorySegment } from "@/types";
import type { UnifiedMessage } from "@/services/messageTypes";
import type { ToolCallRecord } from "@/types";
import type { VfsSession } from "@/services/vfs/vfsSession";

// ============================================================================
// Core Context Types
// ============================================================================

/**
 * World foundation context - static information about the game world
 */
export interface WorldFoundation {
  title: string;
  premise: string;
  mainGoal: string;
  worldSetting: string;
}

/**
 * Protagonist context - information about the player character
 */
export interface ProtagonistContext {
  name: string;
  title: string;
  race: string;
  profession: string;
  appearance: string;
  background: string;
}

/**
 * Dynamic context that changes each turn
 */
export interface DynamicContext {
  godMode: boolean;
  ragContext?: string;
}

// ============================================================================
// Message Building Types
// ============================================================================

/**
 * Result of building turn messages (simplified for history-based sessions)
 */
export interface TurnMessagesResult {
  /** Initial context messages (world, protagonist, RAG, etc.) */
  contextMessages: UnifiedMessage[];
  /** User action message */
  userMessage: UnifiedMessage;
  /** God mode context string for logging */
  godModeContext: string;
}

/**
 * Options for building initial context
 */
export interface InitialContextOptions {
  gameState: GameState;
  vfsSession: VfsSession;
  ragContext?: string;
}

/**
 * Options for building turn messages
 */
export interface TurnMessagesOptions {
  gameState: GameState;
  userAction: string;
  vfsSession: VfsSession;
  ragContext?: string;
}

// ============================================================================
// Session Context Types
// ============================================================================

/**
 * Session initialization result
 */
export interface SessionInitResult {
  sessionId: string;
  isNewSession: boolean;
  activeHistory: UnifiedMessage[];
}

/**
 * Options for session context management
 */
export interface SessionContextOptions {
  slotId: string;
  forkId: number;
  providerId: string;
  modelId: string;
  protocol: string;
  systemInstruction: string;
  /** Initial context messages for new sessions */
  contextMessages: UnifiedMessage[];
  recentHistory?: StorySegment[];
  isInit?: boolean;
}

// ============================================================================
// Context Builder Configuration
// ============================================================================

/**
 * Configuration for the context builder
 */
export interface ContextBuilderConfig {
  /** Language for prompts */
  language: string;
  /** Theme/narrative style */
  themeKey?: string;
  /** AI settings */
  settings: AISettings;
  /** Translation function */
  tFunc?: (key: string, options?: Record<string, unknown>) => string;
}

export interface LiveToolCallUpdateOptions {
  onToolCallsUpdate?: (calls: ToolCallRecord[]) => void;
}
