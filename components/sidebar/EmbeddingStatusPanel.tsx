import React from "react";
import { useTranslation } from "react-i18next";
import { EmbeddingProgress } from "../../hooks/useEmbeddingStatus";

interface EmbeddingStatusPanelProps {
  progress: EmbeddingProgress | null;
  isExpanded: boolean;
  onToggle: () => void;
}

export const EmbeddingStatusPanel: React.FC<EmbeddingStatusPanelProps> = ({
  progress,
  isExpanded,
  onToggle,
}) => {
  const { t } = useTranslation();

  if (!progress) return null;

  const percentage =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="border-t border-theme-border bg-theme-bg/50">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-theme-surface/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <span className="text-sm font-medium text-theme-text">
            {t("embedding.status") || "Embedding Status"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-theme-muted">{percentage}%</span>
          <span className="text-theme-muted text-xs">
            {isExpanded ? "▼" : "▲"}
          </span>
        </div>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-0 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-theme-muted">
                <span>
                  {t(`embedding.phase.${progress.stage}`) || progress.stage}
                </span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="h-1.5 bg-theme-border/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-theme-primary transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            {progress.message && (
              <p className="text-xs text-theme-muted italic">
                {progress.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
