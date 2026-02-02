/**
 * Loop Initializer
 *
 * Handles initialization of agentic loop state and resources.
 */

import type {
  AISettings,
  GameState,
  TokenUsage,
  GameResponse,
} from "../../../../types";
import type { VfsSession } from "../../../vfs/vfsSession";
import type { ZodToolDefinition } from "../../../providers/types";
import { BudgetState, createBudgetState } from "../budgetUtils";
import { ALL_DEFINED_TOOLS } from "../../../tools";

// ============================================================================
// Types
// ============================================================================

export interface LoopState {
  /** VFS session for file-based state */
  vfsSession?: VfsSession;
  /** Budget tracking state */
  budgetState: BudgetState;
  /** Accumulated response being built */
  accumulatedResponse: GameResponse;
  /** Map of changed entities (id -> type) */
  changedEntities: Map<string, string>;
  /** Total token usage */
  totalUsage: TokenUsage;
  /** Currently active tools */
  activeTools: ZodToolDefinition[];
  /** Whether in SUDO mode */
  isSudoMode: boolean;
  /** Name of the finish tool */
  finishToolName: string;
  /** Whether RAG is enabled */
  isRAGEnabled: boolean;
}

// ============================================================================
// Initialization Functions
// ============================================================================

/**
 * Create initial loop state
 */
export function createLoopState(
  gameState: GameState,
  settings: AISettings,
  isSudoMode: boolean,
  vfsSession?: VfsSession,
): LoopState {
  const budgetState = createBudgetState(settings);
  const accumulatedResponse = createEmptyResponse();
  const isRAGEnabled = settings.embedding?.enabled ?? false;
  const activeTools = createInitialTools(isSudoMode, isRAGEnabled);
  const finishToolName = "vfs_write";

  return {
    vfsSession,
    budgetState,
    accumulatedResponse,
    changedEntities: new Map(),
    totalUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    activeTools,
    isSudoMode,
    finishToolName,
    isRAGEnabled,
  };
}

/**
 * Create empty accumulated response
 */
export function createEmptyResponse(): GameResponse {
  return {
    narrative: "",
    choices: [],
    inventoryActions: [],
    npcActions: [],
    locationActions: [],
    questActions: [],
    knowledgeActions: [],
    factionActions: [],
    characterUpdates: undefined,
    timelineEvents: [],
  };
}

/**
 * Create initial tool set based on mode
 */
export function createInitialTools(
  isSudoMode: boolean,
  isRAGEnabled: boolean,
): ZodToolDefinition[] {
  void isSudoMode;
  void isRAGEnabled;
  return [...ALL_DEFINED_TOOLS];
}

/**
 * Add tool to active set if not already present
 */
export function addToolIfNew(
  activeTools: ZodToolDefinition[],
  tool: ZodToolDefinition,
): boolean {
  if (!activeTools.some((t) => t.name === tool.name)) {
    activeTools.push(tool);
    return true;
  }
  return false;
}

/**
 * Accumulate token usage
 */
export function accumulateUsage(
  totalUsage: TokenUsage,
  usage: TokenUsage | undefined,
): void {
  if (usage) {
    totalUsage.promptTokens += usage.promptTokens || 0;
    totalUsage.completionTokens += usage.completionTokens || 0;
    totalUsage.totalTokens += usage.totalTokens || 0;
  }
}
