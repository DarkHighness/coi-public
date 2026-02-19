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
  ToolCallContextUsageSnapshot,
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
import {
  createLoopState,
  accumulateUsage,
  type LoopState,
  type AgenticTurnKind,
} from "./loopInitializer";
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
import { toJsonValue } from "../../../jsonValue";
import {
  buildToolCallContextUsageSnapshot,
  AUTO_QUERY_DANGER_THRESHOLD,
  recordPromptTokenCalibrationSample,
} from "../../contextUsage";
import { ContextOverflowError } from "../../contextCompressor";
import { estimatePromptTokens } from "../retry";
import {
  collectWriteTargetsFromToolCall,
  formatPendingWriteFailurePaths,
  getToolErrorCode,
  isReadOnlyInspectionToolName,
  isLikelyNoOpReadBeforeFinishBatch,
  isWriteMutationToolName,
  normalizeWriteTargetPath,
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
  currentUserAction?: string;
  turnKind?: AgenticTurnKind;
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

const resolveCurrentUserAction = (
  explicitUserAction: string | undefined,
  initialContents: UnifiedMessage[],
): string | null => {
  if (
    typeof explicitUserAction === "string" &&
    explicitUserAction.trim().length > 0
  ) {
    return explicitUserAction;
  }

  for (let i = initialContents.length - 1; i >= 0; i -= 1) {
    const message = initialContents[i];
    if (message.role !== "user") {
      continue;
    }
    const text = getMessageText(message);
    if (text.trim().length > 0) {
      return text;
    }
  }

  return null;
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

const BLOCKING_NEW_TARGET_WRITE_ERROR_CODES = new Set([
  "INVALID_DATA",
  "SCHEMA_VALIDATION_FAILED",
]);

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
  const record = output as JsonObject;
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
  const isBlockingNewTargetFailure =
    writeTargets.length > 0 &&
    existingWriteTargets.length === 0 &&
    !!errorCode &&
    BLOCKING_NEW_TARGET_WRITE_ERROR_CODES.has(errorCode);

  if (errorCode && UNRECOVERABLE_WRITE_ERROR_CODES.has(errorCode)) {
    return {
      disposition: "error_unrecoverable_non_blocking",
      retryTargets: [],
      guidance:
        `[ERROR: WRITE_UNRECOVERABLE_NON_BLOCKING] Write failed because policy/ACL forbids these targets: ${allTargetList}. ` +
        "This does NOT block finish. Choose an allowed path/operation or request policy change before retrying.",
    };
  }

  if (
    existingWriteTargets.length > 0 ||
    writeTargets.length === 0 ||
    isBlockingNewTargetFailure
  ) {
    const retryTargets =
      existingWriteTargets.length > 0 ? existingTargets : allTargets;
    const retryTargetList = formatPathPreview(retryTargets, {
      prefixCurrent: false,
    });
    return {
      disposition: "retry_required_existing_target",
      retryTargets,
      guidance:
        `[ERROR: WRITE_EXISTING_TARGET_RETRY_REQUIRED] Write failed and must be retried before finish. ` +
        `Retry targets: ${retryTargetList}.`,
    };
  }

  return {
    disposition: "warn_missing_target_non_blocking",
    retryTargets: [],
    guidance:
      errorCode === "NOT_FOUND"
        ? `[WARNING: WRITE_NON_EXISTENT_TARGET_NON_BLOCKING] Write failed because target path(s) do not exist. ` +
          `This does NOT block finish. If creation is still required, fix path/operation and retry. Targets: ${allTargetList}.`
        : `[WARNING: WRITE_NON_BLOCKING_FAILURE] Write failed on non-blocking target path(s). ` +
          `This does NOT block finish. New-file creation may still be intended; fix the actual error above (e.g. schema/arguments/content) and retry only if needed. Targets: ${allTargetList}.`,
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
    currentUserAction: explicitCurrentUserAction,
    turnKind,
  } = config;

  // Initialize provider
  const provider = sessionManager.getProvider(sessionId, instance);
  const isPlayerRateMode = detectPlayerRateMode(
    initialContents,
    isSudoMode,
    isCleanupMode,
  );
  const currentUserAction = resolveCurrentUserAction(
    explicitCurrentUserAction,
    initialContents,
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
      turnKind,
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
    latestSummaryReferencesMarkdown:
      getLatestSummaryReferencesMarkdown(gameState),
    mandatoryReadPaths: [
      ...loopState.requiredCommandSkillPaths,
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
  let autoCompactTriggeredByContextPressure = false;

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

      const estimatedPromptTokensForCalibration = estimatePromptTokens(
        {
          modelId,
          systemInstruction,
          messages: [],
          tools: loopState.activeTools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          })),
        },
        conversationHistory,
      );
      recordPromptTokenCalibrationSample({
        providerProtocol: protocol,
        modelId,
        reportedPromptTokens: aiResult.usage?.promptTokens ?? 0,
        estimatedPromptTokens: estimatedPromptTokensForCalibration,
        usageReported: aiResult.usage?.reported,
      });

      // Accumulate usage
      accumulateUsage(loopState.totalUsage, aiResult.usage);
      const contextUsageSnapshot = buildToolCallContextUsageSnapshot({
        settings,
        promptTokens: aiResult.usage?.promptTokens ?? 0,
        autoCompactThreshold: settings.extra?.autoCompactThreshold,
      });
      const autoCompactEnabled = settings.extra?.autoCompactEnabled ?? true;
      const hasFinishCall = (aiResult.functionCalls || []).some(
        (call) => call.name === loopState.finishToolName,
      );
      const inDangerZone =
        contextUsageSnapshot.usageRatio >= AUTO_QUERY_DANGER_THRESHOLD;
      const shouldUseDangerOnlyThreshold =
        loopState.turnKind === "session_cleanup" ||
        loopState.turnKind === "session_compact";
      const shouldTriggerContextOverflow = shouldUseDangerOnlyThreshold
        ? inDangerZone
        : contextUsageSnapshot.usageRatio >=
          contextUsageSnapshot.autoCompactThreshold;
      if (
        autoCompactEnabled &&
        !autoCompactTriggeredByContextPressure &&
        !hasFinishCall &&
        shouldTriggerContextOverflow
      ) {
        autoCompactTriggeredByContextPressure = true;
        const ratioPercent = Math.round(contextUsageSnapshot.usageRatio * 100);
        const thresholdPercent = Math.round(
          contextUsageSnapshot.autoCompactThreshold * 100,
        );
        const dangerPercent = Math.round(AUTO_QUERY_DANGER_THRESHOLD * 100);
        const appliedThresholdPercent = shouldUseDangerOnlyThreshold
          ? dangerPercent
          : thresholdPercent;
        throw new ContextOverflowError(
          new Error(
            `AUTO_COMPACT_THRESHOLD_REACHED: turnKind=${loopState.turnKind}, promptTokens=${contextUsageSnapshot.promptTokens}, contextWindow=${contextUsageSnapshot.contextWindowTokens}, ratio=${ratioPercent}% >= ${appliedThresholdPercent}%`,
          ),
          {
            turnKind: loopState.turnKind,
            usageRatio: contextUsageSnapshot.usageRatio,
            autoCompactThreshold: contextUsageSnapshot.autoCompactThreshold,
            dangerThreshold: AUTO_QUERY_DANGER_THRESHOLD,
            dangerous: inDangerZone,
          },
        );
      }

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
        contextUsageSnapshot,
        currentUserAction,
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
  contextUsageSnapshot?: ToolCallContextUsageSnapshot | null;
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
  currentUserAction?: string | null;
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

  return Object.entries(value as JsonObject).flatMap(([k, v]) =>
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

interface VmExecutionMeta {
  successfulWriteTargets: string[];
  failedWriteTargets: string[];
  hasUnknownFailure: boolean;
  successfulWriteCallCount: number;
  finishCalled: boolean;
  finishToolName: string | null;
}

const toRecordOrNull = (value: unknown): JsonObject | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonObject;
};

const isToolFailureOutput = (value: unknown): boolean => {
  const record = toRecordOrNull(value);
  return record?.success === false;
};

const normalizeVmWriteTargets = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const targets = new Set<string>();
  for (const candidate of value) {
    if (typeof candidate !== "string") continue;
    const normalized = normalizeWriteTargetPath(candidate);
    if (normalized) {
      targets.add(normalized);
    }
  }
  return Array.from(targets.values());
};

