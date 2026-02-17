import { fromGeminiFormat } from "../../../messageTypes";
import { readConversationIndex } from "../../../vfs/conversation";
import { sessionManager } from "../../sessionManager";
import { getProviderConfig } from "../../utils";
import type { SummaryLoopInput } from "./summary";

export interface SummaryRouteDecision {
  mode: "session_compact" | "query_summary";
  reason:
    | "story_provider_missing"
    | "story_session_unavailable"
    | "story_system_instruction_missing"
    | "story_history_empty"
    | "story_history_too_large"
    | "conversation_anchor_missing"
    | "compact_ready";
  diagnostics: {
    estimatedChars: number;
    historyLength: number;
    targetForkId: number;
    hasConversationIndex: boolean;
  };
}

const COMPACT_HISTORY_CHAR_SOFT_LIMIT = 180_000;

const estimateHistoryChars = (history: unknown[]): number => {
  let total = 0;
  for (const entry of history) {
    try {
      total += JSON.stringify(entry).length;
    } catch {
      total += 256;
    }
  }
  return total;
};

export async function preflightSummaryRoute(
  input: SummaryLoopInput,
): Promise<SummaryRouteDecision> {
  const diagnostics: SummaryRouteDecision["diagnostics"] = {
    estimatedChars: 0,
    historyLength: 0,
    targetForkId: Number.isFinite(input.forkId) ? Math.floor(input.forkId) : 0,
    hasConversationIndex: false,
  };

  const providerInfo = getProviderConfig(input.settings, "story");
  if (!providerInfo) {
    return {
      mode: "query_summary",
      reason: "story_provider_missing",
      diagnostics,
    };
  }

  const { instance, modelId } = providerInfo;

  let storySessionId: string;
  try {
    const storySession = await sessionManager.getOrCreateSession({
      slotId: input.slotId,
      forkId: input.forkId,
      providerId: instance.id,
      modelId,
      protocol: instance.protocol,
    });
    storySessionId = storySession.id;
  } catch {
    return {
      mode: "query_summary",
      reason: "story_session_unavailable",
      diagnostics,
    };
  }

  const systemInstruction = sessionManager.getSystemInstruction(storySessionId);
  if (!systemInstruction) {
    return {
      mode: "query_summary",
      reason: "story_system_instruction_missing",
      diagnostics,
    };
  }

  const nativeHistory = sessionManager.getHistory(storySessionId);
  const history =
    instance.protocol === "gemini"
      ? fromGeminiFormat(nativeHistory)
      : nativeHistory;

  diagnostics.historyLength = Array.isArray(history) ? history.length : 0;
  diagnostics.estimatedChars = Array.isArray(history)
    ? estimateHistoryChars(history)
    : 0;

  if (!Array.isArray(history) || history.length === 0) {
    return {
      mode: "query_summary",
      reason: "story_history_empty",
      diagnostics,
    };
  }

  if (diagnostics.estimatedChars > COMPACT_HISTORY_CHAR_SOFT_LIMIT) {
    return {
      mode: "query_summary",
      reason: "story_history_too_large",
      diagnostics,
    };
  }

  const index = readConversationIndex(input.vfsSession.snapshot());
  diagnostics.hasConversationIndex = Boolean(index);
  if (!index) {
    return {
      mode: "query_summary",
      reason: "conversation_anchor_missing",
      diagnostics,
    };
  }

  return {
    mode: "session_compact",
    reason: "compact_ready",
    diagnostics,
  };
}
