import type { GameState, StorySegment } from "../types";
import { deriveHistory } from "../utils/storyUtils";

const PLACEHOLDER_CHARACTER_VALUES = new Set([
  "",
  "loading...",
  "initializing...",
  "pending",
  "unknown",
  "加载中",
  "初始化中",
  "未知",
  "待定",
]);

const normalizeCharacterValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const isPlaceholderCharacterValue = (value: unknown): boolean => {
  const normalized = normalizeCharacterValue(value);
  if (!normalized) {
    return true;
  }
  return PLACEHOLDER_CHARACTER_VALUES.has(normalized.toLowerCase());
};

const mergeCharacterWithFallback = (
  baseCharacter: GameState["character"],
  derivedCharacter: GameState["character"],
): GameState["character"] => {
  const nextCharacter = {
    ...derivedCharacter,
  } as GameState["character"];

  const fallbackFields: Array<
    "title" | "profession" | "race" | "age" | "status" | "currentLocation"
  > = ["title", "profession", "race", "age", "status", "currentLocation"];

  for (const field of fallbackFields) {
    const derivedValue = (derivedCharacter as any)?.[field];
    const baseValue = (baseCharacter as any)?.[field];
    if (
      isPlaceholderCharacterValue(derivedValue) &&
      !isPlaceholderCharacterValue(baseValue)
    ) {
      (nextCharacter as any)[field] = baseValue;
    }
  }

  return nextCharacter;
};

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
    playerRate: derived.playerRate ?? base.playerRate,
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
  options?: { resetRuntime?: boolean },
): GameState => {
  const mergedNodes = mergeNodes(base.nodes, derived.nodes);
  const activeNodeId = derived.activeNodeId;
  const resetRuntime = options?.resetRuntime === true;

  return {
    ...derived,
    nodes: mergedNodes,
    currentFork: activeNodeId ? deriveHistory(mergedNodes, activeNodeId) : [],
    character: mergeCharacterWithFallback(base.character, derived.character),
    uiState: base.uiState,
    summaries: derived.summaries,
    lastSummarizedIndex: derived.lastSummarizedIndex,
    outline: derived.outline ?? base.outline,
    outlineConversation:
      derived.outlineConversation ?? base.outlineConversation,
    themeConfig: derived.themeConfig ?? base.themeConfig,
    customContext: derived.customContext ?? base.customContext,
    language: derived.language || base.language,
    customRules: derived.customRules,
    playerProfile: derived.playerProfile ?? base.playerProfile,
    narrativeScale: derived.narrativeScale ?? base.narrativeScale,
    seedImageId: derived.seedImageId ?? base.seedImageId,
    initialPrompt: derived.initialPrompt ?? base.initialPrompt,
    veoScript: derived.veoScript ?? base.veoScript,
    tokenUsage: base.tokenUsage,
    logs: base.logs,
    isProcessing: resetRuntime ? false : base.isProcessing,
    isImageGenerating: resetRuntime ? false : base.isImageGenerating,
    generatingNodeId: resetRuntime ? null : base.generatingNodeId,
    error: resetRuntime ? null : base.error,
    godMode: base.godMode,
    unlockMode: base.unlockMode,
  };
};
