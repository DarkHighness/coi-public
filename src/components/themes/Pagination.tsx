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

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(0);

      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages - 2, currentPage + 1);

      if (currentPage <= 2) {
        start = 1;
        end = Math.min(3, totalPages - 2);
      }

      if (currentPage >= totalPages - 3) {
        start = Math.max(1, totalPages - 4);
        end = totalPages - 2;
      }

      if (start > 1) {
        pages.push("ellipsis");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 2) {
        pages.push("ellipsis");
      }

      pages.push(totalPages - 1);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="h-8 w-8 grid place-items-center rounded-lg border border-theme-divider/60 bg-transparent text-theme-text-secondary hover:text-theme-primary hover:border-theme-primary/45 hover:bg-theme-surface-highlight/15 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
        aria-label={t("pagination.previous")}
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
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="w-7 text-center text-theme-text-secondary text-xs"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`h-8 min-w-[2rem] px-2 rounded-lg border text-xs font-semibold transition-colors ${
                currentPage === page
                  ? "bg-theme-surface-highlight/35 border-theme-primary/45 text-theme-primary"
                  : "bg-transparent border-theme-divider/60 text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-highlight/15 hover:border-theme-border"
              }`}
            >
              {page + 1}
            </button>
          ),
        )}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
        className="h-8 w-8 grid place-items-center rounded-lg border border-theme-divider/60 bg-transparent text-theme-text-secondary hover:text-theme-primary hover:border-theme-primary/45 hover:bg-theme-surface-highlight/15 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
        aria-label={t("pagination.next")}
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
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {currentPage < totalPages - 2 && (
        <button
          onClick={() => onPageChange(totalPages - 1)}
          className="h-8 w-8 grid place-items-center rounded-lg border border-theme-divider/60 bg-transparent text-theme-text-secondary hover:text-theme-primary hover:border-theme-primary/45 hover:bg-theme-surface-highlight/15 transition-colors"
          aria-label={t("pagination.last")}
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
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        </button>
      )}
    </div>
  );
};
