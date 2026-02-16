import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getRAGService } from "../../services/rag";
import { EmbeddingProgress } from "../../hooks/useEmbeddingStatus";

interface RAGPanelProps {
  progress: EmbeddingProgress | null;
  themeFont: string;
}

export const RAGPanel: React.FC<RAGPanelProps> = ({ progress, themeFont }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const isIndexing = Boolean(progress && progress.current < progress.total);
  const hasProgress = Boolean(progress);
  const [stats, setStats] = useState<{
    totalDocs: number;
    pendingRequests: number;
    isIndexing: boolean;
  }>({ totalDocs: 0, pendingRequests: 0, isIndexing: false });

  const fetchStats = useCallback(async () => {
    const service = getRAGService();
    if (!service) return;

    const status = await service.getStatus();
    const next = {
      totalDocs: status.storageDocuments,
      pendingRequests: status.pending || 0,
      isIndexing,
    };

    setStats((prev) => {
      if (
        prev.totalDocs === next.totalDocs &&
        prev.pendingRequests === next.pendingRequests &&
        prev.isIndexing === next.isIndexing
      ) {
        return prev;
      }
      return next;
    });
  }, [isIndexing]);

  useEffect(() => {
    void fetchStats();
    const interval = setInterval(() => {
      void fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  useEffect(() => {
    const service = getRAGService();
    if (!service) return;

    const handleDataMutation = () => {
      void fetchStats();
    };

    service.on("indexUpdated", handleDataMutation);
    service.on("cleanupComplete", handleDataMutation);

    return () => {
      service.off("indexUpdated", handleDataMutation);
      service.off("cleanupComplete", handleDataMutation);
    };
  }, [fetchStats]);

  const percentage =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;
  const progressMessage = progress?.messageKey
    ? t(progress.messageKey, progress.messageParams || {})
    : progress?.message;
  const phaseLabel = progress
    ? t(`embedding.phase.${progress.stage}`) || progress.stage
    : t("embedding.phase.idle") || "Idle";
  const statusLabel = isIndexing
    ? t("rag.indexing", "Indexing...")
    : hasProgress
      ? t("rag.synced", "Synced")
      : t("rag.idle", "Idle");
  const statusTone = isIndexing
    ? "text-theme-primary border-theme-primary/40 bg-theme-primary/8"
    : "text-theme-text-secondary border-theme-divider/70 bg-theme-bg/70";

  return (
    <div>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between cursor-pointer group ${
          isOpen ? "mb-3" : "mb-0"
        }`}
      >
        <div
          className={`flex items-center text-theme-primary uppercase text-xs font-bold tracking-widest ${themeFont}`}
        >
          <span className="flex items-center">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              ></path>
            </svg>
            {t("rag.title", "RAG System")}
          </span>
        </div>
        <div className="text-theme-text-secondary group-hover:text-theme-primary p-1 transition-colors">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            ></path>
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-3 animate-[fade-in_0.28s_ease-out]">
          <div className="relative overflow-hidden border border-theme-divider/70 bg-theme-surface/35">
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-theme-primary/0 via-theme-primary/60 to-theme-primary/0" />
            <div className="px-2.5 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 border border-theme-primary/35 bg-theme-bg/85 flex items-center justify-center shrink-0">
                    <svg
                      className="w-4 h-4 text-theme-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      ></path>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-theme-text-secondary uppercase tracking-[0.16em] font-bold">
                      {t("rag.status", "Status")}
                    </div>
                    <div className="text-[11px] text-theme-text truncate">
                      {phaseLabel}
                    </div>
                  </div>
                </div>

                <div
                  className={`text-[10px] uppercase tracking-[0.14em] px-2 py-1 border flex items-center gap-1.5 ${statusTone}`}
                >
                  {isIndexing && (
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      ></path>
                    </svg>
                  )}
                  {statusLabel}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="border border-theme-divider/60 bg-theme-bg/70 px-2.5 py-2">
                  <div className="text-[10px] text-theme-text-secondary uppercase tracking-wider">
                    {t("rag.totalDocs", "Total Docs")}
                  </div>
                  <div className="font-mono text-sm text-theme-text mt-1">
                    {stats.totalDocs}
                  </div>
                </div>
                <div className="border border-theme-divider/60 bg-theme-bg/70 px-2.5 py-2">
                  <div className="text-[10px] text-theme-text-secondary uppercase tracking-wider">
                    {t("rag.pending", "Pending")}
                  </div>
                  <div className="font-mono text-sm text-theme-text mt-1">
                    {stats.pendingRequests}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {progress && (
            <div className="border border-theme-divider/70 bg-theme-bg/55 px-2.5 py-2.5">
              <div className="flex justify-between items-start gap-2 text-theme-text-secondary mb-2">
                <span className="text-[10px] uppercase tracking-[0.14em]">
                  {phaseLabel}
                </span>
                <span className="text-[10px] font-mono whitespace-nowrap">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="h-1.5 w-full bg-theme-divider/55 overflow-hidden border border-theme-divider/40">
                <div
                  className="h-full bg-linear-to-r from-theme-primary via-theme-primary-hover to-theme-primary transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {progressMessage && (
                <p className="text-xs text-theme-text-secondary mt-2 leading-relaxed">
                  {progressMessage}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
