/**
 * Summary Loop - Refactored Main Loop
 *
 * Modular implementation of the summary agentic loop.
 * Stage-less design: AI has all tools available and calls finish_summary when ready.
 */

import type {
  LogEntry,
  TokenUsage,
  StorySummary,
  UnifiedMessage,
} from "../../../../types";
import type { ToolCallResult } from "../../../providers/types";

import { sessionManager } from "../../sessionManager";
import { getProviderConfig, createLogEntry } from "../../utils";
import {
  createUserMessage,
  createToolCallMessage,
  createToolResponseMessage,
} from "../../../messageTypes";
import { callWithAgenticRetry } from "../retry";
import {
  checkBudgetExhaustion,
  generateBudgetPrompt,
  incrementToolCalls,
  incrementRetries,
  incrementIterations,
  getBudgetSummary,
} from "../budgetUtils";

import type { SummaryLoopInput, SummaryAgenticLoopResult } from "./summary";
import {
  createSummaryLoopState,
  accumulateSummaryUsage,
} from "./summaryInitializer";
import {
  getSummarySystemInstruction,
  buildSummaryInitialContext,
} from "./summaryContext";
import { executeSummaryToolCall } from "./summaryToolHandler";

// Ensure handlers are registered for summary fallback queries
import "../../../tools/handlers/vfsHandlers";
import "../../../tools/handlers/storyQueryHandlers";

// ============================================================================
// Main Loop
// ============================================================================

export async function runSummaryLoopRefactored(
  input: SummaryLoopInput,
): Promise<SummaryAgenticLoopResult> {
  const { settings, language, strategy = "compact" } = input;

  // Get provider
  const providerInfo = getProviderConfig(settings, "story");
  if (!providerInfo) {
    throw new Error("Story provider not configured");
  }
  const { instance, modelId } = providerInfo;

  const summarySession = await sessionManager.getOrCreateSession({
    slotId: "summary",
    forkId: -2,
    providerId: instance.id,
    modelId,
    protocol: instance.protocol,
  });
  const provider = sessionManager.getProvider(summarySession.id, instance);

  // Initialize state
  const loopState = createSummaryLoopState(input);
  const systemInstruction = getSummarySystemInstruction(
    language,
    settings.extra?.liteMode,
    settings.extra?.nsfw,
    settings.extra?.detailedDescription,
    strategy,
  );

  // Build initial context - all segments provided upfront
  let conversationHistory: UnifiedMessage[] = [
    createUserMessage(
      `[CONTEXT: Summary Task]\n${buildSummaryInitialContext(input)}`,
    ),
  ];

  const allLogs: LogEntry[] = [];
  let finalSummary: StorySummary | null = null;

  // Main loop - stage-less design
  while (
    loopState.budgetState.loopIterationsUsed <
    loopState.budgetState.loopIterationsMax
  ) {
    const budgetCheck = checkBudgetExhaustion(loopState.budgetState);
    if (budgetCheck.exhausted) {
      console.warn(`[SummaryLoop] ${budgetCheck.message}`);
      break;
    }

    // Inject budget status
    conversationHistory.push(
      createUserMessage(
        `[SYSTEM: BUDGET STATUS]\n${generateBudgetPrompt(loopState.budgetState)}`,
      ),
    );

    console.log(
      `[SummaryLoop] Iteration: ${loopState.budgetState.loopIterationsUsed + 1}, Budget: ${getBudgetSummary(loopState.budgetState)}`,
    );

    // Call AI with all tools available
    const toolConfig = loopState.activeTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    const iterationNum = loopState.budgetState.loopIterationsUsed + 1;

    const { result, usage, raw } = await callWithAgenticRetry(
      provider,
      {
        modelId,
        systemInstruction,
        messages: [],
        tools: toolConfig,
        toolChoice: sessionManager.getEffectiveToolChoice(
          summarySession.id,
          "required",
          settings.extra?.forceAutoToolChoice,
        ),
        temperature: settings.story?.temperature,
      },
      conversationHistory,
      {
        maxRetries: loopState.budgetState.retriesMax,
        onRetry: (msg, count) => {
          console.warn(`[SummaryLoop] Retry ${count}: ${msg}`);
          incrementRetries(loopState.budgetState);
          conversationHistory.push(
            createUserMessage(
              `[SYSTEM: BUDGET UPDATE]\n${generateBudgetPrompt(loopState.budgetState)}`,
            ),
          );
        },
      },
    );

    accumulateSummaryUsage(loopState, usage);

    // Log AI call with usage stats
    allLogs.push(
      createLogEntry({
        provider: instance.protocol,
        model: modelId,
        endpoint: `summary-iteration-${iterationNum}`,
        stage: strategy,
        response: raw,
        usage,
      }),
    );

    // Process tool calls
    const functionCalls = (result as { functionCalls?: ToolCallResult[] })
      .functionCalls;

    if (functionCalls) {
      // Ensure IDs
      for (const fc of functionCalls) {
        if (!fc.id) {
          fc.id = `call_${Math.random().toString(36).slice(2, 11)}`;
        }
      }

      conversationHistory.push(
        createToolCallMessage(
          functionCalls.map((fc) => ({
            id: fc.id,
            name: fc.name,
            arguments: fc.args,
            thoughtSignature: fc.thoughtSignature,
          })),
        ),
      );

      incrementToolCalls(loopState.budgetState, functionCalls.length);

      const toolResponses: Array<{
        toolCallId: string;
        name: string;
        content: unknown;
      }> = [];
      let loopFinished = false;

      for (const call of functionCalls) {
        const output = executeSummaryToolCall(
          call.name,
          call.args,
          input,
          loopState,
        );

        if (
          call.name === "finish_summary" &&
          output &&
          (output as any).success
        ) {
          finalSummary = (output as any).summary;
          loopFinished = true;
        }

        toolResponses.push({
          toolCallId: call.id,
          name: call.name,
          content: output,
        });

        allLogs.push(
          createLogEntry({
            provider: instance.protocol,
            model: modelId,
            endpoint: "summary_tool",
            stage: strategy,
            toolName: call.name,
            toolInput: call.args,
            toolOutput: output,
          }),
        );
      }

      conversationHistory.push(createToolResponseMessage(toolResponses));

      if (loopFinished) break;
    }

    incrementIterations(loopState.budgetState);
  }

  return {
    summary: finalSummary,
    logs: allLogs,
    usage: loopState.totalUsage,
    strategyUsed: strategy,
  };
}
