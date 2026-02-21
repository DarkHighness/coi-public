/**
 * EmbeddingTab - RAG embedding status display
 * Shows the status of the retrieval-augmented generation system
 */

import React from "react";
import type { TFunction } from "i18next";
import { EmbeddingProgress } from "../../hooks/useEmbeddingStatus";
import { Section, InfoRow, EntityBlock, SubsectionLabel } from "./helpers";

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
  const progressPercent =
    embeddingProgress && embeddingProgress.total > 0
      ? Math.round((embeddingProgress.current / embeddingProgress.total) * 100)
      : 0;

  return (
    <div className="space-y-3">
      <EntityBlock className="border-b border-theme-divider/70">
        <div className="font-semibold text-theme-text text-xs flex items-center gap-2 mb-2">
          <span className="ui-emoji-slot">🧠</span>
          {t("gameViewer.embeddingStatus") || "Embedding Status"}
        </div>
        <InfoRow
          label={t("gameViewer.description", { defaultValue: "Description" })}
          value={
            t("gameViewer.embeddingDescription") ||
            "View the status of the RAG (Retrieval-Augmented Generation) system."
          }
        />
      </EntityBlock>

      {embeddingProgress ? (
        <Section
          id="embeddingStats"
          title={t("gameViewer.embeddingStats") || "Statistics"}
          icon="📊"
          isExpanded={expandedSections.has("embeddingStats")}
          onToggle={toggleSection}
        >
          <InfoRow
            label={t("embedding.phaseLabel") || "Phase"}
            value={
              t(`embedding.phase.${embeddingProgress.stage}`) ||
              embeddingProgress.stage
            }
          />
          <InfoRow
            label={t("embedding.progress") || "Progress"}
            value={`${embeddingProgress.current} / ${embeddingProgress.total} (${progressPercent}%)`}
          />
          {progressMessage ? (
            <InfoRow
              label={t("gameViewer.message", { defaultValue: "Message" })}
              value={progressMessage}
            />
          ) : null}
          <SubsectionLabel>
            {t("gameViewer.progressBar", { defaultValue: "Progress Bar" })}
          </SubsectionLabel>
          <div className="h-2 bg-theme-bg/50 overflow-hidden border border-theme-divider/60">
            <div
              className="h-full bg-theme-primary transition-all duration-300"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>
        </Section>
      ) : (
        <EntityBlock className="border-b border-theme-divider/70">
          <InfoRow
            label={t("gameViewer.status") || "Status"}
            value={
              t("gameViewer.noEmbeddingActivity") ||
              "No active embedding tasks."
            }
          />
        </EntityBlock>
      )}
    </div>
  );
};
