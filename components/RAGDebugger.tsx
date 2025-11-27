import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  getEmbeddingManager,
  initializeEmbeddingManager,
  isWebGPUAvailable,
} from "../services/embedding";
import { EmbeddingDocument, GameState, AISettings } from "../types";

interface RAGDebuggerProps {
  isOpen: boolean;
  onClose: () => void;
  themeFont: string;
  gameState?: GameState;
  aiSettings?: AISettings;
}

interface SearchResult {
  doc: EmbeddingDocument;
  score: number;
}

interface IndexStats {
  documentCount: number;
  modelId: string;
  typeBreakdown: Record<string, number>;
  hasEmbeddings: boolean;
  isWebGPUEnabled: boolean;
}

export const RAGDebugger: React.FC<RAGDebuggerProps> = ({
  isOpen,
  onClose,
  themeFont,
  gameState,
  aiSettings,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indexStats, setIndexStats] = useState<IndexStats | null>(null);
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "stats">("search");

  // Fork/Turn filtering options
  const [currentForkOnly, setCurrentForkOnly] = useState(false);
  const [beforeCurrentTurn, setBeforeCurrentTurn] = useState(false);

  // Load index stats
  const loadIndexStats = useCallback(async () => {
    const embeddingManager = getEmbeddingManager();
    if (!embeddingManager) {
      setIndexStats(null);
      return;
    }

    const index = embeddingManager.getIndex();
    if (!index) {
      setIndexStats(null);
      return;
    }

    // Calculate type breakdown
    const typeBreakdown: Record<string, number> = {};
    for (const doc of index.documents) {
      typeBreakdown[doc.type] = (typeBreakdown[doc.type] || 0) + 1;
    }

    // Check WebGPU availability asynchronously
    const webgpuEnabled = await isWebGPUAvailable();

    setIndexStats({
      documentCount: index.documents.length,
      modelId: index.modelId,
      typeBreakdown,
      hasEmbeddings: index.documents.some(
        (d) => d.embedding && d.embedding.length > 0,
      ),
      isWebGPUEnabled: webgpuEnabled,
    });
  }, []);

  // Reset state and load stats when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setError(null);
      loadIndexStats();
    }
  }, [isOpen, loadIndexStats]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setResults([]);
    setError(null);

    try {
      const embeddingManager = getEmbeddingManager();
      if (!embeddingManager) {
        setError(
          t(
            "ragDebugger.noEmbeddingManager",
            "Embedding manager not initialized",
          ),
        );
        setIsSearching(false);
        return;
      }

      if (!embeddingManager.hasIndex()) {
        setError(t("ragDebugger.noIndex", "No embedding index available"));
        setIsSearching(false);
        return;
      }

      // Build search options with fork/turn filtering
      const searchOptions: any = { topK: 10 };

      if (currentForkOnly && gameState) {
        searchOptions.currentForkOnly = true;
        searchOptions.forkId = gameState.forkId;
        searchOptions.forkTree = gameState.forkTree;
      }

      if (beforeCurrentTurn && gameState) {
        searchOptions.beforeCurrentTurn = true;
        searchOptions.currentTurn = gameState.turnNumber;
      }

      const response = await embeddingManager.retrieveContext(
        query,
        searchOptions,
      );

      if (response && (response as any).relevantDocs) {
        setResults((response as any).relevantDocs);
      } else {
        setError(
          t("ragDebugger.rawDocsError", "Could not retrieve search results"),
        );
      }
    } catch (err: any) {
      console.error("RAG Search failed:", err);
      setError(
        t("ragDebugger.searchFailed", "Search failed") + `: ${err.message}`,
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleRebuildIndex = async () => {
    if (!gameState || !aiSettings) return;

    setIsRebuildingIndex(true);
    setError(null);

    try {
      const manager = initializeEmbeddingManager({ settings: aiSettings });
      await manager.buildIndex(gameState);
      loadIndexStats();
      console.log("[RAGDebugger] Index rebuilt successfully");
    } catch (err: any) {
      console.error("Failed to rebuild index:", err);
      setError(
        t("ragDebugger.rebuildFailed", "Failed to rebuild index") +
          `: ${err.message}`,
      );
    } finally {
      setIsRebuildingIndex(false);
    }
  };

  if (!isOpen) return null;

  const embeddingEnabled = aiSettings?.embedding?.enabled ?? false;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className={`bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col ${themeFont}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-theme-border">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-theme-primary">
              {t("ragDebugger.title", "RAG Debugger")}
            </h2>
            {/* Status Badge */}
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                embeddingEnabled && indexStats
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {embeddingEnabled
                ? indexStats
                  ? t("ragDebugger.statusActive", "Active")
                  : t("ragDebugger.statusNoIndex", "No Index")
                : t("ragDebugger.statusDisabled", "Disabled")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-text transition-colors p-1"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-theme-border">
          <button
            onClick={() => setActiveTab("search")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "search"
                ? "text-theme-primary border-b-2 border-theme-primary"
                : "text-theme-muted hover:text-theme-text"
            }`}
          >
            {t("ragDebugger.tabSearch", "Search")}
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "stats"
                ? "text-theme-primary border-b-2 border-theme-primary"
                : "text-theme-muted hover:text-theme-text"
            }`}
          >
            {t("ragDebugger.tabStats", "Statistics")}
          </button>
        </div>

        {/* Content */}
        {activeTab === "search" ? (
          <>
            {/* Search Bar */}
            <div className="p-4 border-b border-theme-border bg-theme-bg/50">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t(
                    "ragDebugger.searchPlaceholder",
                    "Enter search query...",
                  )}
                  className="flex-1 bg-theme-surface border border-theme-border rounded-lg px-4 py-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  autoFocus
                  disabled={!embeddingEnabled || !indexStats}
                />
                <button
                  type="submit"
                  disabled={
                    isSearching ||
                    !query.trim() ||
                    !embeddingEnabled ||
                    !indexStats
                  }
                  className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-bg rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching
                    ? t("ragDebugger.searching", "Searching...")
                    : t("ragDebugger.search", "Search")}
                </button>
              </form>

              {/* Filter Options */}
              {gameState && embeddingEnabled && (
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2 text-theme-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentForkOnly}
                      onChange={(e) => setCurrentForkOnly(e.target.checked)}
                      className="w-4 h-4 rounded border-theme-border text-theme-primary focus:ring-theme-primary"
                    />
                    <span>
                      {t("ragDebugger.currentForkOnly", "Current Fork Only")}
                    </span>
                    <span className="text-theme-muted text-xs">
                      (fork: {gameState.forkId})
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-theme-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={beforeCurrentTurn}
                      onChange={(e) => setBeforeCurrentTurn(e.target.checked)}
                      className="w-4 h-4 rounded border-theme-border text-theme-primary focus:ring-theme-primary"
                    />
                    <span>
                      {t(
                        "ragDebugger.beforeCurrentTurn",
                        "Before Current Turn",
                      )}
                    </span>
                    <span className="text-theme-muted text-xs">
                      (turn: {gameState.turnNumber})
                    </span>
                  </label>
                </div>
              )}

              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!embeddingEnabled && (
                <div className="text-center text-theme-muted py-8">
                  <p>
                    {t(
                      "ragDebugger.embeddingDisabled",
                      "RAG/Embedding is disabled in settings",
                    )}
                  </p>
                  <p className="text-xs mt-2">
                    {t(
                      "ragDebugger.enableInSettings",
                      "Enable it in Settings → Embedding",
                    )}
                  </p>
                </div>
              )}

              {embeddingEnabled && !indexStats && (
                <div className="text-center text-theme-muted py-8">
                  <p>
                    {t(
                      "ragDebugger.noIndexYet",
                      "No embedding index available",
                    )}
                  </p>
                  <p className="text-xs mt-2">
                    {t(
                      "ragDebugger.indexWillBuild",
                      "Index will be built when you continue playing",
                    )}
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
              )}

              {embeddingEnabled &&
                indexStats &&
                results.length === 0 &&
                !isSearching &&
                !error && (
                  <div className="text-center text-theme-muted py-8">
                    {t(
                      "ragDebugger.noResults",
                      "Enter a query to search the embedding index",
                    )}
                  </div>
                )}

              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="bg-theme-surface-highlight/50 border border-theme-border rounded-lg p-3 hover:border-theme-primary/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-theme-primary/20 text-theme-primary text-xs rounded-full uppercase font-bold">
                        {result.doc.type}
                      </span>
                      <span className="text-xs text-theme-muted font-mono">
                        {result.doc.entityId}
                      </span>
                      {result.doc.metadata?.forkId !== undefined && (
                        <span className="text-xs text-theme-secondary font-mono">
                          {t("ragDebugger.fork", "fork")}:
                          {result.doc.metadata.forkId}
                        </span>
                      )}
                      {result.doc.metadata?.turnNumber !== undefined && (
                        <span className="text-xs text-theme-secondary font-mono">
                          {t("ragDebugger.turn", "turn")}:
                          {result.doc.metadata.turnNumber}
                        </span>
                      )}
                      {result.doc.metadata?.importance !== undefined && (
                        <span className="text-xs text-amber-400 font-mono">
                          {t("ragDebugger.importance", "imp")}:
                          {result.doc.metadata.importance.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-theme-secondary">
                      {t("ragDebugger.score", "Score")}:{" "}
                      {result.score.toFixed(4)}
                    </span>
                  </div>
                  <p className="text-sm text-theme-text/90 whitespace-pre-wrap line-clamp-4">
                    {result.doc.content}
                  </p>
                  <details className="mt-2">
                    <summary className="text-xs text-theme-muted cursor-pointer hover:text-theme-text">
                      {t("ragDebugger.showMetadata", "Show metadata")}
                    </summary>
                    <div className="mt-2 pt-2 border-t border-theme-border/50 text-xs text-theme-muted">
                      <pre className="whitespace-pre-wrap font-mono overflow-x-auto">
                        {JSON.stringify(result.doc.metadata, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Stats Tab */
          <div className="flex-1 overflow-y-auto p-4">
            {!embeddingEnabled ? (
              <div className="text-center text-theme-muted py-8">
                <p>
                  {t(
                    "ragDebugger.embeddingDisabled",
                    "RAG/Embedding is disabled",
                  )}
                </p>
              </div>
            ) : !indexStats ? (
              <div className="text-center text-theme-muted py-8">
                <p>
                  {t(
                    "ragDebugger.noIndexStats",
                    "No index statistics available",
                  )}
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
            ) : (
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
                      {Object.keys(indexStats.typeBreakdown).length}
                    </div>
                    <div className="text-xs text-theme-muted uppercase tracking-wider mt-1">
                      {t("ragDebugger.types", "Document Types")}
                    </div>
                  </div>
                  <div className="bg-theme-surface-highlight/50 border border-theme-border rounded-lg p-4 text-center">
                    <div
                      className="text-sm font-bold text-theme-primary truncate"
                      title={indexStats.modelId}
                    >
                      {indexStats.modelId.split("/").pop() ||
                        indexStats.modelId}
                    </div>
                    <div className="text-xs text-theme-muted uppercase tracking-wider mt-1">
                      {t("ragDebugger.model", "Embedding Model")}
                    </div>
                  </div>
                  <div className="bg-theme-surface-highlight/50 border border-theme-border rounded-lg p-4 text-center">
                    <div
                      className={`text-2xl font-bold ${indexStats.isWebGPUEnabled ? "text-green-400" : "text-theme-muted"}`}
                    >
                      {indexStats.isWebGPUEnabled ? "✓" : "–"}
                    </div>
                    <div className="text-xs text-theme-muted uppercase tracking-wider mt-1">
                      {t("ragDebugger.webgpu", "WebGPU")}
                    </div>
                  </div>
                </div>

                {/* Type Breakdown */}
                <div className="bg-theme-surface-highlight/50 border border-theme-border rounded-lg p-4">
                  <h3 className="text-sm font-bold text-theme-text mb-3 uppercase tracking-wider">
                    {t("ragDebugger.typeBreakdown", "Documents by Type")}
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(indexStats.typeBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center gap-3">
                          <span className="px-2 py-0.5 bg-theme-primary/20 text-theme-primary text-xs rounded-full uppercase font-bold min-w-[80px] text-center">
                            {type}
                          </span>
                          <div className="flex-1 h-2 bg-theme-bg rounded-full overflow-hidden">
                            <div
                              className="h-full bg-theme-primary/60 rounded-full transition-all"
                              style={{
                                width: `${(count / indexStats.documentCount) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-theme-muted font-mono w-12 text-right">
                            {count}
                          </span>
                        </div>
                      ))}
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          {t("ragDebugger.rebuildIndex", "Rebuild Index")}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
