import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { KnowledgeEntry } from "../../types";
import { DetailedListModal } from "../DetailedListModal";
import { getValidIcon, isValidEmoji } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";

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
      className={`bg-theme-surface-highlight/30 rounded border border-theme-border overflow-hidden transition-all duration-300 mb-3
        ${isHighlight ? "animate-pulse ring-2 ring-theme-primary/50" : ""}
      `}
    >
      <div
        className="p-3 cursor-pointer hover:bg-theme-surface-highlight/50 transition-colors flex items-center justify-between gap-3"
        onClick={handleToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-xl">
              {isValidEmoji(k.icon)
                ? k.icon
                : CATEGORY_ICONS[k.category] || "📖"}
            </span>
            <h4 className="text-xs font-bold text-theme-primary truncate flex items-center gap-2">
              {k.title}
              {k.unlocked && (
                <svg
                  className="w-3.5 h-3.5 text-theme-primary"
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
          className={`w-5 h-5 text-theme-muted transition-transform duration-300 ${
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
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          expandedSet.has(k.id) ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-0 text-xs text-theme-muted/90 leading-relaxed border-t border-theme-border/30 mt-1">
            <div className="mt-3">
              <span className="text-xs uppercase tracking-wider text-theme-primary font-bold block mb-1">
                {t("description") || "Description"}
              </span>
              <div className="pl-2 border-l-2 border-theme-border/50 text-theme-text/90">
                <MarkdownText
                  content={k.visible?.description || ""}
                  indentSize={2}
                />
              </div>
            </div>

            {k.visible?.details && (
              <div className="mt-4 pt-3 border-t border-theme-border/30">
                <span className="text-xs uppercase tracking-wider text-theme-primary font-bold block mb-1">
                  {t("details") || "Details"}
                </span>
                <div className="pl-2 border-l-2 border-theme-border/50 text-theme-text/90">
                  <MarkdownText content={k.visible.details} indentSize={2} />
                </div>
              </div>
            )}

            {/* Unlocked Hidden Truth - Outer Layer */}
            {k.unlocked && k.hidden?.fullTruth && (
              <div className="mt-4 pt-3 border-t border-theme-unlocked/20">
                <span className="text-xs uppercase tracking-wider text-theme-unlocked font-bold flex items-center gap-1.5 mb-2">
                  <svg
                    className="w-3.5 h-3.5"
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
                <div className="text-theme-text/90 bg-theme-surface/50 p-3 rounded border border-theme-unlocked/20">
                  <MarkdownText content={k.hidden.fullTruth} indentSize={2} />

                  {k.hidden.misconceptions &&
                    k.hidden.misconceptions.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-theme-unlocked/10">
                        <span className="text-xs uppercase tracking-wider text-theme-danger/90 block mb-1">
                          {t("hidden.misconceptions")}:
                        </span>
                        <ul className="list-disc list-inside text-theme-danger/80 space-y-1 pl-2">
                          {k.hidden.misconceptions.map((misc, i) => (
                            <li key={i}>
                              <MarkdownText
                                content={misc}
                                indentSize={2}
                                inline
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {k.hidden.toBeRevealed &&
                    k.hidden.toBeRevealed.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-theme-unlocked/10">
                        <span className="text-xs uppercase tracking-wider text-theme-primary/80 block mb-1">
                          {t("hidden.future")}:
                        </span>
                        <ul className="list-disc list-inside text-theme-primary/80 space-y-1 pl-2">
                          {k.hidden.toBeRevealed.map((mystery, i) => (
                            <li key={i}>
                              <MarkdownText
                                content={mystery}
                                indentSize={2}
                                inline
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            )}

            {k.discoveredAt && (
              <div className="mt-3 pt-2 border-t border-theme-border/30 flex justify-between items-center">
                <span className="text-xs uppercase tracking-wider text-theme-primary font-bold">
                  {t("knowledgePanel.discovered") || "Discovered"}
                </span>
                <span className="text-xs text-theme-muted">
                  {k.discoveredAt}
                </span>
              </div>
            )}
          </div>
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
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between cursor-pointer group ${
          isOpen ? "mb-4" : "mb-0"
        }`}
      >
        <div
          className={`flex items-center text-theme-primary uppercase text-xs font-bold tracking-widest ${themeFont}`}
        >
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-theme-primary rounded-full animate-pulse"></span>
            {t("knowledgePanel.title")}
            <span className="ml-2 text-xs text-theme-muted bg-theme-surface-highlight px-2 py-0.5 rounded border border-theme-border">
              {knowledge.length}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-theme-muted group-hover:text-theme-primary p-1 transition-colors">
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${
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
      </div>

      {isOpen && (
        <div className="space-y-3 animate-[fade-in_0.3s_ease-in]">
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
            <div className="text-theme-muted text-xs italic p-4 border border-dashed border-theme-border/50 rounded text-center bg-theme-surface-highlight/10">
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
