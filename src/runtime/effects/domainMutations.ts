import type { Dispatch, SetStateAction } from "react";
import type { GameState, StorySegment, UIState } from "../../types";

export interface DomainMutationOptions {
  reason?: string;
  persist?: boolean;
}

interface DomainMutationDeps {
  setGameState: Dispatch<SetStateAction<GameState>>;
  triggerSave: () => void;
}

export function createDomainMutationActions({
  setGameState,
  triggerSave,
}: DomainMutationDeps) {
  const maybePersistMutation = (
    persist: boolean | undefined,
    defaultPersist: boolean,
  ) => {
    if (persist ?? defaultPersist) {
      triggerSave();
    }
  };

  const updateUiState = <K extends keyof UIState>(
    section: K,
    value: UIState[K],
    options?: DomainMutationOptions,
  ) => {
    setGameState((prev) => ({
      ...prev,
      uiState: {
        ...prev.uiState,
        [section]: value,
      },
    }));
    maybePersistMutation(options?.persist, false);
  };

  const setViewedSegmentId = (
    segmentId?: string,
    options?: DomainMutationOptions,
  ) => {
    updateUiState("viewedSegmentId", segmentId, options);
  };

  const updateNodeMeta = (
    nodeId: string,
    patch: Partial<StorySegment>,
    options?: DomainMutationOptions,
  ) => {
    setGameState((prev) => {
      const node = prev.nodes[nodeId];
      if (!node) return prev;
      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [nodeId]: {
            ...node,
            ...patch,
          },
        },
      };
    });
    maybePersistMutation(options?.persist, false);
  };

  const setVeoScript = (script: string, options?: DomainMutationOptions) => {
    setGameState((prev) => ({
      ...prev,
      veoScript: script,
    }));
    maybePersistMutation(options?.persist, false);
  };

  const toggleGodMode = (
    enable: boolean,
    options?: DomainMutationOptions,
  ) => {
    setGameState((prev) => ({
      ...prev,
      godMode: enable,
    }));
    maybePersistMutation(options?.persist, true);
  };

  const setUnlockMode = (
    enable: boolean,
    options?: DomainMutationOptions,
  ) => {
    setGameState((prev) => ({
      ...prev,
      unlockMode: enable,
    }));
    maybePersistMutation(options?.persist, true);
  };

  const applyVfsMutation = (
    nextState: GameState,
    options?: DomainMutationOptions,
  ) => {
    setGameState(nextState);
    maybePersistMutation(options?.persist, true);
  };

  const applyVfsDerivedState = (nextState: GameState, _reason?: string) => {
    setGameState(nextState);
  };

  return {
    updateUiState,
    setViewedSegmentId,
    updateNodeMeta,
    setVeoScript,
    toggleGodMode,
    setUnlockMode,
    applyVfsMutation,
    applyVfsDerivedState,
  };
}
