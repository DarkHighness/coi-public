import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

interface DetailedListModalProps<T extends { id: string | number }> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  renderItem: (
    item: T,
    options?: {
      isEditMode: boolean;
      isDragging: boolean;
      onDragStart: (e: React.DragEvent) => void;
      onDragEnter: (e: React.DragEvent) => void;
      onDragOver: (e: React.DragEvent) => void;
      onDrop: (e: React.DragEvent) => void;
      onDragEnd: () => void;
    },
  ) => React.ReactNode;
  searchFilter: (item: T, query: string) => boolean;
  themeFont: string;
  // Optional: enable edit mode support
  enableEditMode?: boolean;
  onReorderItem?: (dragId: string, hoverId: string) => void;
}

export function DetailedListModal<T extends { id: string | number }>({
  isOpen,
  onClose,
  title,
  items,
  renderItem,
  searchFilter,
  themeFont,
  enableEditMode = false,
  onReorderItem,
}: DetailedListModalProps<T>) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    return items.filter((item) => searchFilter(item, searchQuery));
  }, [items, searchQuery, searchFilter]);

  const handleDragStart = (e: React.DragEvent, id: string | number) => {
    const idStr = id.toString();
    setDraggedId(idStr);
    e.dataTransfer.setData("text/plain", idStr);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string | number) => {
    const targetIdStr = targetId.toString();
    if (!isEditMode || !draggedId || draggedId === targetIdStr) return;
    onReorderItem?.(draggedId, targetIdStr);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-theme-bg border border-theme-border rounded-lg shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-theme-border flex justify-between items-center bg-theme-surface sticky top-0 z-10">
          <h2
            className={`text-xl font-bold text-theme-primary uppercase tracking-widest ${themeFont}`}
          >
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {enableEditMode && (
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`p-2 rounded transition-colors ${
                  isEditMode
                    ? "bg-theme-primary text-theme-bg"
                    : "text-theme-muted hover:text-theme-primary"
                }`}
                title={isEditMode ? t("done") : t("edit")}
              >
                {isEditMode ? (
                  <svg
                    className="w-5 h-5"
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
                    className="w-5 h-5"
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
            )}
            <button
              onClick={onClose}
              className="text-theme-muted hover:text-theme-primary transition-colors p-2 -mr-2"
              aria-label={t("close") || "Close"}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-theme-border bg-theme-surface-highlight/30">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search") || "Search..."}
              className="w-full bg-theme-bg border border-theme-border rounded px-4 py-3 sm:py-2 pl-10 text-theme-text focus:border-theme-primary focus:outline-none text-base sm:text-sm"
            />
            <svg
              className="w-5 h-5 text-theme-muted absolute left-3 top-3.5 sm:top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar overscroll-contain">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div key={item.id}>
                {renderItem(
                  item,
                  enableEditMode
                    ? {
                        isEditMode,
                        isDragging: draggedId === item.id.toString(),
                        onDragStart: (e) => handleDragStart(e, item.id),
                        onDragEnter: (e) => handleDragEnter(e, item.id),
                        onDragOver: handleDragOver,
                        onDrop: handleDrop,
                        onDragEnd: handleDragEnd,
                      }
                    : undefined,
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-theme-muted py-8 italic">
              {t("noResults") || "No results found."}
            </div>
          )}
        </div>

        {/* Footer (Mobile only close button for easier reach) */}
        <div className="sm:hidden p-4 border-t border-theme-border bg-theme-surface">
          <button
            onClick={onClose}
            className="w-full py-3 bg-theme-surface-highlight border border-theme-border rounded text-theme-primary font-bold uppercase tracking-widest active:bg-theme-primary/10"
          >
            {t("close") || "Close"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
