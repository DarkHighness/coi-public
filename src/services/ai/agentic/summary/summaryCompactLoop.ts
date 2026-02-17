/**
 * Session Compact Summary Loop
 *
 * Wrapper for session-history compaction mode.
 */

import type { UnifiedMessage } from "../../../../types";

import { sessionManager } from "../../sessionManager";
import { getProviderConfig } from "../../utils";
import { createUserMessage, fromGeminiFormat } from "../../../messageTypes";
import { canonicalizeLanguage } from "../../../prompts/languageCanonical";

import type { SummaryAgenticLoopResult, SummaryLoopInput } from "./summary";
import { runSummaryLoopCore } from "./summaryLoopCore";
export {
  buildCompactModeTriggerMessage,
  buildCompactSummaryConsistencyAnchor,
} from "./summaryPromptTemplates";
import {
  buildCompactModeTriggerMessage,
  buildCompactSummaryConsistencyAnchor,
} from "./summaryPromptTemplates";

const isUnifiedMessage = (value: unknown): value is UnifiedMessage =>
  !!value &&
  typeof value === "object" &&
  typeof (value as { role?: unknown }).role === "string" &&
  Array.isArray((value as { content?: unknown }).content);

export async function runCompactSummaryLoop(
  input: SummaryLoopInput,
): Promise<SummaryAgenticLoopResult> {
  const { settings, language } = input;
  const { code: languageCode } = canonicalizeLanguage(language);

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
      ? fromGeminiFormat(nativeHistory)
      : nativeHistory.filter(isUnifiedMessage);

  const targetLastSummarizedIndex = input.nodeRange.toIndex + 1;

  const trigger = createUserMessage(
    buildCompactModeTriggerMessage({
      language: languageCode,
      nodeRange: input.nodeRange,
      targetLastSummarizedIndex,
    }),
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
    crossForkErrorCodePrefix: "COMPACT_SUMMARY",
    runtimeFieldErrorCodePrefix: "COMPACT_SUMMARY",
    buildConsistencyAnchor: buildCompactSummaryConsistencyAnchor,
  });
}
