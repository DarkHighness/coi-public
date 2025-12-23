import React from "react";
import { useTranslation } from "react-i18next";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      // Show all pages if total is small
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(0);

      // Calculate start and end of visible range
      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages - 2, currentPage + 1);

      // Adjust if at the beginning
      if (currentPage <= 2) {
        start = 1;
        end = Math.min(3, totalPages - 2);
      }

      // Adjust if at the end
      if (currentPage >= totalPages - 3) {
        start = Math.max(1, totalPages - 4);
        end = totalPages - 2;
      }

      // Add ellipsis after first page if needed
      if (start > 1) {
        pages.push("ellipsis");
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 2) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages - 1);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="p-2 rounded-lg bg-theme-surface border border-theme-border text-theme-text hover:bg-theme-surface-highlight disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label={t("pagination.previous")}
      >
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-theme-muted text-sm"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[32px] h-8 sm:min-w-[36px] sm:h-9 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                currentPage === page
                  ? "bg-theme-primary text-theme-bg"
                  : "bg-theme-surface border border-theme-border text-theme-text hover:bg-theme-surface-highlight"
              }`}
            >
              {page + 1}
            </button>
          ),
        )}
      </div>

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
        className="p-2 rounded-lg bg-theme-surface border border-theme-border text-theme-text hover:bg-theme-surface-highlight disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label={t("pagination.next")}
      >
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Jump to Last */}
      {currentPage < totalPages - 2 && (
        <button
          onClick={() => onPageChange(totalPages - 1)}
          className="p-2 rounded-lg bg-theme-surface border border-theme-border text-theme-text hover:bg-theme-surface-highlight transition-colors"
          aria-label={t("pagination.last")}
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        </button>
      )}
    </div>
  );
};
