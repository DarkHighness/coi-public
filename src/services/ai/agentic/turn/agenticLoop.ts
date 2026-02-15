/**
 * Agentic Loop - Refactored Main Loop
 *
 * This module contains the refactored agentic loop that uses
 * modular components for initialization, context injection,
 * AI invocation, and tool processing.
 */

import type {
  AISettings,
  LogEntry,
  TokenUsage,
  GameState,
  GameResponse,
  ProviderProtocol,
  ProviderInstance,
  ToolCallRecord,
  CustomRulesAckPendingReason,
} from "../../../../types";
import type { VfsSession } from "../../../vfs/vfsSession";
import type { ToolCallResult } from "../../../providers/types";
import { UnifiedMessage } from "../../../messageTypes";

import { sessionManager } from "../../sessionManager";
import { createLogEntry, type ActivePresetSkillRequirement } from "../../utils";
import {
  createToolCallMessage,
  createToolResponseMessage,
} from "../../../messageTypes";

// Import modular components
import { createLoopState, accumulateUsage, LoopState } from "./loopInitializer";
import {
  injectSudoModeInstruction,
  injectNormalTurnInstruction,
  injectColdStartRequiredReads,
  injectReadyConsequences,
  injectBudgetStatus,
  injectNoToolCallError,
  injectRetconAckRequired,
  injectOutOfBandReadInvalidations,
} from "./contextInjector";
import {
  checkBudgetExhaustion,
  incrementToolCalls,
  incrementIterations,
  getBudgetSummary,
} from "../budgetUtils";
import {
  buildResponseFromVfs,
  getChangedEntitiesArray,
} from "./resultAccumulator";
import { normalizeVfsPath } from "../../../vfs/utils";
import { rollbackVfsSessionToCheckpoint } from "../../../vfs/runtimeCheckpoints";
import {
  collectWriteTargetsFromToolCall,
  formatPendingWriteFailurePaths,
  getToolErrorCode,
  isReadOnlyInspectionToolName,
  isLikelyNoOpReadBeforeFinishBatch,
  isWriteMutationToolName,
  UNRECOVERABLE_WRITE_ERROR_CODES,
  UNKNOWN_WRITE_TARGET,
} from "../common/toolCallPolicies";

// Import tool handling
import { executeGenericTool, ToolCallContext } from "./toolCallProcessor";
import { handleAICall } from "./aiCallHandler";
import {
  buildSessionStartupProfile,
  getLatestSummaryReferencesMarkdown,
  type SessionStartupMode,
} from "../startup";

// ============================================================================
// Types
// ============================================================================

export interface AgenticLoopConfig {
  protocol: ProviderProtocol;
  instance: ProviderInstance;
  modelId: string;
  systemInstruction: string;
  initialContents: UnifiedMessage[];
  gameState: GameState;
  generationDetails?: LogEntry["generationDetails"];
  settings: AISettings;
  isSudoMode?: boolean;
  isCleanupMode?: boolean;
  sessionId: string;
  vfsSession: VfsSession;
  onToolCallsUpdate?: (calls: ToolCallRecord[]) => void;
  retconAckPending?: { hash: string; reason?: CustomRulesAckPendingReason };
  vfsMode?: "normal" | "god" | "sudo";
  vfsElevationToken?: string | null;
  vfsElevationIntent?:
    | "outline_submit"
    | "sudo_command"
    | "god_turn"
    | "history_rewrite"
    | "editor_session";
  vfsElevationScopeTemplateIds?: string[] | "all_elevated";
  requiredPresetSkillPaths?: string[];
  requiredPresetSkillRequirements?: ActivePresetSkillRequirement[];
}

export interface AgenticLoopResult {
  response: GameResponse;
  logs: LogEntry[];
  usage: TokenUsage;
  changedEntities: Array<{ id: string; type: string }>;
  _conversationHistory: UnifiedMessage[];
}

const getMessageText = (message: UnifiedMessage): string =>
  message.content.find((part) => part.type === "text")?.text ?? "";

