import {
  AISettings,
  GameState,
  StorySegment,
  StorySummary,
  LanguageCode,
  ForkTree,
  LogEntry,
  GameResponse,
  TokenUsage,
} from "../types";
import type { VfsSession } from "../services/vfs/vfsSession";
import { createFork, createStateSnapshot } from "../utils/snapshotManager";
import { getRAGService } from "../services/rag";
import { deriveHistory } from "../utils/storyUtils";
import { summarizeContext } from "../services/aiService";
import { LANG_MAP } from "../utils/constants";
import {
  AtmosphereObject,
  normalizeAtmosphere,
} from "../utils/constants/atmosphere";
import { sessionManager } from "../services/ai/sessionManager";
import { writeSessionHistoryJsonl } from "../services/vfs/conversation";
import {
  getModelsForInstance,
  getProviderInstance,
} from "../services/ai/provider/registry";
import { getProviderConfig } from "../services/ai/utils";
import { resolveModelContextWindowTokens } from "../services/modelContextWindows";

const rebuildSessionIfPresent = async (
  aiSettings: AISettings,
  slotId: string,
  forkId: number,
  mode: "story" | "summary" | "cleanup",
): Promise<void> => {
  if (!aiSettings || !aiSettings.story || !aiSettings.providers) {
    return;
  }

  let providerInfo: ReturnType<typeof getProviderConfig> | null = null;
  try {
    providerInfo = getProviderConfig(aiSettings, "story");
  } catch {
    return;
  }

  if (!providerInfo) {
    return;
  }

  const targetSlotId =
    mode === "story"
      ? slotId
      : mode === "summary"
        ? `${slotId}:summary`
        : `${slotId}:cleanup`;

  const session = await sessionManager.getOrCreateSession({
    slotId: targetSlotId,
    forkId,
    providerId: providerInfo.instance.id,
    modelId: providerInfo.modelId,
    protocol: providerInfo.instance.protocol,
  });

  await sessionManager.invalidate(session.id, "manual_clear");
};

export const rebuildSessionsAfterHeavyMutation = async (
  aiSettings: AISettings,
  slotId: string,
  forkId: number,
): Promise<void> => {
  await rebuildSessionIfPresent(aiSettings, slotId, forkId, "story");
  await rebuildSessionIfPresent(aiSettings, slotId, forkId, "summary");
  await rebuildSessionIfPresent(aiSettings, slotId, forkId, "cleanup");
};

/**
 * Safely notify session manager that a summary was created.
 *
 * This is needed because summarization uses a separate session (slotId: "summary", forkId: -2).
 * After summarization, the summary session becomes "current", so we need to switch back
 * to the story session before calling onSummaryCreated.
 *
 * @param aiSettings - AI settings to get provider info
 * @param slotId - Current save slot ID
 * @param forkId - Current fork ID
 * @param summaryId - ID of the created summary
 * @returns Promise that resolves when session is cleared
 */
export const notifySessionSummaryCreated = async (
  aiSettings: AISettings,
  slotId: string,
  forkId: number,
  summaryId: string | number,
  vfsSession: VfsSession,
): Promise<void> => {
  const storyProvider = getProviderInstance(
    aiSettings,
    aiSettings.story.providerId,
  );
  if (!storyProvider) {
    console.warn(
      "[notifySessionSummaryCreated] Story provider not found, skipping session clear",
    );
    return;
  }

  // Get or create the story session to make it current
  const storySession = await sessionManager.getOrCreateSession({
    slotId,
    forkId,
    providerId: aiSettings.story.providerId,
    modelId: aiSettings.story.modelId,
    protocol: storyProvider.protocol,
  });

  // Now we can safely call onSummaryCreated
  await sessionManager.onSummaryCreated(storySession.id, String(summaryId));
  vfsSession.setActiveForkId(forkId);
  writeSessionHistoryJsonl(
    vfsSession,
    sessionManager.getHistory(storySession.id),
    {
      operation: "finish_commit",
    },
  );
  await rebuildSessionIfPresent(aiSettings, slotId, forkId, "summary");
  await rebuildSessionIfPresent(aiSettings, slotId, forkId, "cleanup");
  vfsSession.beginReadEpoch("summary_created");
};

/**
 * Helper to update provider token statistics
 */
