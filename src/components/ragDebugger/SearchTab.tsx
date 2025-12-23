import React, { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useOptionalRAGContext } from "../../contexts/RAGContext";
import type {
  SearchResult as RAGSearchResult,
  DocumentType,
} from "../../services/rag";
import type { SearchTabProps, SearchResultDisplay } from "./types";
import { DocumentTypeFilter } from "./DocumentTypeFilter";

export const SearchTab: React.FC<SearchTabProps> = ({
  gameState,
  aiSettings,
}) => {
  const { t } = useTranslation();
  const ragContext = useOptionalRAGContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultDisplay[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentForkOnly, setCurrentForkOnly] = useState(false);
  const [beforeCurrentTurn, setBeforeCurrentTurn] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType | "all">("all");

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setResults([]);
    setError(null);

    try {
      if (!ragContext || !ragContext.isInitialized) {
        setError(
          t("ragDebugger.noEmbeddingManager", "RAG service not initialized"),
        );
        setIsSearching(false);
        return;
      }

      // Build search options with fork/turn filtering
      // For debugger: ignore threshold, return top 100 results sorted by similarity
      const searchOptions: {
        topK?: number;
        threshold?: number;
        forkId?: number;
        beforeTurn?: number;
        currentForkOnly?: boolean;
        types?: DocumentType[];
      } = {
        topK: 100,
        threshold: 0, // Ignore threshold for debugger
      };

      if (currentForkOnly && gameState) {
        searchOptions.forkId = gameState.forkId;
        searchOptions.currentForkOnly = true;
      }

      if (beforeCurrentTurn && gameState) {
        searchOptions.beforeTurn = gameState.turnNumber;
      }

      if (selectedType !== "all") {
        searchOptions.types = [selectedType];
      }

      const searchResults = await ragContext.actions.search(
        query,
        searchOptions,
      );

      if (searchResults && searchResults.length > 0) {
        setResults(
          searchResults.map((r: RAGSearchResult) => ({
            entityId: r.document.entityId,
            type: r.document.type,
            content: r.document.content,
            score: r.score,
            metadata: {
              forkId: r.document.forkId,
              turnNumber: r.document.turnNumber,
              importance: r.document.importance,
            },
          })),
        );
      } else {
        setResults([]);
      }
    } catch (err: unknown) {
      console.error("RAG Search failed:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(
        t("ragDebugger.searchFailed", "Search failed") + ": " + errorMessage,
      );
    } finally {
      setIsSearching(false);
    }
  }, [
    query,
    currentForkOnly,
    beforeCurrentTurn,
    selectedType,
    gameState,
    ragContext,
    t,
  ]);

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col">
      {/* Search controls */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={t(
              "ragDebugger.searchPlaceholder",
              "Enter search query...",
            )}
            className="flex-1 bg-theme-surface border border-theme-border rounded px-3 py-2 text-theme-text focus:outline-none focus:border-theme-primary"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-bg rounded font-bold transition-colors disabled:opacity-50"
          >
            {isSearching
              ? t("ragDebugger.searching", "Searching...")
              : t("ragDebugger.search", "Search")}
          </button>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-theme-muted uppercase font-bold">
            {t("ragDebugger.types", "Document Types")}:
          </label>
          <DocumentTypeFilter
            value={selectedType}
            onChange={(type) => setSelectedType(type)}
          />
        </div>

        {/* Filters */}
        {gameState && (
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentForkOnly}
                onChange={(e) => setCurrentForkOnly(e.target.checked)}
                className="rounded border-theme-border"
              />
              <span className="text-theme-text">
                {t("ragDebugger.currentForkOnly", "Current Fork Only")}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={beforeCurrentTurn}
                onChange={(e) => setBeforeCurrentTurn(e.target.checked)}
                className="rounded border-theme-border"
              />
              <span className="text-theme-text">
                {t("ragDebugger.beforeCurrentTurn", "Before Current Turn")}
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {results.length === 0 && !isSearching && (
          <div className="text-center text-theme-muted py-8">
            {t(
              "ragDebugger.noResults",
              "Enter a query to search the embedding index.",
            )}
          </div>
        )}
        {results.map((result, idx) => (
          <div
            key={`${result.entityId}-${idx}`}
            className="bg-theme-surface border border-theme-border rounded-lg p-4 space-y-2"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-theme-primary/10 text-theme-primary text-xs rounded-full uppercase font-bold border border-theme-primary/20">
                  {result.type}
                </span>
                <span className="text-xs text-theme-muted font-mono">
                  {result.entityId}
                </span>
              </div>
              <div className="text-sm font-bold text-theme-primary">
                {(result.score * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-sm text-theme-text whitespace-pre-wrap">
              {result.content}
            </div>
            {result.metadata && (
              <div className="flex gap-4 text-xs text-theme-muted">
                <span>
                  {t("ragDebugger.labels.fork")}{" "}
                  {result.metadata.forkId as number}
                </span>
                <span>
                  {t("ragDebugger.labels.turn")}{" "}
                  {result.metadata.turnNumber as number}
                </span>
                <span>
                  {t("ragDebugger.labels.importance")}{" "}
                  {((result.metadata.importance as number) * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
