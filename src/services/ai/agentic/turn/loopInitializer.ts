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
import { VFS_TOOLSETS } from "../../../vfsToolsets";
import { getConversationMarker, type ConversationMarker } from "./resultAccumulator";

// ============================================================================
// Types
// ============================================================================

export interface LoopState {
  /** VFS session for file-based state */
  vfsSession: VfsSession;
  /** Baseline conversation marker (for detecting new turns) */
  conversationMarker: ConversationMarker | null;
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
  /** Whether in CLEANUP mode */
  isCleanupMode: boolean;
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
  isCleanupMode: boolean = false,
  vfsSession: VfsSession,
): LoopState {
  const budgetState = createBudgetState(settings, {
    loopType: isCleanupMode ? "cleanup" : "turn",
  });
  const accumulatedResponse = createEmptyResponse();
  const isRAGEnabled = settings.embedding?.enabled ?? false;
  const activeTools = createInitialTools({
    isSudoMode,
    isRAGEnabled,
    isCleanupMode,
  });
  const finishToolName = VFS_TOOLSETS.turn.finishToolName;
  const conversationMarker = getConversationMarker(vfsSession);

  return {
    vfsSession,
    conversationMarker,
    budgetState,
    accumulatedResponse,
    changedEntities: new Map(),
    totalUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    activeTools,
    isSudoMode,
    isCleanupMode,
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
  options: {
    isSudoMode: boolean;
    isRAGEnabled: boolean;
    isCleanupMode: boolean;
  },
): ZodToolDefinition[] {
  const { isSudoMode, isRAGEnabled, isCleanupMode } = options;
  void isSudoMode;
  void isRAGEnabled;

  const toolset = isCleanupMode ? VFS_TOOLSETS.cleanup : VFS_TOOLSETS.turn;
  const allowed = new Set<string>(toolset.tools);

  return ALL_DEFINED_TOOLS.filter((tool) => allowed.has(tool.name));
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
