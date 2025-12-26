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

// Import refactored loop
import { runSummaryLoopRefactored } from "./summaryLoop";

// ============================================================================
// Types
// ============================================================================

export interface SummaryAgenticLoopResult {
  summary: StorySummary | null;
  logs: LogEntry[];
  usage: TokenUsage;
}

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
}

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
  // Delegate to refactored loop
  return runSummaryLoopRefactored(input);
};
