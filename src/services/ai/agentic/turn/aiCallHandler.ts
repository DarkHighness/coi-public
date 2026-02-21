/**
 * AI Call Handler
 *
 * Handles AI API calls with retry logic.
 */

import type { AISettings, TokenUsage } from "../../../../types";
import type { ToolCallResult } from "../../../providers/types";
import type { UnifiedMessage } from "../../../messageTypes";
import { NON_STORY_OUTLINE_MAX_OUTPUT_TOKENS } from "../../../tokenBudget";
import type {
  ProviderBase,
  ChatGenerateResponse,
} from "../../provider/interfaces";
import type { LoopState } from "./loopInitializer";

import { callWithAgenticRetry } from "../retry";
import { incrementRetries, generateBudgetPrompt } from "../budgetUtils";
import { createUserMessage } from "../../../messageTypes";
import {
  isContextLengthError,
  isInvalidArgumentError,
  ContextOverflowError,
  HistoryCorruptedError,
} from "../../contextCompressor";
import { sessionManager } from "../../sessionManager";
import {
  DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
  resolveModelContextWindowTokensWithLookup,
} from "../../../modelContextWindows";

// ============================================================================
// Types
// ============================================================================

export interface AICallParams {
  provider: ProviderBase;
  modelId: string;
  systemInstruction: string;
  conversationHistory: UnifiedMessage[];
  loopState: LoopState;
  settings: AISettings;
  sessionId: string;
  requiredToolName?: string;
}

export interface AICallResult {
  text: string;
  functionCalls: ToolCallResult[] | undefined;
  usage: TokenUsage;
  finalUsage: TokenUsage;
}

// ============================================================================
// Handler
// ============================================================================

export async function handleAICall(
  params: AICallParams,
): Promise<AICallResult> {
  const {
    provider,
    modelId,
    systemInstruction,
    conversationHistory,
    loopState,
    settings,
    sessionId,
    requiredToolName,
  } = params;

  const toolConfig = loopState.activeTools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  const effectiveToolChoice = sessionManager.getEffectiveToolChoice(
    sessionId,
    "required",
    settings.extra?.forceAutoToolChoice,
  );

  try {
    const storyCfg = settings.story;
    const remainingRetries = Math.max(
      0,
      loopState.budgetState.retriesMax - loopState.budgetState.retriesUsed,
    );
    const providerApiKey = settings.providers?.instances?.find(
      (instance) => instance.id === provider.instanceId,
    )?.apiKey;
    const contextWindowTokens = (
      await resolveModelContextWindowTokensWithLookup({
        settings,
        providerId: provider.instanceId,
        providerProtocol: provider.protocol,
        modelId,
        providerApiKey,
        fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
      })
    ).value;
    const resp = await callWithAgenticRetry(
      provider,
      {
        modelId,
        systemInstruction,
        messages: [],
        tools: toolConfig,
        toolChoice: effectiveToolChoice,
        mediaResolution: storyCfg?.mediaResolution,
        temperature: storyCfg?.temperature,
        topP: storyCfg?.topP,
        topK: storyCfg?.topK,
        minP: storyCfg?.minP,
        tokenBudget: {
          providerManagedMaxTokens:
            settings.extra?.providerManagedMaxTokens ?? true,
          maxOutputTokensFallback: settings.extra?.maxOutputTokensFallback,
          contextWindowTokens,
          maxOutputTokensHardCap: NON_STORY_OUTLINE_MAX_OUTPUT_TOKENS,
        },
        thinkingEffort: storyCfg?.thinkingEffort,
      },
      conversationHistory,
      {
        maxRetries: remainingRetries,
        requiredToolName,
        finishToolName: loopState.finishToolName,
        promptTokenBudgetContext: loopState.promptTokenBudgetContext,
        onRetry: (err, count, meta) => {
          console.warn(`[AICall] Retry ${count}/${remainingRetries}: ${err}`);
          if (!meta?.silent) {
            incrementRetries(loopState.budgetState);
            const retryPrompt = generateBudgetPrompt(
              loopState.budgetState,
              loopState.finishToolName,
            );
            conversationHistory.push(
              createUserMessage(`[SYSTEM: BUDGET UPDATE]\n${retryPrompt}`),
            );
          }
        },
      },
    );

    const result = resp.result;
    const functionCalls = extractFunctionCalls(result);

    // Ensure all tool calls have IDs
    if (functionCalls) {
      for (const fc of functionCalls) {
        if (!fc.id) {
          fc.id = `call_${Math.random().toString(36).slice(2, 11)}`;
        }
      }
    }

    return {
      text: extractTextContent(result),
      functionCalls,
      usage: resp.usage,
      finalUsage: resp.finalUsage ?? resp.usage,
    };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));

    if (isContextLengthError(error)) {
      console.warn(`[AICall] Context length error. Triggering rebuild...`);
      throw new ContextOverflowError(error);
    }

    if (isInvalidArgumentError(error)) {
      console.warn(`[AICall] Invalid argument. Triggering rebuild...`);
      throw new HistoryCorruptedError(error);
    }

    throw error;
  }
}

const extractFunctionCalls = (
  result: ChatGenerateResponse["result"],
): ToolCallResult[] | undefined => {
  if (!result || typeof result !== "object") return undefined;
  const raw = (result as { functionCalls?: unknown }).functionCalls;
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((call): call is ToolCallResult => {
    if (!call || typeof call !== "object") return false;
    const record = call as JsonObject;
    return (
      typeof record.name === "string" &&
      (typeof record.id === "string" || typeof record.id === "undefined") &&
      typeof record.args === "object" &&
      record.args !== null
    );
  });
};

const extractTextContent = (result: ChatGenerateResponse["result"]): string => {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return "";
  const record = result as JsonObject;
  if (typeof record.text === "string") return record.text;
  if (typeof record.content === "string") return record.content;
  return "";
};
