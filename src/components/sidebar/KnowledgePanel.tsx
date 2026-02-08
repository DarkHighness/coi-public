import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { KnowledgeEntry, ListState } from "../../types";
import { DetailedListModal } from "../DetailedListModal";
import { getValidIcon, isValidEmoji } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { useListManagement } from "../../hooks/useListManagement";
import { useOptionalRuntimeContext } from "../../runtime/context";

interface KnowledgePanelProps {
  knowledge: KnowledgeEntry[];
  themeFont: string;
  listState: ListState;
  onUpdateList: (newState: ListState) => void;
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
  isPinned?: boolean;
  onPin?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isEditMode?: boolean;
  isDragging?: boolean;
}

const KnowledgeItem: React.FC<KnowledgeItemProps> = ({
  k,
  expandedSet,
  isModal,
  onToggle,
  t,
  isPinned,
  onPin,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  isEditMode,
  isDragging,
}) => {
  const engine = useOptionalRuntimeContext();
  const clearHighlight = engine?.actions.clearHighlight;
  const [isHighlight, setIsHighlight] = useState(k.highlight || false);

  useEffect(() => {
    setIsHighlight(k.highlight || false);
  }, [k.highlight]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(k.id, isModal);
    if (isHighlight) {
      setIsHighlight(false);
      clearHighlight?.({ kind: "knowledge", id: k.id.toString() });
    }
  };

  const handleDragEnd = () => {
    // Cleanup is handled by parent
  };

  return (
    <div
      className={`relative border-l-2 border-b border-theme-divider/60 transition-colors pb-2
        ${isHighlight ? "animate-pulse ring-1 ring-theme-primary/40" : ""}
        ${isDragging ? "opacity-60" : ""}
        ${isEditMode ? "cursor-grab active:cursor-grabbing" : ""}
      `}
      draggable={isEditMode}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={handleDragEnd}
    >
      <div
        className="py-2 pl-2 pr-1 min-h-[2.25rem] cursor-pointer hover:bg-theme-surface-highlight/20 transition-colors flex items-center justify-between gap-3"
        onClick={handleToggle}
      >
        {/* Pin button - only show in edit mode or if pinned */}
        {(isEditMode || isPinned) && onPin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className={`p-1 rounded transition-colors shrink-0 ${
              isPinned
                ? "text-theme-primary"
                : "text-theme-text-secondary hover:text-theme-primary"
            }`}
            title={isPinned ? t("unpin") : t("pin")}
          >
            <svg
              className="w-3 h-3"
              fill={isPinned ? "currentColor" : "none"}
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="ui-emoji-slot">
              {isValidEmoji(k.icon)
                ? k.icon
                : CATEGORY_ICONS[k.category] || "📖"}
            </span>
            <h4 className="text-xs font-bold text-theme-primary flex items-center gap-2 min-w-0">
              <span className="truncate">{k.title}</span>
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
          className={`w-5 h-5 text-theme-text-secondary shrink-0 transition-transform duration-300 ${
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
          <div className="pt-2 pb-3 pl-2 pr-1 text-xs text-theme-text-secondary leading-relaxed border-t border-theme-divider/60 mt-1">
            <div className="mt-3">
              <span className="text-xs uppercase tracking-wider text-theme-primary font-bold block mb-1">
                {t("description") || "Description"}
              </span>
              <div className="pl-2 border-l-2 border-theme-divider/60 text-theme-text/90">
                <MarkdownText
                  content={k.visible?.description || ""}
                  indentSize={2}
                />
              </div>
            </div>

            {k.visible?.details && (
              <div className="mt-4 pt-3 border-t border-theme-divider/60">
                <span className="text-xs uppercase tracking-wider text-theme-primary font-bold block mb-1">
                  {t("details") || "Details"}
                </span>
                <div className="pl-2 border-l-2 border-theme-divider/60 text-theme-text/90">
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
                <div className="text-theme-text/90 pl-2 border-l-2 border-theme-unlocked/30">
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
              <div className="mt-3 pt-2 border-t border-theme-divider/60 flex justify-between items-center">
                <span className="text-xs uppercase tracking-wider text-theme-primary font-bold">
                  {t("knowledgePanel.discovered") || "Discovered"}
                </span>
                <span className="text-xs text-theme-text-secondary">
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
  listState,
  onUpdateList,
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const safeKnowledge = Array.isArray(knowledge) ? knowledge : [];

  const {
    visibleItems,
    allItems,
    togglePin,
    toggleHide,
    reorderItem,
    isPinned,
    isHidden,
  } = useListManagement(safeKnowledge, listState, onUpdateList);

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
            <span className="ml-2 text-xs text-theme-text-secondary bg-theme-surface-highlight px-2 py-0.5 rounded border border-theme-divider/60">
              {knowledge.length}
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
                : "text-theme-text-secondary hover:text-theme-primary"
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
              className="text-theme-text-secondary hover:text-theme-primary p-1"
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

          <div className="text-theme-text-secondary group-hover:text-theme-primary p-1 transition-colors">
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
        <div className="space-y-2 animate-[fade-in_0.3s_ease-in]">
          {visibleItems.length === 0 ? (
            <div className="text-theme-text-secondary text-xs italic py-3 text-center border-t border-theme-divider/60">
              {t("knowledgePanel.empty")}
            </div>
          ) : (
            visibleItems.map((k) => (
              <KnowledgeItem
                key={k.id}
                k={k}
                expandedSet={expandedKnowledge}
                isModal={false}
                onToggle={toggleKnowledge}
                t={t}
                onDragStart={
                  isEditMode ? (e) => handleDragStart(e, k.id) : undefined
                }
                onDragEnter={
                  isEditMode ? (e) => handleDragEnter(e, k.id) : undefined
                }
                onDragOver={isEditMode ? handleDragOver : undefined}
                onDrop={isEditMode ? (e) => handleDrop(e, k.id) : undefined}
                isEditMode={isEditMode}
                isDragging={draggedId === k.id.toString()}
              />
            ))
          )}
        </div>
      )}

      <DetailedListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("knowledgePanel.title")}
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
            .includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
        }
        renderItem={(item, dragOptions) => (
          <KnowledgeItem
            key={item.id}
            k={item}
            expandedSet={modalExpandedKnowledge}
            isModal={true}
            onToggle={toggleKnowledge}
            t={t}
            isEditMode={dragOptions?.isEditMode}
            isDragging={dragOptions?.isDragging}
            onDragStart={dragOptions?.onDragStart}
            onDragEnter={dragOptions?.onDragEnter}
            onDragOver={dragOptions?.onDragOver}
            onDrop={dragOptions?.onDrop}
          />
        )}
      />
    </div>
  );
};
