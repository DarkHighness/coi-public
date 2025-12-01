import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

interface DetailedListModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  searchFilter: (item: T, query: string) => boolean;
  themeFont: string;
}

export function DetailedListModal<T>({
  isOpen,
  onClose,
  title,
  items,
  renderItem,
  searchFilter,
  themeFont,
}: DetailedListModalProps<T>) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    return items.filter((item) => searchFilter(item, searchQuery));
  }, [items, searchQuery, searchFilter]);

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
            filteredItems.map((item, idx) => (
              <div key={idx}>{renderItem(item)}</div>
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
