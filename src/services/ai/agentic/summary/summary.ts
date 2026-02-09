/**
 * ============================================================================
 * Summary Agentic Loop - AI 驱动的故事摘要生成
 * ============================================================================
 *
 * 设计理念：
 * - 只传递最少必要的上下文（上一轮摘要 + 本轮对话）
 * - 让 AI 自主决定需要查询什么额外信息
 * - 两个阶段：query（查询）和 finish（完成）
 *
 * 与 adventure.ts 的 runAgenticLoop 类似，但更轻量：
 * - 没有 add/remove/update 阶段
 * - 专注于信息收集和摘要生成
 */

import {
  AISettings,
  LogEntry,
  TokenUsage,
  StorySummary,
  StorySegment,
  GameState,
} from "../../../../types";
import type { VfsSession } from "../../../vfs/vfsSession";
import {
  isContextLengthError,
  isInvalidArgumentError,
} from "../../contextCompressor";

// Import refactored loop
import { runSummaryLoopRefactored } from "./summaryLoop";

// ============================================================================
// Types
// ============================================================================

export interface SummaryAgenticLoopResult {
  summary: StorySummary | null;
  logs: LogEntry[];
  usage: TokenUsage;
  strategyUsed: SummaryStrategy;
}

export type SummaryStrategy = "compact" | "query_summary";

export interface SummaryLoopInput {
  /** Previous summary (the one before the segments being summarized) */
  previousSummary: StorySummary | null;
  /** Segments to be summarized */
  segmentsToSummarize: StorySegment[];
  /** Full game state for queries */
  gameState: GameState;
  /** Node index range being summarized */
  nodeRange: { fromIndex: number; toIndex: number };
  /** Language for output */
  language: string;
  /** AI Settings */
  settings: AISettings;
  /** VFS session (optional, enables vfs_* tools in fallback mode) */
  vfsSession?: VfsSession;
  /** Explicit strategy override (normally auto-selected by runSummaryAgenticLoop) */
  strategy?: SummaryStrategy;
}

const combineUsage = (
  base: TokenUsage,
  extra?: TokenUsage,
): TokenUsage => ({
  promptTokens: base.promptTokens + (extra?.promptTokens || 0),
  completionTokens: base.completionTokens + (extra?.completionTokens || 0),
  totalTokens: base.totalTokens + (extra?.totalTokens || 0),
  cacheRead: (base.cacheRead || 0) + (extra?.cacheRead || 0),
  cacheWrite: (base.cacheWrite || 0) + (extra?.cacheWrite || 0),
});

const canFallbackToQuerySummary = (error: unknown): boolean => {
  return isContextLengthError(error) || isInvalidArgumentError(error);
};

// ============================================================================
// Main Agentic Loop
// ============================================================================

/**
 * Run the summary agentic loop
 *
 * Process:
 * 1. Start with minimal context (previous summary + turn overview)
 * 2. AI can query for more detail if needed
 * 3. AI produces final summary via finish_summary tool
 */
export const runSummaryAgenticLoop = async (
  input: SummaryLoopInput,
): Promise<SummaryAgenticLoopResult> => {
  // Explicit strategy (used by tests/internal callers)
  if (input.strategy) {
    return runSummaryLoopRefactored(input);
  }

  // 1) Compact first: summarize directly in the original context (best/cheapest path)
  let compactResult: SummaryAgenticLoopResult | null = null;
  try {
    compactResult = await runSummaryLoopRefactored({
      ...input,
      strategy: "compact",
    });
    if (compactResult.summary) {
      return compactResult;
    }

    console.warn(
      "[Summary] Compact mode returned no summary, falling back to query_summary mode.",
    );
  } catch (error) {
    if (!canFallbackToQuerySummary(error)) {
      throw error;
    }

    console.warn(
      "[Summary] Compact mode failed with context/history issue, falling back to query_summary mode.",
      error,
    );
  }

  // 2) Fallback: query summary mode with anchors + tool-driven retrieval
  const queryResult = await runSummaryLoopRefactored({
    ...input,
    strategy: "query_summary",
  });

  if (!compactResult) {
    return queryResult;
  }

  return {
    summary: queryResult.summary,
    logs: [...compactResult.logs, ...queryResult.logs],
    usage: combineUsage(compactResult.usage, queryResult.usage),
    strategyUsed: queryResult.strategyUsed,
  };
};
