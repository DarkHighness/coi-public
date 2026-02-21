import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { KnowledgeEntry, ListState } from "../../types";
import { DetailedListModal } from "../DetailedListModal";
import { getValidIcon, isValidEmoji } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { useListManagement } from "../../hooks/useListManagement";
import { useProgressiveRender } from "../../hooks/useProgressiveRender";
import { useOptionalRuntimeContext } from "../../runtime/context";
import { resolveEntityDisplayName } from "../../utils/entityDisplay";
import { SidebarTag } from "./SidebarTag";
import { SidebarEntityRow } from "./SidebarEntityRow";
import { SidebarField, SidebarSection } from "./SidebarSections";
import { SidebarLoadMoreSentinel } from "./SidebarLoadMoreSentinel";
import { pickFirstText } from "./panelText";
import { SidebarPanelHeader } from "./SidebarPanelHeader";

interface KnowledgePanelProps {
  knowledge: KnowledgeEntry[];
  themeFont: string;
  listState: ListState;
  onUpdateList: (newState: ListState) => void;
  listManagementEnabled?: boolean;
  globalEditMode?: boolean;
  expandedItemId?: string | null;
  onExpandItem?: (itemId: string | null) => void;
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
  entry: KnowledgeEntry;
  expandedId: string | number | null;
  isModal: boolean;
  onToggle: (id: string | number, isModal: boolean) => void;
  t: TFunction;
  isPinned?: boolean;
  onPin?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isEditMode?: boolean;
  isDragging?: boolean;
}

