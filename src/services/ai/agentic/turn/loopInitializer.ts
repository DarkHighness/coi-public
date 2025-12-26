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
import type { ZodToolDefinition } from "../../../providers/types";
import { GameDatabase } from "../../../gameDatabase";
import { BudgetState, createBudgetState } from "../budgetUtils";
import {
  SEARCH_TOOL,
  FINISH_TURN_TOOL,
  COMPLETE_FORCE_UPDATE_TOOL,
  OVERRIDE_OUTLINE_TOOL,
  QUERY_STORY_TOOL,
  QUERY_TURN_TOOL,
  ACTIVATE_SKILL_TOOL,
  LIST_TOOL,
  findTools,
} from "../../../tools";

// ============================================================================
// Types
// ============================================================================

export interface LoopState {
  /** Game database for state queries and modifications */
  db: GameDatabase;
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
): LoopState {
  const db = createGameDatabase(gameState);
  const budgetState = createBudgetState(settings);
  const accumulatedResponse = createEmptyResponse();
  const isRAGEnabled = settings.embedding?.enabled ?? false;
  const activeTools = createInitialTools(isSudoMode, isRAGEnabled);
  const finishToolName = isSudoMode ? "complete_force_update" : "finish_turn";

  return {
    db,
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
 * Create GameDatabase from game state
 */
export function createGameDatabase(gameState: GameState): GameDatabase {
  return new GameDatabase({
    ...gameState,
    knowledge: gameState.knowledge || [],
    factions: gameState.factions || [],
    timeline: gameState.timeline || [],
    causalChains: gameState.causalChains || [],
    time: gameState.time || "Unknown",
  });
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
  const tools: ZodToolDefinition[] = [
    SEARCH_TOOL,
    LIST_TOOL,
    ACTIVATE_SKILL_TOOL,
    isSudoMode ? COMPLETE_FORCE_UPDATE_TOOL : FINISH_TURN_TOOL,
    QUERY_STORY_TOOL,
    QUERY_TURN_TOOL,
  ];

  // Add override_outline tool only in sudo mode
  if (isSudoMode) {
    tools.push(OVERRIDE_OUTLINE_TOOL);
  }

  // Add RAG tool if enabled
  if (isRAGEnabled) {
    const ragTools = findTools("query", "rag_search");
    if (ragTools.length > 0) {
      tools.push(ragTools[0]);
    }
  }

  return tools;
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