export const updateProviderStats = (
  updateSettings: (
    s:
      | AISettings
      | Partial<AISettings>
      | ((prev: AISettings) => AISettings | Partial<AISettings>),
  ) => void,
  providerId: string,
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  },
) => {
  if (!usage || !providerId) return;

  updateSettings((currentSettings) => {
    const providerIndex = currentSettings.providers.instances.findIndex(
      (p) => p.id === providerId,
    );

    if (providerIndex === -1) return currentSettings;

    const instance = currentSettings.providers.instances[providerIndex];
    const newStats = {
      promptTokens:
        (instance.tokenStats?.promptTokens || 0) + usage.promptTokens,
      completionTokens:
        (instance.tokenStats?.completionTokens || 0) + usage.completionTokens,
      totalTokens: (instance.tokenStats?.totalTokens || 0) + usage.totalTokens,
    };

    const newInstances = [...currentSettings.providers.instances];
    newInstances[providerIndex] = {
      ...instance,
      tokenStats: newStats,
      lastModified: Date.now(),
    };

    return {
      ...currentSettings,
      providers: {
        ...currentSettings.providers,
        instances: newInstances,
      },
    };
  });
};

/**
 * Handles the logic for creating a fork if necessary.
 */
export const handleForking = (
  gameState: GameState,
  parentId: string | null,
  preventFork: boolean,
  isInit: boolean,
  aiSettings: AISettings,
  currentSlotId: string | null,
): { currentForkId: number; currentForkTree: ForkTree } => {
  console.log("[gameActionHelpers] handleForking called", {
    parentId,
    preventFork,
    isInit,
  });
  let currentForkId = gameState.forkId;
  let currentForkTree = gameState.forkTree;

  if (
    !isInit &&
    parentId &&
    parentId !== gameState.activeNodeId &&
    !preventFork
  ) {
    const forkResult = createFork(
      currentForkId,
      currentForkTree,
      parentId,
      gameState.turnNumber,
    );
    currentForkId = forkResult.newForkId;
    currentForkTree = forkResult.newForkTree;
    console.log(
      `[HandleAction] Created implicit fork ${currentForkId} from node ${parentId}`,
    );

    // Update RAG context in background
    if (aiSettings.embedding?.enabled) {
      const ragService = getRAGService();
      if (ragService && currentSlotId) {
        ragService
          .switchSave(currentSlotId, currentForkId, currentForkTree)
          .catch(console.error);
      }
    }
  }

  return { currentForkId, currentForkTree };
};

/**
 * Handles the summarization logic.
 */
