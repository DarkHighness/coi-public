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
  const [expandedKnowledge, setExpandedKnowledge] = useState<Set<string>>(
    new Set(),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalExpandedKnowledge, setModalExpandedKnowledge] = useState<
    Set<string>
  >(new Set());

  const DISPLAY_LIMIT = 4; // Show limited number in sidebar

  const toggleKnowledge = (knowledgeId: string, isModal: boolean = false) => {
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
    expandedSet: Set<string>,
    isModal: boolean,
  ) => (
    <div
      key={k.id}
      className="bg-theme-surface-highlight/50 p-3 rounded border border-theme-border text-theme-text text-sm leading-relaxed border-l-4 border-l-theme-primary relative group cursor-pointer hover:bg-theme-surface-highlight/70 transition-colors"
      onClick={() => toggleKnowledge(k.id, isModal)}
    >
      <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity bg-theme-bg border border-theme-primary text-[10px] px-1.5 py-0.5 rounded text-theme-primary uppercase shadow-lg">
        {CATEGORY_ICONS[k.category]}{" "}
        {t(`knowledgePanel.category.${k.category}`)}
      </div>
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-bold text-theme-primary flex-1 pr-16">{k.title}</h4>
        <svg
          className={`w-4 h-4 text-theme-primary transition-transform duration-200 ${expandedSet.has(k.id) ? "rotate-180" : ""}`}
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
      <p className="text-xs opacity-80">{k.description}</p>
      {expandedSet.has(k.id) && k.details && (
        <div className="mt-2 pt-2 border-t border-theme-border/30 animate-[fade-in_0.3s_ease-in]">
          <p className="text-xs italic opacity-90">{k.details}</p>
          {k.discoveredAt && (
            <p className="text-[10px] text-theme-muted mt-1">
              {t("knowledgePanel.discovered")}: {k.discoveredAt}
            </p>
          )}
        </div>
      )}
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
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`text-left text-theme-primary uppercase text-xs font-bold tracking-widest flex items-center group ${themeFont}`}
        >
          <span className="w-2 h-2 bg-theme-primary rounded-full mr-2 animate-pulse"></span>
          {t("knowledgePanel.title")}
        </button>

        <div className="flex items-center gap-2">
          {knowledge.length > DISPLAY_LIMIT && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="text-[10px] text-theme-primary hover:text-theme-primary-hover uppercase tracking-wider font-bold border border-theme-primary/50 rounded px-2 py-0.5 transition-colors"
              title={t("viewAll")}
            >
              {t("viewAll") || "View All"}
            </button>
          )}
          <button onClick={() => setIsOpen(!isOpen)}>
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

      <div
        className={`transition-all duration-500 ease-in-out ${isOpen ? "max-h-[600px] opacity-100 overflow-y-auto" : "max-h-0 opacity-0 overflow-hidden"}`}
      >
        <div className="space-y-3 pr-1">
          {displayKnowledge.map((k) =>
            renderKnowledge(k, expandedKnowledge, false),
          )}

          {knowledge.length === 0 && (
            <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border rounded text-center opacity-50">
              {t("knowledgePanel.empty")}
            </p>
          )}
        </div>
      </div>

      <DetailedListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("knowledgePanel.title")}
        items={knowledge}
        themeFont={themeFont}
        searchFilter={(item, query) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
        }
        renderItem={(item) =>
          renderKnowledge(item, modalExpandedKnowledge, true)
        }
      />
    </div>
  );
};
