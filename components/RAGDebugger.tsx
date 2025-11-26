import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getEmbeddingManager } from "../services/embedding";
import { EmbeddingDocument, GameState } from "../types";

interface RAGDebuggerProps {
  isOpen: boolean;
  onClose: () => void;
  themeFont: string;
  gameState?: GameState; // Optional: for fork/turn filtering
}

interface SearchResult {
  doc: EmbeddingDocument;
  score: number;
}

export const RAGDebugger: React.FC<RAGDebuggerProps> = ({
  isOpen,
  onClose,
  themeFont,
  gameState,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fork/Turn filtering options
  const [currentForkOnly, setCurrentForkOnly] = useState(false);
  const [beforeCurrentTurn, setBeforeCurrentTurn] = useState(false);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setResults([]);
    setError(null);

    try {
      const embeddingManager = getEmbeddingManager();
      if (!embeddingManager) {
        setError(t("ragDebugger.noEmbeddingManager"));
        setIsSearching(false);
        return;
      }

      if (!embeddingManager.hasIndex()) {
        setError(t("ragDebugger.noIndex"));
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

      // We need to map the results back to our display format
      if (response && (response as any).relevantDocs) {
        setResults((response as any).relevantDocs);
      } else {
        // Fallback if we can't get raw docs
        setError(t("ragDebugger.rawDocsError"));
      }
    } catch (err: any) {
      console.error("RAG Search failed:", err);
      setError(t("ragDebugger.searchFailed"));
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className={`bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col ${themeFont}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-theme-border">
          <h2 className="text-xl font-bold text-theme-primary">
            {t("ragDebugger.title")}
          </h2>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-text transition-colors"
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
              placeholder={t("ragDebugger.searchPlaceholder")}
              className="flex-1 bg-theme-surface border border-theme-border rounded-lg px-4 py-2 text-theme-text focus:outline-none focus:border-theme-primary"
              autoFocus
            />
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-bg rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              {isSearching
                ? t("ragDebugger.searching")
                : t("ragDebugger.search")}
            </button>
          </form>

          {/* Filter Options */}
          {gameState && (
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
                  {t("ragDebugger.beforeCurrentTurn", "Before Current Turn")}
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
          {results.length === 0 && !isSearching && !error && (
            <div className="text-center text-theme-muted py-8">
              {t("ragDebugger.noResults")}
            </div>
          )}

          {results.map((result, idx) => (
            <div
              key={idx}
              className="bg-theme-surface-highlight/50 border border-theme-border rounded-lg p-3 hover:border-theme-primary/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-theme-primary/20 text-theme-primary text-xs rounded-full uppercase font-bold">
                    {result.doc.type}
                  </span>
                  <span className="text-xs text-theme-muted font-mono">
                    {result.doc.entityId}
                  </span>
                  {result.doc.metadata?.forkId !== undefined && (
                    <span className="text-xs text-theme-secondary font-mono">
                      fork:{result.doc.metadata.forkId}
                    </span>
                  )}
                  {result.doc.metadata?.turnNumber !== undefined && (
                    <span className="text-xs text-theme-secondary font-mono">
                      turn:{result.doc.metadata.turnNumber}
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-theme-secondary">
                  {t("ragDebugger.score")}: {result.score.toFixed(4)}
                </span>
              </div>
              <p className="text-sm text-theme-text/90 whitespace-pre-wrap">
                {result.doc.content}
              </p>
              {result.doc.metadata && (
                <div className="mt-2 pt-2 border-t border-theme-border/50 text-xs text-theme-muted">
                  <pre className="whitespace-pre-wrap font-mono">
                    {JSON.stringify(result.doc.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
