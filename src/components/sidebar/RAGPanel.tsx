import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_RAG_CONFIG, getRAGService } from "../../services/rag";
import { EmbeddingProgress } from "../../hooks/useEmbeddingStatus";

interface RAGPanelProps {
  progress: EmbeddingProgress | null;
  themeFont: string;
}

const RAGPanelComponent: React.FC<RAGPanelProps> = ({
  progress,
  themeFont,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const isIndexing = Boolean(progress && progress.current < progress.total);
  const [stats, setStats] = useState<{
    totalDocs: number;
    pendingRequests: number;
    isIndexing: boolean;
  }>({ totalDocs: 0, pendingRequests: 0, isIndexing: false });

  const fetchStats = useCallback(async () => {
    const service = getRAGService();
    if (!service) return;
    try {
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
    } catch (error) {
      console.warn("[RAGPanel] Failed to fetch stats:", error);
    }
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
  const indexProgressMessage = progress?.messageKey
    ? t(progress.messageKey, progress.messageParams || {})
    : progress?.message;
  const indexPhaseLabel = progress
    ? t(`embedding.phase.${progress.stage}`) || progress.stage
    : t("embedding.phase.idle", "Idle");
  const statusLabel = stats.isIndexing
    ? t("rag.indexing", "Indexing...")
    : t("rag.idle", "Idle");
  const docLimit = DEFAULT_RAG_CONFIG.maxDocumentsPerSave;
  const docsUsagePercent = useMemo(() => {
    if (docLimit <= 0) return 0;
    return Math.min(100, Math.round((stats.totalDocs / docLimit) * 100));
  }, [docLimit, stats.totalDocs]);

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
        <div className="space-y-2 animate-[fade-in_0.24s_ease-out] border border-theme-divider/65 bg-theme-surface/30 p-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.14em] text-theme-text-secondary">
              {t("rag.status", "Status")}
            </div>
            <div className="text-[10px] font-mono text-theme-text-secondary">
              {statusLabel}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="uppercase tracking-wider text-theme-text-secondary">
                {t("rag.indexProgress", "Index Progress")} · {indexPhaseLabel}
              </span>
              <span className="font-mono text-theme-text-secondary">
                {progress ? `${progress.current} / ${progress.total}` : "0 / 0"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-theme-divider/55 overflow-hidden">
              <div
                className="h-full bg-theme-primary transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            {indexProgressMessage && (
              <p className="text-[11px] text-theme-text-secondary leading-relaxed">
                {indexProgressMessage}
              </p>
            )}
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="uppercase tracking-wider text-theme-text-secondary">
                {t("rag.knowledgeUsage", "Knowledge Usage")}
              </span>
              <span className="font-mono text-theme-text-secondary">
                {stats.totalDocs} / {docLimit}
              </span>
            </div>
            <div className="h-1.5 w-full bg-theme-divider/55 overflow-hidden">
              <div
                className="h-full bg-theme-primary/75 transition-all duration-300"
                style={{ width: `${docsUsagePercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-theme-divider/45 text-[10px] text-theme-text-secondary">
            <span className="uppercase tracking-wider">
              {t("rag.pending", "Pending")}
            </span>
            <span className="font-mono">{stats.pendingRequests}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const RAGPanel = React.memo(RAGPanelComponent);
