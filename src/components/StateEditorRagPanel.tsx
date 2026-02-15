import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOptionalRuntimeContext } from "../runtime/context";
import type { GameState } from "../types";
import type { VfsSession } from "../services/vfs/vfsSession";
import type {
  DocumentType,
  LocalEmbeddingRuntimeInfo,
  SearchResult,
} from "../services/rag";
import { extractFileChunksFromSnapshot } from "../services/rag/vfsExtraction";

interface StateEditorRagPanelProps {
  mode: "search" | "stats" | "documents";
  gameState: GameState;
  vfsSession: VfsSession;
}

const documentTypes: Array<DocumentType> = ["json", "markdown", "text"];

interface RebuildProgressState {
  phase: "embedding" | "indexing" | "searching" | "cleanup";
  current: number;
  total: number;
  message?: string;
  runtime?: LocalEmbeddingRuntimeInfo;
}

const formatPreview = (content: string): string => {
  const preview = content.trim().replace(/\s+/g, " ");
  if (preview.length <= 240) {
    return preview;
  }
  return `${preview.slice(0, 240)}…`;
};

export const StateEditorRagPanel: React.FC<StateEditorRagPanelProps> = ({
  mode,
  gameState,
  vfsSession,
}) => {
  const { t } = useTranslation();
  const runtime = useOptionalRuntimeContext();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchTypeFilter, setSearchTypeFilter] = useState<
    DocumentType | "all"
  >("all");

  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsTotal, setDocumentsTotal] = useState(0);
  const [documentsPage, setDocumentsPage] = useState(1);
  const [documentsPageSize] = useState(20);
  const [documentsFilter, setDocumentsFilter] = useState<DocumentType | "all">(
    "all",
  );
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildProgress, setRebuildProgress] =
    useState<RebuildProgressState | null>(null);
  const rebuildActiveRef = useRef(false);

  const ragStatus = runtime?.state.rag.status ?? null;
  const ragActions = runtime?.actions.rag;
  const ragService = ragActions?.getService?.() ?? null;
  const currentSaveId = runtime?.state.rag.currentSaveId ?? null;

  const totalPages = useMemo(() => {
    if (documentsPageSize <= 0) return 1;
    return Math.max(1, Math.ceil(documentsTotal / documentsPageSize));
  }, [documentsTotal, documentsPageSize]);

  const handleSearch = useCallback(async () => {
    if (!ragActions || !query.trim()) {
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const results = await ragActions.search(query, {
        topK: 40,
        threshold: 0.2,
        forkId: gameState.forkId || 0,
        beforeTurn: gameState.turnNumber,
        currentForkOnly: true,
        types: searchTypeFilter === "all" ? undefined : [searchTypeFilter],
      });
      setSearchResults(results);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSearchError(message);
    } finally {
      setSearching(false);
    }
  }, [
    gameState.forkId,
    gameState.turnNumber,
    query,
    ragActions,
    searchTypeFilter,
  ]);

  const loadDocuments = useCallback(async () => {
    if (!ragService) {
      setDocuments([]);
      setDocumentsTotal(0);
      return;
    }

    setDocumentsLoading(true);
    setDocumentsError(null);

    try {
      const offset = (documentsPage - 1) * documentsPageSize;
      const result = await ragService.getDocumentsPaginated(
        offset,
        documentsPageSize,
        documentsFilter === "all" ? undefined : [documentsFilter],
      );
      setDocuments(result.documents);
      setDocumentsTotal(result.total);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDocumentsError(message);
    } finally {
      setDocumentsLoading(false);
    }
  }, [documentsFilter, documentsPage, documentsPageSize, ragService]);

  useEffect(() => {
    if (mode !== "documents") return;
    loadDocuments();
  }, [loadDocuments, mode]);

  useEffect(() => {
    if (!ragService) return;

    const unsubscribe = ragService.on("progress", (data) => {
      if (!rebuildActiveRef.current) return;

      setRebuildProgress({
        phase: data.phase,
        current: data.current,
        total: data.total,
        message: data.message,
        runtime: data.runtime,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [ragService]);

  const refreshStats = useCallback(async () => {
    if (!ragActions?.refreshStatus) return;
    setStatsLoading(true);
    setStatsError(null);
    try {
      await ragActions.refreshStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatsError(message);
    } finally {
      setStatsLoading(false);
    }
  }, [ragActions]);

  const rebuildIndex = useCallback(async () => {
    if (rebuildActiveRef.current) {
      return;
    }

    if (!ragService || !currentSaveId) {
      setStatsError(
        t("ragDebugger.noEmbeddingManager", "RAG service not initialized"),
      );
      return;
    }

    rebuildActiveRef.current = true;
    setIsRebuilding(true);
    setStatsLoading(true);
    setStatsError(null);
    setRebuildProgress({
      phase: "indexing",
      current: 0,
      total: 1,
      message: t(
        "ragDebugger.rebuildPreparing",
        "Preparing to rebuild index...",
      ),
    });

    try {
      const forkId = gameState.forkId || 0;
      const turnNumber = gameState.turnNumber || 0;
      const snapshot = vfsSession.snapshotAllCanonical();
      const documents = extractFileChunksFromSnapshot(snapshot, {
        saveId: currentSaveId,
        forkId,
        turnNumber,
      });

      await ragService.reindexAll({
        saveId: currentSaveId,
        forkId,
        turnNumber,
        documents,
      });

      setRebuildProgress((prev) => {
        const total = Math.max(1, prev?.total ?? 1);
        return {
          phase: "indexing",
          current: total,
          total,
          message: t(
            "ragDebugger.rebuildComplete",
            "Rebuild completed successfully.",
          ),
        };
      });

      await ragActions?.refreshStatus?.();
      if (mode === "documents") {
        await loadDocuments();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const lockError = /reindex already in progress/i.test(message);
      setStatsError(
        lockError
          ? t(
              "ragDebugger.rebuildAlreadyInProgress",
              "A reindex is already running. Please wait for it to finish.",
            )
          : message,
      );
      setRebuildProgress(null);
    } finally {
      rebuildActiveRef.current = false;
      setIsRebuilding(false);
      setStatsLoading(false);
      setRebuildProgress(null);
    }
  }, [
    currentSaveId,
    gameState.forkId,
    gameState.turnNumber,
    loadDocuments,
    mode,
    ragActions,
    ragService,
    t,
    vfsSession,
  ]);

  const rebuildTotal = Math.max(1, rebuildProgress?.total ?? 1);
  const rebuildCurrent = Math.max(
    0,
    Math.min(rebuildTotal, rebuildProgress?.current ?? 0),
  );
  const rebuildPercent = Math.round((rebuildCurrent / rebuildTotal) * 100);
  const runtimeEngineLabel =
    ragStatus?.localRuntime?.engine ||
    t("ragDebugger.runtimeUnknown", "Unknown");
  const runtimeBackendLabel =
    ragStatus?.localRuntime?.backend ||
    t("ragDebugger.runtimeUnknown", "Unknown");

  if (!runtime || !runtime.state.rag.isInitialized) {
    return (
      <div className="flex-1 overflow-y-auto p-4 text-sm text-theme-text-secondary">
        {t("ragDebugger.noEmbeddingManager", "RAG service not initialized")}
      </div>
    );
  }

  if (mode === "search") {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleSearch();
              }
            }}
            placeholder={t(
              "ragDebugger.searchPlaceholder",
              "Enter search query...",
            )}
            className="flex-1 bg-theme-surface border border-theme-divider/60 rounded px-3 py-2 text-theme-text focus:outline-none focus:border-theme-primary"
          />
          <select
            value={searchTypeFilter}
            onChange={(event) =>
              setSearchTypeFilter(event.target.value as DocumentType | "all")
            }
            className="bg-theme-surface border border-theme-divider/60 rounded px-2 py-2 text-sm text-theme-text"
          >
            <option value="all">
              {t("ragDebugger.allTypes", "All Types")}
            </option>
            {documentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={searching || !query.trim()}
            className="px-4 py-2 rounded bg-theme-primary text-theme-bg font-semibold disabled:opacity-60"
          >
            {searching
              ? t("ragDebugger.searching", "Searching...")
              : t("ragDebugger.search", "Search")}
          </button>
        </div>

        {searchError && (
          <div className="text-sm text-theme-error border border-theme-error/40 bg-theme-error/10 rounded p-3">
            {searchError}
          </div>
        )}

        <div className="space-y-3">
          {searchResults.length === 0 && !searching ? (
            <div className="text-sm text-theme-text-secondary">
              {t(
                "ragDebugger.noResults",
                "Enter a query to search the embedding index.",
              )}
            </div>
          ) : (
            searchResults.map((result) => (
              <div
                key={result.document.id}
                className="border border-theme-divider/60 rounded p-3 bg-theme-surface/60"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-theme-text-secondary mb-2">
                  <span className="font-mono">
                    {result.document.sourcePath}
                  </span>
                  <span>{(result.adjustedScore * 100).toFixed(1)}%</span>
                </div>
                <div className="text-xs text-theme-text-secondary mb-2">
                  {result.document.type} · chunk{" "}
                  {result.document.chunkIndex + 1}/{result.document.chunkCount}{" "}
                  · fork {result.document.forkId} · turn{" "}
                  {result.document.turnNumber}
                </div>
                <pre className="text-sm text-theme-text whitespace-pre-wrap break-words leading-relaxed">
                  {formatPreview(result.document.content)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (mode === "stats") {
    return (
      <>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {statsError && (
            <div className="text-sm text-theme-error border border-theme-error/40 bg-theme-error/10 rounded p-3">
              {statsError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="border border-theme-divider/60 rounded p-3 bg-theme-surface/60">
              <div className="text-theme-text-secondary mb-1">
                {t("ragDebugger.storageDocs", "Stored Documents")}
              </div>
              <div className="text-lg font-semibold text-theme-primary">
                {ragStatus?.storageDocuments ?? 0}
              </div>
            </div>
            <div className="border border-theme-divider/60 rounded p-3 bg-theme-surface/60">
              <div className="text-theme-text-secondary mb-1">
                {t("ragDebugger.model", "Embedding Model")}
              </div>
              <div className="text-sm font-mono text-theme-text break-all">
                {ragStatus?.currentModel || "-"}
              </div>
            </div>
            <div className="border border-theme-divider/60 rounded p-3 bg-theme-surface/60">
              <div className="text-theme-text-secondary mb-1">
                {t("ragDebugger.provider", "Provider")}
              </div>
              <div className="text-sm font-mono text-theme-text">
                {ragStatus?.currentProvider || "-"}
              </div>
            </div>
            <div className="border border-theme-divider/60 rounded p-3 bg-theme-surface/60">
              <div className="text-theme-text-secondary mb-1">
                {t("ragDebugger.saveId", "Save ID")}
              </div>
              <div className="text-sm font-mono text-theme-text break-all">
                {currentSaveId || "-"}
              </div>
            </div>
            <div className="border border-theme-divider/60 rounded p-3 bg-theme-surface/60">
              <div className="text-theme-text-secondary mb-1">
                {t("ragDebugger.runtimeEngine", "Runtime Engine")}
              </div>
              <div className="text-sm font-mono text-theme-text break-all">
                {runtimeEngineLabel}
              </div>
            </div>
            <div className="border border-theme-divider/60 rounded p-3 bg-theme-surface/60">
              <div className="text-theme-text-secondary mb-1">
                {t("ragDebugger.runtimeBackend", "Runtime Backend")}
              </div>
              <div className="text-sm font-mono text-theme-text break-all">
                {runtimeBackendLabel}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refreshStats()}
              disabled={statsLoading || isRebuilding}
              className="px-3 py-2 rounded border border-theme-divider/60 text-sm text-theme-text hover:bg-theme-bg/15 disabled:opacity-60"
            >
              {t("ragDebugger.refresh", "Refresh Stats")}
            </button>
            <button
              type="button"
              onClick={() => void rebuildIndex()}
              disabled={statsLoading || isRebuilding || !currentSaveId}
              className="px-3 py-2 rounded bg-theme-primary text-theme-bg text-sm font-semibold disabled:opacity-60"
            >
              {isRebuilding
                ? t("ragDebugger.rebuilding", "Rebuilding...")
                : t("ragDebugger.rebuildIndex", "Rebuild Index")}
            </button>
          </div>
        </div>

        {isRebuilding && (
          <div
            className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-lg border border-theme-divider/60 bg-theme-surface p-5 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-theme-primary border-t-transparent animate-spin" />
                <div className="text-sm font-semibold text-theme-text">
                  {t("ragDebugger.rebuilding", "Rebuilding...")}
                </div>
                <div className="ml-auto text-xs text-theme-text-secondary font-mono">
                  {rebuildPercent}%
                </div>
              </div>

              <div className="h-2 w-full rounded bg-theme-divider/60 overflow-hidden">
                <div
                  className="h-full bg-theme-primary transition-all duration-200"
                  style={{ width: `${rebuildPercent}%` }}
                />
              </div>

              <div className="text-xs text-theme-text-secondary leading-relaxed">
                {rebuildProgress?.message ||
                  t(
                    "ragDebugger.rebuildInProgress",
                    "Index rebuilding is in progress. Please wait.",
                  )}
                {rebuildProgress?.runtime && (
                  <div className="mt-2 font-mono text-[11px] text-theme-text">
                    {t("ragDebugger.runtimeUsing", "Runtime: {{engine}} / {{backend}}", {
                      engine: rebuildProgress.runtime.engine,
                      backend: rebuildProgress.runtime.backend,
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={documentsFilter}
          onChange={(event) => {
            setDocumentsFilter(event.target.value as DocumentType | "all");
            setDocumentsPage(1);
          }}
          className="bg-theme-surface border border-theme-divider/60 rounded px-2 py-2 text-sm text-theme-text"
        >
          <option value="all">{t("ragDebugger.allTypes", "All Types")}</option>
          {documentTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void loadDocuments()}
          disabled={documentsLoading}
          className="px-3 py-2 rounded border border-theme-divider/60 text-sm text-theme-text hover:bg-theme-bg/15 disabled:opacity-60"
        >
          {t("ragDebugger.refresh", "Refresh Stats")}
        </button>
      </div>

      {documentsError && (
        <div className="text-sm text-theme-error border border-theme-error/40 bg-theme-error/10 rounded p-3">
          {documentsError}
        </div>
      )}

      <div className="border border-theme-divider/60 rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-theme-surface-highlight/30 text-theme-text-secondary uppercase">
            <tr>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Path</th>
              <th className="text-left px-3 py-2">Chunk</th>
              <th className="text-left px-3 py-2">Preview</th>
            </tr>
          </thead>
          <tbody>
            {documentsLoading ? (
              <tr>
                <td className="px-3 py-3" colSpan={4}>
                  {t("loadingGeneric", "Loading...")}
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td className="px-3 py-3" colSpan={4}>
                  {t("ragDebugger.noDocsFound", "No documents found")}
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-t border-theme-divider/40 align-top"
                >
                  <td className="px-3 py-2 text-theme-text-secondary">
                    {doc.type}
                  </td>
                  <td className="px-3 py-2 font-mono text-theme-text break-all">
                    {doc.sourcePath}
                  </td>
                  <td className="px-3 py-2 text-theme-text-secondary">
                    {doc.chunkIndex + 1}/{doc.chunkCount}
                  </td>
                  <td className="px-3 py-2 text-theme-text">
                    {formatPreview(doc.content)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-theme-text-secondary">
        <span>
          {documentsTotal} {t("ragDebugger.totalDocs", "Total Documents")}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDocumentsPage((page) => Math.max(1, page - 1))}
            disabled={documentsPage <= 1}
            className="px-2 py-1 rounded border border-theme-divider/60 disabled:opacity-50"
          >
            ←
          </button>
          <span>
            {t("ragDebugger.page", "Page")} {documentsPage}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setDocumentsPage((page) => Math.min(totalPages, page + 1))
            }
            disabled={documentsPage >= totalPages}
            className="px-2 py-1 rounded border border-theme-divider/60 disabled:opacity-50"
          >
            →
          </button>
        </div>
      </div>
      <div className="text-xs text-theme-text-secondary">
        {t("stateEditor.readOnly", "Read Only")}
      </div>
    </div>
  );
};
