import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

interface StackControlsProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPageJump: (page: number) => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  onItemsPerPageChange: (count: number) => void;
}

// Available items per page options (must be even numbers)
const ITEMS_PER_PAGE_OPTIONS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

export const StackControls: React.FC<StackControlsProps> = ({
  currentPage,
  totalPages,
  itemsPerPage,
  onPrevPage,
  onNextPage,
  onPageJump,
  onFirstPage,
  onLastPage,
  onItemsPerPageChange,
}) => {
  const { t } = useTranslation();
  const [showItemsDropdown, setShowItemsDropdown] = useState(false);

  // Generate page numbers to display
  // Shows: current, current+1, ..., last-1, last (with ellipsis if needed)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [];

    const pages: (number | "ellipsis")[] = [];
    const current = currentPage;

    // Always show first page
    pages.push(0);

    if (totalPages <= 7) {
      // Show all pages if total is small
      for (let i = 1; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Smart pagination with ellipsis
      const showStart = Math.max(1, current - 1);
      const showEnd = Math.min(totalPages - 2, current + 1);

      // Add ellipsis after first if needed
      if (showStart > 1) {
        pages.push("ellipsis");
      }

      // Add middle pages
      for (let i = showStart; i <= showEnd; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      // Add ellipsis before last if needed
      if (showEnd < totalPages - 2) {
        pages.push("ellipsis");
      }

      // Always show last page
      if (totalPages > 1 && !pages.includes(totalPages - 1)) {
        pages.push(totalPages - 1);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="bg-theme-surface/90 backdrop-blur-md border border-theme-border/50 rounded-xl p-2 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-wrap items-center justify-center gap-2 transition-all duration-300">
      {/* First Page Button */}
      <button
        onClick={onFirstPage}
        disabled={currentPage === 0}
        className="p-1.5 rounded-lg hover:bg-theme-primary/20 hover:text-theme-primary disabled:opacity-30 disabled:hover:bg-transparent text-theme-text transition-colors"
        title={t("stackPagination.firstPage") || "First Page"}
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
            d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Previous Page Button */}
      <button
        onClick={onPrevPage}
        disabled={currentPage === 0}
        className="p-1.5 rounded-lg hover:bg-theme-primary/20 hover:text-theme-primary disabled:opacity-30 disabled:hover:bg-transparent text-theme-text transition-colors"
        title={t("stackPagination.prevPage") || "Previous Page"}
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1 px-2">
        {pageNumbers.map((page, index) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1 text-theme-muted">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageJump(page)}
              className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-mono font-bold transition-all ${
                page === currentPage
                  ? "bg-theme-primary text-theme-bg shadow-sm"
                  : "hover:bg-theme-primary/20 text-theme-text hover:text-theme-primary"
              }`}
            >
              {page + 1}
            </button>
          ),
        )}
      </div>

      {/* Next Page Button */}
      <button
        onClick={onNextPage}
        disabled={currentPage >= totalPages - 1}
        className="p-1.5 rounded-lg hover:bg-theme-primary/20 hover:text-theme-primary disabled:opacity-30 disabled:hover:bg-transparent text-theme-text transition-colors"
        title={t("stackPagination.nextPage") || "Next Page"}
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
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Last Page Button */}
      <button
        onClick={onLastPage}
        disabled={currentPage >= totalPages - 1}
        className="p-1.5 rounded-lg hover:bg-theme-primary/20 hover:text-theme-primary disabled:opacity-30 disabled:hover:bg-transparent text-theme-text transition-colors"
        title={t("stackPagination.lastPage") || "Last Page"}
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
            d="M13 5l7 7-7 7M5 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-theme-border/50 mx-1"></div>

      {/* Page Info */}
      <div className="flex items-center gap-2 px-2 text-xs text-theme-muted">
        <span className="font-mono">
          <span className="text-theme-primary font-bold">
            {currentPage + 1}
          </span>
          <span className="mx-1">/</span>
          <span>{totalPages}</span>
        </span>
        <span className="uppercase tracking-wider hidden sm:inline">
          {t("stackPagination.pages") || "pages"}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-theme-border/50 mx-1"></div>

      {/* Items Per Page Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowItemsDropdown(!showItemsDropdown)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-theme-primary/20 text-theme-text transition-colors text-xs"
          title={t("stackPagination.itemsPerPage") || "Items per page"}
        >
          <span className="font-mono font-bold text-theme-primary">
            {itemsPerPage}
          </span>
          <span className="text-theme-muted hidden sm:inline">
            {t("stackPagination.perPage") || "per page"}
          </span>
          <svg
            className={`w-3 h-3 text-theme-muted transition-transform ${showItemsDropdown ? "rotate-180" : ""}`}
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
        </button>

        {/* Dropdown Menu */}
        {showItemsDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowItemsDropdown(false)}
            />
            <div className="absolute bottom-full left-0 mb-2 bg-theme-surface border border-theme-border rounded-lg shadow-xl z-50 py-1 min-w-[80px] animate-fade-in">
              {ITEMS_PER_PAGE_OPTIONS.map((count) => (
                <button
                  key={count}
                  onClick={() => {
                    onItemsPerPageChange(count);
                    setShowItemsDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-theme-primary/20 transition-colors ${
                    count === itemsPerPage
                      ? "text-theme-primary font-bold bg-theme-primary/10"
                      : "text-theme-text"
                  }`}
                >
                  {count} {t("items") || "items"}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
