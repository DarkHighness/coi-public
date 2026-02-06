import { useEffect, useRef } from "react";
import { useToast } from "../../contexts/ToastContext";
import type { RuntimeActions, RuntimeState } from "../state";

interface RuntimeLifecycleParams {
  state: RuntimeState;
  actions: RuntimeActions;
}

export function useRuntimeLifecycleEffects({
  state,
  actions,
}: RuntimeLifecycleParams) {
  const { showToast } = useToast();

  const lastInitializedConfigRef = useRef<string>("");

  useEffect(() => {
    const initRAG = async () => {
      const currentConfigKey = `${state.aiSettings.embedding?.providerId}:${state.aiSettings.embedding?.modelId}:${state.aiSettings.embedding?.dimensions}`;

      const shouldInit =
        state.aiSettings.embedding?.enabled &&
        (!state.rag.isInitialized ||
          lastInitializedConfigRef.current !== currentConfigKey) &&
        !state.rag.isLoading;

      if (shouldInit) {
        const success = await actions.rag.initialize(state.aiSettings);
        if (success) {
          lastInitializedConfigRef.current = currentConfigKey;
        }
      } else if (
        !state.aiSettings.embedding?.enabled &&
        state.rag.isInitialized
      ) {
        actions.rag.terminate();
        lastInitializedConfigRef.current = "";
      }
    };

    initRAG();
  }, [
    state.aiSettings,
    state.rag.isInitialized,
    state.rag.isLoading,
    actions.rag,
  ]);

  const prevEmbeddingEnabledRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    const wasDisabled = prevEmbeddingEnabledRef.current === false;
    const nowEnabled = state.aiSettings.embedding?.enabled === true;

    prevEmbeddingEnabledRef.current = state.aiSettings.embedding?.enabled;

    if (!wasDisabled || !nowEnabled) return;

    const hasExistingGame =
      state.gameState.outline !== null && state.currentSlotId !== null;
    const hasStoryContent = Object.keys(state.gameState.nodes).length > 0;

    if (!hasExistingGame && !hasStoryContent) return;
    if (!state.rag.isInitialized) return;

    const shouldIndex = window.confirm(
      "Embedding has been enabled! Would you like to index your existing game content for semantic search? This may take a moment.",
    );

    if (shouldIndex && state.currentSlotId) {
      const indexExistingContent = async () => {
        try {
          await actions.rag.switchSave(
            state.currentSlotId!,
            state.gameState.forkId || 0,
            state.gameState.forkTree,
          );

          if (actions.rag.indexInitialEntities) {
            await actions.rag.indexInitialEntities(
              state.gameState,
              state.currentSlotId!,
            );
          }

          const storyNodeIds = Object.keys(state.gameState.nodes)
            .slice(-50)
            .map((id) => `story:${id}`);

          if (storyNodeIds.length > 0) {
            await actions.rag.updateDocuments(state.gameState, storyNodeIds);
          }

          showToast("Indexed existing documents", "info");
        } catch (error) {
          console.error("[RuntimeLifecycle] Failed to index existing content:", error);
          showToast("Failed to index existing content", "error");
        }
      };

      indexExistingContent();
    }
  }, [
    state.aiSettings.embedding?.enabled,
    state.rag.isInitialized,
    state.gameState,
    state.currentSlotId,
    actions.rag,
    showToast,
  ]);

  useEffect(() => {
    if (state.rag.modelMismatch) {
      const message = `RAG model mismatch detected. Stored: ${state.rag.modelMismatch.storedModel}; Current: ${state.rag.modelMismatch.currentModel}. Rebuild now?`;

      if (window.confirm(message)) {
        actions.rag.handleModelMismatch("rebuild");
      } else {
        const disableRAG = window.confirm("Disable RAG for this session?");
        if (disableRAG) {
          actions.rag.handleModelMismatch("disable");
          actions.handleSaveSettings({
            ...state.aiSettings,
            embedding: { ...state.aiSettings.embedding, enabled: false },
          });
        } else {
          actions.rag.handleModelMismatch("continue");
        }
      }
    }
  }, [state.rag.modelMismatch, actions.rag, actions, state.aiSettings]);

  useEffect(() => {
    if (state.rag.storageOverflow) {
      const message = `RAG storage overflow: ${state.rag.storageOverflow.currentTotal}/${state.rag.storageOverflow.maxTotal}. Delete old save indexes now?`;
      if (window.confirm(message)) {
        actions.rag.handleStorageOverflow(
          state.rag.storageOverflow.suggestedDeletions,
        );
      }
    }
  }, [state.rag.storageOverflow, actions.rag]);
}
