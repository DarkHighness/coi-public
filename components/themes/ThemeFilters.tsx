import React from "react";
import { useTranslation } from "react-i18next";
import { CATEGORY_KEYS, CategoryKey } from "../../utils/constants/themes";

interface ThemeFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: CategoryKey;
  setSelectedCategory: (category: CategoryKey) => void;
  isScrolled: boolean;
}

export const ThemeFilters: React.FC<ThemeFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  isScrolled,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`sticky top-0 z-20 p-4 transition-all duration-300 ${
        isScrolled
          ? "bg-theme-bg/100 backdrop-blur-xl border-b border-theme-border/50 shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg
              className="w-5 h-5 text-theme-muted group-focus-within:text-theme-primary transition-colors duration-300"
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
            className={`block w-full pl-11 pr-10 py-3 border rounded-xl leading-5 text-theme-text placeholder-theme-muted/50 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary sm:text-sm transition-all duration-300 shadow-inner ${
              isScrolled
                ? "bg-theme-surface-highlight/100 border-theme-border"
                : "bg-theme-surface-highlight/20 border-theme-border/50"
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-theme-muted hover:text-theme-text rounded-full hover:bg-theme-surface-highlight/50 transition-all"
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

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar mask-linear-fade">
          {CATEGORY_KEYS.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? "bg-theme-primary text-theme-bg border-theme-primary shadow-[0_0_10px_rgba(var(--theme-primary),0.3)]"
                  : "bg-theme-surface-highlight/30 text-theme-muted border-transparent hover:border-theme-border hover:text-theme-text hover:bg-theme-surface-highlight/50"
              }`}
            >
              {t(`categories.${cat}`) ||
                cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
