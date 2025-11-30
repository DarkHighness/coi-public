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
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
  inventory = [],
  themeFont,
  itemContext,
  listState,
  onUpdateList,
}) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const DISPLAY_LIMIT = 5;

  const { visibleItems, allItems, togglePin, reorderItem, isPinned } =
    useListManagement(safeInventory, listState, onUpdateList, DISPLAY_LIMIT);

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
              className="w-3 h-3"
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
            <span className="ml-2 text-[10px] text-theme-muted bg-theme-surface-highlight px-1.5 rounded border border-theme-border">
              {inventory.length}
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

          {allItems.length > DISPLAY_LIMIT && (
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

      {isOpen && (
        <div className="space-y-2 animate-[fade-in_0.3s_ease-in]">
          {visibleItems.length === 0 ? (
            <div className="text-theme-muted text-xs italic p-3 border border-dashed border-theme-border/50 rounded text-center bg-theme-surface-highlight/10">
              {t("emptyInventory")}
            </div>
          ) : (
            visibleItems.map((item) => (
              <InventoryItem
                key={item.id}
                item={item}
                language={LANG_MAP[i18n.language as "en" | "zh"]}
                context={itemContext}
                isPinned={isPinned(item.id)}
                onPin={() => togglePin(item.id)}
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
        searchFilter={(item: any, query) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          (item.visible?.description || "")
            .toLowerCase()
            .includes(query.toLowerCase())
        }
        renderItem={(item) => (
          <InventoryItem
            key={item.id}
            item={item}
            language={LANG_MAP[i18n.language as "en" | "zh"]}
            context={itemContext}
            isPinned={isPinned(item.id)}
            onPin={() => togglePin(item.id)}
          />
        )}
      />
    </div>
  );
};