const KnowledgeItem: React.FC<KnowledgeItemProps> = ({
  entry,
  expandedId,
  isModal,
  onToggle,
  t,
  isPinned,
  onPin,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  onDragEnd,
  isEditMode,
  isDragging,
}) => {
  const engine = useOptionalRuntimeContext();
  const clearHighlight = engine?.actions.clearHighlight;
  const runtimeGameState = engine?.state.gameState;
  const [isHighlight, setIsHighlight] = useState(entry.highlight || false);

  React.useEffect(() => {
    setIsHighlight(entry.highlight || false);
  }, [entry.highlight]);

  const handleToggle = () => {
    if (isEditMode) {
      return;
    }
    onToggle(entry.id, isModal);
    if (isHighlight) {
      setIsHighlight(false);
      clearHighlight?.({ kind: "knowledge", id: entry.id.toString() });
    }
  };

  const isExpanded =
    expandedId !== null &&
    expandedId !== undefined &&
    expandedId.toString() === entry.id.toString();

  const categoryLabel = t(`knowledgePanel.category.${entry.category}`, {
    defaultValue: entry.category,
  });

  return (
    <div
      className={`${isDragging ? "opacity-60" : ""}`.trim()}
      draggable={Boolean(isEditMode)}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {isEditMode && onPin ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
          className={`absolute right-8 mt-2 z-10 p-1 rounded transition-colors ${
            isPinned
              ? "text-theme-primary"
              : "text-theme-text-secondary hover:text-theme-primary"
          }`}
          title={isPinned ? t("unpin") : t("pin")}
        >
          <svg
            className="w-3.5 h-3.5"
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
      ) : null}

      <SidebarEntityRow
        title={entry.title}
        icon={
          isValidEmoji(entry.icon)
            ? entry.icon
            : getValidIcon(CATEGORY_ICONS[entry.category], "📖")
        }
        tags={
          <>
            <SidebarTag className="text-theme-text-secondary border-theme-divider/70 text-[10px]">
              {categoryLabel}
            </SidebarTag>
            {entry.unlocked ? (
              <SidebarTag className="text-theme-primary border-theme-primary/60">
                {t("unlocked") || "Unlocked"}
              </SidebarTag>
            ) : null}
          </>
        }
        summary={pickFirstText(
          entry.visible?.description,
          entry.visible?.details,
          entry.hidden?.fullTruth,
        )}
        isExpanded={isExpanded}
        onToggle={handleToggle}
        className={isHighlight ? "ring-1 ring-theme-primary/40" : ""}
        accentClassName={
          isExpanded ? "border-l-theme-primary/70" : "border-l-theme-divider/70"
        }
      >
        <div className="pl-2 pr-1 pb-3 text-xs text-theme-text">
          <SidebarSection title={t("visible") || "Visible"} withDivider={false}>
            <SidebarField label={t("description") || "Description"}>
              <MarkdownText
                content={
                  entry.visible?.description ||
                  t("noDescription") ||
                  "No description"
                }
                indentSize={2}
              />
            </SidebarField>

            {entry.visible?.details ? (
              <SidebarField label={t("details") || "Details"}>
                <MarkdownText content={entry.visible.details} indentSize={2} />
              </SidebarField>
            ) : null}

            {entry.relatedTo?.length ? (
              <SidebarField label={t("relatedTo") || "Related"}>
                <div className="flex flex-wrap gap-1.5">
                  {entry.relatedTo.map((related) => (
                    <SidebarTag
                      key={related}
                      className="text-theme-text-secondary border-theme-divider/70 text-[10px] normal-case tracking-normal"
                      title={related}
                    >
                      {runtimeGameState
                        ? resolveEntityDisplayName(related, runtimeGameState)
                        : related}
                    </SidebarTag>
                  ))}
                </div>
              </SidebarField>
            ) : null}
          </SidebarSection>

          {entry.unlocked && entry.hidden ? (
            <SidebarSection
              title={t("hidden.truth") || "Hidden"}
              className="sidebar-hidden-divider"
            >
              {entry.hidden.fullTruth ? (
                <SidebarField label={t("hidden.truth") || "Truth"}>
                  <MarkdownText
                    content={entry.hidden.fullTruth}
                    indentSize={2}
                  />
                </SidebarField>
              ) : null}

              {entry.hidden.misconceptions?.length ? (
                <SidebarField
                  label={t("hidden.misconceptions") || "Misconceptions"}
                >
                  <ul className="list-disc list-inside space-y-1">
                    {entry.hidden.misconceptions.map((item, index) => (
                      <li key={`${item}-${index}`}>
                        <MarkdownText content={item} indentSize={2} inline />
                      </li>
                    ))}
                  </ul>
                </SidebarField>
              ) : null}

              {entry.hidden.toBeRevealed?.length ? (
                <SidebarField label={t("hidden.future") || "To Be Revealed"}>
                  <ul className="list-disc list-inside space-y-1">
                    {entry.hidden.toBeRevealed.map((item, index) => (
                      <li key={`${item}-${index}`}>
                        <MarkdownText content={item} indentSize={2} inline />
                      </li>
                    ))}
                  </ul>
                </SidebarField>
              ) : null}

              {entry.unlockReason ? (
                <SidebarField label={t("unlockReason") || "Unlock Reason"}>
                  <MarkdownText content={entry.unlockReason} indentSize={2} />
                </SidebarField>
              ) : null}
            </SidebarSection>
          ) : null}

          <SidebarSection title={t("meta") || "Meta"}>
            {entry.discoveredAt ? (
              <SidebarField
                label={t("knowledgePanel.discovered") || "Discovered"}
              >
                {entry.discoveredAt}
              </SidebarField>
            ) : null}
            <SidebarField
              label={t("knowledgePanel.category.title") || "Category"}
            >
              {categoryLabel}
            </SidebarField>
          </SidebarSection>
        </div>
      </SidebarEntityRow>
    </div>
  );
};