const parseVmExecutionMetaFromCandidate = (
  candidate: unknown,
): VmExecutionMeta | null => {
  const record = toRecordOrNull(candidate);
  if (!record) {
    return null;
  }

  const writes = toRecordOrNull(record.writes) ?? {};
  const finish = toRecordOrNull(record.finish) ?? {};
  const successfulWriteTargets = normalizeVmWriteTargets(
    writes.successfulTargets,
  );
  const failedWriteTargets = normalizeVmWriteTargets(writes.failedTargets);
  const hasUnknownFailure = writes.hasUnknownFailure === true;
  const successfulWriteCallCountRaw = writes.successfulWriteCallCount;
  const successfulWriteCallCount =
    typeof successfulWriteCallCountRaw === "number" &&
    Number.isFinite(successfulWriteCallCountRaw) &&
    successfulWriteCallCountRaw > 0
      ? Math.floor(successfulWriteCallCountRaw)
      : 0;
  const finishCalled =
    finish.called === true ||
    (typeof finish.callCount === "number" && finish.callCount > 0);
  const finishToolName =
    typeof finish.toolName === "string" && finish.toolName.length > 0
      ? finish.toolName
      : null;

  if (
    successfulWriteTargets.length === 0 &&
    failedWriteTargets.length === 0 &&
    !hasUnknownFailure &&
    successfulWriteCallCount === 0 &&
    !finishCalled
  ) {
    return null;
  }

  return {
    successfulWriteTargets,
    failedWriteTargets,
    hasUnknownFailure,
    successfulWriteCallCount,
    finishCalled,
    finishToolName,
  };
};

