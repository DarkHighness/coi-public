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
  // Pin support
  onTogglePin?: (id: string | number) => void;
  isPinned?: (id: string | number) => boolean;
  // Visibility toggle support
  onToggleHide?: (id: string | number) => void;
  isHidden?: (id: string | number) => boolean;
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
  onTogglePin,
  isPinned,
  onToggleHide,
  isHidden,
}: DetailedListModalProps<T>) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

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

  const handleItemClick = (id: string | number) => {
    if (!isEditMode) return;
    setSelectedId(selectedId === id ? null : id);
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
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  setSelectedId(null);
                }}
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
            filteredItems.map((item) => {
              const itemPinned = isPinned?.(item.id);
              const itemHidden = isHidden?.(item.id);
              const isSelected = selectedId === item.id;

              return (
                <div
                  key={item.id}
                  className={`relative transition-all ${
                    itemHidden ? "opacity-50" : ""
                  } ${isEditMode ? "cursor-pointer" : ""} ${
                    isSelected ? "ring-2 ring-theme-primary rounded-lg" : ""
                  }`}
                  onClick={() => handleItemClick(item.id)}
                >
                  {/* Status indicators */}
                  {(itemPinned || itemHidden) && (
                    <div className="absolute -top-1 -right-1 z-10 flex gap-1">
                      {itemPinned && (
                        <span className="w-5 h-5 bg-theme-primary text-theme-bg rounded-full flex items-center justify-center">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </span>
                      )}
                      {itemHidden && (
                        <span className="w-5 h-5 bg-theme-muted text-theme-bg rounded-full flex items-center justify-center">
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
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                  )}

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

                  {/* Action bar when selected in edit mode */}
                  {isEditMode && isSelected && (
                    <div className="mt-2 p-2 bg-theme-surface-highlight rounded-lg border border-theme-border flex flex-wrap gap-2 justify-center animate-fade-in">
                      {onTogglePin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(item.id);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                            itemPinned
                              ? "bg-theme-primary text-theme-bg"
                              : "bg-theme-surface border border-theme-border text-theme-text hover:border-theme-primary"
                          }`}
                        >
                          <svg
                            className="w-4 h-4"
                            fill={itemPinned ? "currentColor" : "none"}
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
                          {itemPinned
                            ? t("unpin") || "Unpin"
                            : t("pinToTop") || "Pin"}
                        </button>
                      )}
                      {onToggleHide && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleHide(item.id);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                            itemHidden
                              ? "bg-theme-muted text-theme-bg"
                              : "bg-theme-surface border border-theme-border text-theme-text hover:border-theme-primary"
                          }`}
                        >
                          {itemHidden ? (
                            <>
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
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                              {t("showInSidebar") || "Show"}
                            </>
                          ) : (
                            <>
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
                                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                />
                              </svg>
                              {t("hideFromSidebar") || "Hide"}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center text-theme-muted py-8 italic">
              {t("noResults") || "No results found."}
            </div>
          )}
        </div>

        {/* Edit mode hint for mobile */}
        {isEditMode && (
          <div className="sm:hidden px-4 py-2 bg-theme-surface-highlight/50 text-center text-xs text-theme-muted border-t border-theme-border">
            {t("tapToSelect") || "Tap an item to edit"}
          </div>
        )}

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
