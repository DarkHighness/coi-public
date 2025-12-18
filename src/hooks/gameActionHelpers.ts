import {
  AISettings,
  GameState,
  StorySegment,
  StorySummary,
  LanguageCode,
} from "../types";
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
import { getProviderInstance } from "../services/ai/provider/registry";

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
  forceSummarize: boolean = false,
): Promise<{
  effectiveSummaries: StorySummary[];
  lastIndex: number;
  summarySnapshot: StorySummary | undefined;
  contextNodes: StorySegment[];
  logs?: any[];
  error?: string;
}> => {
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
  const turnLimit = aiSettings.contextLen || 10;

  const nodesToSummarizeCount = totalLength - lastIndex;

  // Turn-Based Trigger
  if (!shouldSummarize && nodesToSummarizeCount >= turnLimit) {
    console.log(
      `[Summarization] Turn limit triggered: ${nodesToSummarizeCount} >= ${turnLimit}`,
    );
    shouldSummarize = true;
  }

  if (shouldSummarize) {
    const toSummarize = contextNodes.slice(lastIndex, totalLength);

    // Get previous summary (null if none exists)
    const lastSummary =
      effectiveSummaries.length > 0
        ? effectiveSummaries[effectiveSummaries.length - 1]
        : null;

    // Node range being summarized
    const nodeRange = {
      fromIndex: lastIndex,
      toIndex: totalLength - 1,
    };

    // Call Summary Service with agentic loop
    const sumResult = await summarizeContext(
      lastSummary,
      toSummarize,
      nodeRange,
      LANG_MAP[language],
      aiSettings,
      gameState,
    );

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
): {
  modelNode: StorySegment;
  responseAtmosphere: AtmosphereObject;
  modelNodeId: string;
} => {
  const modelNodeId = `model-${newSegmentId}`;
  const finalState = response.finalState;

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