const extractVmExecutionMeta = (output: unknown): VmExecutionMeta | null => {
  const root = toRecordOrNull(output);
  if (!root) {
    return null;
  }

  const fromRoot = parseVmExecutionMetaFromCandidate(root.vmMeta);
  if (fromRoot) {
    return fromRoot;
  }

  const data = toRecordOrNull(root.data);
  if (data) {
    const fromDataVmMeta = parseVmExecutionMetaFromCandidate(data.vmMeta);
    if (fromDataVmMeta) {
      return fromDataVmMeta;
    }

    const fromData = parseVmExecutionMetaFromCandidate(data);
    if (fromData) {
      return fromData;
    }
  }

  const details = toRecordOrNull(root.details);
  const hint = details ? toRecordOrNull(details.hint) : null;
  const metadata = hint ? toRecordOrNull(hint.metadata) : null;
  if (metadata) {
    const fromHint = parseVmExecutionMetaFromCandidate(metadata.vmMeta);
    if (fromHint) {
      return fromHint;
    }
  }

  return null;
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
      error: `[ERROR: COMMAND_SKILL_NOT_READ] You must read required command skill file(s) in current epoch before non-read tools: ${
        missing.length > 0 ? formatPathPreview(missing) : "(none)"
      }.\nAction: call a read tool on each missing file first (prefer vfs_read_markdown for markdown sections; otherwise vfs_read_lines/vfs_read_json/vfs_read_chars).`,
      code: "SKILL_NOT_READ",
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
      error: `[ERROR: PRESET_SKILL_NOT_READ] Active preset skill file(s) must be read in current epoch before non-read tools: ${
        missing.length > 0 ? formatPathPreview(missing) : "(none)"
      }.\nAction: call a read tool on each missing file first (prefer vfs_read_markdown for markdown sections; otherwise vfs_read_lines/vfs_read_json/vfs_read_chars).`,
      code: "PRESET_SKILL_NOT_READ",
    },
  };
}

/**
 * Domain skill soft gate — fires ONCE per session.
 * If the AI attempts a mutation without having read any domain skill,
 * block with a suggestion. After the first reminder, never fire again.
 * Skipped in sudo/cleanup/player-rate modes (focused tasks, not storytelling).
 */
const DOMAIN_SKILL_INDICATOR_PATHS = [
  "skills/npc/logic/SKILL.md",
  "skills/npc/soul/SKILL.md",
  "skills/npc/dialogue/SKILL.md",
  "skills/craft/emotional-empathy/SKILL.md",
  "skills/gm/moral-complexity/SKILL.md",
  "skills/gm/knowledge/SKILL.md",
  "skills/worldbuilding/SKILL.md",
] as const;

