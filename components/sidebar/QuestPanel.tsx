import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Quest } from "../../types";
import { DetailedListModal } from "../DetailedListModal";

interface QuestPanelProps {
  quests: Quest[];
  themeFont: string;
}

export const QuestPanel: React.FC<QuestPanelProps> = ({
  quests,
  themeFont,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedQuests, setExpandedQuests] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalExpandedQuests, setModalExpandedQuests] = useState<Set<string>>(
    new Set(),
  );

  const activeQuests = quests.filter(
    (q) => q.status === "active" && q.type !== "hidden",
  );
  const mainQuests = activeQuests.filter((q) => q.type === "main");
  const sideQuests = activeQuests.filter((q) => q.type === "side");
  const allQuests = [...mainQuests, ...sideQuests];
  const DISPLAY_LIMIT = 3; // Lower limit for quests as they are large

  const toggleQuest = (questId: string, isModal: boolean = false) => {
    const setter = isModal ? setModalExpandedQuests : setExpandedQuests;
    setter((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questId)) {
        newSet.delete(questId);
      } else {
        newSet.add(questId);
      }
      return newSet;
    });
  };

  const renderQuest = (
    q: Quest,
    expandedSet: Set<string>,
    isModal: boolean,
  ) => (
    <div
      key={q.id}
      className="bg-theme-surface-highlight/50 p-4 rounded border border-theme-border text-theme-text text-sm leading-relaxed border-l-4 border-l-theme-primary relative group cursor-pointer hover:bg-theme-surface-highlight/70 transition-colors mb-2 overflow-visible"
      onClick={() => toggleQuest(q.id, isModal)}
    >
      <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity bg-theme-bg border border-theme-primary text-[10px] px-1.5 py-0.5 rounded text-theme-primary uppercase shadow-lg">
        {q.type === "main" ? t("questPanel.main") : t("questPanel.side")}
      </div>
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-theme-primary mb-1 flex-1">{q.title}</h4>
        <svg
          className={`w-4 h-4 text-theme-primary transition-transform duration-200 ${expandedSet.has(q.id) ? "rotate-180" : ""}`}
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
      {expandedSet.has(q.id) && (
        <p className="italic opacity-90 mt-2 animate-[fade-in_0.3s_ease-in]">
          {q.description}
        </p>
      )}
    </div>
  );

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`text-left text-theme-primary uppercase text-xs font-bold tracking-widest flex items-center group ${themeFont}`}
        >
          <span className="w-2 h-2 bg-theme-primary rounded-full mr-2 animate-pulse"></span>
          {t("questPanel.title")}
        </button>

        <div className="flex items-center gap-2">
          {allQuests.length > DISPLAY_LIMIT && (
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
        className={`transition-all duration-500 ease-in-out ${isOpen ? "max-h-[500px] opacity-100 overflow-y-auto" : "max-h-0 opacity-0 overflow-hidden"}`}
      >
        <div className="space-y-4 pr-1">
          {/* Main Quests */}
          {mainQuests
            .slice(0, DISPLAY_LIMIT)
            .map((q) => renderQuest(q, expandedQuests, false))}

          {/* Side Quests (only if space permits) */}
          {mainQuests.length < DISPLAY_LIMIT &&
            sideQuests
              .slice(0, DISPLAY_LIMIT - mainQuests.length)
              .map((q) => renderQuest(q, expandedQuests, false))}

          {allQuests.length === 0 && (
            <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border rounded text-center opacity-50">
              {t("questPanel.empty")}
            </p>
          )}
        </div>
      </div>

      <DetailedListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("questPanel.title")}
        items={allQuests}
        themeFont={themeFont}
        searchFilter={(item, query) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase())
        }
        renderItem={(item) => renderQuest(item, modalExpandedQuests, true)}
      />
    </div>
  );
};