const detectPlayerRateMode = (
  initialContents: UnifiedMessage[],
  isSudoMode: boolean,
  isCleanupMode: boolean,
): boolean => {
  if (isSudoMode || isCleanupMode) {
    return false;
  }

  for (let i = initialContents.length - 1; i >= 0; i -= 1) {
    const message = initialContents[i];
    if (message.role !== "user") {
      continue;
    }
    return getMessageText(message).trimStart().startsWith("[Player Rate]");
  }

  return false;
};

const formatPathPreview = (
  paths: string[],
  options?: { prefixCurrent?: boolean },
): string => {
  const normalized = paths
    .map((path) => path.trim())
    .filter((path) => path.length > 0);
  return normalized
    .map((path) =>
    options?.prefixCurrent === false ? path : `current/${path}`,
    )
    .join(", ");
};

type WriteFailureDisposition =
  | "retry_required_existing_target"
  | "warn_missing_target_non_blocking"
  | "error_unrecoverable_non_blocking";

interface WriteFailureClassification {
  disposition: WriteFailureDisposition;
  retryTargets: string[];
  guidance: string;
}

const appendWriteFailureGuidance = (
  output: unknown,
  guidance: string,
): unknown => {
  if (!output || typeof output !== "object") {
    return output;
  }
  const record = output as Record<string, unknown>;
  const existingError = typeof record.error === "string" ? record.error : "";
  if (existingError.includes(guidance)) {
    return output;
  }
  return {
    ...record,
    error: existingError ? `${existingError}\n\n${guidance}` : guidance,
  };
};

const classifyWriteFailure = (params: {
  errorCode: string | null;
  writeTargets: string[];
  existingWriteTargets: string[];
}): WriteFailureClassification => {
  const { errorCode, writeTargets, existingWriteTargets } = params;
  const allTargets =
    writeTargets.length > 0 ? writeTargets : [UNKNOWN_WRITE_TARGET];
  const existingTargets =
    existingWriteTargets.length > 0
      ? existingWriteTargets
      : [UNKNOWN_WRITE_TARGET];
  const allTargetList = formatPathPreview(allTargets, {
    prefixCurrent: false,
  });
  const existingTargetList = formatPathPreview(existingTargets, {
    prefixCurrent: false,
  });

  if (errorCode && UNRECOVERABLE_WRITE_ERROR_CODES.has(errorCode)) {
    return {
      disposition: "error_unrecoverable_non_blocking",
      retryTargets: [],
      guidance:
        `[ERROR: WRITE_UNRECOVERABLE_NON_BLOCKING] Write failed due to unrecoverable permission/policy constraints. ` +
        `This does NOT block finish. Change path/operation instead of blind retry. Targets: ${allTargetList}.`,
    };
  }

  if (existingWriteTargets.length > 0 || writeTargets.length === 0) {
    return {
      disposition: "retry_required_existing_target",
      retryTargets: existingTargets,
      guidance:
        `[ERROR: WRITE_EXISTING_TARGET_RETRY_REQUIRED] Write to existing target failed and must be retried before finish. ` +
        `Retry targets: ${existingTargetList}.`,
    };
  }

  return {
    disposition: "warn_missing_target_non_blocking",
    retryTargets: [],
    guidance:
      `[WARNING: WRITE_NON_EXISTENT_TARGET_NON_BLOCKING] Write failed on non-existent target path(s). ` +
      `This does NOT block finish. If creation is still required, fix path/operation and retry. Targets: ${allTargetList}.`,
  };
};

// ============================================================================
// Main Agentic Loop
// ============================================================================

