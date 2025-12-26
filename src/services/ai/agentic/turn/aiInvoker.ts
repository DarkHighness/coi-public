/**
 * AI Invoker
 *
 * Handles AI API calls with retry logic and error handling.
 */

import type { UnifiedMessage, TokenUsage } from "../../../../types";
import type {
  ToolCallResult,
  ZodToolDefinition,
} from "../../../providers/types";
import {
  isContextLengthError,
  isInvalidArgumentError,
  ContextOverflowError,
  HistoryCorruptedError,
} from "../../contextCompressor";
import { callWithAgenticRetry } from "../retry";
import {
  BudgetState,
  incrementRetries,
  generateBudgetPrompt,
} from "../budgetUtils";
import { createUserMessage } from "../../../messageTypes";

// ============================================================================
// Types
// ============================================================================

export interface AICallConfig {
  modelId: string;
  systemInstruction: string;
  tools: ZodToolDefinition[];
  toolChoice: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
  mediaResolution?: string;
  thinkingEffort?: string;
}

export interface AICallResult {
  text: string;
  functionCalls: ToolCallResult[] | undefined;
  usage: TokenUsage;
  retries: number;
}

// ============================================================================
// AI Invocation
// ============================================================================

/**
 * Call AI with retry logic
 */
export async function invokeAI(
  provider: any,
  config: AICallConfig,
  history: UnifiedMessage[],
  budgetState: BudgetState,
  finishToolName: string,
): Promise<AICallResult> {
  const toolConfig = config.tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters as any,
  }));

  try {
    const resp = await callWithAgenticRetry(
      provider,
      {
        modelId: config.modelId,
        systemInstruction: config.systemInstruction,
        messages: [],
        tools: toolConfig,
        toolChoice: config.toolChoice as any,
        mediaResolution: config.mediaResolution as any,
        temperature: config.temperature,
        topP: config.topP,
        topK: config.topK,
        minP: config.minP,
        thinkingEffort: config.thinkingEffort as any,
      },
      history,
      {
        maxRetries: budgetState.retriesMax,
        onRetry: (err, count) => {
          console.warn(
            `[AIInvoker] Retry ${count}/${budgetState.retriesMax}: ${err}`,
          );
          incrementRetries(budgetState);
          const retryPrompt = generateBudgetPrompt(budgetState, finishToolName);
          history.push(
            createUserMessage(`[SYSTEM: BUDGET UPDATE]\n${retryPrompt}`),
          );
        },
      },
    );

    const result = resp.result as any;
    return {
      text: result.text || result.content || "",
      functionCalls: result.functionCalls,
      usage: resp.usage,
      retries: resp.retries,
    };
  } catch (e) {
    handleAIError(e);
    throw e; // Re-throw if not handled
  }
}

/**
 * Handle AI call errors
 */
function handleAIError(e: unknown): never {
  const error = e instanceof Error ? e : new Error(String(e));

  if (isContextLengthError(error)) {
    console.warn(`[AIInvoker] Context length error. Triggering rebuild...`);
    throw new ContextOverflowError(error);
  }

  if (isInvalidArgumentError(error)) {
    console.warn(`[AIInvoker] Invalid argument. Triggering rebuild...`);
    throw new HistoryCorruptedError(error);
  }

  throw error;
}

/**
 * Ensure all tool calls have IDs (OpenAI requirement)
 */
export function ensureToolCallIds(
  functionCalls: ToolCallResult[] | undefined,
): void {
  if (!functionCalls) return;
  for (const fc of functionCalls) {
    if (!fc.id) {
      fc.id = `call_${Math.random().toString(36).slice(2, 11)}`;
    }
  }
}