function checkDomainSkillSoftGate(
  functionCalls: ToolCallResult[],
  loopState: LoopState,
):
  | { ok: true }
  | { ok: false; error: { success: false; error: string; code: string } } {
  if (loopState.domainSkillReminderFired) {
    return { ok: true };
  }

  if (
    loopState.isSudoMode ||
    loopState.isCleanupMode ||
    loopState.isPlayerRateMode
  ) {
    return { ok: true };
  }

  const hasMutationLikeCall = functionCalls.some(
    (call) => !isReadOnlyInspectionToolName(call.name),
  );
  if (!hasMutationLikeCall) {
    return { ok: true };
  }

  const hasDomainSkill = DOMAIN_SKILL_INDICATOR_PATHS.some((path) =>
    loopState.vfsSession.hasToolSeenInCurrentEpoch(path),
  );

  if (hasDomainSkill) {
    return { ok: true };
  }

  loopState.domainSkillReminderFired = true;

  return {
    ok: false,
    error: {
      success: false,
      error:
        `[ERROR: DOMAIN_SKILL_MISSING] No domain skill loaded. ` +
        `Read at least 1 before mutations. Pick the most relevant:\n` +
        `- NPC scene → vfs_read_chars({ path: "current/skills/npc/logic/SKILL.md" })\n` +
        `- Emotional scene → vfs_read_chars({ path: "current/skills/craft/emotional-empathy/SKILL.md" })\n` +
        `- Moral dilemma → vfs_read_chars({ path: "current/skills/gm/moral-complexity/SKILL.md" })\n` +
        `This reminder fires once per session.`,
      code: "DOMAIN_SKILL_MISSING",
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
    contextUsageSnapshot,
    currentUserAction,
  } = params;

  const finishToolName = loopState.finishToolName;

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
    if (!isWriteMutationToolName(call.name)) {
      return [];
    }

    const touched: string[] = [];

    const args = call.args;
    const maybePath = args.path;
    const maybeFrom = args.from;
    const maybeTo = args.to;

    if (typeof maybePath === "string" && isConversationPath(maybePath)) {
      touched.push(maybePath);
    }
    if (typeof maybeFrom === "string" && isConversationPath(maybeFrom)) {
      touched.push(maybeFrom);
    }
    if (typeof maybeTo === "string" && isConversationPath(maybeTo)) {
      touched.push(maybeTo);
    }

    return touched;
  };

  const getGateErrorForCall = (
    call: ToolCallResult,
  ): { success: false; error: string; code: string } | null => {
    const commandGate = checkCommandSkillReadGate([call], loopState);
    if ("error" in commandGate) {
      return commandGate.error;
    }

    const presetSkillGate = checkPresetSkillReadGate([call], loopState);
    if ("error" in presetSkillGate) {
      return presetSkillGate.error;
    }

    const domainSkillGate = checkDomainSkillSoftGate([call], loopState);
    if ("error" in domainSkillGate) {
      return domainSkillGate.error;
    }

    return null;
  };

  const mustOnlyFinish =
    loopState.activeTools.length > 0 &&
    loopState.activeTools.every((tool) => tool.name === finishToolName);

  const finishCallIndices = functionCalls
    .map((call, index) => ({ call, index }))
    .filter(({ call }) => isFinishToolCall(call))
    .map(({ index }) => index);
  const hasMultipleFinishCalls = finishCallIndices.length > 1;
  const hasFinishNotLast =
    finishCallIndices.length === 1 &&
    finishCallIndices[0] !== functionCalls.length - 1;
  const hasNoOpReadBeforeFinishSequence = isLikelyNoOpReadBeforeFinishBatch(
    functionCalls,
    finishToolName,
  );
  const hasVmMixedBatch =
    functionCalls.length > 1 &&
    functionCalls.some((call) => call.name === "vfs_vm");

  const targetForkId =
    typeof gameState.forkId === "number" ? gameState.forkId : 0;

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
    input: call.args,
    output: null,
    timestamp: Date.now(),
    contextUsage: contextUsageSnapshot || undefined,
  }));
  onToolCallsUpdate?.([...liveToolCalls]);

  const toolCtx: ToolCallContext = {
    loopState,
    gameState,
    settings,
    currentUserAction: currentUserAction ?? undefined,
  };

  for (let callIndex = 0; callIndex < functionCalls.length; callIndex += 1) {
    const call = functionCalls[callIndex]!;
    let output: unknown;
    let isError = false;
    let blockedByGuardian = false;
    const isWriteTool = isWriteMutationToolName(call.name);
    const writeTargets = isWriteTool
      ? collectWriteTargetsFromToolCall(call)
      : [];
    const existingWriteTargets = isWriteTool
      ? writeTargets.filter((target) => loopState.vfsSession.readFile(target))
      : [];

    const gateError = getGateErrorForCall(call);
    if (gateError) {
      output = gateError;
      isError = true;
      blockedByGuardian = true;
    } else if (hasVmMixedBatch) {
      output = {
        success: false,
        error:
          '[ERROR: VFS_VM_MIXED_BATCH] "vfs_vm" must be the ONLY top-level tool call in this assistant response.',
        code: "INVALID_ACTION",
      };
      isError = true;
      blockedByGuardian = true;
    } else if (mustOnlyFinish && !isFinishToolCall(call)) {
      output = {
        success: false,
        error: `[ERROR: FORCED_FINISH] Budget is critically low. Your ONLY allowed tool call is "${finishToolName}" in this round.`,
        code: "INVALID_ACTION",
      };
      isError = true;
      blockedByGuardian = true;
    } else if (hasMultipleFinishCalls && isFinishToolCall(call)) {
      output = {
        success: false,
        error: `[ERROR: MULTIPLE_FINISH_CALLS] You invoked the finish operation more than once. Provide exactly one "${finishToolName}", and it must be the LAST tool call.`,
        code: "INVALID_ACTION",
      };
      isError = true;
      blockedByGuardian = true;
    } else if (hasFinishNotLast && isFinishToolCall(call)) {
      output = {
        success: false,
        error: `[ERROR: FINISH_NOT_LAST] The finish tool must be your LAST tool call. Reorder so all state edits happen before "${finishToolName}".`,
        code: "INVALID_ACTION",
      };
      isError = true;
      blockedByGuardian = true;
    } else if (
      hasNoOpReadBeforeFinishSequence &&
      isFinishToolCall(call) &&
      finishCallIndices[0] === callIndex
    ) {
      output = {
        success: false,
        error:
          `[WARNING: PRE_FINISH_READ_ONLY_SEQUENCE] You are calling "${finishToolName}" in this batch, ` +
          "but all prior calls are read-only and produce no state changes. " +
          "Avoid token-waste reads right before finish. Either finish directly, or perform required mutations before finish.",
        code: "WARNING",
        warning: true,
      };
      isError = true;
      blockedByGuardian = true;
    } else {
      const crossForkViolations = findTurnCrossForkViolations(
        call.args,
        targetForkId,
      );
      if (crossForkViolations.length > 0) {
        const details = crossForkViolations
          .slice(0, 3)
          .map((item) => `fork=${item.forkId} path="${item.path}"`)
          .join("; ");
        output = {
          success: false,
          error:
            `[ERROR: CROSS_FORK_ACCESS_BLOCKED] Current turn is scoped to fork ${targetForkId}. ` +
            `Cross-fork path references are not allowed (${details}). Read/write only current fork paths.`,
          code: "INVALID_ACTION",
        };
        isError = true;
        blockedByGuardian = true;
      } else {
        const conversationTouched = getConversationTouchedPaths(call);
        if (conversationTouched.length > 0) {
          const preview = formatPathPreview(
            Array.from(new Set(conversationTouched)),
            { prefixCurrent: false },
          );
          output = {
            success: false,
            error:
              `[ERROR: CONVERSATION_WRITE_FORBIDDEN] Do not mutate current/conversation/* via generic write/move/delete tools. ` +
              `Use "${finishToolName}" as the ONLY commit path at turn end. Forbidden: ${preview}.`,
            code: "INVALID_ACTION",
          };
          isError = true;
          blockedByGuardian = true;
        } else if (
          isFinishToolCall(call) &&
          loopState.pendingWriteFailurePaths.size > 0
        ) {
          const pendingList = formatPendingWriteFailurePaths(
            loopState.pendingWriteFailurePaths,
          );
          output = {
            success: false,
            error:
              `[ERROR: FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE] Required write targets failed earlier and must succeed before finish. ` +
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
            if (isToolFailureOutput(output)) {
              isError = true;
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            output = {
              success: false,
              error: `Tool execution failed: ${message}`,
              code: "EXECUTION_ERROR",
            };
            isError = true;
          }
        }
      }
    }

    const vmMeta =
      call.name === "vfs_vm" ? extractVmExecutionMeta(output) : null;

    if (call.name === "vfs_vm" && vmMeta && !blockedByGuardian) {
      for (const target of vmMeta.failedWriteTargets) {
        loopState.pendingWriteFailurePaths.add(target);
      }

      for (const target of vmMeta.successfulWriteTargets) {
        loopState.pendingWriteFailurePaths.delete(target);
      }

      if (vmMeta.hasUnknownFailure) {
        loopState.pendingWriteFailurePaths.add(UNKNOWN_WRITE_TARGET);
      }

      if (vmMeta.successfulWriteCallCount > 0) {
        loopState.pendingWriteFailurePaths.delete(UNKNOWN_WRITE_TARGET);
      }
    }

    if (isWriteTool && !blockedByGuardian) {
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
        // If a previous malformed write had unknown target, a successful write
        // indicates the model recovered its write workflow and can proceed.
        loopState.pendingWriteFailurePaths.delete(UNKNOWN_WRITE_TARGET);
      }
    }

    responses.push({
      toolCallId: call.id,
      name: call.name,
      content: output,
    });

    liveToolCalls[callIndex] = {
      ...liveToolCalls[callIndex],
      output: toJsonValue(output),
    };
    onToolCallsUpdate?.([...liveToolCalls]);

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

    if (
      call.name === "vfs_vm" &&
      !isError &&
      vmMeta?.finishCalled === true &&
      vmMeta.finishToolName === finishToolName
    ) {
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
