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
  fromGeminiFormat,
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
  buildSummaryInitialContext,
} from "./summaryContext";
import { dispatchToolCallAsync } from "../../../tools/handlers";
import { readConversationIndex } from "../../../vfs/conversation";
import { VFS_TOOLSETS } from "../../../vfsToolsets";
import { isContextLengthError, HistoryCorruptedError } from "../../contextCompressor";

// ============================================================================
// Main Loop
// ============================================================================

export type SummaryLoopMode = "auto" | "session_compact" | "query_summary";

const COMPACT_TRIGGER = "[SYSTEM: COMPACT_NOW]";

const shouldFallbackToQuerySummary = (error: unknown): boolean => {
  if (error instanceof HistoryCorruptedError) return true;
  if (isContextLengthError(error)) return true;
  if (error instanceof Error) {
    const msg = error.message || "";
    return (
      msg.includes("CONTEXT_LENGTH_EXCEEDED") ||
      msg.includes("HISTORY_CORRUPTED") ||
      msg.includes("Missing story system instruction")
    );
  }
  return false;
};

const containsForbiddenSummaryTokens = (summary: StorySummary): boolean => {
  const forbidden = [
    /vfs_/i,
    /\[error\b/i,
    /\btool\b/i,
    /\bretry\b/i,
    /\bbudget\b/i,
    /\bfunction_call\b/i,
    /\btool_call\b/i,
  ];

  const hasForbidden = (value: unknown): boolean => {
    if (typeof value === "string") {
      return forbidden.some((re) => re.test(value));
    }
    if (Array.isArray(value)) {
      return value.some((v) => hasForbidden(v));
    }
    if (value && typeof value === "object") {
      return Object.values(value as Record<string, unknown>).some((v) =>
        hasForbidden(v),
      );
    }
    return false;
  };

  return hasForbidden(summary);
};

async function runSummaryLoopCore(options: {
  input: SummaryLoopInput;
  provider: ReturnType<typeof sessionManager.getProvider>;
  modelId: string;
  providerProtocol: string;
  sessionId: string;
  systemInstruction: string;
  initialHistory: UnifiedMessage[];
  modeLabel: "session_compact" | "query_summary";
}): Promise<SummaryAgenticLoopResult> {
  const {
    input,
    provider,
    modelId,
    providerProtocol,
    sessionId,
    systemInstruction,
    initialHistory,
  } = options;

  const { settings, language } = input;
  const finishToolName = VFS_TOOLSETS.summary.finishToolName;

  // Initialize state
  const loopState = createSummaryLoopState(input);

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

  let conversationHistory: UnifiedMessage[] = [...initialHistory];

  const allLogs: LogEntry[] = [];
  let finalSummary: StorySummary | null = null;
  let forbiddenRetryUsed = false;

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
        (tool) => tool.name === finishToolName,
      );
    }

    // Inject budget status
    conversationHistory.push(
      createUserMessage(
        `[SYSTEM: BUDGET STATUS]\n${generateBudgetPrompt(loopState.budgetState, finishToolName)}`,
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
          sessionId,
          "required",
          settings.extra?.forceAutoToolChoice,
        ),
        temperature: settings.story?.temperature,
      },
      conversationHistory,
      {
        maxRetries: loopState.budgetState.retriesMax,
        requiredToolName: mustFinishNow ? finishToolName : undefined,
        onRetry: (msg, count) => {
          console.warn(`[SummaryLoop] Retry ${count}: ${msg}`);
          incrementRetries(loopState.budgetState);
          conversationHistory.push(
            createUserMessage(
              `[SYSTEM: BUDGET UPDATE]\n${generateBudgetPrompt(loopState.budgetState, finishToolName)}`,
            ),
          );
        },
      },
    );

    accumulateSummaryUsage(loopState, usage);

    // Log AI call with usage stats
    allLogs.push(
      createLogEntry({
        provider: providerProtocol,
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
        loopState.activeTools[0]?.name === finishToolName;

      if (mustOnlyFinish) {
        if (
          functionCalls.length !== 1 ||
          functionCalls[0]?.name !== finishToolName
        ) {
          const error = {
            success: false,
            error:
              `[ERROR: FORCED_FINISH] Budget is critically low. Your ONLY allowed tool call is "${finishToolName}", and it must be the ONLY tool call in this response.`,
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
        .filter(({ call }) => call.name === finishToolName)
        .map(({ index }) => index);

      if (finishIndices.length > 1) {
        const error = {
          success: false,
          error:
            `[ERROR: MULTIPLE_FINISH_CALLS] Provide exactly one "${finishToolName}", and it must be the LAST tool call.`,
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
            `[ERROR: FINISH_NOT_LAST] "${finishToolName}" must be your LAST tool call. Reorder your tool calls and try again.`,
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

        if (call.name === finishToolName && output && (output as any).success) {
          const produced = (output as any).data?.summary ?? null;
          const hasForbidden =
            produced && typeof produced === "object"
              ? containsForbiddenSummaryTokens(produced as StorySummary)
              : false;

          if (hasForbidden) {
            // Roll back summary state to baseline and ask the model to try again.
            // This keeps the "finish" tool semantics while preventing bad summaries from persisting.
            if (!forbiddenRetryUsed) {
              forbiddenRetryUsed = true;
              try {
                input.vfsSession.mergeJson("summary/state.json", {
                  summaries: input.baseSummaries,
                  lastSummarizedIndex: input.baseIndex,
                });
              } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                throw new Error(
                  `[SummaryLoop] Failed to rollback summary/state.json after forbidden token check: ${msg}`,
                );
              }

              toolResponses.push({
                toolCallId: call.id,
                name: call.name,
                content: {
                  success: false,
                  error:
                    `[ERROR: SUMMARY_FORBIDDEN_TOKENS] The summary contains forbidden process-related tokens (e.g. tool/retry/error). ` +
                    `Rewrite the summary to include ONLY story facts and world changes. Do NOT mention tools, failures, retries, budgets, or internal errors.`,
                  code: "INVALID_SUMMARY",
                },
              });
              allLogs.push(
                createLogEntry({
                  provider: providerProtocol,
                  model: modelId,
                  endpoint: "summary_tool",
                  toolName: call.name,
                  toolInput: call.args,
                  toolOutput: output,
                }),
              );
              // Skip default logging below (already logged) and continue processing remaining calls if any.
              continue;
            }
          }

          finalSummary = produced;
          loopFinished = true;
        }

        toolResponses.push({
          toolCallId: call.id,
          name: call.name,
          content: output,
        });

        allLogs.push(
          createLogEntry({
            provider: providerProtocol,
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

async function runQuerySummary(input: SummaryLoopInput): Promise<SummaryAgenticLoopResult> {
  const { settings, language } = input;

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

  // Summary system instruction (small, task-focused)
  const { getSummarySystemInstruction } = await import("./summaryContext");
  const systemInstruction = getSummarySystemInstruction(
    language,
    settings.extra?.nsfw,
    settings.extra?.detailedDescription,
  );

  const initialHistory: UnifiedMessage[] = [
    createUserMessage(
      `[CONTEXT: Summary Task]\n${buildSummaryInitialContext(input)}`,
    ),
  ];

  return runSummaryLoopCore({
    input,
    provider,
    modelId,
    providerProtocol: instance.protocol,
    sessionId: summarySession.id,
    systemInstruction,
    initialHistory,
    modeLabel: "query_summary",
  });
}

async function runSessionCompactSummary(
  input: SummaryLoopInput,
): Promise<SummaryAgenticLoopResult> {
  const { settings, language } = input;

  const providerInfo = getProviderConfig(settings, "story");
  if (!providerInfo) {
    throw new Error("Story provider not configured");
  }
  const { instance, modelId } = providerInfo;

  // Use the story session (NOT the :summary session) so we can compact the real session history.
  const storySession = await sessionManager.getOrCreateSession({
    slotId: input.slotId,
    forkId: input.forkId,
    providerId: instance.id,
    modelId,
    protocol: instance.protocol,
  });

  const systemInstruction = sessionManager.getSystemInstruction(storySession.id);
  if (!systemInstruction) {
    throw new Error(
      "[SummaryLoop] Missing story system instruction for session-native compaction.",
    );
  }

  const nativeHistory = sessionManager.getHistory(storySession.id);
  const initialHistory: UnifiedMessage[] =
    instance.protocol === "gemini"
      ? fromGeminiFormat(nativeHistory as any[])
      : (nativeHistory as UnifiedMessage[]);

  const targetLastSummarizedIndex = input.nodeRange.toIndex + 1;

  const trigger = createUserMessage(
    `${COMPACT_TRIGGER}\n` +
      `You are entering **session compaction** mode.\n\n` +
      `Requirements:\n` +
      `- Produce exactly ONE summary by calling "vfs_finish_summary" as your LAST tool call.\n` +
      `- The summary MUST be in ${language}.\n` +
      `- Cover nodeRange: ${input.nodeRange.fromIndex}-${input.nodeRange.toIndex}.\n` +
      `- Set lastSummarizedIndex = ${targetLastSummarizedIndex}.\n` +
      `- DO NOT mention tools, failures, retries, budgets, or internal errors anywhere in the summary fields.\n\n` +
      `If you need to verify details, you may use read-only VFS tools (vfs_read_json/search/grep/etc.).`,
  );

  return runSummaryLoopCore({
    input,
    provider: sessionManager.getProvider(storySession.id, instance),
    modelId,
    providerProtocol: instance.protocol,
    sessionId: storySession.id,
    systemInstruction,
    initialHistory: [...initialHistory, trigger],
    modeLabel: "session_compact",
  });
}

export async function runSummaryLoop(
  input: SummaryLoopInput,
  mode: SummaryLoopMode = "auto",
): Promise<SummaryAgenticLoopResult> {
  if (mode === "query_summary") {
    return runQuerySummary(input);
  }

  // session_compact/auto: prefer session-native compaction, fallback to query-based summary on
  // overflow/corruption/missing-system-instruction.
  try {
    return await runSessionCompactSummary(input);
  } catch (error) {
    if (!shouldFallbackToQuerySummary(error)) {
      throw error;
    }

    console.warn(
      "[SummaryLoop] Session-native compaction failed; falling back to query-based summary.",
      error,
    );
    return runQuerySummary(input);
  }
}

// Back-compat: previous export name, now delegates to the unified loop (auto mode).
export async function runSummaryLoopRefactored(
  input: SummaryLoopInput,
): Promise<SummaryAgenticLoopResult> {
  return runSummaryLoop(input, "auto");
}
