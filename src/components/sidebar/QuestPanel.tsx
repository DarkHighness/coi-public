import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListState, Quest } from "../../types";
import { useListManagement } from "../../hooks/useListManagement";
import { useProgressiveRender } from "../../hooks/useProgressiveRender";
import { DetailedListModal } from "../DetailedListModal";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";
import { SidebarEntityRow } from "./SidebarEntityRow";
import { SidebarTag } from "./SidebarTag";
import { SidebarField, SidebarSection } from "./SidebarSections";
import { SidebarLoadMoreSentinel } from "./SidebarLoadMoreSentinel";
import { pickFirstText } from "./panelText";
import { SidebarPanelHeader } from "./SidebarPanelHeader";

interface QuestPanelProps {
  quests: Quest[];
  themeFont: string;
  listState: ListState;
  onUpdateList: (newState: ListState) => void;
  listManagementEnabled?: boolean;
  globalEditMode?: boolean;
  expandedItemId?: string | null;
  onExpandItem?: (itemId: string | null) => void;
}

const getQuestTypeLabel = (
  type: string,
  t: ReturnType<typeof useTranslation>["t"],
) =>
  type === "main"
    ? t("questPanel.main") || t("mainQuest") || "Main"
    : type === "side"
      ? t("questPanel.side") || t("sideQuest") || "Side"
      : t("questType.hidden") || "Hidden";

const renderObjectives = (objectives: string[] | undefined) => {
  if (!Array.isArray(objectives) || objectives.length === 0) {
    return null;
  }
  return (
    <ul className="list-disc list-inside space-y-1">
      {objectives.map((objective, index) => (
        <li key={`${objective}-${index}`}>
          <MarkdownText content={objective} indentSize={2} inline />
        </li>
      ))}
    </ul>
  );
};

