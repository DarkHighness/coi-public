import { useCallback, useMemo } from "react";
import type { RuntimeActions, RuntimeEngineState } from "./state";
import { ensureRagSaveContext } from "./effects/rag";
import { validateProvidersForMode } from "./effects/providerValidation";
import { runContinueGame, runLoadSlotForPlay } from "./effects/continuation";
import type { RuntimeEngineBridgeActions } from "./engineBridge";

export type RuntimeMutationScope =
  | "domain"
  | "ui"
  | "rag"
  | "async"
  | "lifecycle";

export type MarkRuntimeMutation = (
  scope: RuntimeMutationScope,
  reason?: string | null,
) => void;

interface UseRuntimeActionsParams {
  engineActions: RuntimeEngineBridgeActions;
  engineState: RuntimeEngineState;
  ragRuntime: {
    isInitialized: boolean;
    actions: RuntimeActions["rag"];
  };
  markMutation: MarkRuntimeMutation;
}

export function useRuntimeActions({
  engineActions,
  engineState,
  ragRuntime,
  markMutation,
}: UseRuntimeActionsParams): RuntimeActions {
  const updateUiState = useCallback<RuntimeActions["updateUiState"]>(
    (section, value, options) => {
      engineActions.updateUiState(section, value, options);
      markMutation("ui", options?.reason ?? `ui.${String(section)}`);
    },
    [engineActions, markMutation],
  );

  const setViewedSegmentId = useCallback<RuntimeActions["setViewedSegmentId"]>(
    (segmentId, options) => {
      engineActions.setViewedSegmentId(segmentId, options);
      markMutation("ui", options?.reason ?? "ui.viewedSegmentId");
    },
    [engineActions, markMutation],
  );

  const updateNodeMeta = useCallback<RuntimeActions["updateNodeMeta"]>(
    (nodeId, patch, options) => {
      engineActions.updateNodeMeta(nodeId, patch, options);
      markMutation("domain", options?.reason ?? `node.${nodeId}`);
    },
    [engineActions, markMutation],
  );

  const setVeoScript = useCallback<RuntimeActions["setVeoScript"]>(
    (script, options) => {
      engineActions.setVeoScript(script, options);
      markMutation("domain", options?.reason ?? "veoScript");
    },
    [engineActions, markMutation],
  );

  const toggleGodMode = useCallback<RuntimeActions["toggleGodMode"]>(
    (enable, options) => {
      engineActions.toggleGodMode(enable, options);
      markMutation("domain", options?.reason ?? "godMode");
    },
    [engineActions, markMutation],
  );

  const setUnlockMode = useCallback<RuntimeActions["setUnlockMode"]>(
    (enable, options) => {
      engineActions.setUnlockMode(enable, options);
      markMutation("domain", options?.reason ?? "unlockMode");
    },
    [engineActions, markMutation],
  );

  const applyVfsMutation = useCallback<RuntimeActions["applyVfsMutation"]>(
    (nextState, options) => {
      engineActions.applyVfsMutation(nextState, options);
      markMutation("domain", options?.reason ?? "applyVfsMutation");
    },
    [engineActions, markMutation],
  );

  const applyVfsDerivedState = useCallback<
    RuntimeActions["applyVfsDerivedState"]
  >(
    (nextState, reason) => {
      engineActions.applyVfsDerivedState(nextState, reason);
      markMutation("domain", reason ?? "applyVfsDerivedState");
    },
    [engineActions, markMutation],
  );

  const syncRagSaveContext = useCallback<RuntimeActions["syncRagSaveContext"]>(
    async (saveId, forkId, forkTree, options) => {
      const switched = await ensureRagSaveContext({
        embeddingEnabled: engineState.aiSettings.embedding?.enabled,
        ragInitialized: ragRuntime.isInitialized,
        saveId,
        forkId,
        forkTree: forkTree ?? engineState.gameState.forkTree,
        switchSave: ragRuntime.actions.switchSave,
      });

      if (switched) {
        markMutation("rag", options?.reason ?? `rag.switchSave:${saveId}`);
      }

      return switched;
    },
    [
      engineState.aiSettings.embedding?.enabled,
      engineState.gameState.forkTree,
      ragRuntime.isInitialized,
      ragRuntime.actions.switchSave,
      markMutation,
    ],
  );

  const continueGame = useCallback<RuntimeActions["continueGame"]>(
    async (callbacks) =>
      runContinueGame(
        {
          gameState: engineState.gameState,
          currentSlotId: engineState.currentSlotId,
          saveSlots: engineState.saveSlots,
          loadSlot: engineActions.loadSlot,
          resumeOutlineGeneration: engineActions.resumeOutlineGeneration,
          startNewGame: engineActions.startNewGame,
          syncRagSaveContext: (params) =>
            syncRagSaveContext(params.saveId, params.forkId, params.forkTree, {
              reason: params.reason,
            }),
        },
        callbacks,
      ),
    [
      engineActions.loadSlot,
      engineActions.resumeOutlineGeneration,
      engineActions.startNewGame,
      engineState.currentSlotId,
      engineState.gameState,
      engineState.saveSlots,
      syncRagSaveContext,
    ],
  );

  const loadSlotForPlay = useCallback<RuntimeActions["loadSlotForPlay"]>(
    async (id, callbacks) =>
      runLoadSlotForPlay(
        {
          gameState: engineState.gameState,
          loadSlot: engineActions.loadSlot,
          resumeOutlineGeneration: engineActions.resumeOutlineGeneration,
          syncRagSaveContext: (params) =>
            syncRagSaveContext(params.saveId, params.forkId, params.forkTree, {
              reason: params.reason,
            }),
        },
        id,
        callbacks,
      ),
    [
      engineActions.loadSlot,
      engineActions.resumeOutlineGeneration,
      engineState.gameState,
      syncRagSaveContext,
    ],
  );

  const validateProviders = useCallback<RuntimeActions["validateProviders"]>(
    async (mode) => validateProvidersForMode(engineState.aiSettings, mode),
    [engineState.aiSettings],
  );

  return useMemo<RuntimeActions>(
    () => ({
      ...engineActions,
      rag: ragRuntime.actions,
      updateUiState,
      setViewedSegmentId,
      updateNodeMeta,
      setVeoScript,
      toggleGodMode,
      setUnlockMode,
      applyVfsMutation,
      applyVfsDerivedState,
      syncRagSaveContext,
      continueGame,
      loadSlotForPlay,
      validateProviders,
    }),
    [
      engineActions,
      ragRuntime.actions,
      updateUiState,
      setViewedSegmentId,
      updateNodeMeta,
      setVeoScript,
      toggleGodMode,
      setUnlockMode,
      applyVfsMutation,
      applyVfsDerivedState,
      syncRagSaveContext,
      continueGame,
      loadSlotForPlay,
      validateProviders,
    ],
  );
}
