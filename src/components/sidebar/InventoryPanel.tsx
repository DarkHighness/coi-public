import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { InventoryItem } from "../InventoryItem";
import { LANG_MAP } from "../../utils/constants";
import { DetailedListModal } from "../DetailedListModal";
import { useListManagement } from "../../hooks/useListManagement";

import { InventoryItem as InventoryItemType, ListState } from "../../types";

interface InventoryPanelProps {
  inventory: InventoryItemType[];
  themeFont: string;
  itemContext: string;
  listState: ListState;
  onUpdateList: (newState: ListState) => void;
  listManagementEnabled?: boolean;
}

const InventoryPanelComponent: React.FC<InventoryPanelProps> = ({
  inventory = [],
  themeFont,
  itemContext,
  listState,
  onUpdateList,
  listManagementEnabled = true,
}) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const listManagementActive = listManagementEnabled && (isOpen || isModalOpen);

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
          isOpen ? "mb-3" : "mb-0"
        }`}
      >
        <div
          className={`flex items-center text-theme-primary uppercase text-xs font-bold tracking-widest ${themeFont}`}
        >
          <span className="flex items-center gap-2">
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
            {t("inventory") || "Inventory"}
            <span className="ml-2 text-[10px] text-theme-text-secondary bg-theme-surface-highlight px-1.5 rounded border border-theme-divider/60">
              {inventory.length}
            </span>
          </span>
        </div>

        <div className="flex items-center justify-end gap-1 shrink-0 min-w-[6.5rem]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditMode(!isEditMode);
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

          {safeInventory.length > 0 && (
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
          )}

          <div className="h-8 w-8 grid place-items-center rounded text-theme-text-secondary group-hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors">
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
              {t("emptyInventory")}
            </div>
          ) : (
            visibleItems.map((item) => (
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
                onDrop={isEditMode ? (e) => handleDrop(e, item.id) : undefined}
                isEditMode={isEditMode}
                isDragging={draggedId === item.id.toString()}
              />
            ))
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
          />
        )}
      />
    </div>
  );
};

export const InventoryPanel = React.memo(InventoryPanelComponent);
