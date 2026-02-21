import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { InventoryItem } from "../InventoryItem";
import { LANG_MAP } from "../../utils/constants";
import { DetailedListModal } from "../DetailedListModal";
import { useListManagement } from "../../hooks/useListManagement";
import { useProgressiveRender } from "../../hooks/useProgressiveRender";
import { SidebarLoadMoreSentinel } from "./SidebarLoadMoreSentinel";
import { SidebarPanelHeader } from "./SidebarPanelHeader";

import { InventoryItem as InventoryItemType, ListState } from "../../types";

interface InventoryPanelProps {
  inventory: InventoryItemType[];
  themeFont: string;
  itemContext: string;
  listState: ListState;
  onUpdateList: (newState: ListState) => void;
  listManagementEnabled?: boolean;
  globalEditMode?: boolean;
  expandedItemId?: string | null;
  onExpandItem?: (itemId: string | null) => void;
}

const InventoryPanelComponent: React.FC<InventoryPanelProps> = ({
  inventory = [],
  themeFont,
  itemContext,
  listState,
  onUpdateList,
  listManagementEnabled = true,
  globalEditMode,
  expandedItemId,
  onExpandItem,
}) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocalEditMode, setIsLocalEditMode] = useState(false);
  const [localExpandedItemId, setLocalExpandedItemId] = useState<string | null>(
    null,
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const listManagementActive = listManagementEnabled && (isOpen || isModalOpen);
  const isEditMode = globalEditMode ?? isLocalEditMode;
  const allowPanelEditToggle = globalEditMode === undefined;
  const resolvedExpandedItemId =
    expandedItemId !== undefined ? expandedItemId : localExpandedItemId;

  const safeInventory = Array.isArray(inventory) ? inventory : [];

  const {
    visibleItems,
    allItems,
    togglePin,
    toggleHide,
    reorderItem,
    isPinned,
    isHidden,
  } = useListManagement(safeInventory, listState, onUpdateList, {
    enabled: listManagementActive,
  });
  const {
    visibleItems: progressiveItems,
    hasMore,
    loadMore,
  } = useProgressiveRender(visibleItems, 30, isOpen);

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
  const handleToggleItem = (id: string | number) => {
    const next =
      resolvedExpandedItemId === id.toString() ? null : id.toString();
    if (onExpandItem) {
      onExpandItem(next);
      return;
    }
    setLocalExpandedItemId(next);
  };

  return (
    <div>
      <SidebarPanelHeader
        title={t("inventory") || "Inventory"}
        icon={
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
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            ></path>
          </svg>
        }
        count={allItems.length}
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        themeFont={themeFont}
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
            {isEditMode && safeInventory.length > 0 ? (
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
        <div className="space-y-2 animate-[fade-in_0.3s_ease-in]">
          {progressiveItems.length === 0 ? (
            <div className="text-theme-text-secondary text-xs italic py-3 text-center border-t border-theme-divider/60">
              {t("emptyInventory")}
            </div>
          ) : (
            <>
              {progressiveItems.map((item) => (
                <InventoryItem
                  key={item.id}
                  item={item}
                  language={LANG_MAP[i18n.language as "en" | "zh"]}
                  context={itemContext}
                  onDragStart={
                    isEditMode ? (e) => handleDragStart(e, item.id) : undefined
                  }
                  onDragEnter={
                    isEditMode ? (e) => handleDragEnter(e, item.id) : undefined
                  }
                  onDragOver={isEditMode ? handleDragOver : undefined}
                  onDrop={
                    isEditMode ? (e) => handleDrop(e, item.id) : undefined
                  }
                  isEditMode={isEditMode}
                  isDragging={draggedId === item.id.toString()}
                  isExpanded={resolvedExpandedItemId === item.id.toString()}
                  onToggleExpand={handleToggleItem}
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
        title={t("inventory")}
        items={allItems}
        themeFont={themeFont}
        enableEditMode={true}
        onReorderItem={reorderItem}
        onTogglePin={togglePin}
        isPinned={isPinned}
        onToggleHide={toggleHide}
        isHidden={isHidden}
        searchFilter={(item: InventoryItemType, query) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          (item.visible?.description || "")
            .toLowerCase()
            .includes(query.toLowerCase())
        }
        renderItem={(item, dragOptions) => (
          <InventoryItem
            key={item.id}
            item={item}
            language={LANG_MAP[i18n.language as "en" | "zh"]}
            context={itemContext}
            isEditMode={dragOptions?.isEditMode}
            isDragging={dragOptions?.isDragging}
            onDragStart={dragOptions?.onDragStart}
            onDragEnter={dragOptions?.onDragEnter}
            onDragOver={dragOptions?.onDragOver}
            onDrop={dragOptions?.onDrop}
            isExpanded={resolvedExpandedItemId === item.id.toString()}
            onToggleExpand={handleToggleItem}
          />
        )}
      />
    </div>
  );
};

export const InventoryPanel = React.memo(InventoryPanelComponent);
