import type { OutlinePhaseProgress } from "../../services/aiService";
import type { ForkTree, GameState, SavePresetProfile, SaveSlot } from "../../types";
import type { RuntimeContinueResult, RuntimeLoadSlotResult } from "../state";

export interface ContinuationCallbacks {
  onStream?: (text: string) => void;
  onPhaseProgress?: (progress: OutlinePhaseProgress) => void;
}

interface LoadSlotResult {
  success: boolean;
  hasOutline?: boolean;
  hasOutlineConversation?: boolean;
  forkId?: number;
  forkTree?: ForkTree;
}

interface ContinueGameDeps {
  gameState: GameState;
  currentSlotId: string | null;
  saveSlots: SaveSlot[];
  loadSlot: (id: string) => Promise<LoadSlotResult>;
  resumeOutlineGeneration: (
    onStream?: (text: string) => void,
    onPhaseProgress?: (progress: OutlinePhaseProgress) => void,
  ) => Promise<void>;
  startNewGame: (
    theme: string,
    customContext?: string,
    onStream?: (text: string) => void,
    onPhaseProgress?: (progress: OutlinePhaseProgress) => void,
    existingSlotId?: string,
    seedImage?: Blob,
    protagonistFeature?: string,
    presetProfile?: SavePresetProfile,
  ) => Promise<void>;
  syncRagSaveContext: (params: {
    saveId: string;
    forkId: number;
    forkTree?: ForkTree;
    reason: string;
  }) => Promise<boolean>;
}

interface LoadSlotForPlayDeps {
  gameState: GameState;
  loadSlot: (id: string) => Promise<LoadSlotResult>;
  resumeOutlineGeneration: (
    onStream?: (text: string) => void,
    onPhaseProgress?: (progress: OutlinePhaseProgress) => void,
  ) => Promise<void>;
  syncRagSaveContext: (params: {
    saveId: string;
    forkId: number;
    forkTree?: ForkTree;
    reason: string;
  }) => Promise<boolean>;
}

function resolveForkTree(
  gameState: GameState,
  loadedForkTree?: ForkTree,
): ForkTree | undefined {
  return loadedForkTree || gameState.forkTree;
}

async function resolveLoadedSlotState(
  result: LoadSlotResult,
  callbacks: ContinuationCallbacks | undefined,
  deps: Pick<LoadSlotForPlayDeps, "gameState" | "resumeOutlineGeneration" | "syncRagSaveContext">,
  slotId: string,
  reason: string,
): Promise<RuntimeLoadSlotResult> {
  if (result.hasOutline) {
    await deps.syncRagSaveContext({
      saveId: slotId,
      forkId: result.forkId || 0,
      forkTree: resolveForkTree(deps.gameState, result.forkTree),
      reason,
    });
    return "navigated-game";
  }

  if (result.hasOutlineConversation) {
    await deps.resumeOutlineGeneration(
      callbacks?.onStream,
      callbacks?.onPhaseProgress,
    );
    return "resumed-outline";
  }

  return "invalid-state";
}

export async function runContinueGame(
  deps: ContinueGameDeps,
  callbacks?: ContinuationCallbacks,
): Promise<RuntimeContinueResult> {
  if (deps.currentSlotId) {
    if (deps.gameState.outline) {
      await deps.syncRagSaveContext({
        saveId: deps.currentSlotId,
        forkId: deps.gameState.forkId || 0,
        forkTree: deps.gameState.forkTree,
        reason: "runtime.continue.current",
      });
      return "navigated-game";
    }

    if (deps.gameState.outlineConversation) {
      await deps.resumeOutlineGeneration(
        callbacks?.onStream,
        callbacks?.onPhaseProgress,
      );
      return "resumed-outline";
    }

    if (deps.gameState.theme) {
      await deps.startNewGame(
        deps.gameState.theme,
        deps.gameState.customContext,
        callbacks?.onStream,
        callbacks?.onPhaseProgress,
        deps.currentSlotId,
        undefined,
        undefined,
        deps.gameState.presetProfile,
      );
      return "started-outline";
    }

    return "invalid-state";
  }

  if (deps.saveSlots.length === 0) {
    return "no-save";
  }

  const mostRecent = [...deps.saveSlots].sort((a, b) => b.timestamp - a.timestamp)[0];
  const loadResult = await deps.loadSlot(mostRecent.id);

  if (!loadResult.success) {
    return "load-failed";
  }

  return resolveLoadedSlotState(
    loadResult,
    callbacks,
    {
      gameState: deps.gameState,
      resumeOutlineGeneration: deps.resumeOutlineGeneration,
      syncRagSaveContext: deps.syncRagSaveContext,
    },
    mostRecent.id,
    "runtime.continue.loaded",
  );
}

export async function runLoadSlotForPlay(
  deps: LoadSlotForPlayDeps,
  id: string,
  callbacks?: ContinuationCallbacks,
): Promise<RuntimeLoadSlotResult> {
  const loadResult = await deps.loadSlot(id);

  if (!loadResult.success) {
    return "load-failed";
  }

  return resolveLoadedSlotState(
    loadResult,
    callbacks,
    deps,
    id,
    "runtime.loadSlot",
  );
}
