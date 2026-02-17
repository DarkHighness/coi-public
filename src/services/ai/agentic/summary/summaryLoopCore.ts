import type {
  LogEntry,
  StorySummary,
  UnifiedMessage,
} from "../../../../types";
import type { ToolCallResult } from "../../../providers/types";

import { sessionManager } from "../../sessionManager";
import { createLogEntry } from "../../utils";
import {
  createToolCallMessage,
  createToolResponseMessage,
  createUserMessage,
} from "../../../messageTypes";
import { callWithAgenticRetry } from "../retry";
import {
  checkBudgetExhaustion,
  generateBudgetPrompt,
  getBudgetSummary,
  incrementIterations,
  incrementRetries,
  incrementToolCalls,
} from "../budgetUtils";
import { dispatchToolCallAsync } from "../../../tools/handlers";
import { readConversationIndex } from "../../../vfs/conversation";
import { vfsToolRegistry } from "../../../vfs/tools";
import {
  CURRENT_SOUL_LOGICAL_PATH,
  GLOBAL_SOUL_LOGICAL_PATH,
} from "../../../vfs/soulTemplates";
import {
  accumulateSummaryUsage,
  createSummaryLoopState,
} from "./summaryInitializer";
import type { SummaryAgenticLoopResult, SummaryLoopInput } from "./summary";
import { isReadOnlyInspectionToolName } from "../common/toolCallPolicies";

const SUMMARY_PATH_ARG_KEYS = new Set([
  "path",
  "paths",
  "from",
  "to",
  "patterns",
  "excludePatterns",
]);

const SUMMARY_REQUIRED_SOUL_PATHS = [
  CURRENT_SOUL_LOGICAL_PATH,
  GLOBAL_SOUL_LOGICAL_PATH,
] as const;

export type SummaryLoopCoreMode = "session_compact" | "query_summary";