export const handleSummarization = async (
  gameState: GameState,
  effectiveParentId: string | null,
  effectiveUserNodeId: string,
  action: string,
  baseSummaries: StorySummary[],
  baseIndex: number,
  isInit: boolean,
  aiSettings: AISettings,
  language: LanguageCode,
  vfsSession: VfsSession,
  slotId: string | null,
  currentForkId: number,
  forceSummarize: boolean = false,
): Promise<{
  effectiveSummaries: StorySummary[];
  lastIndex: number;
  summarySnapshot: StorySummary | undefined;
  contextNodes: StorySegment[];
  logs?: LogEntry[];
  error?: string;
}> => {
  const DEFAULT_CONTEXT_LENGTH_FALLBACK_TOKENS = 32000;

  const committedContextNodes = deriveHistory(
    gameState.nodes,
    effectiveParentId,
  );
  let contextNodes = [...committedContextNodes];

  // Create temp user node for context calculation (only if not forced or if we have an action)
  if (!isInit && action) {
    const tempUserNode: StorySegment = {
      segmentIdx:
        (gameState.nodes[effectiveParentId || ""]?.segmentIdx ?? -1) + 1,
      id: effectiveUserNodeId,
      parentId: effectiveParentId,
      text: action,
      choices: [],
      imagePrompt: "",
      role: "user",
      timestamp: Date.now(),
      summaries: baseSummaries,
      summarizedIndex: baseIndex,
      ending: "continue",
    };
    contextNodes.push(tempUserNode);
  }

  // Determine Trigger Condition
  let effectiveSummaries = [...baseSummaries];
  let lastIndex = baseIndex;
  let summarySnapshot: StorySummary | undefined;
  let logs: LogEntry[] = [];

  const committedLength = committedContextNodes.length;

  let shouldSummarize = forceSummarize;
  const autoCompactEnabled = aiSettings.extra?.autoCompactEnabled ?? true;
  const autoCompactThreshold = aiSettings.extra?.autoCompactThreshold ?? 0.7;

  const resolveContextLengthTokens = async (): Promise<number | null> => {
    const startedAt = Date.now();

    const storyProvider = getProviderInstance(
      aiSettings,
      aiSettings.story.providerId,
    );
    if (!storyProvider) {
      console.debug("[Summarization] Context length resolved", {
        source: "fallback.noProvider",
        value: DEFAULT_CONTEXT_LENGTH_FALLBACK_TOKENS,
        elapsedMs: Date.now() - startedAt,
      });
      return DEFAULT_CONTEXT_LENGTH_FALLBACK_TOKENS;
    }

    try {
      const models = await getModelsForInstance(storyProvider);
      const modelInfo = models.find((m) => m.id === aiSettings.story.modelId);
      const resolution = resolveModelContextWindowTokens({
        settings: aiSettings,
        providerId: aiSettings.story.providerId,
        providerProtocol: storyProvider.protocol,
        modelId: aiSettings.story.modelId,
        providerReportedContextLength: modelInfo?.contextLength,
        fallback: DEFAULT_CONTEXT_LENGTH_FALLBACK_TOKENS,
      });
      console.debug("[Summarization] Context length resolved", {
        source: resolution.source,
        value: resolution.value,
        providerId: storyProvider.id,
        modelId: aiSettings.story.modelId,
        elapsedMs: Date.now() - startedAt,
      });
      return resolution.value;
    } catch (error) {
      console.warn(
        "[Summarization] Failed to resolve model context length",
        error,
      );
      const resolution = resolveModelContextWindowTokens({
        settings: aiSettings,
        providerId: aiSettings.story.providerId,
        providerProtocol: storyProvider.protocol,
        modelId: aiSettings.story.modelId,
        fallback: DEFAULT_CONTEXT_LENGTH_FALLBACK_TOKENS,
      });
      console.debug("[Summarization] Context length resolved", {
        source: resolution.source,
        value: resolution.value,
        providerId: storyProvider.id,
        modelId: aiSettings.story.modelId,
        elapsedMs: Date.now() - startedAt,
      });
      return resolution.value;
    }
  };

  // Token-Usage Trigger: use last promptTokens from previous model response
  // (provider-reported or retry-layer estimation fallback), divided by model context length.
  if (!shouldSummarize && autoCompactEnabled) {
    const parentNode =
      effectiveParentId && gameState.nodes[effectiveParentId]
        ? gameState.nodes[effectiveParentId]
        : null;
    const parentUsage =
      parentNode?.role === "model" ? parentNode.usage : undefined;
    const lastPromptTokens =
      typeof parentUsage?.promptTokens === "number" &&
      parentUsage.promptTokens > 0
        ? parentUsage.promptTokens
        : undefined;

    if (typeof lastPromptTokens === "number" && lastPromptTokens > 0) {
      const contextLengthTokens = await resolveContextLengthTokens();
      if (contextLengthTokens && contextLengthTokens > 0) {
        const ratio = lastPromptTokens / contextLengthTokens;
        if (ratio >= autoCompactThreshold) {
          console.log(
            `[Summarization] Token threshold triggered: promptTokens=${lastPromptTokens}, contextLength=${contextLengthTokens}, ratio=${ratio.toFixed(
              3,
            )} >= ${autoCompactThreshold}`,
          );
          shouldSummarize = true;
        }
      }
    }
  }

  if (shouldSummarize) {
    const hasCommittedRange = committedLength > baseIndex;

    if (hasCommittedRange) {
      const nodeRange = {
        fromIndex: baseIndex,
        toIndex: committedLength - 1,
      };

      const pendingPlayerAction =
        !isInit && typeof action === "string" && action.trim().length > 0
          ? { segmentIdx: committedLength, text: action }
          : null;

      const sumResult = await summarizeContext({
        vfsSession,
        slotId: slotId || "default",
        forkId: currentForkId,
        baseSummaries,
        baseIndex,
        nodeRange,
        language: LANG_MAP[language],
        settings: aiSettings,
        pendingPlayerAction,
        mode: forceSummarize ? "session_compact" : "auto",
      });

      if (sumResult.summary) {
        effectiveSummaries.push(sumResult.summary);
        summarySnapshot = sumResult.summary;
      }

      lastIndex = committedLength;
      logs = sumResult.logs;

      if (sumResult.error) {
        return {
          effectiveSummaries,
          lastIndex: baseIndex,
          summarySnapshot: undefined,
          contextNodes,
          logs: sumResult.logs,
          error: sumResult.error,
        };
      }
    } else {
      lastIndex = Math.max(baseIndex, committedLength);
    }
  } else {
    // Ensure lastIndex is at least baseIndex to prevent regression
    lastIndex = Math.max(lastIndex, baseIndex);
  }

  return {
    effectiveSummaries,
    lastIndex,
    summarySnapshot,
    contextNodes,
    logs,
  };
};