export async function runAgenticLoopRefactored(
  config: AgenticLoopConfig,
): Promise<AgenticLoopResult> {
  const {
    protocol,
    instance,
    modelId,
    systemInstruction,
    initialContents,
    gameState,
    generationDetails,
    settings,
    isSudoMode = false,
    isCleanupMode = false,
    sessionId,
    onToolCallsUpdate,
    retconAckPending,
    vfsMode,
    vfsElevationToken,
    vfsElevationIntent,
    vfsElevationScopeTemplateIds,
    requiredPresetSkillPaths,
    requiredPresetSkillRequirements,
  } = config;

  // Initialize provider
  const provider = sessionManager.getProvider(sessionId, instance);
  const isPlayerRateMode = detectPlayerRateMode(
    initialContents,
    isSudoMode,
    isCleanupMode,
  );

  // Initialize loop state
  const loopState = createLoopState(
    gameState,
    settings,
    isSudoMode,
    isCleanupMode,
    config.vfsSession,
    requiredPresetSkillPaths ?? [],
    vfsMode,
    vfsElevationToken ?? null,
    requiredPresetSkillRequirements ?? [],
    vfsElevationIntent,
    vfsElevationScopeTemplateIds,
    {
      isPlayerRateMode,
    },
  );
  const startupMode: SessionStartupMode = isCleanupMode
    ? "cleanup"
    : isSudoMode
      ? "sudo"
      : isPlayerRateMode
        ? "player-rate"
        : "turn";
  const startupProfile = buildSessionStartupProfile({
    mode: startupMode,
    latestSummaryReferencesMarkdown: getLatestSummaryReferencesMarkdown(
      gameState,
    ),
    mandatoryReadPaths: [
      ...loopState.requiredCommandSkillPaths,
      ...loopState.requiredSoulReadPaths,
      ...loopState.requiredPresetSkillPaths,
    ],
    maxOptionalRefs: 3,
  });

  if (startupProfile.metrics.candidateCount > 0) {
    console.log(
      `[StartupProfile] mode=${startupMode} parsed=${startupProfile.metrics.validCount}/${startupProfile.metrics.candidateCount} dropped=${startupProfile.metrics.droppedCount} fallback=${startupProfile.metrics.fallbackRefsUsed}`,
    );
  }
  if (startupProfile.warnings.length > 0) {
    console.warn(`[StartupProfile] ${startupProfile.warnings.join(" | ")}`);
  }

  let conversationHistory: UnifiedMessage[] = [...initialContents];
  const allLogs: LogEntry[] = [];
  let didFinishTurn = false;

  try {
    // Inject ready consequences
    injectReadyConsequences(conversationHistory);

    if (retconAckPending?.hash) {
      injectRetconAckRequired(
        conversationHistory,
        retconAckPending.hash,
        retconAckPending.reason,
      );
    }

    const outOfBandInvalidations =
      config.vfsSession.drainOutOfBandReadInvalidations();
    if (outOfBandInvalidations.length > 0) {
      injectOutOfBandReadInvalidations(
        conversationHistory,
        outOfBandInvalidations,
      );
    }

    // Inject mode-specific instruction
    if (isSudoMode) {
      injectSudoModeInstruction(conversationHistory, loopState.isRAGEnabled);
    } else {
      injectNormalTurnInstruction(
        conversationHistory,
        loopState.finishToolName,
        isCleanupMode,
        {
          godMode: gameState.godMode === true,
          unlockMode: gameState.unlockMode === true,
        },
        loopState.requiredPresetSkillPaths,
        loopState.requiredPresetSkillRequirements ?? [],
        {
          forkId:
            typeof gameState.forkId === "number" ? gameState.forkId : undefined,
          turnNumber:
            typeof gameState.turnNumber === "number"
              ? gameState.turnNumber
              : undefined,
          mode: isCleanupMode ? "cleanup" : "normal",
        },
        loopState.isRAGEnabled,
        isPlayerRateMode ? "player-rate" : "turn",
      );
    }

    injectColdStartRequiredReads(
      conversationHistory,
      startupProfile.preloadReadPaths,
    );

    // Main loop
    while (
      loopState.budgetState.loopIterationsUsed <
      loopState.budgetState.loopIterationsMax
    ) {
      // Check budget exhaustion
      const budgetCheck = checkBudgetExhaustion(loopState.budgetState);
      if (budgetCheck.exhausted) {
        console.warn(`[AgenticLoop] ${budgetCheck.message}`);
        throw new Error(budgetCheck.message);
      }

      // Inject budget status
      injectBudgetStatus(
        conversationHistory,
        loopState.budgetState,
        loopState.finishToolName,
      );

      const turnId = `turn_${Date.now()}_${loopState.budgetState.loopIterationsUsed}`;
      console.log(
        `[AgenticLoop] Iteration: ${loopState.budgetState.loopIterationsUsed + 1}/${loopState.budgetState.loopIterationsMax}, Budget: ${getBudgetSummary(loopState.budgetState)}`,
      );

      const toolCallsRemaining =
        loopState.budgetState.toolCallsMax -
        loopState.budgetState.toolCallsUsed;
      const iterationsRemaining =
        loopState.budgetState.loopIterationsMax -
        loopState.budgetState.loopIterationsUsed;
      const mustFinishNow = toolCallsRemaining <= 2 || iterationsRemaining <= 2;

      if (mustFinishNow) {
        loopState.activeTools = loopState.activeTools.filter(
          (tool) => tool.name === loopState.finishToolName,
        );
      }

      // Call AI
      const aiResult = await handleAICall({
        provider,
        modelId,
        systemInstruction,
        conversationHistory,
        loopState,
        settings,
        sessionId,
        requiredToolName: undefined,
      });

      // Accumulate usage
      accumulateUsage(loopState.totalUsage, aiResult.usage);

      // Record assistant message
      if (aiResult.functionCalls && aiResult.functionCalls.length > 0) {
        conversationHistory.push(
          createToolCallMessage(
            aiResult.functionCalls.map((fc) => ({
              id: fc.id,
              name: fc.name,
              arguments: fc.args,
              thoughtSignature: fc.thoughtSignature,
            })),
            aiResult.text,
          ),
        );
      } else if (aiResult.text) {
        conversationHistory.push({
          role: "assistant",
          content: [{ type: "text", text: aiResult.text }],
        });
      }

      // Handle no tool calls
      if (!aiResult.functionCalls || aiResult.functionCalls.length === 0) {
        if (aiResult.text.length > 0) {
          injectNoToolCallError(conversationHistory, loopState.finishToolName);
          incrementIterations(loopState.budgetState);
          continue;
        }
      }

      // Process tool calls
      const toolResult = await processToolCalls({
        functionCalls: aiResult.functionCalls || [],
        loopState,
        gameState,
        settings,
        sessionId,
        conversationHistory,
        protocol,
        modelId,
        turnId,
        allLogs,
        onToolCallsUpdate,
      });

      // Add tool responses to history
      if (toolResult.responses.length > 0) {
        conversationHistory.push(
          createToolResponseMessage(toolResult.responses),
        );
      }

      // Check if turn finished
      if (toolResult.turnFinished) {
        didFinishTurn = true;
        onToolCallsUpdate?.([]);
        break;
      }

      incrementIterations(loopState.budgetState);
    }
  } catch (error) {
    onToolCallsUpdate?.([]);
    const rolledBack = rollbackVfsSessionToCheckpoint(
      sessionId,
      config.vfsSession,
    );
    if (!rolledBack) {
      throw new Error(
        `[AgenticLoop] Missing VFS checkpoint for session "${sessionId}". Cannot rollback after error.`,
        { cause: error as unknown },
      );
    }
    throw error;
  }

  if (!didFinishTurn) {
    onToolCallsUpdate?.([]);
    const rolledBack = rollbackVfsSessionToCheckpoint(
      sessionId,
      config.vfsSession,
    );
    if (!rolledBack) {
      throw new Error(
        `[AgenticLoop] Missing VFS checkpoint for session "${sessionId}". Cannot rollback after TURN_NOT_COMMITTED.`,
      );
    }
    throw new Error(
      `TURN_NOT_COMMITTED: Agentic loop exhausted its budget without calling finish tool "${loopState.finishToolName}" as the last step.`,
    );
  }

  return {
    response: loopState.accumulatedResponse,
    logs: allLogs,
    usage: loopState.totalUsage,
    changedEntities: getChangedEntitiesArray(loopState.changedEntities),
    _conversationHistory: conversationHistory,
  };
}

