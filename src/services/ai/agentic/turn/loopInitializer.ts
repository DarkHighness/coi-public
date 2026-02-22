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
import {
  createPromptTokenBudgetContext,
  type PromptTokenBudgetContext,
} from "../retry";
import { vfsToolRegistry } from "../../../vfs/tools";
import {
  getConversationMarker,
  type ConversationMarker,
} from "./resultAccumulator";
import type { ActivePresetSkillRequirement } from "../../utils";
import { isExperimentalVfsVmEnabled } from "../../../vfs/experimentalFlags";
import { resolveSkillPolicyGateConfig } from "../../../skills/skillPolicies";
import {
  getLoopSkillBaselineCanonicalPaths,
  LOOP_RUNTIME_OPTIONAL_SKILLS,
  resolveRuntimeLoopBaselineKey,
  toCanonicalSkillPath,
} from "../../../prompts/skills/loopSkillBaseline";

// ============================================================================
// Types
// ============================================================================

export type AgenticTurnKind =
  | "normal"
  | "session_compact"
  | "query_summary"
  | "session_cleanup"
  | "query_cleanup";

export interface LoopState {
  /** VFS session for file-based state */
  vfsSession: VfsSession;
  /** Baseline conversation marker (for detecting new turns) */
  conversationMarker: ConversationMarker | null;
  /** Budget tracking state */
  budgetState: BudgetState;
  /** Session-local token budget references (no global shared cache) */
  promptTokenBudgetContext: PromptTokenBudgetContext;
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
  /** Whether experimental vfs_vm is enabled */
  vfsVmExperimentalEnabled: boolean;
  /** Logical turn kind for context-pressure routing */
  turnKind: AgenticTurnKind;
  /** Whether this loop is triggered by [Player Rate] */
  isPlayerRateMode: boolean;
  /** Required command skill paths for this loop */
  requiredCommandSkillPaths: string[];
  /** Required preset skill paths for this loop */
  requiredPresetSkillPaths: string[];
  /** Player-configured must-read skill paths (auto-preloaded into context) */
  userRequiredSkillPaths: string[];
  /** Player-configured recommended skill paths (soft guidance only) */
  userRecommendedSkillPaths: string[];
  /** Player-configured forbidden skill paths (read tools blocked) */
  userForbiddenSkillPaths: string[];
  /** Forbidden entries ignored because hard runtime/preset gates require them */
  userForbiddenIgnoredByHardGate: string[];
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
}

export interface ResolvedLoopSkillPolicyState {
  requiredCommandSkillPaths: string[];
  requiredPresetSkillPaths: string[];
  userRequiredSkillPaths: string[];
  userRecommendedSkillPaths: string[];
  userForbiddenSkillPaths: string[];
  userForbiddenIgnoredByHardGate: string[];
}

