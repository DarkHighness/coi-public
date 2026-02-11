/**
 * Session Compact Summary Loop
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
import { dispatchToolCallAsync } from "../../../tools/handlers";
import { buildTurnPath, readConversationIndex } from "../../../vfs/conversation";
import { VFS_TOOLSETS } from "../../../vfsToolsets";

// ============================================================================
// Main Loop
// ============================================================================

const COMPACT_TRIGGER = "[SYSTEM: COMPACT_NOW]";
const COMPACT_SUMMARY_CONSISTENCY_ANCHOR_MARKER = "[COMPACT SUMMARY CONSISTENCY ANCHOR]";
const SUMMARY_PATH_ARG_KEYS = new Set([
  "path",
  "paths",
  "from",
  "to",
  "patterns",
  "excludePatterns",
]);

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

const buildSummaryConsistencyAnchor = (
  input: SummaryLoopInput,
  modeLabel: "session_compact" | "query_summary",
  runtime: {
    targetForkId: number;
    activeForkId: number | null;
    activeTurnId: string | null;
    targetForkLatestTurn: number | null;
  },
): string => {
  const targetLastSummarizedIndex = input.nodeRange.toIndex + 1;
  const pendingPlayerActionText = input.pendingPlayerAction?.text
    ? input.pendingPlayerAction.text.slice(0, 280)
    : "";
  const previousSummary =
    input.baseSummaries.length > 0
      ? input.baseSummaries[input.baseSummaries.length - 1]
      : null;
  const previousSummaryLabel = previousSummary
    ? `id=${String((previousSummary as any).id ?? "unknown")}, createdAt=${String((previousSummary as any).createdAt ?? "unknown")}, nodeRange=${previousSummary.nodeRange ? `${previousSummary.nodeRange.fromIndex}-${previousSummary.nodeRange.toIndex}` : "unknown"}`
    : "none";

  const latestTurnPath =
    typeof runtime.targetForkLatestTurn === "number"
      ? `current/${buildTurnPath(runtime.targetForkId, runtime.targetForkLatestTurn)}`
      : `current/conversation/turns/fork-${runtime.targetForkId}/turn-<n>.json`;

  return `${COMPACT_SUMMARY_CONSISTENCY_ANCHOR_MARKER}
Mode: ${modeLabel}
MODE CONTRACT: SESSION_COMPACT
Target fork ID: ${runtime.targetForkId}
Active fork ID from index: ${runtime.activeForkId ?? "unknown"}
Active turn ID from index: ${runtime.activeTurnId ?? "unknown"}
Latest turn number in target fork: ${runtime.targetForkLatestTurn ?? "unknown"}
Latest turn path in target fork: ${latestTurnPath}
Summary range: ${input.nodeRange.fromIndex}-${input.nodeRange.toIndex}
Base lastSummarizedIndex: ${input.baseIndex}
Required final lastSummarizedIndex: ${targetLastSummarizedIndex}
Base summaries count: ${input.baseSummaries.length}
Last summary checkpoint: ${previousSummaryLabel}
${pendingPlayerActionText ? `Pending player action (for context only): ${pendingPlayerActionText}` : ""}

Primary source for facts:
- Current session history already loaded in context.
- Do NOT rebuild full history from scratch unless evidence is missing.

Verification-only reads (optional):
- current/conversation/index.json
- current/conversation/turns/fork-${runtime.targetForkId}/turn-*.json
- forks/${runtime.targetForkId}/story/summary/state.json

Hard constraints:
- Keep compaction scoped to target fork ${runtime.targetForkId}; NEVER cross forks.
- Do NOT summarize outside the specified summary range.
- Preserve continuity with previous summaries and in-session events.
- \`vfs_finish_summary.lastSummarizedIndex\` MUST equal ${targetLastSummarizedIndex}.
- Output summary content only. Never mention tools/retries/errors/budgets.`;
};

const collectSummaryPathCandidates = (
  value: unknown,
  key?: string,
): string[] => {
  if (typeof value === "string") {
    return key && SUMMARY_PATH_ARG_KEYS.has(key) ? [value] : [];
  }

  if (Array.isArray(value)) {
    if (key && SUMMARY_PATH_ARG_KEYS.has(key)) {
      return value.flatMap((entry) =>
        typeof entry === "string" ? [entry] : collectSummaryPathCandidates(entry),
      );
    }
    return value.flatMap((entry) => collectSummaryPathCandidates(entry));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    collectSummaryPathCandidates(v, k),
  );
};

const extractForkRefsFromPath = (candidate: string): number[] => {
  const refs = new Set<number>();
  const canonicalForkPattern = /\bforks\/(\d+)\b/g;
  const conversationForkPattern = /\bconversation\/turns\/fork-(\d+)\b/g;

  for (const pattern of [canonicalForkPattern, conversationForkPattern]) {
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

const findSummaryCrossForkViolations = (
  args: unknown,
  targetForkId: number,
): Array<{ path: string; forkId: number }> => {
  const candidates = collectSummaryPathCandidates(args);
  const violations: Array<{ path: string; forkId: number }> = [];

  for (const candidate of candidates) {
    const refs = extractForkRefsFromPath(candidate);
    for (const forkId of refs) {
      if (forkId !== targetForkId) {
        violations.push({ path: candidate, forkId });
      }
    }
  }

  return violations;
};

const validateFinishSummaryRange = (
  args: unknown,
  expectedRange: { fromIndex: number; toIndex: number },
):
  | { ok: true }
  | {
      ok: false;
      code: "INVALID_DATA";
      error: string;
    } => {
  const raw = (args ?? {}) as Record<string, unknown>;
  const nodeRange = raw.nodeRange as
    | { fromIndex?: unknown; toIndex?: unknown }
    | undefined;
  const lastSummarizedIndex = raw.lastSummarizedIndex;

  const fromIndex =
    typeof nodeRange?.fromIndex === "number" && Number.isFinite(nodeRange.fromIndex)
      ? Math.floor(nodeRange.fromIndex)
      : null;
  const toIndex =
    typeof nodeRange?.toIndex === "number" && Number.isFinite(nodeRange.toIndex)
      ? Math.floor(nodeRange.toIndex)
      : null;
  const lastIndex =
    typeof lastSummarizedIndex === "number" && Number.isFinite(lastSummarizedIndex)
      ? Math.floor(lastSummarizedIndex)
      : null;

  if (fromIndex === null || toIndex === null || lastIndex === null) {
    return {
      ok: false,
      code: "INVALID_DATA",
      error:
        "[ERROR: COMPACT_SUMMARY_FINISH_ARGS_INVALID] vfs_finish_summary must include numeric nodeRange.fromIndex, nodeRange.toIndex, and lastSummarizedIndex.",
    };
  }

  const expectedLastSummarizedIndex = expectedRange.toIndex + 1;
  if (
    fromIndex !== expectedRange.fromIndex ||
    toIndex !== expectedRange.toIndex ||
    lastIndex !== expectedLastSummarizedIndex
  ) {
    return {
      ok: false,
      code: "INVALID_DATA",
      error:
        `[ERROR: COMPACT_SUMMARY_RANGE_MISMATCH] Summary loop is anchored to nodeRange ` +
        `${expectedRange.fromIndex}-${expectedRange.toIndex} with lastSummarizedIndex=${expectedLastSummarizedIndex}. ` +
        `Received nodeRange ${fromIndex}-${toIndex}, lastSummarizedIndex=${lastIndex}. ` +
        "Read target-fork history again and retry with the anchored range.",
    };
  }

  return { ok: true };
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

  const snapshotForAnchor = input.vfsSession.snapshot();
  const indexForAnchor = readConversationIndex(snapshotForAnchor);
  const targetForkId = Number.isFinite(input.forkId) ? Math.floor(input.forkId) : 0;
  const targetForkLatestTurn =
    typeof indexForAnchor?.latestTurnNumberByFork?.[String(targetForkId)] ===
    "number"
      ? indexForAnchor.latestTurnNumberByFork[String(targetForkId)]
      : null;
  const activeForkIdForAnchor =
    typeof indexForAnchor?.activeForkId === "number"
      ? indexForAnchor.activeForkId
      : null;
  const activeTurnIdForAnchor =
    typeof indexForAnchor?.activeTurnId === "string"
      ? indexForAnchor.activeTurnId
      : null;

  if (typeof (input.vfsSession as any)?.setActiveForkId === "function") {
    (input.vfsSession as any).setActiveForkId(targetForkId);
  }

  conversationHistory.push(
    createUserMessage(
      buildSummaryConsistencyAnchor(input, options.modeLabel, {
        targetForkId,
        activeForkId: activeForkIdForAnchor,
        activeTurnId: activeTurnIdForAnchor,
        targetForkLatestTurn,
      }),
    ),
  );

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

    const remainingRetries = Math.max(
      0,
      loopState.budgetState.retriesMax - loopState.budgetState.retriesUsed,
    );

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
        maxRetries: remainingRetries,
        requiredToolName: mustFinishNow ? finishToolName : undefined,
        finishToolName,
        onRetry: (msg, count, meta) => {
          console.warn(`[SummaryLoop] Retry ${count}: ${msg}`);
          if (meta?.silent) {
            return;
          }

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
      const forkId = targetForkId;

      if (typeof (input.vfsSession as any)?.setActiveForkId === "function") {
        (input.vfsSession as any).setActiveForkId(forkId);
      }

      const turnNumberByTargetFork =
        typeof index?.latestTurnNumberByFork?.[String(forkId)] === "number"
          ? index.latestTurnNumberByFork[String(forkId)]
          : null;
      const fallbackTurnNumber =
        typeof index?.activeForkId === "number"
          ? (index?.latestTurnNumberByFork?.[String(index.activeForkId)] ?? null)
          : null;
      const turnNumber =
        typeof turnNumberByTargetFork === "number"
          ? turnNumberByTargetFork
          : fallbackTurnNumber;

      const toolCtx = {
        vfsSession: input.vfsSession,
        settings: input.settings,
        gameState: {
          forkId,
          turnNumber: typeof turnNumber === "number" ? turnNumber : 0,
        } as any,
        vfsActor: "ai" as const,
        vfsMode: "normal" as const,
      };

      let hasPriorToolFailure = false;

      for (const call of functionCalls) {
        if (call.name === finishToolName && hasPriorToolFailure) {
          toolResponses.push({
            toolCallId: call.id,
            name: call.name,
            content: {
              success: false,
              error:
                `[ERROR: FINISH_BLOCKED_BY_PREVIOUS_FAILURE] One or more tool calls before finish failed in this batch. ` +
                `Fix those failures first, then call "${finishToolName}" again as the LAST tool call.`,
              code: "INVALID_ACTION",
            },
          });
          hasPriorToolFailure = true;
          continue;
        }

        const crossForkViolations = findSummaryCrossForkViolations(call.args, forkId);
        if (crossForkViolations.length > 0) {
          const details = crossForkViolations
            .slice(0, 3)
            .map((item) => `fork=${item.forkId} path="${item.path}"`)
            .join("; ");
          toolResponses.push({
            toolCallId: call.id,
            name: call.name,
            content: {
              success: false,
              error:
                `[ERROR: COMPACT_SUMMARY_CROSS_FORK_BLOCKED] Summary is scoped to fork ${forkId}. ` +
                `Cross-fork path references are not allowed (${details}). Read only target-fork paths first, then retry.`,
              code: "INVALID_ACTION",
            },
          });
          hasPriorToolFailure = true;
          continue;
        }

        if (call.name === finishToolName) {
          const finishRangeValidation = validateFinishSummaryRange(
            call.args,
            input.nodeRange,
          );
          if (!finishRangeValidation.ok) {
            const failure = finishRangeValidation as {
              ok: false;
              error: string;
              code: "INVALID_DATA";
            };

            toolResponses.push({
              toolCallId: call.id,
              name: call.name,
              content: {
                success: false,
                error: failure.error,
                code: failure.code,
              },
            });
            hasPriorToolFailure = true;
            continue;
          }
        }

        const output = await dispatchToolCallAsync(call.name, call.args, toolCtx);

        const isToolFailure =
          !!output &&
          typeof output === "object" &&
          "success" in (output as any) &&
          (output as any).success === false;
        if (isToolFailure) {
          hasPriorToolFailure = true;
        }

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
              hasPriorToolFailure = true;
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

export async function runCompactSummaryLoop(
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
      `Before finish, read protocol (hub first): "current/skills/commands/runtime/SKILL.md", then "current/skills/commands/runtime/compact/SKILL.md".\n` +
      `If you need to verify details, use read-only VFS tools (vfs_read_json/search/grep/etc.) and stay on target fork only.`,
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
