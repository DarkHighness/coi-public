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
} from "../../../../types";
import type { VfsSession } from "../../../vfs/vfsSession";

import type { SummaryLoopMode } from "./summaryLoop";
import { runSummaryLoop } from "./summaryLoop";

// ============================================================================
// Types
// ============================================================================

export interface SummaryAgenticLoopResult {
  summary: StorySummary | null;
  logs: LogEntry[];
  usage: TokenUsage;
}

export interface SummaryLoopInput {
  /** VFS session for file-backed state + conversation reads */
  vfsSession: VfsSession;
  /** Slot id for session-scoped summary calls */
  slotId: string;
  /** Current fork id (for logging / diagnostics) */
  forkId: number;
  /** Node index range being summarized (segment indices) */
  nodeRange: { fromIndex: number; toIndex: number };
  /** Fork-safe base summaries to reset summary state before running */
  baseSummaries: StorySummary[];
  /** Fork-safe base lastSummarizedIndex to reset summary state before running */
  baseIndex: number;
  /** Language for output */
  language: string;
  /** AI Settings */
  settings: AISettings;
  /** Optional pending player action not yet written to VFS */
  pendingPlayerAction?: { segmentIdx: number; text: string } | null;
}

// ============================================================================
// Main Agentic Loop
// ============================================================================

/**
 * Run the summary agentic loop
 *
 * Process:
 * 1. Start with minimal context (previous summary + turn overview)
 * 2. AI can query VFS for more detail if needed
 * 3. AI finishes via vfs_commit_summary (writes summary/state.json)
 */
export const runSummaryAgenticLoop = async (
  input: SummaryLoopInput,
  options?: { mode?: SummaryLoopMode },
): Promise<SummaryAgenticLoopResult> => {
  return runSummaryLoop(input, options?.mode ?? "auto");
};
