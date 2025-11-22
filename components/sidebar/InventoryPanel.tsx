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

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string) => {
    if (!isEditMode || !draggedId || draggedId === targetId) return;
    reorderItem(draggedId, targetId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    // Final reorder is already done by dragEnter, just clear state
    setDraggedId(null);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`text-left text-theme-primary uppercase text-xs font-bold tracking-widest flex items-center group ${themeFont}`}
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            ></path>
          </svg>
          {t("inventory")}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditMode(!isEditMode);
            }}
            className={`text-[10px] uppercase tracking-wider font-bold border rounded px-2 py-0.5 transition-colors ${
              isEditMode
                ? "bg-theme-primary text-theme-bg border-theme-primary"
                : "text-theme-primary border-theme-primary/50 hover:text-theme-primary-hover"
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
              className="text-[10px] text-theme-primary hover:text-theme-primary-hover uppercase tracking-wider font-bold border border-theme-primary/50 rounded px-2 py-0.5 transition-colors"
              title={t("viewAll")}
            >
              {t("viewAll") || "View All"}
            </button>
          )}
          <span className="text-[10px] text-theme-muted bg-theme-surface-highlight px-1.5 rounded border border-theme-border">
            {allItems.length}
          </span>
          <button onClick={() => setIsOpen(!isOpen)}>
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
          </button>
        </div>
      </div>

      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-2">
          {visibleItems.length === 0 ? (
            <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border rounded text-center opacity-50">
              {t("emptyInventory")}
            </p>
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
                isDragging={draggedId === item.id}
              />
            ))
          )}
        </div>
      </div>

      <DetailedListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("inventory")}
        items={allItems}
        themeFont={themeFont}
        searchFilter={(item, query) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase())
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
