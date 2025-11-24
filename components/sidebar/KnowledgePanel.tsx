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
  tech: "⚙️",
  secret: "🤐",
  person: "🧑",
  other: "📖",
};

interface KnowledgeItemProps {
  k: KnowledgeEntry;
  expandedSet: Set<string | number>;
  isModal: boolean;
  onToggle: (id: string | number, isModal: boolean) => void;
  t: any; // Or specific translation function type
}

const KnowledgeItem: React.FC<KnowledgeItemProps> = ({
  k,
  expandedSet,
  isModal,
  onToggle,
  t,
}) => {
  const [isHighlight, setIsHighlight] = useState(k.highlight || false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(k.id, isModal);
    if (isHighlight) {
      setIsHighlight(false);
    }
  };

  return (
    <div
      className={`bg-theme-surface-highlight/30 rounded border border-theme-border overflow-hidden transition-all duration-300 mb-2
        ${isHighlight ? "animate-pulse ring-2 ring-yellow-400/50" : ""}
      `}
    >
      <div
        className="p-3 cursor-pointer hover:bg-theme-surface-highlight/50 transition-colors flex items-start justify-between gap-2"
        onClick={handleToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{CATEGORY_ICONS[k.category] || "📖"}</span>
            <h4 className="text-sm font-bold text-theme-primary truncate flex items-center gap-2">
              {k.title}
              {k.unlocked && (
                <svg
                  className="w-3.5 h-3.5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                </svg>
              )}
            </h4>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-theme-muted transition-transform duration-300 ${
            expandedSet.has(k.id) ? "rotate-180" : ""
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
          />
        </svg>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          expandedSet.has(k.id) ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        }`}
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

          {/* Unlocked Hidden Truth */}
          {k.unlocked && k.hidden?.fullTruth && (
            <div className="mt-3 text-xs border-l-2 border-yellow-500/50 pl-3 bg-yellow-900/10 py-2 rounded-r">
              <span className="text-[10px] uppercase tracking-wider text-yellow-400 font-bold block mb-1 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                {t("hidden.truth")}
              </span>
              <p className="leading-relaxed text-yellow-200/90">
                {k.hidden.fullTruth}
              </p>

              {k.hidden.misconceptions &&
                k.hidden.misconceptions.length > 0 && (
                  <div className="mt-2">
                    <span className="text-[9px] uppercase tracking-wider text-red-400/70 block mb-0.5">
                      {t("hidden.misconceptions")}:
                    </span>
                    <ul className="list-disc list-inside text-red-200/80 space-y-0.5">
                      {k.hidden.misconceptions.map((misc, i) => (
                        <li key={i}>{misc}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {k.hidden.toBeRevealed && k.hidden.toBeRevealed.length > 0 && (
                <div className="mt-2">
                  <span className="text-[9px] uppercase tracking-wider text-blue-400/70 block mb-0.5">
                    {t("hidden.future")}:
                  </span>
                  <ul className="list-disc list-inside text-blue-200/80 space-y-0.5">
                    {k.hidden.toBeRevealed.map((mystery, i) => (
                      <li key={i}>{mystery}</li>
                    ))}
                  </ul>
                </div>
              )}
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
          {displayKnowledge.map((k) => (
            <KnowledgeItem
              key={k.id}
              k={k}
              expandedSet={expandedKnowledge}
              isModal={false}
              onToggle={toggleKnowledge}
              t={t}
            />
          ))}

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
        renderItem={(item) => (
          <KnowledgeItem
            key={item.id}
            k={item}
            expandedSet={modalExpandedKnowledge}
            isModal={true}
            onToggle={toggleKnowledge}
            t={t}
          />
        )}
      />
    </div>
  );
};
