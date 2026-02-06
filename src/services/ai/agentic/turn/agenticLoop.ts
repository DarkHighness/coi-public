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
import { createLogEntry } from "../../utils";
import {
  createToolCallMessage,
  createToolResponseMessage,
} from "../../../messageTypes";

// Import modular components
import { createLoopState, accumulateUsage, LoopState } from "./loopInitializer";
import {
  injectSudoModeInstruction,
  injectNormalTurnInstruction,
  injectReadyConsequences,
  injectBudgetStatus,
  injectNoToolCallError,
  injectRetconAckRequired,
} from "./contextInjector";
import {
  checkBudgetExhaustion,
  incrementToolCalls,
  incrementIterations,
  getBudgetSummary,
} from "../budgetUtils";
import { buildResponseFromVfs, getChangedEntitiesArray } from "./resultAccumulator";
import { normalizeVfsPath } from "../../../vfs/utils";
import { rollbackVfsSessionToCheckpoint } from "../../../vfs/runtimeCheckpoints";

// Import tool handling
import {
  executeGenericTool,
  ToolCallContext,
} from "./toolCallProcessor";
import { handleAICall } from "./aiCallHandler";

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
}

export interface AgenticLoopResult {
  response: GameResponse;
  logs: LogEntry[];
  usage: TokenUsage;
  changedEntities: Array<{ id: string; type: string }>;
  _conversationHistory: UnifiedMessage[];
}

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
  } = config;

  // Initialize provider
  const provider = sessionManager.getProvider(sessionId, instance);

  // Initialize loop state
  const loopState = createLoopState(
    gameState,
    settings,
    isSudoMode,
    isCleanupMode,
    config.vfsSession,
  );
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

    // Inject mode-specific instruction
    if (isSudoMode) {
      injectSudoModeInstruction(conversationHistory);
    } else {
      injectNormalTurnInstruction(
        conversationHistory,
        loopState.finishToolName,
        isCleanupMode,
      );
    }

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
        loopState.budgetState.toolCallsMax - loopState.budgetState.toolCallsUsed;
      const iterationsRemaining =
        loopState.budgetState.loopIterationsMax -
        loopState.budgetState.loopIterationsUsed;
      const mustFinishNow = toolCallsRemaining <= 2 || iterationsRemaining <= 2;

      if (mustFinishNow) {
        // Forced-finish mode should still allow batching via vfs_tx + commit_turn
        // so the model can apply essential state updates and finish in one call.
        loopState.activeTools = loopState.activeTools.filter(
          (tool) =>
            tool.name === loopState.finishToolName || tool.name === "vfs_tx",
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
        // In forced-finish mode we allow either vfs_commit_turn or vfs_tx (with commit_turn as last op).
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
        conversationHistory.push(createToolResponseMessage(toolResult.responses));
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
    const rolledBack = rollbackVfsSessionToCheckpoint(sessionId, config.vfsSession);
    if (!rolledBack) {
      throw new Error(
        `[AgenticLoop] Missing VFS checkpoint for session "${sessionId}". Cannot rollback after TURN_NOT_COMMITTED.`,
      );
    }
    throw new Error(
      `TURN_NOT_COMMITTED: Agentic loop exhausted its budget without writing conversation files (expected ${loopState.finishToolName} or equivalent conversation writes as the last tool call).`,
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
}

interface ProcessToolCallsResult {
  responses: Array<{ toolCallId: string; name: string; content: unknown }>;
  turnFinished: boolean;
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

  const isTxCommitTurnCall = (call: ToolCallResult): boolean => {
    if (call.name !== "vfs_tx") return false;
    const ops = (call.args as any)?.ops;
    if (!Array.isArray(ops) || ops.length === 0) return false;
    return ops[ops.length - 1]?.op === "commit_turn";
  };

  const isFinishToolCall = (call: ToolCallResult): boolean => {
    if (call.name === finishToolName) {
      return true;
    }
    if (isTxCommitTurnCall(call)) return true;
    return false;
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
      const files = (call.args as any)?.files;
      if (Array.isArray(files)) {
        for (const file of files) {
          if (typeof file?.path === "string" && isConversationPath(file.path)) {
            touched.push(file.path);
          }
        }
      }
      return touched;
    }

    if (call.name === "vfs_edit") {
      const edits = (call.args as any)?.edits;
      if (Array.isArray(edits)) {
        for (const edit of edits) {
          if (typeof edit?.path === "string" && isConversationPath(edit.path)) {
            touched.push(edit.path);
          }
        }
      }
      return touched;
    }

    if (call.name === "vfs_merge") {
      const files = (call.args as any)?.files;
      if (Array.isArray(files)) {
        for (const file of files) {
          if (typeof file?.path === "string" && isConversationPath(file.path)) {
            touched.push(file.path);
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

    if (call.name === "vfs_tx") {
      const ops = (call.args as any)?.ops;
      if (Array.isArray(ops)) {
        for (const op of ops) {
          if (!op || typeof op !== "object") {
            continue;
          }
          const kind = (op as any).op;
          if (kind === "write" || kind === "edit" || kind === "merge" || kind === "delete") {
            const path = (op as any).path;
            if (typeof path === "string" && isConversationPath(path)) {
              touched.push(path);
            }
            continue;
          }
          if (kind === "move") {
            const from = (op as any).from;
            const to = (op as any).to;
            if (typeof from === "string" && isConversationPath(from)) {
              touched.push(from);
            }
            if (typeof to === "string" && isConversationPath(to)) {
              touched.push(to);
            }
          }
        }
      }
      return touched;
    }

    return touched;
  };

  const mustOnlyFinish =
    loopState.activeTools.length > 0 &&
    loopState.activeTools.every(
      (tool) => tool.name === finishToolName || tool.name === "vfs_tx",
    );

  if (mustOnlyFinish) {
    if (functionCalls.length !== 1 || !isFinishToolCall(functionCalls[0]!)) {
      const error = {
        success: false,
        error: `[ERROR: FORCED_FINISH] Budget is critically low. Your ONLY allowed tool call is "${finishToolName}" (or one "vfs_tx" whose LAST op is commit_turn), and it must be the ONLY tool call in this response.`,
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
      error: `[ERROR: MULTIPLE_FINISH_CALLS] You invoked the finish operation more than once. Provide exactly one "${finishToolName}" (or one "vfs_tx" whose LAST op is commit_turn), and it must be the LAST tool call.`,
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
      error: `[ERROR: FINISH_NOT_LAST] The finish tool must be your LAST tool call. Reorder so all state edits happen before "${finishToolName}" (or "vfs_tx" whose LAST op is commit_turn).`,
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

  const conversationTouched = functionCalls.flatMap((call) =>
    getConversationTouchedPaths(call),
  );

  if (conversationTouched.length > 0) {
    const unique = Array.from(new Set(conversationTouched));
    const error = {
      success: false,
      error: `[ERROR: CONVERSATION_WRITE_FORBIDDEN] Do not write to current/conversation/* using generic VFS write/edit/merge/move/delete tools. End the turn ONLY via "${finishToolName}" (preferred) or "vfs_tx" with commit_turn as the LAST op. Forbidden paths: ${unique.join(", ")}`,
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

    responses.push({
      toolCallId: call.id,
      name: call.name,
      content: output,
    });

    const callIndex = functionCalls.findIndex((toolCall) => toolCall.id === call.id);
    if (callIndex >= 0) {
      liveToolCalls[callIndex] = {
        ...liveToolCalls[callIndex],
        output,
      };
      onToolCallsUpdate?.([...liveToolCalls]);
    }

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

    // Log tool usage
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
  }

  if (!turnFinished) {
    onToolCallsUpdate?.([...liveToolCalls]);
  }

  return { responses, turnFinished };
}
