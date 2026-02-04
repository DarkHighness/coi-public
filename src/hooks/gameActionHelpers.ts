import {
  AISettings,
  GameState,
  StorySegment,
  StorySummary,
  LanguageCode,
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
import {
  getModelsForInstance,
  getProviderInstance,
} from "../services/ai/provider/registry";

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
): { currentForkId: number; currentForkTree: any } => {
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
  vfsSession: VfsSession | undefined,
  slotId: string | null,
  forceSummarize: boolean = false,
): Promise<{
  effectiveSummaries: StorySummary[];
  lastIndex: number;
  summarySnapshot: StorySummary | undefined;
  contextNodes: StorySegment[];
  logs?: any[];
  error?: string;
}> => {
  const DEFAULT_CONTEXT_LENGTH_FALLBACK_TOKENS = 32000;

  let contextNodes = deriveHistory(gameState.nodes, effectiveParentId);

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
  let logs: any[] = [];

  const totalLength = contextNodes.length;

  let shouldSummarize = forceSummarize;
  const autoCompactEnabled = aiSettings.extra?.autoCompactEnabled ?? true;
  const autoCompactThreshold = aiSettings.extra?.autoCompactThreshold ?? 0.7;

  const resolveContextLengthTokens = async (): Promise<number | null> => {
    const override = aiSettings.maxContextTokens;
    if (typeof override === "number" && Number.isFinite(override) && override > 0) {
      return override;
    }

    const storyProvider = getProviderInstance(
      aiSettings,
      aiSettings.story.providerId,
    );
    if (!storyProvider) return DEFAULT_CONTEXT_LENGTH_FALLBACK_TOKENS;

    try {
      const models = await getModelsForInstance(storyProvider);
      const modelInfo = models.find((m) => m.id === aiSettings.story.modelId);
      const ctx = modelInfo?.contextLength;
      return typeof ctx === "number" && Number.isFinite(ctx) && ctx > 0
        ? ctx
        : DEFAULT_CONTEXT_LENGTH_FALLBACK_TOKENS;
    } catch (error) {
      console.warn("[Summarization] Failed to resolve model context length", error);
      return DEFAULT_CONTEXT_LENGTH_FALLBACK_TOKENS;
    }
  };

  // Token-Usage Trigger (no estimation): use real promptTokens from previous model response,
  // divided by model context length.
  if (!shouldSummarize && autoCompactEnabled) {
    const parentNode =
      effectiveParentId && gameState.nodes[effectiveParentId]
        ? gameState.nodes[effectiveParentId]
        : null;
    const lastPromptTokens =
      parentNode?.role === "model" ? parentNode.usage?.promptTokens : undefined;

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
    // Node range being summarized
    const nodeRange = {
      fromIndex: lastIndex,
      toIndex: totalLength - 1,
    };

    // Call Summary Service with agentic loop
    if (!vfsSession) {
      return {
        effectiveSummaries,
        lastIndex: baseIndex, // RESET lastIndex so we retry next time
        summarySnapshot: undefined,
        contextNodes,
        logs: [],
        error: "VFS session is not available for summarization",
      };
    }

    const pendingPlayerAction =
      !isInit && typeof action === "string" && action.trim().length > 0
        ? { segmentIdx: nodeRange.toIndex, text: action }
        : null;

    const sumResult = await summarizeContext({
      vfsSession,
      slotId: slotId || "default",
      forkId: gameState.forkId ?? 0,
      baseSummaries,
      baseIndex,
      nodeRange,
      language: LANG_MAP[language],
      settings: aiSettings,
      pendingPlayerAction,
      mode: forceSummarize ? "session_compact" : "auto",
    });

    // Push the new summary object if successful
    if (sumResult.summary) {
      effectiveSummaries.push(sumResult.summary);
      summarySnapshot = sumResult.summary;
    }

    lastIndex = totalLength;
    logs = sumResult.logs;

    // Return error if present
    if (sumResult.error) {
      return {
        effectiveSummaries,
        lastIndex: baseIndex, // RESET lastIndex so we retry next time
        summarySnapshot: undefined,
        contextNodes,
        logs: sumResult.logs,
        error: sumResult.error,
      };
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
  response: any,
  gameState: GameState,
  effectiveUserNodeId: string,
  isInit: boolean,
  effectiveSummaries: StorySummary[],
  lastIndex: number,
  summarySnapshot: StorySummary | undefined,
  usage: any,
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
  const sanitizedChoices = Array.isArray(response.choices)
    ? response.choices.map((c: any) => {
        if (typeof c === "object" && c !== null) {
          const obj = c as any;
          return {
            text: obj.text || obj.choice || obj.label || "Continue",
            consequence: obj.consequence,
          };
        }
        return String(c);
      })
    : [];

  // Resolve atmosphere from response
  let responseAtmosphere: AtmosphereObject = normalizeAtmosphere(
    response.atmosphere || gameState.atmosphere,
  );

  // Force Theme Logic: Override envTheme if forceTheme is provided
  if (forceTheme) {
    responseAtmosphere = {
      ...responseAtmosphere,
      envTheme: forceTheme as any,
    };
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
