import type { GameState, StorySegment } from "../types";
import { deriveHistory } from "../utils/storyUtils";

const mergeNodeExtras = (
  base: StorySegment | undefined,
  derived: StorySegment,
): StorySegment => {
  if (!base) {
    return derived;
  }

  return {
    ...derived,
    imagePrompt: derived.imagePrompt || base.imagePrompt,
    imageUrl: derived.imageUrl || base.imageUrl,
    imageId: derived.imageId || base.imageId,
    veoScript: derived.veoScript || base.veoScript,
    audioKey: derived.audioKey || base.audioKey,
    summarySnapshot: derived.summarySnapshot ?? base.summarySnapshot,
    usage: derived.usage ?? base.usage,
    summaries: derived.summaries ?? base.summaries,
    summarizedIndex: derived.summarizedIndex ?? base.summarizedIndex,
    stateSnapshot: derived.stateSnapshot ?? base.stateSnapshot,
  };
};

const mergeNodes = (
  baseNodes: Record<string, StorySegment>,
  derivedNodes: Record<string, StorySegment>,
): Record<string, StorySegment> => {
  const merged: Record<string, StorySegment> = {};
  for (const [id, node] of Object.entries(derivedNodes)) {
    merged[id] = mergeNodeExtras(baseNodes[id], node);
  }
  return merged;
};

export const mergeDerivedViewState = (
  base: GameState,
  derived: GameState,
): GameState => {
  const mergedNodes = mergeNodes(base.nodes, derived.nodes);
  const activeNodeId = derived.activeNodeId;

  return {
    ...derived,
    nodes: mergedNodes,
    currentFork: activeNodeId ? deriveHistory(mergedNodes, activeNodeId) : [],
    uiState: base.uiState,
    summaries: base.summaries,
    lastSummarizedIndex: base.lastSummarizedIndex,
    outline: base.outline,
    outlineConversation: base.outlineConversation,
    themeConfig: base.themeConfig,
    customContext: base.customContext,
    language: base.language,
    customRules: base.customRules,
    notes: base.notes,
    playerProfile: base.playerProfile,
    narrativeScale: base.narrativeScale,
    seedImageId: base.seedImageId,
    initialPrompt: base.initialPrompt,
    veoScript: base.veoScript,
    tokenUsage: base.tokenUsage,
    logs: base.logs,
    isProcessing: base.isProcessing,
    isImageGenerating: base.isImageGenerating,
    generatingNodeId: base.generatingNodeId,
    error: base.error,
    godMode: base.godMode,
    unlockMode: base.unlockMode,
  };
};
