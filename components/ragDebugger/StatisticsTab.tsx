import React, { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getRAGService } from "../../services/rag";
import type { StatisticsTabProps, IndexStats } from "./types";

export const StatisticsTab: React.FC<StatisticsTabProps> = ({
  gameState,
  aiSettings,
}) => {
  const { t } = useTranslation();
  const [indexStats, setIndexStats] = useState<IndexStats | null>(null);
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const embeddingEnabled = aiSettings?.embedding?.enabled ?? false;

  const loadIndexStats = useCallback(async () => {
    const ragService = getRAGService();
    if (!ragService) {
      setIndexStats(null);
      return;
    }

    try {
      const status = await ragService.getStatus();
      setIndexStats({
        documentCount: status.storageDocuments + status.memoryDocuments,
        modelId: status.currentModel,
        provider: status.currentProvider,
        isInitialized: status.initialized,
        currentSaveId: status.currentSaveId,
        storageDocuments: status.storageDocuments,
        memoryDocuments: status.memoryDocuments,
      });
    } catch (err) {
      console.error("[RAGDebugger] Failed to load stats:", err);
      setIndexStats(null);
    }
  }, []);

  const handleRebuildIndex = useCallback(async () => {
    if (!gameState || !aiSettings) return;

    setIsRebuildingIndex(true);
    setError(null);

    try {
      const ragService = getRAGService();
      if (ragService) {
        await ragService.rebuildForModel();

        const { extractDocumentsFromState } = await import(
          "../../hooks/useRAG"
        );
        const entityIds: string[] = [];

        if (gameState.outline) {
          entityIds.push(
            "outline:full",
            "outline:world",
            "outline:goal",
            "outline:premise",
            "outline:character",
          );
        }

        gameState.inventory?.forEach((item) => entityIds.push(item.id));
        gameState.relationships?.forEach((npc) => entityIds.push(npc.id));
        gameState.locations?.forEach((loc) => entityIds.push(loc.id));
        gameState.quests?.forEach((quest) => entityIds.push(quest.id));
        gameState.knowledge?.forEach((know) => entityIds.push(know.id));
        gameState.timeline?.forEach((event) => entityIds.push(event.id));

        const storyNodeIds = Object.keys(gameState.nodes)
          .slice(-50)
          .map((id) => `story:${id}`);
        entityIds.push(...storyNodeIds);

        const documents = extractDocumentsFromState(gameState, entityIds);

        if (documents.length > 0) {
          await ragService.addDocuments(
            documents.map((doc) => ({
              ...doc,
              saveId: indexStats?.currentSaveId || "unknown",
              forkId: gameState.forkId || 0,
              turnNumber: gameState.turnNumber || 0,
            })),
          );
        }

        loadIndexStats();
      }
    } catch (err: unknown) {
      console.error("Failed to rebuild index:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(
        t("ragDebugger.rebuildFailed", "Failed to rebuild index") +
          ": " +
          errorMessage,
      );
    } finally {
      setIsRebuildingIndex(false);
    }
  }, [gameState, aiSettings, indexStats, loadIndexStats, t]);

  useEffect(() => {
    loadIndexStats();
  }, [loadIndexStats]);

  if (!embeddingEnabled) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center text-theme-muted py-8">
          <p>
            {t("ragDebugger.embeddingDisabled", "RAG/Embedding is disabled")}
          </p>
        </div>
      </div>
    );
  }

  if (!indexStats) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center text-theme-muted py-8">
          <p>
            {t("ragDebugger.noIndexStats", "No index statistics available")}
          </p>
          {gameState && (
            <button
              onClick={handleRebuildIndex}
              disabled={isRebuildingIndex}
              className="mt-4 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-bg rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              {isRebuildingIndex
                ? t("ragDebugger.building", "Building...")
                : t("ragDebugger.buildNow", "Build Index Now")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-theme-surface-highlight/50 border border-theme-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-theme-primary">
              {indexStats.documentCount}
            </div>
            <div className="text-xs text-theme-muted uppercase tracking-wider mt-1">
              {t("ragDebugger.totalDocs", "Total Documents")}
            </div>
          </div>
          <div className="bg-theme-surface-highlight/50 border border-theme-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-theme-primary">
              {indexStats.storageDocuments}
            </div>
            <div className="text-xs text-theme-muted uppercase tracking-wider mt-1">
              {t("ragDebugger.storageDocs", "Storage")}
            </div>
          </div>
          <div className="bg-theme-surface-highlight/50 border border-theme-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-theme-primary">
              {indexStats.memoryDocuments}
            </div>
            <div className="text-xs text-theme-muted uppercase tracking-wider mt-1">
              {t("ragDebugger.memoryDocs", "Memory")}
            </div>
          </div>
          <div className="bg-theme-surface-highlight/50 border border-theme-border rounded-lg p-4 text-center">
            <div
              className="text-sm font-bold text-theme-primary truncate"
              title={indexStats.modelId}
            >
              {indexStats.modelId.split("/").pop() || indexStats.modelId}
            </div>
            <div className="text-xs text-theme-muted uppercase tracking-wider mt-1">
              {t("ragDebugger.model", "Embedding Model")}
            </div>
          </div>
        </div>

        {/* Provider Info */}
        <div className="bg-theme-surface-highlight/50 border border-theme-border rounded-lg p-4">
          <h3 className="text-sm font-bold text-theme-text mb-3 uppercase tracking-wider">
            {t("ragDebugger.providerInfo", "Provider Information")}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-theme-muted">
                {t("ragDebugger.provider", "Provider")}:
              </span>
              <span className="ml-2 text-theme-text font-mono">
                {indexStats.provider}
              </span>
            </div>
            <div>
              <span className="text-theme-muted">
                {t("ragDebugger.saveId", "Save ID")}:
              </span>
              <span className="ml-2 text-theme-text font-mono">
                {indexStats.currentSaveId || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-theme-muted">
                {t("ragDebugger.initialized", "Initialized")}:
              </span>
              <span
                className={`ml-2 font-mono ${indexStats.isInitialized ? "text-green-400" : "text-red-400"}`}
              >
                {indexStats.isInitialized ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <button
            onClick={loadIndexStats}
            className="px-4 py-2 border border-theme-border hover:border-theme-primary text-theme-text rounded-lg transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t("ragDebugger.refresh", "Refresh Stats")}
          </button>
          {gameState && (
            <button
              onClick={handleRebuildIndex}
              disabled={isRebuildingIndex}
              className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-bg rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isRebuildingIndex ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t("ragDebugger.rebuilding", "Rebuilding...")}
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {t("ragDebugger.rebuildIndex", "Rebuild Index")}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
