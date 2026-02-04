/**
 * Summary Loop - Refactored Main Loop
 *
 * VFS-only summary agentic loop.
 * - Read details via vfs_* tools (read-only subset)
 * - Finish by calling vfs_finish_summary (MUST be last)
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
import { dispatchToolCallAsync } from "../../../tools/handlers";
import { readConversationIndex } from "../../../vfs/conversation";

// ============================================================================
// Main Loop
// ============================================================================

export async function runSummaryLoopRefactored(
  input: SummaryLoopInput,
): Promise<SummaryAgenticLoopResult> {
  const { settings, language } = input;

  // Get provider
  const providerInfo = getProviderConfig(settings, "story");
  if (!providerInfo) {
    throw new Error("Story provider not configured");
  }
  const { instance, modelId } = providerInfo;

  const summarySession = await sessionManager.getOrCreateSession({
    slotId: `${input.slotId}:summary`,
    forkId: input.forkId,
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
  );

  // Fork-safe reset: restore baseline summaries for this branch before running.
  try {
    input.vfsSession.mergeJson("summary/state.json", {
      summaries: input.baseSummaries,
      lastSummarizedIndex: input.baseIndex,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[SummaryLoop] Failed to reset summary/state.json: ${message}`);
  }

  // Build initial context (hybrid: index + per-turn excerpts)
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

    const toolCallsRemaining =
      loopState.budgetState.toolCallsMax - loopState.budgetState.toolCallsUsed;
    const iterationsRemaining =
      loopState.budgetState.loopIterationsMax - loopState.budgetState.loopIterationsUsed;
    const mustFinishNow = toolCallsRemaining <= 2 || iterationsRemaining <= 2;

    if (mustFinishNow) {
      loopState.activeTools = loopState.activeTools.filter(
        (tool) => tool.name === "vfs_finish_summary",
      );
    }

    // Inject budget status
    conversationHistory.push(
      createUserMessage(
        `[SYSTEM: BUDGET STATUS]\n${generateBudgetPrompt(loopState.budgetState, "vfs_finish_summary")}`,
      ),
    );

    console.log(
      `[SummaryLoop] Iteration: ${loopState.budgetState.loopIterationsUsed + 1}, Budget: ${getBudgetSummary(loopState.budgetState)}`,
    );

    // Call AI
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
        requiredToolName: mustFinishNow ? "vfs_finish_summary" : undefined,
        onRetry: (msg, count) => {
          console.warn(`[SummaryLoop] Retry ${count}: ${msg}`);
          incrementRetries(loopState.budgetState);
          conversationHistory.push(
            createUserMessage(
              `[SYSTEM: BUDGET UPDATE]\n${generateBudgetPrompt(loopState.budgetState, "vfs_finish_summary")}`,
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

      const mustOnlyFinish =
        loopState.activeTools.length === 1 &&
        loopState.activeTools[0]?.name === "vfs_finish_summary";

      if (mustOnlyFinish) {
        if (
          functionCalls.length !== 1 ||
          functionCalls[0]?.name !== "vfs_finish_summary"
        ) {
          const error = {
            success: false,
            error:
              '[ERROR: FORCED_FINISH] Budget is critically low. Your ONLY allowed tool call is "vfs_finish_summary", and it must be the ONLY tool call in this response.',
            code: "INVALID_ACTION",
          };
          conversationHistory.push(
            createToolResponseMessage(
              functionCalls.map((call) => ({
                toolCallId: call.id,
                name: call.name,
                content: error,
              })),
            ),
          );
          incrementIterations(loopState.budgetState);
          continue;
        }
      }

      const finishIndices = functionCalls
        .map((call, index) => ({ call, index }))
        .filter(({ call }) => call.name === "vfs_finish_summary")
        .map(({ index }) => index);

      if (finishIndices.length > 1) {
        const error = {
          success: false,
          error:
            '[ERROR: MULTIPLE_FINISH_CALLS] Provide exactly one "vfs_finish_summary", and it must be the LAST tool call.',
          code: "INVALID_ACTION",
        };
        conversationHistory.push(
          createToolResponseMessage(
            functionCalls.map((call) => ({
              toolCallId: call.id,
              name: call.name,
              content: error,
            })),
          ),
        );
        incrementIterations(loopState.budgetState);
        continue;
      }

      if (
        finishIndices.length === 1 &&
        finishIndices[0] !== functionCalls.length - 1
      ) {
        const error = {
          success: false,
          error:
            '[ERROR: FINISH_NOT_LAST] "vfs_finish_summary" must be your LAST tool call. Reorder your tool calls and try again.',
          code: "INVALID_ACTION",
        };
        conversationHistory.push(
          createToolResponseMessage(
            functionCalls.map((call) => ({
              toolCallId: call.id,
              name: call.name,
              content: error,
            })),
          ),
        );
        incrementIterations(loopState.budgetState);
        continue;
      }

      incrementToolCalls(loopState.budgetState, functionCalls.length);

      const toolResponses: Array<{
        toolCallId: string;
        name: string;
        content: unknown;
      }> = [];
      let loopFinished = false;

      const snapshot = input.vfsSession.snapshot();
      const index = readConversationIndex(snapshot);
      const forkId =
        typeof index?.activeForkId === "number" ? index.activeForkId : input.forkId;
      const turnNumber =
        typeof forkId === "number"
          ? (index?.latestTurnNumberByFork?.[String(forkId)] ?? null)
          : null;

      const toolCtx = {
        vfsSession: input.vfsSession,
        settings: input.settings,
        gameState: {
          forkId,
          turnNumber: typeof turnNumber === "number" ? turnNumber : 0,
        } as any,
      };

      for (const call of functionCalls) {
        const output = await dispatchToolCallAsync(call.name, call.args, toolCtx);

        if (call.name === "vfs_finish_summary" && output && (output as any).success) {
          finalSummary = (output as any).data?.summary ?? null;
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
  };
}
