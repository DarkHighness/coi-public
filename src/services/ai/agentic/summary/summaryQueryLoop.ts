/**
 * Query Summary Loop
 *
 * Wrapper for VFS-query-driven summary mode.
 */

import type { UnifiedMessage } from "../../../../types";

import { sessionManager } from "../../sessionManager";
import { getProviderConfig } from "../../utils";
import { createUserMessage } from "../../../messageTypes";
import { canonicalizeLanguage } from "../../../prompts/languageCanonical";

import type { SummaryAgenticLoopResult, SummaryLoopInput } from "./summary";
import { buildSummaryInitialContext, getSummarySystemInstruction } from "./summaryContext";
import { runSummaryLoopCore } from "./summaryLoopCore";
export { buildQuerySummaryConsistencyAnchor } from "./summaryPromptTemplates";
import { buildQuerySummaryConsistencyAnchor } from "./summaryPromptTemplates";

export async function runQuerySummaryLoop(
  input: SummaryLoopInput,
): Promise<SummaryAgenticLoopResult> {
  const { settings, language } = input;
  const { code: languageCode } = canonicalizeLanguage(language);

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

  const systemInstruction = getSummarySystemInstruction(
    languageCode,
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
    crossForkErrorCodePrefix: "QUERY_SUMMARY",
    runtimeFieldErrorCodePrefix: "QUERY_SUMMARY",
    buildConsistencyAnchor: buildQuerySummaryConsistencyAnchor,
  });
}
