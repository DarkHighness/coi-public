import React, { useEffect, useState } from "react";
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
  const [stats, setStats] = useState<{
    totalDocs: number;
    pendingRequests: number;
    isIndexing: boolean;
  }>({ totalDocs: 0, pendingRequests: 0, isIndexing: false });

  useEffect(() => {
    const fetchStats = async () => {
      const service = getRAGService();
      if (service) {
        const status = await service.getStatus();
        setStats({
          totalDocs: status.storageDocuments,
          pendingRequests: status.pending || 0,
          isIndexing: !!progress,
        });
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [progress]);

  const percentage =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

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
        <div className="text-theme-muted group-hover:text-theme-primary p-1 transition-colors">
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
        <div className="space-y-3 animate-[fade-in_0.3s_ease-in]">
          {/* Status Info */}
          <div className="border-l-2 border-b border-theme-border/25 pb-2 border-l-theme-border/50">
            <div className="py-2 pl-2 pr-1">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-theme-muted uppercase tracking-wider font-bold">
                  {t("rag.status", "Status")}
                </span>
                {stats.isIndexing && (
                  <span className="text-[10px] text-theme-primary animate-pulse flex items-center gap-1 uppercase tracking-wider">
                    <svg
                      className="w-3 h-3 animate-spin"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {t("rag.indexing", "Indexing...")}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col border-t border-theme-border/25 pt-2">
                  <span className="text-[10px] text-theme-muted uppercase tracking-wider">
                    {t("rag.totalDocs", "Total Docs")}
                  </span>
                  <span className="font-mono text-theme-text font-bold text-xs mt-1">
                    {stats.totalDocs}
                  </span>
                </div>
                <div className="flex flex-col border-t border-theme-border/25 pt-2">
                  <span className="text-[10px] text-theme-muted uppercase tracking-wider">
                    {t("rag.pending", "Pending")}
                  </span>
                  <span className="font-mono text-theme-text font-bold text-xs mt-1">
                    {stats.pendingRequests}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {progress && (
            <div className="border-l-2 border-b border-theme-border/25 pb-2 border-l-theme-primary/40">
              <div className="py-2 pl-2 pr-1">
                <div className="flex justify-between items-start gap-2 text-theme-muted mb-2">
                  <span className="text-[10px] uppercase tracking-wider">
                    {t(`embedding.phase.${progress.stage}`) || progress.stage}
                  </span>
                  <span className="text-[10px] font-mono whitespace-nowrap">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="h-1 w-full bg-theme-border/20 overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-theme-primary to-theme-primary-hover transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                {progress.message && (
                  <p className="text-xs text-theme-muted mt-2 leading-relaxed pl-2 border-l border-theme-border/25">
                    {progress.message}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
