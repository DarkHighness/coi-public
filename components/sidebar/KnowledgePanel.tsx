import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { KnowledgeEntry } from "../../types";
import { DetailedListModal } from "../DetailedListModal";

interface KnowledgePanelProps {
  knowledge: KnowledgeEntry[];
  themeFont: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  landscape: "🏔️",
  history: "📜",
  item: "💎",
  legend: "⚔️",
  faction: "🏛️",
  culture: "🎭",
  magic: "✨",
  technology: "⚙️",
  other: "📖",
};

export const KnowledgePanel: React.FC<KnowledgePanelProps> = ({
  knowledge,
  themeFont,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedKnowledge, setExpandedKnowledge] = useState<
    Set<string | number>
  >(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalExpandedKnowledge, setModalExpandedKnowledge] = useState<
    Set<string | number>
  >(new Set());

  const DISPLAY_LIMIT = 4; // Show limited number in sidebar

  const toggleKnowledge = (
    knowledgeId: string | number,
    isModal: boolean = false,
  ) => {
    const setter = isModal ? setModalExpandedKnowledge : setExpandedKnowledge;
    setter((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(knowledgeId)) {
        newSet.delete(knowledgeId);
      } else {
        newSet.add(knowledgeId);
      }
      return newSet;
    });
  };

  const renderKnowledge = (
    k: KnowledgeEntry,
    expandedSet: Set<string | number>,
    isModal: boolean,
  ) => (
    <div
      key={k.id}
      className="bg-theme-surface-highlight/30 rounded border border-theme-border overflow-hidden transition-all duration-300 mb-2"
    >
      <div
        className="p-3 cursor-pointer hover:bg-theme-surface-highlight/50 transition-colors flex items-start justify-between gap-2"
        onClick={() => toggleKnowledge(k.id, isModal)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-sm"
              title={t(`knowledgePanel.category.${k.category}`)}
            >
              {CATEGORY_ICONS[k.category] || "📖"}
            </span>
            <h4 className="font-bold text-theme-text text-sm leading-tight truncate">
              {k.title}
            </h4>
          </div>
          <p className="text-[10px] text-theme-muted truncate opacity-80 pl-6">
            {k.visible?.description || "No description"}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-theme-muted transition-transform duration-200 mt-1 ${expandedSet.has(k.id) ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedSet.has(k.id) ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="p-3 pt-0 text-xs text-theme-muted/90 italic leading-relaxed border-t border-theme-border/30 mt-1">
          <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-0.5">
            {t("description") || "Description"}
          </span>
          <p className="pl-1 mb-2">{k.visible?.description}</p>

          {k.visible?.details && (
            <div className="mt-2 pt-2 border-t border-theme-border/30">
              <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-0.5">
                {t("details") || "Details"}
              </span>
              <div className="pl-1">
                <p>{k.visible.details}</p>
              </div>
            </div>
          )}
          {k.discoveredAt && (
            <div className="mt-2 pt-2 border-t border-theme-border/30 flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold">
                {t("knowledgePanel.discovered") || "Discovered"}
              </span>
              <span className="text-[10px] text-theme-muted opacity-80">
                {k.discoveredAt}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Group by category for display
  const knowledgeByCategory: Record<string, KnowledgeEntry[]> = {};
  knowledge.forEach((k) => {
    if (!knowledgeByCategory[k.category]) {
      knowledgeByCategory[k.category] = [];
    }
    knowledgeByCategory[k.category].push(k);
  });

  // Flatten for display limit
  const displayKnowledge = knowledge.slice(0, DISPLAY_LIMIT);

  return (
    <div>
      <div
        className={`flex items-center justify-between ${isOpen ? "mb-3" : "mb-0"}`}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center text-theme-primary uppercase text-xs font-bold tracking-widest group ${themeFont}`}
        >
          <span className="w-2 h-2 bg-theme-primary rounded-full mr-2 animate-pulse"></span>
          {t("knowledgePanel.title")}
          <span className="ml-2 text-[10px] text-theme-muted bg-theme-surface-highlight px-1.5 rounded border border-theme-border">
            {knowledge.length}
          </span>
        </button>

        <div className="flex items-center gap-2">
          {knowledge.length > DISPLAY_LIMIT && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="text-theme-muted hover:text-theme-primary p-1"
              title={t("viewAll")}
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-theme-muted hover:text-theme-primary p-1"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
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
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-2 animate-[fade-in_0.3s_ease-in]">
          {displayKnowledge.map((k) =>
            renderKnowledge(k, expandedKnowledge, false),
          )}

          {knowledge.length === 0 && (
            <div className="text-theme-muted text-xs italic p-3 border border-dashed border-theme-border/50 rounded text-center bg-theme-surface-highlight/10">
              {t("knowledgePanel.empty")}
            </div>
          )}
        </div>
      )}

      <DetailedListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("knowledgePanel.title")}
        items={knowledge}
        themeFont={themeFont}
        searchFilter={(item, query) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          (item.visible?.description || "")
            .toLowerCase()
            .includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
        }
        renderItem={(item) =>
          renderKnowledge(item, modalExpandedKnowledge, true)
        }
      />
    </div>
  );
};
