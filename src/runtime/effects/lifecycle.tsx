import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { showToast } = useToast();

  const lastInitializedConfigRef = useRef<string>("");

  useEffect(() => {
    const initRAG = async () => {
      const embedding = state.aiSettings.embedding;
      const currentConfigKey = JSON.stringify({
        enabled: embedding?.enabled ?? false,
        runtime: embedding?.runtime ?? "local_transformers",
        providerId: embedding?.providerId ?? "",
        modelId: embedding?.modelId ?? "",
        dimensions: embedding?.dimensions ?? null,
        local: embedding?.local ?? null,
        maxRagStorageMB:
          embedding?.storage?.maxRagStorageMB ??
          embedding?.lru?.maxRagStorageMB ??
          512,
      });

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
      t(
        "runtime.embeddingEnabledIndexPrompt",
        "Embedding has been enabled! Would you like to index your existing game content for semantic search? This may take a moment.",
      ),
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
              state.vfsSession,
            );
          }


          showToast(
            t("runtime.indexedExistingDocuments", "Indexed existing documents"),
            "info",
          );
        } catch (error) {
          console.error("[RuntimeLifecycle] Failed to index existing content:", error);
          showToast(
            t(
              "runtime.failedToIndexExistingContent",
              "Failed to index existing content",
            ),
            "error",
          );
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
    t,
  ]);

  useEffect(() => {
    if (state.rag.modelMismatch) {
      const message = t("runtime.ragModelMismatchPrompt", {
        defaultValue:
          "RAG model mismatch detected. Stored: {{storedModel}}; Current: {{currentModel}}. Rebuild now?",
        storedModel: state.rag.modelMismatch.storedModel,
        currentModel: state.rag.modelMismatch.currentModel,
      });

      if (window.confirm(message)) {
        actions.rag.handleModelMismatch("rebuild");
      } else {
        const disableRAG = window.confirm(
          t(
            "runtime.disableRagPrompt",
            "Disable RAG for this session?",
          ),
        );
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
  }, [state.rag.modelMismatch, actions.rag, actions, state.aiSettings, t]);

  useEffect(() => {
    if (state.rag.storageOverflow) {
      const message = t("runtime.ragStorageOverflowPrompt", {
        defaultValue:
          "RAG storage overflow: {{currentTotal}}/{{maxTotal}}. Delete old save indexes now?",
        currentTotal: state.rag.storageOverflow.currentTotal,
        maxTotal: state.rag.storageOverflow.maxTotal,
      });
      if (window.confirm(message)) {
        actions.rag.handleStorageOverflow(
          state.rag.storageOverflow.suggestedDeletions,
        );
      }
    }
  }, [state.rag.storageOverflow, actions.rag, t]);
}
