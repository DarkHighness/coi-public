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

function applyUnlockAllState(prev: GameState): GameState {
  const newState = { ...prev };

  newState.inventory = prev.inventory.map((item) => ({
    ...item,
    unlocked: true,
    highlight: true,
  }));

  newState.npcs = prev.npcs.map((relation) => ({
    ...relation,
    unlocked: true,
    highlight: true,
  }));

  newState.locations = prev.locations.map((location) => ({
    ...location,
    unlocked: true,
    highlight: true,
  }));

  newState.quests = prev.quests.map((quest) => ({
    ...quest,
    unlocked: true,
    highlight: true,
  }));

  newState.knowledge = prev.knowledge.map((entry) => ({
    ...entry,
    unlocked: true,
    highlight: true,
  }));

  newState.factions = prev.factions.map((faction) => ({
    ...faction,
    unlocked: true,
    highlight: true,
  }));

  if (newState.character?.hiddenTraits) {
    newState.character = {
      ...newState.character,
      hiddenTraits: newState.character.hiddenTraits.map((trait) => ({
        ...trait,
        unlocked: true,
      })),
    };
  }

  newState.unlockMode = true;
  return newState;
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

  const unlockAll = (options?: DomainMutationOptions) => {
    setGameState((prev) => applyUnlockAllState(prev));
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
    unlockAll,
    applyVfsMutation,
    applyVfsDerivedState,
  };
}