// ============================================================================
// Tool Call Processing
// ============================================================================

interface ProcessToolCallsParams {
  functionCalls: ToolCallResult[];
  loopState: LoopState;
  gameState: GameState;
  settings: AISettings;
  sessionId: string;
  conversationHistory: UnifiedMessage[];
  protocol: ProviderProtocol;
  modelId: string;
  turnId: string;
  allLogs: LogEntry[];
  onToolCallsUpdate?: (calls: ToolCallRecord[]) => void;
  retconAckPending?: { hash: string; reason?: CustomRulesAckPendingReason };
  vfsMode?: "normal" | "god" | "sudo";
  vfsElevationToken?: string | null;
  vfsElevationIntent?:
    | "outline_submit"
    | "sudo_command"
    | "god_turn"
    | "history_rewrite"
    | "editor_session";
  vfsElevationScopeTemplateIds?: string[] | "all_elevated";
}

interface ProcessToolCallsResult {
  responses: Array<{ toolCallId: string; name: string; content: unknown }>;
  turnFinished: boolean;
}

const extractTurnPathCandidates = (value: unknown, key?: string): string[] => {
  const PATH_KEYS = new Set([
    "path",
    "paths",
    "from",
    "to",
    "patterns",
    "excludePatterns",
  ]);

  if (typeof value === "string") {
    return key && PATH_KEYS.has(key) ? [value] : [];
  }

  if (Array.isArray(value)) {
    if (key && PATH_KEYS.has(key)) {
      return value.flatMap((entry) =>
        typeof entry === "string" ? [entry] : extractTurnPathCandidates(entry),
      );
    }
    return value.flatMap((entry) => extractTurnPathCandidates(entry));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    extractTurnPathCandidates(v, k),
  );
};

