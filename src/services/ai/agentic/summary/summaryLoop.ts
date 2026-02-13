import type { SummaryLoopInput, SummaryAgenticLoopResult } from "./summary";
import { runCompactSummaryLoop } from "./summaryCompactLoop";
import { runQuerySummaryLoop } from "./summaryQueryLoop";
import {
  isContextLengthError,
  HistoryCorruptedError,
} from "../../contextCompressor";

export type SummaryLoopMode = "auto" | "session_compact" | "query_summary";

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

export async function runSummaryLoop(
  input: SummaryLoopInput,
  mode: SummaryLoopMode = "auto",
): Promise<SummaryAgenticLoopResult> {
  if (mode === "query_summary") {
    return runQuerySummaryLoop(input);
  }

  if (mode === "session_compact") {
    return runCompactSummaryLoop(input);
  }

  try {
    return await runCompactSummaryLoop(input);
  } catch (error) {
    if (!shouldFallbackToQuerySummary(error)) {
      throw error;
    }

    console.warn(
      "[SummaryLoop] Session-native compaction failed; falling back to query-based summary.",
      error,
    );
    return runQuerySummaryLoop(input);
  }
}
