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
import type { VfsElevationIntent, VfsMode } from "../../../vfs/core/types";
import type { VfsElevationScopeTemplateIds } from "../../../vfs/core/elevation";
import type { ZodToolDefinition } from "../../../providers/types";
import { BudgetState, createBudgetState } from "../budgetUtils";
import { vfsToolRegistry } from "../../../vfs/tools";
import {
  CURRENT_SOUL_LOGICAL_PATH,
  GLOBAL_SOUL_LOGICAL_PATH,
} from "../../../vfs/soulTemplates";
import {
  getConversationMarker,
  type ConversationMarker,
} from "./resultAccumulator";
import type { ActivePresetSkillRequirement } from "../../utils";

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
  /** Whether this loop is triggered by [Player Rate] */
  isPlayerRateMode: boolean;
  /** Required command skill paths for this loop */
  requiredCommandSkillPaths: string[];
  /** Session-level mandatory soul reads before mutation */
  requiredSoulReadPaths: string[];
  /** Required preset skill paths for this loop */
  requiredPresetSkillPaths: string[];
  /** Active preset requirements with source metadata */
  requiredPresetSkillRequirements?: ActivePresetSkillRequirement[];
  /** Active VFS mode for policy checks */
  vfsMode: VfsMode;
  /** One-time elevation token for this request (optional) */
  vfsElevationToken?: string | null;
  /** Declared elevation intent for current request token */
  vfsElevationIntent?: VfsElevationIntent;
  /** Declared elevation scope for current request token */
  vfsElevationScopeTemplateIds?: VfsElevationScopeTemplateIds;
  /** Pending existing-file write targets that must be retried successfully before finish */
  pendingWriteFailurePaths: Set<string>;
  /** Whether the one-time domain skill reminder has already fired */
  domainSkillReminderFired: boolean;
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
  requiredPresetSkillPaths: string[] = [],
  vfsMode?: VfsMode,
  vfsElevationToken?: string | null,
  requiredPresetSkillRequirements: ActivePresetSkillRequirement[] = [],
  vfsElevationIntent?: VfsElevationIntent,
  vfsElevationScopeTemplateIds?: VfsElevationScopeTemplateIds,
  options?: {
    isPlayerRateMode?: boolean;
  },
): LoopState {
  const isPlayerRateMode =
    options?.isPlayerRateMode === true && !isSudoMode && !isCleanupMode;
  const budgetState = createBudgetState(settings, {
    loopType: isCleanupMode ? "cleanup" : "turn",
  });
  const accumulatedResponse = createEmptyResponse();
  const isRAGEnabled = settings.embedding?.enabled ?? false;
  const activeTools = createInitialTools({
    isSudoMode,
    isRAGEnabled,
    isCleanupMode,
    isPlayerRateMode,
  });
  const finishToolName = isCleanupMode
    ? vfsToolRegistry.getToolset("cleanup").finishToolName
    : isPlayerRateMode
      ? vfsToolRegistry.getToolset("playerRate").finishToolName
      : vfsToolRegistry.getToolset("turn").finishToolName;
  const resolvedVfsMode: VfsMode =
    vfsMode ?? (isSudoMode ? "sudo" : gameState.godMode ? "god" : "normal");
  const conversationMarker = getConversationMarker(vfsSession);
  const requiredCommandSkillPaths = Array.from(
    new Set(
      [
        "skills/commands/runtime/SKILL.md",
        isCleanupMode
          ? "skills/commands/runtime/cleanup/SKILL.md"
          : isSudoMode
            ? "skills/commands/runtime/sudo/SKILL.md"
            : isPlayerRateMode
              ? "skills/commands/runtime/player-rate/SKILL.md"
              : "skills/commands/runtime/turn/SKILL.md",
        "skills/core/protocols/SKILL.md",
        "skills/craft/writing/SKILL.md",
        !isCleanupMode &&
        !isSudoMode &&
        !isPlayerRateMode &&
        gameState.godMode === true
          ? "skills/commands/runtime/god/SKILL.md"
          : null,
        !isCleanupMode &&
        !isSudoMode &&
        !isPlayerRateMode &&
        gameState.unlockMode === true
          ? "skills/commands/runtime/unlock/SKILL.md"
          : null,
      ].filter((path): path is string => typeof path === "string"),
    ),
  );
  const uniqueRequiredPresetSkillPaths = Array.from(
    new Set(
      (requiredPresetSkillPaths || [])
        .map((path) => path.trim())
        .filter((path) => path.length > 0),
    ),
  );
  const uniqueRequiredPresetSkillRequirements = Array.from(
    new Map(
      (requiredPresetSkillRequirements || [])
        .filter((entry) => entry && entry.path && entry.tag && entry.profile)
        .map((entry) => [
          `${entry.path}::${entry.tag}::${entry.profile}::${entry.source}`,
          entry,
        ]),
    ).values(),
  );
  const requiredSoulReadPaths = isCleanupMode
    ? []
    : [CURRENT_SOUL_LOGICAL_PATH, GLOBAL_SOUL_LOGICAL_PATH];

  return {
    vfsSession,
    conversationMarker,
    budgetState,
    accumulatedResponse,
    changedEntities: new Map(),
    totalUsage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
    activeTools,
    isSudoMode,
    isCleanupMode,
    isPlayerRateMode,
    finishToolName,
    isRAGEnabled,
    requiredCommandSkillPaths,
    requiredSoulReadPaths,
    requiredPresetSkillPaths: uniqueRequiredPresetSkillPaths,
    requiredPresetSkillRequirements: uniqueRequiredPresetSkillRequirements,
    vfsMode: resolvedVfsMode,
    vfsElevationToken: vfsElevationToken ?? null,
    vfsElevationIntent,
    vfsElevationScopeTemplateIds,
    pendingWriteFailurePaths: new Set<string>(),
    domainSkillReminderFired: false,
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
export function createInitialTools(options: {
  isSudoMode: boolean;
  isRAGEnabled: boolean;
  isCleanupMode: boolean;
  isPlayerRateMode?: boolean;
}): ZodToolDefinition[] {
  const { isSudoMode, isRAGEnabled, isCleanupMode, isPlayerRateMode } = options;
  void isSudoMode;

  const toolsetId = isCleanupMode
    ? "cleanup"
    : isPlayerRateMode
      ? "playerRate"
      : "turn";

  return vfsToolRegistry.getDefinitionsForToolset(toolsetId, {
    ragEnabled: isRAGEnabled,
  });
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
    if (usage.reported === true) {
      totalUsage.reported = true;
    } else if (usage.reported === false && totalUsage.reported !== true) {
      totalUsage.reported = false;
    }
  }
}