const extractForkRefsFromTurnPath = (candidate: string): number[] => {
  const refs = new Set<number>();
  const canonicalPattern = /\bforks\/(\d+)\b/g;
  const conversationPattern = /\bconversation\/turns\/fork-(\d+)\b/g;

  for (const pattern of [canonicalPattern, conversationPattern]) {
    let match: RegExpExecArray | null = null;
    while ((match = pattern.exec(candidate)) !== null) {
      const forkId = Number(match[1]);
      if (Number.isFinite(forkId)) {
        refs.add(forkId);
      }
    }
  }

  return Array.from(refs.values());
};

const findTurnCrossForkViolations = (
  args: unknown,
  targetForkId: number,
): Array<{ path: string; forkId: number }> => {
  const candidates = extractTurnPathCandidates(args);
  const violations: Array<{ path: string; forkId: number }> = [];

  for (const candidate of candidates) {
    const refs = extractForkRefsFromTurnPath(candidate);
    for (const forkId of refs) {
      if (forkId !== targetForkId) {
        violations.push({ path: candidate, forkId });
      }
    }
  }

  return violations;
};

function checkCommandSkillReadGate(
  functionCalls: ToolCallResult[],
  loopState: LoopState,
):
  | { ok: true }
  | { ok: false; error: { success: false; error: string; code: string } } {
  const required = loopState.requiredCommandSkillPaths;
  if (!required || required.length === 0) {
    return { ok: true };
  }

  const hasMutationLikeCall = functionCalls.some(
    (call) => !isReadOnlyInspectionToolName(call.name),
  );
  if (!hasMutationLikeCall) {
    return { ok: true };
  }

  const missing = required.filter(
    (path) => !loopState.vfsSession.hasToolSeenInCurrentEpoch(path),
  );

  if (missing.length === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    error: {
      success: false,
      error: `[ERROR: COMMAND_SKILL_NOT_READ] You must read required command skill file(s) in current epoch before non-read tools: ${missing
        .length > 0
        ? formatPathPreview(missing)
        : "(none)"}.\nAction: call vfs_read on each missing file first.`,
      code: "SKILL_NOT_READ",
    },
  };
}

function checkSoulReadGate(
  functionCalls: ToolCallResult[],
  loopState: LoopState,
):
  | { ok: true }
  | { ok: false; error: { success: false; error: string; code: string } } {
  const required = loopState.requiredSoulReadPaths;
  if (!required || required.length === 0) {
    return { ok: true };
  }

  const hasMutationLikeCall = functionCalls.some(
    (call) => !isReadOnlyInspectionToolName(call.name),
  );
  if (!hasMutationLikeCall) {
    return { ok: true };
  }

  const missing = required.filter(
    (path) => !loopState.vfsSession.hasToolSeenInCurrentEpoch(path),
  );

  if (missing.length === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    error: {
      success: false,
      error: `[ERROR: SOUL_NOT_READ] Session preflight requires reading soul memory anchors before non-read tools: ${missing
        .length > 0
        ? formatPathPreview(missing)
        : "(none)"}.\nAction: call vfs_read on each anchor once, then continue.`,
      code: "SOUL_NOT_READ",
    },
  };
}

