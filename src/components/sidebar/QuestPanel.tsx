import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Quest, ListState } from "../../types";
import { DetailedListModal } from "../DetailedListModal";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { useListManagement } from "../../hooks/useListManagement";

interface QuestPanelProps {
  quests: Quest[];
  themeFont: string;
  listState: ListState;
  onUpdateList: (newState: ListState) => void;
}

export const QuestPanel: React.FC<QuestPanelProps> = ({
  quests,
  themeFont,
  listState,
  onUpdateList,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedQuests, setExpandedQuests] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalExpandedQuests, setModalExpandedQuests] = useState<Set<string>>(
    new Set(),
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const activeQuests = quests.filter(
    (q) => q.status === "active" && q.type !== "hidden",
  );
  const safeQuests = Array.isArray(activeQuests) ? activeQuests : [];

  const {
    visibleItems,
    allItems,
    togglePin,
    toggleHide,
    reorderItem,
    isPinned,
    isHidden,
  } = useListManagement(safeQuests, listState, onUpdateList);

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

  const handleDragStart = (e: React.DragEvent, id: string | number) => {
    const idStr = id.toString();
    setDraggedId(idStr);
    e.dataTransfer.setData("text/plain", idStr);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string | number) => {
    const targetIdStr = targetId.toString();
    if (!isEditMode || !draggedId || draggedId === targetIdStr) return;
    reorderItem(draggedId, targetIdStr);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string | number) => {
    e.preventDefault();
    // Final reorder is already done by dragEnter, just clear state
    setDraggedId(null);
  };

  const renderQuest = (
    q: Quest,
    expandedSet: Set<string>,
    isModal: boolean,
    options?: {
      isPinned?: boolean;
      onPin?: () => void;
      onDragStart?: (e: React.DragEvent) => void;
      onDragEnter?: (e: React.DragEvent) => void;
      onDragOver?: (e: React.DragEvent) => void;
      onDrop?: (e: React.DragEvent) => void;
      isDragging?: boolean;
      isEditMode?: boolean;
    },
  ) => {
    // Use options.isEditMode for modal, component-level isEditMode for sidebar
    const effectiveEditMode = isModal ? options?.isEditMode : isEditMode;

    return (
      <div
        key={q.id}
        className={`bg-theme-surface-highlight/30 rounded border border-theme-border overflow-hidden transition-all duration-300 mb-2 ${
          q.type === "main"
            ? "border-l-4 border-l-theme-primary"
            : "border-l-4 border-l-theme-muted"
        } ${options?.isDragging ? "opacity-50 scale-95" : ""} ${
          effectiveEditMode ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        draggable={effectiveEditMode}
        onDragStart={options?.onDragStart}
        onDragEnter={options?.onDragEnter}
        onDragOver={options?.onDragOver}
        onDrop={options?.onDrop}
        onDragEnd={handleDragEnd}
      >
        <div
          className="p-3 cursor-pointer hover:bg-theme-surface-highlight/50 transition-colors flex items-start justify-between gap-2"
          onClick={() => toggleQuest(q.id, isModal)}
        >
          {/* Pin button - only show in edit mode or if pinned */}
          {(effectiveEditMode || options?.isPinned) && options?.onPin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                options.onPin!();
              }}
              className={`p-1 rounded transition-colors shrink-0 mt-0.5 ${
                options?.isPinned
                  ? "text-theme-primary"
                  : "text-theme-muted hover:text-theme-primary"
              }`}
              title={options?.isPinned ? t("unpin") : t("pin")}
            >
              <svg
                className="w-3 h-3"
                fill={options?.isPinned ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>
          )}
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
                      d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z"
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
              <div className="pl-1 text-theme-muted/90">
                <MarkdownText
                  content={
                    q.visible?.description ||
                    t("noDescription") ||
                    "No description"
                  }
                  indentSize={2}
                />
              </div>

              {/* Hidden content - only shown when unlocked */}
              {q.unlocked && q.hidden && (
                <div className="mt-3 space-y-2 border-t border-theme-unlocked/20 pt-2 bg-theme-surface/50 rounded">
                  <div className="flex items-center gap-1 text-theme-unlocked text-[10px] uppercase tracking-wider font-bold mb-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z"
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
                      <div className="text-theme-danger/80 not-italic pl-1">
                        <MarkdownText
                          content={q.hidden.trueDescription}
                          indentSize={2}
                        />
                      </div>
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
                            <li key={idx}>
                              <MarkdownText
                                content={obj}
                                indentSize={2}
                                inline
                              />
                            </li>
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
                      <div className="text-theme-secret/80 not-italic pl-1">
                        <MarkdownText
                          content={q.hidden.secretOutcome}
                          indentSize={2}
                        />
                      </div>
                    </div>
                  )}

                  {/* Twist - Hidden Complication */}
                  {q.hidden.twist && (
                    <div className="pl-1">
                      <span className="text-[10px] uppercase tracking-wider text-amber-500/80 font-bold block mb-0.5">
                        ⚠️ {t("gameViewer.twist") || "Twist"}
                      </span>
                      <div className="text-amber-400/80 not-italic pl-1">
                        <MarkdownText content={q.hidden.twist} indentSize={2} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

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
              {allItems.length}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditMode(!isEditMode);
            }}
            className={`p-1 rounded transition-colors ${
              isEditMode
                ? "bg-theme-primary text-theme-bg"
                : "text-theme-muted hover:text-theme-primary"
            }`}
            title={isEditMode ? t("done") : t("edit")}
          >
            {isEditMode ? (
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
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
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            )}
          </button>

          {allItems.length > 0 && (
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
            {visibleItems.length === 0 ? (
              <div className="text-theme-muted text-xs italic p-3 border border-dashed border-theme-border/50 rounded text-center bg-theme-surface-highlight/10">
                {t("questPanel.empty")}
              </div>
            ) : (
              visibleItems.map((q) =>
                renderQuest(q, expandedQuests, false, {
                  onDragStart: isEditMode
                    ? (e) => handleDragStart(e, q.id)
                    : undefined,
                  onDragEnter: isEditMode
                    ? (e) => handleDragEnter(e, q.id)
                    : undefined,
                  onDragOver: isEditMode ? handleDragOver : undefined,
                  onDrop: isEditMode ? (e) => handleDrop(e, q.id) : undefined,
                  isDragging: draggedId === q.id.toString(),
                }),
              )
            )}
          </div>
        </div>
      </div>

      <DetailedListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("questPanel.title")}
        items={allItems}
        themeFont={themeFont}
        enableEditMode={true}
        onReorderItem={reorderItem}
        onTogglePin={togglePin}
        isPinned={isPinned}
        onToggleHide={toggleHide}
        isHidden={isHidden}
        searchFilter={(item, query) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          (item.visible?.description || "")
            .toLowerCase()
            .includes(query.toLowerCase())
        }
        renderItem={(item, dragOptions) =>
          renderQuest(item, modalExpandedQuests, true, {
            onDragStart: dragOptions?.onDragStart,
            onDragEnter: dragOptions?.onDragEnter,
            onDragOver: dragOptions?.onDragOver,
            onDrop: dragOptions?.onDrop,
            isDragging: dragOptions?.isDragging,
            isEditMode: dragOptions?.isEditMode,
          })
        }
      />
    </div>
  );
};