export function resolveLoopSkillPolicyState(params: {
  gameState: Pick<GameState, "godMode" | "unlockMode">;
  settings: AISettings;
  isSudoMode: boolean;
  isCleanupMode: boolean;
  isPlayerRateMode?: boolean;
  requiredPresetSkillPaths?: string[];
}): ResolvedLoopSkillPolicyState {
  const {
    gameState,
    settings,
    isSudoMode,
    isCleanupMode,
    isPlayerRateMode = false,
    requiredPresetSkillPaths = [],
  } = params;

  const runtimeBaselineKey = resolveRuntimeLoopBaselineKey({
    isCleanupMode,
    isSudoMode,
    isPlayerRateMode,
  });
  const optionalRuntimeSkillPaths: string[] = [];
  if (
    !isCleanupMode &&
    !isSudoMode &&
    !isPlayerRateMode &&
    gameState.godMode === true
  ) {
    optionalRuntimeSkillPaths.push(LOOP_RUNTIME_OPTIONAL_SKILLS.god);
  }
  if (
    !isCleanupMode &&
    !isSudoMode &&
    !isPlayerRateMode &&
    gameState.unlockMode === true
  ) {
    optionalRuntimeSkillPaths.push(LOOP_RUNTIME_OPTIONAL_SKILLS.unlock);
  }

  const resolvedRequiredCommandSkillPaths = Array.from(
    new Set(
      [
        ...getLoopSkillBaselineCanonicalPaths(runtimeBaselineKey),
        ...optionalRuntimeSkillPaths.map(toCanonicalSkillPath),
      ].filter((path): path is string => typeof path === "string"),
    ),
  );
  const resolvedRequiredPresetSkillPaths = Array.from(
    new Set(
      (requiredPresetSkillPaths || [])
        .map((path) => path.trim())
        .filter((path) => path.length > 0),
    ),
  );

  const skillPolicyGateConfig = resolveSkillPolicyGateConfig({
    settings,
    hardRequiredPaths: resolvedRequiredCommandSkillPaths,
    hardPresetRequiredPaths: resolvedRequiredPresetSkillPaths,
  });

  return {
    requiredCommandSkillPaths: resolvedRequiredCommandSkillPaths,
    requiredPresetSkillPaths: resolvedRequiredPresetSkillPaths,
    userRequiredSkillPaths: skillPolicyGateConfig.required,
    userRecommendedSkillPaths: skillPolicyGateConfig.recommended,
    userForbiddenSkillPaths: skillPolicyGateConfig.forbidden,
    userForbiddenIgnoredByHardGate: skillPolicyGateConfig.ignoredForbidden,
  };
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
    turnKind?: AgenticTurnKind;
  },
): LoopState {
  const vfsVmExperimentalEnabled = isExperimentalVfsVmEnabled(settings);
  vfsSession.setExperimentalFeatures?.({
    vfsVm: vfsVmExperimentalEnabled,
  });
  const isPlayerRateMode =
    options?.isPlayerRateMode === true && !isSudoMode && !isCleanupMode;
  const turnKind =
    options?.turnKind ?? (isCleanupMode ? "session_cleanup" : "normal");
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
    vfsVmEnabled: vfsVmExperimentalEnabled,
  });
  const finishToolName = isCleanupMode
    ? vfsToolRegistry.getToolset("cleanup").finishToolName
    : isPlayerRateMode
      ? vfsToolRegistry.getToolset("playerRate").finishToolName
      : vfsToolRegistry.getToolset("turn").finishToolName;
  const resolvedVfsMode: VfsMode =
    vfsMode ?? (isSudoMode ? "sudo" : gameState.godMode ? "god" : "normal");
  const conversationMarker = getConversationMarker(vfsSession);
  const skillPolicyState = resolveLoopSkillPolicyState({
    gameState: {
      godMode: gameState.godMode === true,
      unlockMode: gameState.unlockMode === true,
    },
    settings,
    isSudoMode,
    isCleanupMode,
    isPlayerRateMode,
    requiredPresetSkillPaths,
  });
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
  return {
    vfsSession,
    conversationMarker,
    budgetState,
    promptTokenBudgetContext: createPromptTokenBudgetContext(),
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
    vfsVmExperimentalEnabled,
    turnKind,
    isPlayerRateMode,
    finishToolName,
    isRAGEnabled,
    requiredCommandSkillPaths: skillPolicyState.requiredCommandSkillPaths,
    requiredPresetSkillPaths: skillPolicyState.requiredPresetSkillPaths,
    userRequiredSkillPaths: skillPolicyState.userRequiredSkillPaths,
    userRecommendedSkillPaths: skillPolicyState.userRecommendedSkillPaths,
    userForbiddenSkillPaths: skillPolicyState.userForbiddenSkillPaths,
    userForbiddenIgnoredByHardGate:
      skillPolicyState.userForbiddenIgnoredByHardGate,
    requiredPresetSkillRequirements: uniqueRequiredPresetSkillRequirements,
    vfsMode: resolvedVfsMode,
    vfsElevationToken: vfsElevationToken ?? null,
    vfsElevationIntent,
    vfsElevationScopeTemplateIds,
    pendingWriteFailurePaths: new Set<string>(),
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
  vfsVmEnabled?: boolean;
}): ZodToolDefinition[] {
  const {
    isSudoMode,
    isRAGEnabled,
    isCleanupMode,
    isPlayerRateMode,
    vfsVmEnabled = true,
  } = options;
  void isSudoMode;

  const toolsetId = isCleanupMode
    ? "cleanup"
    : isPlayerRateMode
      ? "playerRate"
      : "turn";

  return vfsToolRegistry.getDefinitionsForToolset(toolsetId, {
    ragEnabled: isRAGEnabled,
    includeExperimentalTools: vfsVmEnabled,
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