function checkPresetSkillReadGate(
  functionCalls: ToolCallResult[],
  loopState: LoopState,
):
  | { ok: true }
  | { ok: false; error: { success: false; error: string; code: string } } {
  const required = loopState.requiredPresetSkillPaths;
  if (!required || required.length === 0) {
    return { ok: true };
  }

  const hasMutationLikeCall = functionCalls.some(
    (call) => !isReadOnlyInspectionToolName(call.name),
  );
  if (!hasMutationLikeCall) {
    return { ok: true };
  }

  const missing = required.filter(
    (path) => !loopState.vfsSession.hasToolSeenInCurrentEpoch(path),
  );

  if (missing.length === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    error: {
      success: false,
      error: `[ERROR: PRESET_SKILL_NOT_READ] Active preset skill file(s) must be read in current epoch before non-read tools: ${missing
        .length > 0
        ? formatPathPreview(missing)
        : "(none)"}.\nAction: call vfs_read on each missing file first.`,
      code: "PRESET_SKILL_NOT_READ",
    },
  };
}

async function processToolCalls(
  params: ProcessToolCallsParams,
): Promise<ProcessToolCallsResult> {
  const {
    functionCalls,
    loopState,
    gameState,
    settings,
    sessionId,
    conversationHistory,
    protocol,
    modelId,
    turnId,
    allLogs,
    onToolCallsUpdate,
  } = params;

  const finishToolName = loopState.finishToolName;

  const skillGate = checkCommandSkillReadGate(functionCalls, loopState);
  if ("error" in skillGate) {
    const gateError = skillGate.error;
    return {
      responses: functionCalls.map((call) => ({
        toolCallId: call.id,
        name: call.name,
        content: gateError,
      })),
      turnFinished: false,
    };
  }

  const soulGate = checkSoulReadGate(functionCalls, loopState);
  if ("error" in soulGate) {
    const gateError = soulGate.error;
    return {
      responses: functionCalls.map((call) => ({
        toolCallId: call.id,
        name: call.name,
        content: gateError,
      })),
      turnFinished: false,
    };
  }

  const presetSkillGate = checkPresetSkillReadGate(functionCalls, loopState);
  if ("error" in presetSkillGate) {
    const gateError = presetSkillGate.error;
    return {
      responses: functionCalls.map((call) => ({
        toolCallId: call.id,
        name: call.name,
        content: gateError,
      })),
      turnFinished: false,
    };
  }

  const isFinishToolCall = (call: ToolCallResult): boolean => {
    return call.name === finishToolName;
  };

  const isConversationPath = (path: string): boolean => {
    const normalized = normalizeVfsPath(path);
    if (!normalized) {
      return false;
    }
    const stripped = normalized.startsWith("current/")
      ? normalized.slice("current/".length)
      : normalized;
    return stripped === "conversation" || stripped.startsWith("conversation/");
  };

  const getConversationTouchedPaths = (call: ToolCallResult): string[] => {
    const touched: string[] = [];

    if (call.name === "vfs_write") {
      const ops = (call.args as any)?.ops;
      if (Array.isArray(ops)) {
        for (const op of ops) {
          if (!op || typeof op !== "object") continue;
          const path = (op as any).path;
          if (typeof path === "string" && isConversationPath(path)) {
            touched.push(path);
          }
        }
      }
      return touched;
    }

    if (call.name === "vfs_move") {
      const moves = (call.args as any)?.moves;
      if (Array.isArray(moves)) {
        for (const move of moves) {
          if (typeof move?.from === "string" && isConversationPath(move.from)) {
            touched.push(move.from);
          }
          if (typeof move?.to === "string" && isConversationPath(move.to)) {
            touched.push(move.to);
          }
        }
      }
      return touched;
    }

    if (call.name === "vfs_delete") {
      const paths = (call.args as any)?.paths;
      if (Array.isArray(paths)) {
        for (const path of paths) {
          if (typeof path === "string" && isConversationPath(path)) {
            touched.push(path);
          }
        }
      }
      return touched;
    }

    return touched;
  };

  const mustOnlyFinish =
    loopState.activeTools.length > 0 &&
    loopState.activeTools.every((tool) => tool.name === finishToolName);

  if (mustOnlyFinish) {
    if (functionCalls.length !== 1 || !isFinishToolCall(functionCalls[0]!)) {
      const error = {
        success: false,
        error: `[ERROR: FORCED_FINISH] Budget is critically low. Your ONLY allowed tool call is "${finishToolName}", and it must be the ONLY tool call in this response.`,
        code: "INVALID_ACTION",
      };
      return {
        responses: functionCalls.map((call) => ({
          toolCallId: call.id,
          name: call.name,
          content: error,
        })),
        turnFinished: false,
      };
    }
  }

  const finishCallIndices = functionCalls
    .map((call, index) => ({ call, index }))
    .filter(({ call }) => isFinishToolCall(call))
    .map(({ index }) => index);

  if (finishCallIndices.length > 1) {
    const error = {
      success: false,
      error: `[ERROR: MULTIPLE_FINISH_CALLS] You invoked the finish operation more than once. Provide exactly one "${finishToolName}", and it must be the LAST tool call.`,
      code: "INVALID_ACTION",
    };
    return {
      responses: functionCalls.map((call) => ({
        toolCallId: call.id,
        name: call.name,
        content: error,
      })),
      turnFinished: false,
    };
  }

  if (
    finishCallIndices.length === 1 &&
    finishCallIndices[0] !== functionCalls.length - 1
  ) {
    const error = {
      success: false,
      error: `[ERROR: FINISH_NOT_LAST] The finish tool must be your LAST tool call. Reorder so all state edits happen before "${finishToolName}".`,
      code: "INVALID_ACTION",
    };
    return {
      responses: functionCalls.map((call) => ({
        toolCallId: call.id,
        name: call.name,
        content: error,
      })),
      turnFinished: false,
    };
  }

  if (isLikelyNoOpReadBeforeFinishBatch(functionCalls, finishToolName)) {
    const warning = {
      success: false,
      error:
        `[WARNING: PRE_FINISH_READ_ONLY_SEQUENCE] You are calling "${finishToolName}" in this batch, ` +
        "but all prior calls are read-only and produce no state changes. " +
        "Avoid token-waste reads right before finish. Either finish directly, or perform required mutations before finish.",
      code: "WARNING",
      warning: true,
    };
    return {
      responses: functionCalls.map((call) => ({
        toolCallId: call.id,
        name: call.name,
        content: warning,
      })),
      turnFinished: false,
    };
  }

  const conversationTouched = functionCalls.flatMap((call) =>
    getConversationTouchedPaths(call),
  );

  const targetForkId =
    typeof gameState.forkId === "number" ? gameState.forkId : 0;

  for (const call of functionCalls) {
    const crossForkViolations = findTurnCrossForkViolations(
      call.args,
      targetForkId,
    );
    if (crossForkViolations.length > 0) {
      const details = crossForkViolations
        .slice(0, 3)
        .map((item) => `fork=${item.forkId} path="${item.path}"`)
        .join("; ");

      const error = {
        success: false,
        error:
          `[ERROR: CROSS_FORK_ACCESS_BLOCKED] Current turn is scoped to fork ${targetForkId}. ` +
          `Cross-fork path references are not allowed (${details}). Read/write only current fork paths.`,
        code: "INVALID_ACTION",
      };

      return {
        responses: functionCalls.map((toolCall) => ({
          toolCallId: toolCall.id,
          name: toolCall.name,
          content: error,
        })),
        turnFinished: false,
      };
    }
  }

  if (conversationTouched.length > 0) {
    const unique = Array.from(new Set(conversationTouched));
    const preview = formatPathPreview(unique, {
      prefixCurrent: false,
    });
    const error = {
      success: false,
      error:
        `[ERROR: CONVERSATION_WRITE_FORBIDDEN] Do not mutate current/conversation/* via generic write/move/delete tools. ` +
        `Use "${finishToolName}" as the ONLY commit path at turn end. Forbidden: ${preview}.`,
      code: "INVALID_ACTION",
    };
    return {
      responses: functionCalls.map((call) => ({
        toolCallId: call.id,
        name: call.name,
        content: error,
      })),
      turnFinished: false,
    };
  }

  incrementToolCalls(loopState.budgetState, functionCalls.length);
  console.log(
    `[AgenticLoop] Processing ${functionCalls.length} tool calls. Budget: ${getBudgetSummary(loopState.budgetState)}`,
  );

  const responses: Array<{
    toolCallId: string;
    name: string;
    content: unknown;
  }> = [];
  let turnFinished = false;

  const liveToolCalls: ToolCallRecord[] = functionCalls.map((call) => ({
    name: call.name,
    input: (call.args || {}) as Record<string, unknown>,
    output: null,
    timestamp: Date.now(),
  }));
  onToolCallsUpdate?.([...liveToolCalls]);

  const toolCtx: ToolCallContext = {
    loopState,
    gameState,
    settings,
  };

  for (const call of functionCalls) {
    let output: unknown;
    let isError = false;
    const isWriteTool = isWriteMutationToolName(call.name);
    const writeTargets = isWriteTool
      ? collectWriteTargetsFromToolCall(call)
      : [];
    const existingWriteTargets = isWriteTool
      ? writeTargets.filter((target) => loopState.vfsSession.readFile(target))
      : [];

    if (
      isFinishToolCall(call) &&
      loopState.pendingWriteFailurePaths.size > 0
    ) {
      const pendingList = formatPendingWriteFailurePaths(
        loopState.pendingWriteFailurePaths,
      );
      output = {
        success: false,
        error:
          `[ERROR: FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE] Existing-file write targets failed earlier and must succeed before finish. ` +
          `Retry writes for: ${pendingList}.`,
        code: "INVALID_ACTION",
      };
      isError = true;
    } else {
      try {
        output = await Promise.resolve(
          executeGenericTool(call.name, call.args, toolCtx),
        );

        // Check for errors
        if (
          output &&
          typeof output === "object" &&
          "success" in output &&
          (output as any).success === false
        ) {
          isError = true;
        }
      } catch (err: any) {
        output = {
          success: false,
          error: `Tool execution failed: ${err.message}`,
          code: "EXECUTION_ERROR",
        };
        isError = true;
      }
    }

    if (isWriteTool) {
      if (isError) {
        const classification = classifyWriteFailure({
          errorCode: getToolErrorCode(output),
          writeTargets,
          existingWriteTargets,
        });
        output = appendWriteFailureGuidance(output, classification.guidance);

        if (classification.disposition === "retry_required_existing_target") {
          for (const target of classification.retryTargets) {
            loopState.pendingWriteFailurePaths.add(target);
          }
        }
      } else {
        if (writeTargets.length > 0) {
          for (const target of writeTargets) {
            loopState.pendingWriteFailurePaths.delete(target);
          }
        }
        // If a previous malformed write had unknown target, any successful write
        // indicates the model recovered its write workflow and can proceed.
        loopState.pendingWriteFailurePaths.delete(UNKNOWN_WRITE_TARGET);
      }
    }

    responses.push({
      toolCallId: call.id,
      name: call.name,
      content: output,
    });

    const callIndex = functionCalls.findIndex(
      (toolCall) => toolCall.id === call.id,
    );
    if (callIndex >= 0) {
      liveToolCalls[callIndex] = {
        ...liveToolCalls[callIndex],
        output,
      };
      onToolCallsUpdate?.([...liveToolCalls]);
    }

    // Log tool usage before checking finish state so the final commit tool
    // is also recorded in the persisted log list.
    allLogs.push(
      createLogEntry({
        provider: protocol,
        model: modelId,
        endpoint: "tool_execution",
        toolName: call.name,
        toolInput: call.args,
        toolOutput: output,
        turnId,
        forkId: gameState.forkId,
        turnNumber: gameState.turnNumber,
      }),
    );

    const responseFromVfs = buildResponseFromVfs(
      loopState.vfsSession,
      loopState.conversationMarker,
    );
    if (responseFromVfs) {
      loopState.accumulatedResponse = responseFromVfs;
      turnFinished = true;
      onToolCallsUpdate?.([]);
      break;
    }

    if (isFinishToolCall(call) && !isError) {
      turnFinished = true;
      onToolCallsUpdate?.([]);
      break;
    }
  }

  if (!turnFinished) {
    onToolCallsUpdate?.([...liveToolCalls]);
  }

  return { responses, turnFinished };
}
