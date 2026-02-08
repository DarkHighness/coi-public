import React from "react";
import { useTranslation } from "react-i18next";
import { CATEGORY_KEYS, CategoryKey } from "../../utils/constants/themes";

interface ThemeFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: CategoryKey;
  setSelectedCategory: (category: CategoryKey) => void;
  isScrolled: boolean;
  isDesktop: boolean;
}

export const ThemeFilters: React.FC<ThemeFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  isScrolled,
  isDesktop,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`sticky top-0 z-20 transition-all duration-300 ${
        isScrolled ? "shadow-[0_4px_14px_rgba(0,0,0,0.15)]" : ""
      }`}
    >
      <div
        className={`w-full border-y border-theme-divider/60 bg-theme-surface/10 backdrop-blur-md ${
          isDesktop ? "px-4 py-3" : "px-3 py-2.5"
        }`}
      >
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-2.5">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="w-4 h-4 text-theme-text-secondary group-focus-within:text-theme-primary transition-colors"
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

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchThemes") || "Search themes..."}
              className="block h-10 w-full rounded-lg border border-theme-divider/60 bg-theme-bg/70 pl-9 pr-10 text-sm text-theme-text placeholder-theme-text-secondary/70 transition-colors focus:outline-none focus:border-theme-primary/60 focus:bg-theme-bg"
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-md text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors"
                aria-label={t("clear", "Clear")}
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-primary/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-theme-primary/35">
            {CATEGORY_KEYS.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`h-9 px-3 rounded-lg border text-[11px] font-bold uppercase tracking-[0.08em] whitespace-nowrap transition-colors shrink-0 ${
                  selectedCategory === cat
                    ? "bg-theme-surface-highlight/35 border-theme-primary/45 text-theme-primary"
                    : "bg-transparent border-theme-divider/60 text-theme-text-secondary hover:text-theme-text hover:border-theme-border hover:bg-theme-surface-highlight/15"
                }`}
              >
                {t(`categories.${cat}`) ||
                  cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