/**
 * Creates the model node and resolves the atmosphere.
 */
export const createModelNode = (
  response: Omit<GameResponse, "choices"> & {
    choices?: unknown[];
    imagePrompt?: string;
  },
  gameState: GameState,
  effectiveUserNodeId: string,
  isInit: boolean,
  effectiveSummaries: StorySummary[],
  lastIndex: number,
  summarySnapshot: StorySummary | undefined,
  usage: TokenUsage,
  newSegmentId: string,
  forceTheme?: string,
  options?: {
    finalState?: GameState;
    modelNodeId?: string;
  },
): {
  modelNode: StorySegment;
  responseAtmosphere: AtmosphereObject;
  modelNodeId: string;
} => {
  const modelNodeId = options?.modelNodeId ?? `model-${newSegmentId}`;
  const finalState = options?.finalState ?? response.finalState;
  if (!finalState) {
    throw new Error("Missing final state for model node snapshot.");
  }

  // Sanitize choices to ensure valid structure
  const normalizedChoices = Array.isArray(response.choices) ? response.choices : [];
  const sanitizedChoices: StorySegment["choices"] = normalizedChoices.map(
    (choice) => {
      if (typeof choice === "string") {
        return choice;
      }
      if (typeof choice === "object" && choice !== null) {
        const choiceRecord = choice as Record<string, unknown>;
        const text =
          typeof choiceRecord.text === "string"
            ? choiceRecord.text
            : typeof choiceRecord.choice === "string"
              ? choiceRecord.choice
              : typeof choiceRecord.label === "string"
                ? choiceRecord.label
                : "Continue";
        return {
          text,
          consequence:
            typeof choiceRecord.consequence === "string"
              ? choiceRecord.consequence
              : undefined,
        };
      }
      return choice == null ? "Continue" : String(choice);
    },
  );

  // Resolve atmosphere from response
  let responseAtmosphere: AtmosphereObject = normalizeAtmosphere(
    response.atmosphere || gameState.atmosphere,
  );

  // Force Theme Logic: Override envTheme if forceTheme is provided
  if (forceTheme) {
    responseAtmosphere = normalizeAtmosphere({
      ...responseAtmosphere,
      envTheme: forceTheme as AtmosphereObject["envTheme"],
    });
  }

  const modelNode: StorySegment = {
    segmentIdx: (gameState.nodes[effectiveUserNodeId]?.segmentIdx ?? -1) + 1,
    id: modelNodeId,
    parentId: isInit ? null : effectiveUserNodeId,
    text: response.narrative || "...",
    choices: sanitizedChoices,
    imagePrompt: response.imagePrompt || "",
    role: "model",
    timestamp: Date.now(),
    summarySnapshot: summarySnapshot || undefined,
    usage: usage,
    summaries: effectiveSummaries,
    summarizedIndex: lastIndex,
    atmosphere: responseAtmosphere,
    narrativeTone: response.narrativeTone,
    ending: response.ending || "continue",
    forceEnd: response.forceEnd,
    stateSnapshot: createStateSnapshot(finalState, {
      summaries: effectiveSummaries,
      lastSummarizedIndex: lastIndex,
      currentLocation: finalState.currentLocation,
      time: finalState.time,
      atmosphere: responseAtmosphere,
      veoScript: gameState.veoScript,
      uiState: gameState.uiState,
    }),
  };

  return { modelNode, responseAtmosphere, modelNodeId };
};