const QuestPanelComponent: React.FC<QuestPanelProps> = ({
  quests,
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
  const [localExpandedQuestId, setLocalExpandedQuestId] = useState<
    string | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalExpandedQuestId, setModalExpandedQuestId] = useState<
    string | null
  >(null);
  const [isLocalEditMode, setIsLocalEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const listManagementActive = listManagementEnabled && (isOpen || isModalOpen);
  const isEditMode = globalEditMode ?? isLocalEditMode;
  const allowPanelEditToggle = globalEditMode === undefined;
  const expandedQuestId =
    expandedItemId !== undefined ? expandedItemId : localExpandedQuestId;

  const visibleQuests = useMemo(
    () => quests.filter((quest) => quest.type !== "hidden"),
    [quests],
  );

  const {
    visibleItems: managedVisibleItems,
    allItems,
    togglePin,
    toggleHide,
    reorderItem,
    isPinned,
    isHidden,
  } = useListManagement(visibleQuests, listState, onUpdateList, {
    enabled: listManagementActive,
  });

  const { visibleItems, hasMore, loadMore } = useProgressiveRender(
    managedVisibleItems,
    30,
    isOpen,
  );

  const toggleQuest = (questId: string | number, isModal = false) => {
    const targetId = questId.toString();
    if (isModal) {
      setModalExpandedQuestId((prev) => (prev === targetId ? null : targetId));
      return;
    }
    const next = expandedQuestId === targetId ? null : targetId;
    if (onExpandItem) {
      onExpandItem(next);
      return;
    }
    setLocalExpandedQuestId(next);
  };

  const handleDragStart = (e: React.DragEvent, id: string | number) => {
    const idStr = id.toString();
    setDraggedId(idStr);
    e.dataTransfer.setData("text/plain", idStr);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (_e: React.DragEvent, targetId: string | number) => {
    const targetIdStr = targetId.toString();
    if (!isEditMode || !draggedId || draggedId === targetIdStr) {
      return;
    }
    reorderItem(draggedId, targetIdStr);
  };

  const clearDragState = () => setDraggedId(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const renderQuestRow = (
    quest: Quest,
    expandedId: string | null,
    isModal: boolean,
    options?: {
      isEditMode?: boolean;
      isDragging?: boolean;
      onDragStart?: (e: React.DragEvent) => void;
      onDragEnter?: (e: React.DragEvent) => void;
      onDragOver?: (e: React.DragEvent) => void;
      onDrop?: (e: React.DragEvent) => void;
    },
  ) => {
    const effectiveEditMode = isModal ? options?.isEditMode : isEditMode;
    const isExpanded = expandedId === quest.id.toString();
    const previewText = pickFirstText(
      quest.visible?.description,
      quest.visible?.objectives?.join(" "),
      quest.hidden?.trueDescription,
      quest.hidden?.secretOutcome,
      quest.hidden?.twist,
    );

    return (
      <div
        key={quest.id}
        className={`${options?.isDragging ? "opacity-60" : ""}`.trim()}
        draggable={Boolean(effectiveEditMode)}
        onDragStart={options?.onDragStart}
        onDragEnter={options?.onDragEnter}
        onDragOver={options?.onDragOver}
        onDrop={options?.onDrop}
        onDragEnd={clearDragState}
      >
        <SidebarEntityRow
          title={quest.title}
          icon={getValidIcon(quest.icon, quest.type === "main" ? "🎯" : "📜")}
          tags={
            <>
              <SidebarTag>{getQuestTypeLabel(quest.type, t)}</SidebarTag>
              <SidebarTag className="text-theme-text-secondary border-theme-divider/70 text-[10px]">
                {quest.status || "active"}
              </SidebarTag>
              {quest.unlocked ? (
                <SidebarTag className="text-theme-primary border-theme-primary/60">
                  {t("unlocked") || "Unlocked"}
                </SidebarTag>
              ) : null}
            </>
          }
          summary={previewText}
          isExpanded={isExpanded}
          onToggle={() => {
            if (effectiveEditMode) {
              return;
            }
            toggleQuest(quest.id, isModal);
          }}
          accentClassName={
            quest.type === "main"
              ? "border-l-theme-primary/70"
              : "border-l-theme-divider/70"
          }
        >
          <div className="pl-2 pr-1 pb-3 text-xs text-theme-text">
            <SidebarSection
              title={t("visible") || "Visible"}
              withDivider={false}
            >
              <SidebarField
                label={t("questPanel.description") || "Description"}
              >
                <MarkdownText
                  content={
                    quest.visible?.description ||
                    t("noDescription") ||
                    "No description"
                  }
                  indentSize={2}
                />
              </SidebarField>
              <SidebarField label={t("objectives") || "Objectives"}>
                {renderObjectives(quest.visible?.objectives) || (
                  <span className="text-theme-text-secondary">
                    {t("noObjectives") || "No objectives"}
                  </span>
                )}
              </SidebarField>
            </SidebarSection>

            {quest.unlocked && quest.hidden ? (
              <SidebarSection
                title={t("hidden.truth") || "Hidden"}
                className="sidebar-hidden-divider"
              >
                {quest.hidden.trueDescription ? (
                  <SidebarField
                    label={
                      t("questPanel.trueDescription") || "True Description"
                    }
                  >
                    <MarkdownText
                      content={quest.hidden.trueDescription}
                      indentSize={2}
                    />
                  </SidebarField>
                ) : null}
                {quest.hidden.trueObjectives?.length ? (
                  <SidebarField
                    label={t("questPanel.trueObjectives") || "True Objectives"}
                  >
                    {renderObjectives(quest.hidden.trueObjectives)}
                  </SidebarField>
                ) : null}
                {quest.hidden.secretOutcome ? (
                  <SidebarField
                    label={t("questPanel.secretOutcome") || "Secret Outcome"}
                  >
                    <MarkdownText
                      content={quest.hidden.secretOutcome}
                      indentSize={2}
                    />
                  </SidebarField>
                ) : null}
                {quest.hidden.twist ? (
                  <SidebarField label={t("gameViewer.twist") || "Twist"}>
                    <MarkdownText content={quest.hidden.twist} indentSize={2} />
                  </SidebarField>
                ) : null}
                {quest.unlockReason ? (
                  <SidebarField label={t("unlockReason") || "Unlock Reason"}>
                    <MarkdownText content={quest.unlockReason} indentSize={2} />
                  </SidebarField>
                ) : null}
              </SidebarSection>
            ) : null}

            <SidebarSection title={t("meta") || "Meta"}>
              <SidebarField label={t("questType.title") || "Type"}>
                {getQuestTypeLabel(quest.type, t)}
              </SidebarField>
              <SidebarField label={t("status") || "Status"}>
                {quest.status || "active"}
              </SidebarField>
            </SidebarSection>
          </div>
        </SidebarEntityRow>
      </div>
    );
  };

  return (
    <div>
      <SidebarPanelHeader
        title={t("questPanel.title")}
        icon={<span className="w-2 h-2 bg-theme-primary rounded-full" />}
        count={allItems.length}
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
        themeFont={themeFont}
        actions={
          <>
            {allowPanelEditToggle ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLocalEditMode((prev) => !prev);
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
            {isEditMode && visibleQuests.length > 0 ? (
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

      {isOpen ? (
        <div className="space-y-2 animate-sidebar-expand">
          {visibleItems.length === 0 ? (
            <div className="text-theme-text-secondary text-xs italic py-3 text-center border-t border-theme-divider/60">
              {t("questPanel.empty")}
            </div>
          ) : (
            <>
              {visibleItems.map((quest) =>
                renderQuestRow(quest, expandedQuestId, false, {
                  isDragging: draggedId === quest.id.toString(),
                  onDragStart: isEditMode
                    ? (e) => handleDragStart(e, quest.id)
                    : undefined,
                  onDragEnter: isEditMode
                    ? (e) => handleDragEnter(e, quest.id)
                    : undefined,
                  onDragOver: isEditMode ? handleDragOver : undefined,
                  onDrop: isEditMode
                    ? (e) => {
                        e.preventDefault();
                        clearDragState();
                      }
                    : undefined,
                }),
              )}
              <SidebarLoadMoreSentinel enabled={hasMore} onVisible={loadMore} />
            </>
          )}
        </div>
      ) : null}

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
          renderQuestRow(item, modalExpandedQuestId, true, {
            isEditMode: dragOptions?.isEditMode,
            isDragging: dragOptions?.isDragging,
            onDragStart: dragOptions?.onDragStart,
            onDragEnter: dragOptions?.onDragEnter,
            onDragOver: dragOptions?.onDragOver,
            onDrop: dragOptions?.onDrop,
          })
        }
      />
    </div>
  );
};

export const QuestPanel = React.memo(QuestPanelComponent);
