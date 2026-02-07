import { AISettings, LogEntry, StorySummary } from "../../../../types";
import type { VfsSession } from "../../../vfs/vfsSession";
import { createLogEntry, getProviderConfig } from "../../utils";
import { runSummaryAgenticLoop } from "./summary";
import type { SummaryLoopMode } from "./summaryLoop";

export const summarizeContext = async (
  input: {
    vfsSession: VfsSession;
    slotId: string;
    forkId: number;
    baseSummaries: StorySummary[];
    baseIndex: number;
    nodeRange: { fromIndex: number; toIndex: number };
    language: string;
    settings: AISettings;
    pendingPlayerAction?: { segmentIdx: number; text: string } | null;
    mode?: SummaryLoopMode;
  },
): Promise<{
  summary: StorySummary | null;
  logs: LogEntry[];
  error?: string;
}> => {
  try {
    const result = await runSummaryAgenticLoop(
      {
        vfsSession: input.vfsSession,
        slotId: input.slotId,
        forkId: input.forkId,
        nodeRange: input.nodeRange,
        baseSummaries: input.baseSummaries,
        baseIndex: input.baseIndex,
        language: input.language,
        settings: input.settings,
        pendingPlayerAction: input.pendingPlayerAction,
      },
      { mode: input.mode },
    );

    if (!result.summary) {
      return {
        summary: null,
        logs: result.logs,
        error: "Summary generation failed",
      };
    }

    return {
      summary: result.summary,
      logs: result.logs,
    };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error("Summary agentic loop failed", error);

    const providerInfo = getProviderConfig(input.settings, "story");
    return {
      summary: null,
      logs: [
        createLogEntry({
          provider: providerInfo?.instance.protocol || "openai",
          model: providerInfo?.modelId || "unknown",
          endpoint: "summary-error",
          stage: "error",
          request: { error: error.message },
        }),
      ],
      error: error.message,
    };
  }
};
