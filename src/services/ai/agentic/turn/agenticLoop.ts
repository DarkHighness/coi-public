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
} from "../../../../types";
import type { VfsSession } from "../../../vfs/vfsSession";
import type { ToolCallResult } from "../../../providers/types";
import { UnifiedMessage } from "../../../messageTypes";

import { createProvider } from "../../provider/createProvider";
import { sessionManager } from "../../sessionManager";
import { createLogEntry } from "../../utils";
import {
  createToolCallMessage,
  createToolResponseMessage,
  createUserMessage,
} from "../../../messageTypes";

// Import modular components
import { createLoopState, accumulateUsage, LoopState } from "./loopInitializer";
import {
  injectSudoModeInstruction,
  injectNormalTurnInstruction,
  injectReadyConsequences,
  injectBudgetStatus,
  injectNoToolCallError,
} from "./contextInjector";
import {
  checkBudgetExhaustion,
  incrementToolCalls,
  incrementIterations,
  getBudgetSummary,
} from "../budgetUtils";
import { buildResponseFromVfs, getChangedEntitiesArray } from "./resultAccumulator";

// Import tool handling
import {
  handleSearchTool,
  handleActivateSkill,
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
  sessionId?: string;
  vfsSession?: VfsSession;
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
    sessionId,
  } = config;

  // Initialize provider
  const provider = sessionId
    ? sessionManager.getProvider(sessionId, instance)
    : createProvider(instance);

  // Initialize loop state
  const loopState = createLoopState(
    gameState,
    settings,
    isSudoMode,
    config.vfsSession,
  );
  let conversationHistory: UnifiedMessage[] = [...initialContents];
  const allLogs: LogEntry[] = [];

  // Inject ready consequences
  injectReadyConsequences(conversationHistory);

  // Inject mode-specific instruction
  if (isSudoMode) {
    injectSudoModeInstruction(conversationHistory);
  } else {
    injectNormalTurnInstruction(conversationHistory, loopState.finishToolName);
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

    // Call AI
    const aiResult = await handleAICall({
      provider,
      modelId,
      systemInstruction,
      conversationHistory,
      loopState,
      settings,
      sessionId,
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
    });

    // Add tool responses to history
    if (toolResult.responses.length > 0) {
      conversationHistory.push(createToolResponseMessage(toolResult.responses));
    }

    // Check if turn finished
    if (toolResult.turnFinished) {
      break;
    }

    incrementIterations(loopState.budgetState);
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
  sessionId?: string;
  conversationHistory: UnifiedMessage[];
  protocol: ProviderProtocol;
  modelId: string;
  turnId: string;
  allLogs: LogEntry[];
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
  } = params;

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
  let hasErrors = false;
  const failedTools: string[] = [];

  const toolCtx: ToolCallContext = {
    loopState,
    gameState,
    settings,
    clearerSearchTool: settings.extra?.clearerSearchTool,
    conversationHistory,
    sessionId,
    vfsSession: loopState.vfsSession,
  };

  for (const call of functionCalls) {
    let output: unknown;
    let isError = false;

    try {
      // Handle special tools
      if (call.name === "search_tool") {
        const result = handleSearchTool(call.args as any, toolCtx);
        output = result.output;
      } else if (call.name === "activate_skill") {
        output = handleActivateSkill(call.args as any, toolCtx);
      } else {
        // Generic tool execution
        output = executeGenericTool(call.name, call.args, toolCtx);
      }

      // Check for errors
      if (
        output &&
        typeof output === "object" &&
        "success" in output &&
        (output as any).success === false
      ) {
        isError = true;
        hasErrors = true;
        failedTools.push(call.name);
      }
    } catch (err: any) {
      output = {
        success: false,
        error: `Tool execution failed: ${err.message}`,
        code: "EXECUTION_ERROR",
      };
      isError = true;
      hasErrors = true;
      failedTools.push(call.name);
    }

    responses.push({
      toolCallId: call.id,
      name: call.name,
      content: output,
    });

    const responseFromVfs = buildResponseFromVfs(
      loopState.vfsSession,
      loopState.conversationMarker,
    );
    if (responseFromVfs) {
      loopState.accumulatedResponse = responseFromVfs;
      turnFinished = true;
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

  return { responses, turnFinished };
}