type SummaryConsistencyRuntime = {
  targetForkId: number;
  activeForkId: number | null;
  activeTurnId: string | null;
  targetForkLatestTurn: number | null;
};

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractSuccessfulSummary = (value: unknown): StorySummary | null => {
  if (!isRecordObject(value) || value.success !== true) {
    return null;
  }
  const data = value.data;
  if (!isRecordObject(data)) {
    return null;
  }
  const summary = data.summary;
  return summary && typeof summary === "object"
    ? (summary as StorySummary)
    : null;
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
        typeof entry === "string"
          ? [entry]
          : collectSummaryPathCandidates(entry),
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

const validateCommitSummaryArgs = (
  args: unknown,
  runtimeFieldErrorCodePrefix: "COMPACT_SUMMARY" | "QUERY_SUMMARY",
):
  | { ok: true }
  | {
      ok: false;
      code: "INVALID_DATA";
      error: string;
    } => {
  const raw = (args ?? {}) as Record<string, unknown>;
  if (
    "nodeRange" in raw ||
    "lastSummarizedIndex" in raw ||
    "id" in raw ||
    "createdAt" in raw
  ) {
    return {
      ok: false,
      code: "INVALID_DATA",
      error: `[ERROR: ${runtimeFieldErrorCodePrefix}_RUNTIME_FIELDS_FORBIDDEN] vfs_finish_summary runtime fields (nodeRange/lastSummarizedIndex/id/createdAt) are system-managed. Provide only summary content fields.`,
    };
  }

  return { ok: true };
};

const injectSummaryRuntimeArgs = (
  args: unknown,
  expectedRange: { fromIndex: number; toIndex: number },
): Record<string, unknown> => {
  const raw = (args ?? {}) as Record<string, unknown>;
  return {
    ...raw,
    nodeRange: {
      fromIndex: expectedRange.fromIndex,
      toIndex: expectedRange.toIndex,
    },
    lastSummarizedIndex: expectedRange.toIndex + 1,
  };
};

const checkSummarySoulReadGate = (
  functionCalls: ToolCallResult[],
  vfsSession: SummaryLoopInput["vfsSession"],
):
  | null
  | {
      success: false;
      error: string;
      code: "SOUL_NOT_READ";
    } => {
  const hasNonReadCall = functionCalls.some(
    (call) => !isReadOnlyInspectionToolName(call.name),
  );
  if (!hasNonReadCall) {
    return null;
  }

  const hasToolSeenInCurrentEpoch = (
    vfsSession as {
      hasToolSeenInCurrentEpoch?: (path: string) => boolean;
    }
  ).hasToolSeenInCurrentEpoch;

  if (typeof hasToolSeenInCurrentEpoch !== "function") {
    return null;
  }

  const missing = SUMMARY_REQUIRED_SOUL_PATHS.filter(
    (path) => !hasToolSeenInCurrentEpoch(path),
  );

  if (missing.length === 0) {
    return null;
  }

  const shown = missing.map((path) => `current/${path}`).join(", ");

  return {
    success: false,
    error:
      `[ERROR: SOUL_NOT_READ] Read required soul anchors before non-read tools: ${shown}. ` +
      "Action: call a read tool on each missing anchor once (prefer vfs_read_markdown when section selectors are known), then continue.",
    code: "SOUL_NOT_READ",
  };
};

export async function runSummaryLoopCore(options: {
  input: SummaryLoopInput;
  provider: ReturnType<typeof sessionManager.getProvider>;
  modelId: string;
  providerProtocol: string;
  sessionId: string;
  systemInstruction: string;
  initialHistory: UnifiedMessage[];
  modeLabel: SummaryLoopCoreMode;
  crossForkErrorCodePrefix: "COMPACT_SUMMARY" | "QUERY_SUMMARY";
  runtimeFieldErrorCodePrefix: "COMPACT_SUMMARY" | "QUERY_SUMMARY";
  buildConsistencyAnchor: (
    input: SummaryLoopInput,
    modeLabel: SummaryLoopCoreMode,
    runtime: SummaryConsistencyRuntime,
  ) => string;
}): Promise<SummaryAgenticLoopResult> {
  const {
    input,
    provider,
    modelId,
    providerProtocol,
    sessionId,
    systemInstruction,
    initialHistory,
    modeLabel,
    crossForkErrorCodePrefix,
    runtimeFieldErrorCodePrefix,
    buildConsistencyAnchor,
  } = options;

  const { settings } = input;
  const finishToolName = vfsToolRegistry.getToolset("summary").finishToolName;

  const loopState = createSummaryLoopState(input);

  // Fork-safe reset: restore baseline summaries for this branch before running.
  try {
    input.vfsSession.mergeJson("summary/state.json", {
      summaries: input.baseSummaries,
      lastSummarizedIndex: input.baseIndex,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[SummaryLoop] Failed to reset summary/state.json: ${message}`,
    );
  }

  let conversationHistory: UnifiedMessage[] = [...initialHistory];

  const snapshotForAnchor = input.vfsSession.snapshot();
  const indexForAnchor = readConversationIndex(snapshotForAnchor);
  const targetForkId = Number.isFinite(input.forkId)
    ? Math.floor(input.forkId)
    : 0;
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

  if (typeof input.vfsSession.setActiveForkId === "function") {
    input.vfsSession.setActiveForkId(targetForkId);
  }

  conversationHistory.push(
    createUserMessage(
      buildConsistencyAnchor(input, modeLabel, {
        targetForkId,
        activeForkId: activeForkIdForAnchor,
        activeTurnId: activeTurnIdForAnchor,
        targetForkLatestTurn,
      }),
    ),
  );

  const allLogs: LogEntry[] = [];
  let finalSummary: StorySummary | null = null;

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
      loopState.budgetState.loopIterationsMax -
      loopState.budgetState.loopIterationsUsed;
    const mustFinishNow = toolCallsRemaining <= 2 || iterationsRemaining <= 2;

    if (mustFinishNow) {
      loopState.activeTools = loopState.activeTools.filter(
        (tool) => tool.name === finishToolName,
      );
    }

    conversationHistory.push(
      createUserMessage(
        `[SYSTEM: BUDGET STATUS]\n${generateBudgetPrompt(loopState.budgetState, finishToolName)}`,
      ),
    );

    console.log(
      `[SummaryLoop] Iteration: ${loopState.budgetState.loopIterationsUsed + 1}, Budget: ${getBudgetSummary(loopState.budgetState)}`,
    );

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
          if (!meta?.silent) {
            incrementRetries(loopState.budgetState);
          }
          conversationHistory.push(
            createUserMessage(
              `[SYSTEM: BUDGET UPDATE]\n${generateBudgetPrompt(loopState.budgetState, finishToolName)}`,
            ),
          );
        },
      },
    );

    accumulateSummaryUsage(loopState, usage);

    allLogs.push(
      createLogEntry({
        provider: providerProtocol,
        model: modelId,
        endpoint: `summary-iteration-${iterationNum}`,
        response: raw,
        usage,
      }),
    );

    const functionCalls = (result as { functionCalls?: ToolCallResult[] })
      .functionCalls;

    if (functionCalls) {
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

      const finishIndices = functionCalls
        .map((call, index) => ({ call, index }))
        .filter(({ call }) => call.name === finishToolName)
        .map(({ index }) => index);

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

      if (typeof input.vfsSession.setActiveForkId === "function") {
        input.vfsSession.setActiveForkId(forkId);
      }

      const turnNumberByTargetFork =
        typeof index?.latestTurnNumberByFork?.[String(forkId)] === "number"
          ? index.latestTurnNumberByFork[String(forkId)]
          : null;
      const fallbackTurnNumber =
        typeof index?.activeForkId === "number"
          ? (index?.latestTurnNumberByFork?.[String(index.activeForkId)] ??
            null)
          : null;
      const turnNumber =
        typeof turnNumberByTargetFork === "number"
          ? turnNumberByTargetFork
          : fallbackTurnNumber;

      const toolCtx = {
        vfsSession: input.vfsSession,
        settings: input.settings,
        vfsActor: "ai" as const,
        vfsMode: "normal" as const,
      };

      for (const call of functionCalls) {
        const soulGateError = checkSummarySoulReadGate([call], input.vfsSession);
        if (soulGateError) {
          toolResponses.push({
            toolCallId: call.id,
            name: call.name,
            content: soulGateError,
          });
          continue;
        }

        if (mustOnlyFinish && call.name !== finishToolName) {
          toolResponses.push({
            toolCallId: call.id,
            name: call.name,
            content: {
              success: false,
              error: `[ERROR: FORCED_FINISH] Budget is critically low. Your ONLY allowed tool call is "${finishToolName}" in this response.`,
              code: "INVALID_ACTION",
            },
          });
          continue;
        }

        if (finishIndices.length > 1 && call.name === finishToolName) {
          toolResponses.push({
            toolCallId: call.id,
            name: call.name,
            content: {
              success: false,
              error: `[ERROR: MULTIPLE_FINISH_CALLS] Provide exactly one "${finishToolName}", and it must be the LAST tool call.`,
              code: "INVALID_ACTION",
            },
          });
          continue;
        }

        if (
          finishIndices.length === 1 &&
          finishIndices[0] !== functionCalls.length - 1 &&
          call.name === finishToolName
        ) {
          toolResponses.push({
            toolCallId: call.id,
            name: call.name,
            content: {
              success: false,
              error: `[ERROR: FINISH_NOT_LAST] "${finishToolName}" must be your LAST tool call. Reorder your tool calls and try again.`,
              code: "INVALID_ACTION",
            },
          });
          continue;
        }

        const crossForkViolations = findSummaryCrossForkViolations(
          call.args,
          forkId,
        );
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
                `[ERROR: ${crossForkErrorCodePrefix}_CROSS_FORK_BLOCKED] Summary is scoped to fork ${forkId}. ` +
                `Cross-fork path references are not allowed (${details}). Read only target-fork paths first, then retry.`,
              code: "INVALID_ACTION",
            },
          });
          continue;
        }

        let dispatchArgs: Record<string, unknown> = call.args;
        if (call.name === finishToolName) {
          const finishRangeValidation = validateCommitSummaryArgs(
            call.args,
            runtimeFieldErrorCodePrefix,
          );
          if (finishRangeValidation.ok === false) {
            toolResponses.push({
              toolCallId: call.id,
              name: call.name,
              content: {
                success: false,
                error: finishRangeValidation.error,
                code: finishRangeValidation.code,
              },
            });
            continue;
          }
          dispatchArgs = injectSummaryRuntimeArgs(call.args, input.nodeRange);
        }

        const output = await dispatchToolCallAsync(
          call.name,
          dispatchArgs,
          toolCtx,
        );

        if (call.name === finishToolName) {
          const produced = extractSuccessfulSummary(output);
          const hasForbidden =
            produced && typeof produced === "object"
              ? containsForbiddenSummaryTokens(produced as StorySummary)
              : false;

          if (hasForbidden) {
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
                code: "SUMMARY_FORBIDDEN_TOKENS",
              },
            });
            allLogs.push(
              createLogEntry({
                provider: providerProtocol,
                model: modelId,
                endpoint: "summary_tool",
                toolName: call.name,
                toolInput: dispatchArgs,
                toolOutput: output,
              }),
            );
            continue;
          }

          finalSummary = produced;
          if (produced) {
            loopFinished = true;
          }
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
            toolInput: dispatchArgs,
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
