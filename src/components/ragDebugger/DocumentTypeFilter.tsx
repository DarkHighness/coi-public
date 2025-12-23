import React from "react";
import { useTranslation } from "react-i18next";
import type { DocumentType } from "../../services/rag";

interface DocumentTypeFilterProps {
  value: DocumentType | "all";
  onChange: (type: DocumentType | "all") => void;
  className?: string;
}

export const DocumentTypeFilter: React.FC<DocumentTypeFilterProps> = ({
  value,
  onChange,
  className = "",
}) => {
  const { t } = useTranslation();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as DocumentType | "all")}
      className={`bg-theme-surface border border-theme-border rounded px-3 py-1.5 text-sm text-theme-text focus:outline-none focus:border-theme-primary ${className}`}
    >
      <option value="all">{t("ragDebugger.allTypes", "All Types")}</option>
      <option value="story">{t("ragDebugger.filters.story")}</option>
      <option value="npc">{t("ragDebugger.filters.npc")}</option>
      <option value="location">{t("ragDebugger.filters.location")}</option>
      <option value="item">{t("ragDebugger.filters.item")}</option>
      <option value="knowledge">{t("ragDebugger.filters.knowledge")}</option>
      <option value="quest">{t("ragDebugger.filters.quest")}</option>
      <option value="event">{t("ragDebugger.filters.event")}</option>
    </select>
  );
};
