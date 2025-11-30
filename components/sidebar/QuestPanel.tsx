import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Quest } from "../../types";
import { DetailedListModal } from "../DetailedListModal";
import { getValidIcon } from "../../utils/emojiValidator";

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

  const toggleQuest = (questId: string | number, isModal: boolean = false) => {
    const idStr = questId.toString();
    const setter = isModal ? setModalExpandedQuests : setExpandedQuests;
    setter((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(idStr)) {
        newSet.delete(idStr);
      } else {
        newSet.add(idStr);
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
      className={`bg-theme-surface-highlight/30 rounded border border-theme-border overflow-hidden transition-all duration-300 mb-2 ${
        q.type === "main"
          ? "border-l-4 border-l-theme-primary"
          : "border-l-4 border-l-theme-muted"
      }`}
    >
      <div
        className="p-3 cursor-pointer hover:bg-theme-surface-highlight/50 transition-colors flex items-start justify-between gap-2"
        onClick={() => toggleQuest(q.id, isModal)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${
                q.type === "main"
                  ? "bg-theme-primary/10 text-theme-primary border-theme-primary/30"
                  : "bg-theme-muted/10 text-theme-muted border-theme-muted/30"
              }`}
            >
              {q.type === "main"
                ? t("mainQuest") || "Main"
                : t("sideQuest") || "Side"}
            </span>
            <span
              className="font-bold text-theme-text text-xs break-words whitespace-normal"
              title={q.title}
            >
              <span className="mr-1">
                {getValidIcon(q.icon, q.type === "main" ? "🎯" : "📜")}
              </span>
              {q.title}
            </span>
            {/* Unlocked indicator */}
            {q.unlocked && (
              <span
                className="text-theme-unlocked"
                title={t("unlocked") || "Unlocked"}
              >
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-theme-muted transition-transform duration-200 mt-1 ${expandedSet.has(q.id.toString()) ? "rotate-180" : ""}`}
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
          expandedSet.has(q.id.toString())
            ? "grid-rows-[1fr]"
            : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-3 pt-0 text-xs text-theme-muted/90 italic leading-relaxed border-t border-theme-border/30 mt-1">
            <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-0.5">
              {t("questPanel.description") || "Description"}
            </span>
            <p className="pl-1">
              {q.visible?.description || t("noDescription") || "No description"}
            </p>

            {/* Hidden content - only shown when unlocked */}
            {q.unlocked && q.hidden && (
              <div className="mt-3 space-y-2 border-t border-theme-unlocked/20 pt-2">
                <div className="flex items-center gap-1 text-theme-unlocked text-[10px] uppercase tracking-wider font-bold mb-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t("questPanel.hiddenTruth") || "Hidden Truth"}
                </div>

                {/* True Description */}
                {q.hidden.trueDescription && (
                  <div className="pl-1">
                    <span className="text-[10px] uppercase tracking-wider text-theme-danger/80 font-bold block mb-0.5">
                      {t("questPanel.trueDescription") || "True Description"}
                    </span>
                    <p className="text-theme-danger/80 not-italic">
                      {q.hidden.trueDescription}
                    </p>
                  </div>
                )}

                {/* True Objectives */}
                {q.hidden.trueObjectives &&
                  q.hidden.trueObjectives.length > 0 && (
                    <div className="pl-1">
                      <span className="text-[10px] uppercase tracking-wider text-theme-danger/80 font-bold block mb-0.5">
                        {t("questPanel.trueObjectives") || "True Objectives"}
                      </span>
                      <ul className="list-disc list-inside text-theme-danger/80 not-italic">
                        {q.hidden.trueObjectives.map((obj, idx) => (
                          <li key={idx}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Secret Outcome */}
                {q.hidden.secretOutcome && (
                  <div className="pl-1">
                    <span className="text-[10px] uppercase tracking-wider text-theme-secret/80 font-bold block mb-0.5">
                      {t("questPanel.secretOutcome") || "Secret Outcome"}
                    </span>
                    <p className="text-theme-secret/80 not-italic">
                      {q.hidden.secretOutcome}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

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
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-theme-primary rounded-full animate-pulse"></span>
            {t("questPanel.title")}
            <span className="ml-2 text-[10px] text-theme-muted bg-theme-surface-highlight px-1.5 rounded border border-theme-border">
              {allQuests.length}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {allQuests.length > DISPLAY_LIMIT && (
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
          <div className="text-theme-muted group-hover:text-theme-primary p-1 transition-colors">
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${
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

      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-3">
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
              <div className="text-theme-muted text-xs italic p-3 border border-dashed border-theme-border/50 rounded text-center bg-theme-surface-highlight/10">
                {t("questPanel.empty")}
              </div>
            )}
          </div>
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
          (item.visible?.description || "")
            .toLowerCase()
            .includes(query.toLowerCase())
        }
        renderItem={(item) => renderQuest(item, modalExpandedQuests, true)}
      />
    </div>
  );
};
