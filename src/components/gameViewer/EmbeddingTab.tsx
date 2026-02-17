/**
 * EmbeddingTab - RAG embedding status display
 * Shows the status of the retrieval-augmented generation system
 */

import React from "react";
import type { TFunction } from "i18next";
import { EmbeddingProgress } from "../../hooks/useEmbeddingStatus";
import { Section, InfoRow } from "./helpers";

interface EmbeddingTabProps {
  embeddingProgress: EmbeddingProgress | null;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: TFunction;
}

export const EmbeddingTab: React.FC<EmbeddingTabProps> = ({
  embeddingProgress,
  expandedSections,
  toggleSection,
  t,
}) => {
  const progressMessage = embeddingProgress?.messageKey
    ? t(embeddingProgress.messageKey, embeddingProgress.messageParams || {})
    : embeddingProgress?.message;

  return (
    <div className="space-y-4">
      <div className="p-6 bg-theme-bg rounded-none border border-theme-border/40 text-center">
        <div className="text-5xl mb-3">🧠</div>
        <h3 className="text-lg sm:text-xl font-[var(--font-fantasy)] text-theme-primary mb-2 uppercase tracking-[0.22em]">
          {t("gameViewer.embeddingStatus") || "Embedding Status"}
        </h3>
        <p className="text-theme-muted text-sm max-w-md mx-auto">
          {t("gameViewer.embeddingDescription") ||
            "View the status of the RAG (Retrieval-Augmented Generation) system."}
        </p>
      </div>

      {embeddingProgress ? (
        <Section
          id="embeddingStats"
          title={t("gameViewer.embeddingStats") || "Statistics"}
          icon="📊"
          isExpanded={expandedSections.has("embeddingStats")}
          onToggle={toggleSection}
        >
          <div className="space-y-3">
            <InfoRow
              label={t("embedding.phaseLabel") || "Phase"}
              value={
                t(`embedding.phase.${embeddingProgress.stage}`) ||
                embeddingProgress.stage
              }
            />
            <InfoRow
              label={t("embedding.progress") || "Progress"}
              value={`${embeddingProgress.current} / ${embeddingProgress.total}`}
            />
            {progressMessage && (
              <div className="text-xs text-theme-muted italic mt-2 p-2 bg-theme-bg rounded-none border border-theme-border/30">
                {progressMessage}
              </div>
            )}
            <div className="mt-3 h-3 bg-theme-bg/50 rounded-full overflow-hidden border border-theme-border/30">
              <div
                className="h-full bg-gradient-to-r from-theme-primary to-theme-primary-hover transition-all duration-300"
                style={{
                  width: `${embeddingProgress.total > 0 ? (embeddingProgress.current / embeddingProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </Section>
      ) : (
        <div className="p-6 text-center text-theme-muted italic border border-dashed border-theme-border/40 rounded-none bg-theme-bg">
          {t("gameViewer.noEmbeddingActivity") || "No active embedding tasks."}
        </div>
      )}
    </div>
  );
};