const KnowledgePanelComponent: React.FC<KnowledgePanelProps> = ({
  knowledge,
  themeFont,
  listState,
  onUpdateList,
  listManagementEnabled = true,
  globalEditMode,
  expandedItemId,
  onExpandItem,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [localExpandedKnowledgeId, setLocalExpandedKnowledgeId] = useState<
    string | number | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalExpandedKnowledgeId, setModalExpandedKnowledgeId] = useState<
    string | number | null
  >(null);
  const [isLocalEditMode, setIsLocalEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const listManagementActive = listManagementEnabled && (isOpen || isModalOpen);
  const isEditMode = globalEditMode ?? isLocalEditMode;
  const allowPanelEditToggle = globalEditMode === undefined;
  const expandedKnowledgeId =
    expandedItemId !== undefined ? expandedItemId : localExpandedKnowledgeId;

  const {
    visibleItems: managedVisibleItems,
    allItems,
    togglePin,
    toggleHide,
    reorderItem,
    isPinned,
    isHidden,
  } = useListManagement(knowledge, listState, onUpdateList, {
    enabled: listManagementActive,
  });

  const { visibleItems, hasMore, loadMore } = useProgressiveRender(
    managedVisibleItems,
    30,
    isOpen,
  );

  const toggleKnowledge = (knowledgeId: string | number, isModal = false) => {
    const targetId = knowledgeId.toString();
    if (isModal) {
      setModalExpandedKnowledgeId((prev) =>
        prev?.toString() === targetId ? null : targetId,
      );
      return;
    }
    const currentId =
      expandedKnowledgeId === null || expandedKnowledgeId === undefined
        ? null
        : expandedKnowledgeId.toString();
    const next = currentId === targetId ? null : targetId;
    if (onExpandItem) {
      onExpandItem(next);
      return;
    }
    setLocalExpandedKnowledgeId(next);
  };

  const handleDragStart = (e: React.DragEvent, id: string | number) => {
    const idStr = id.toString();
    setDraggedId(idStr);
    e.dataTransfer.setData("text/plain", idStr);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (_e: React.DragEvent, targetId: string | number) => {
    const targetIdStr = targetId.toString();
    if (!isEditMode || !draggedId || draggedId === targetIdStr) return;
    reorderItem(draggedId, targetIdStr);
  };

  const clearDragState = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div>
      <SidebarPanelHeader
        title={t("knowledgePanel.title")}
        icon={<span className="w-2 h-2 bg-theme-primary rounded-full" />}
        count={knowledge.length}
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        themeFont={themeFont}
        openMarginClassName="mb-4"
        actions={
          <>
            {allowPanelEditToggle ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLocalEditMode(!isEditMode);
                }}
                className={`h-8 w-8 grid place-items-center rounded transition-colors ${
                  isEditMode
                    ? "bg-theme-primary text-theme-bg"
                    : "text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface-highlight/15"
                }`}
                title={isEditMode ? t("done") : t("edit")}
              >
                {isEditMode ? (
                  <svg
                    className="w-4 h-4"
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
                    className="w-4 h-4"
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
            ) : null}
            {isEditMode && allItems.length > 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalOpen(true);
                }}
                className="h-8 w-8 grid place-items-center rounded text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors"
                title={t("viewAll")}
              >
                <svg
                  className="w-4 h-4"
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
            ) : null}
          </>
        }
      />

      {isOpen && (
        <div className="space-y-2 animate-sidebar-expand">
          {visibleItems.length === 0 ? (
            <div className="text-theme-text-secondary text-xs italic py-3 text-center border-t border-theme-divider/60">
              {t("knowledgePanel.empty")}
            </div>
          ) : (
            <>
              {visibleItems.map((entry) => (
                <KnowledgeItem
                  key={entry.id}
                  entry={entry}
                  expandedId={expandedKnowledgeId}
                  isModal={false}
                  onToggle={toggleKnowledge}
                  t={t}
                  isPinned={isPinned(entry.id)}
                  onPin={() => togglePin(entry.id)}
                  onDragStart={
                    isEditMode ? (e) => handleDragStart(e, entry.id) : undefined
                  }
                  onDragEnter={
                    isEditMode ? (e) => handleDragEnter(e, entry.id) : undefined
                  }
                  onDragOver={isEditMode ? handleDragOver : undefined}
                  onDrop={
                    isEditMode
                      ? (e) => {
                          e.preventDefault();
                          clearDragState();
                        }
                      : undefined
                  }
                  onDragEnd={clearDragState}
                  isEditMode={isEditMode}
                  isDragging={draggedId === entry.id.toString()}
                />
              ))}
              <SidebarLoadMoreSentinel enabled={hasMore} onVisible={loadMore} />
            </>
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
            entry={item}
            expandedId={modalExpandedKnowledgeId}
            isModal={true}
            onToggle={toggleKnowledge}
            t={t}
            isEditMode={dragOptions?.isEditMode}
            isDragging={dragOptions?.isDragging}
            onDragStart={dragOptions?.onDragStart}
            onDragEnter={dragOptions?.onDragEnter}
            onDragOver={dragOptions?.onDragOver}
            onDrop={dragOptions?.onDrop}
            onDragEnd={dragOptions?.onDragEnd}
          />
        )}
      />
    </div>
  );
};

export const KnowledgePanel = React.memo(KnowledgePanelComponent);
