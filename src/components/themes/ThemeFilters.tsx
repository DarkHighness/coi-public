import React from "react";
import { useTranslation } from "react-i18next";
import {
  CATEGORY_KEYS,
  CategoryKey,
} from "../../utils/constants/themeCategories";
import { THEME_SORT_OPTIONS, ThemeSortMode } from "./themeSort";

interface ThemeFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: CategoryKey;
  setSelectedCategory: (category: CategoryKey) => void;
  sortMode: ThemeSortMode;
  setSortMode: (mode: ThemeSortMode) => void;
  isScrolled: boolean;
  isDesktop: boolean;
}

export const ThemeFilters: React.FC<ThemeFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  sortMode,
  setSortMode,
  isScrolled,
  isDesktop,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`sticky top-0 z-20 bg-theme-bg transition-shadow duration-200 ${
        isScrolled ? "shadow-[0_1px_0_var(--theme-divider)]" : ""
      }`}
    >
      <div className={`max-w-5xl mx-auto ${isDesktop ? "" : ""}`}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center pointer-events-none">
            <svg
              className="w-4 h-4 text-theme-text-secondary"
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
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("searchThemes") || "Search themes..."}
            className="h-10 w-full bg-transparent border-b border-theme-divider/60 pl-7 pr-8 text-sm text-theme-text placeholder-theme-text-secondary focus:outline-none focus:border-theme-primary/60"
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center text-theme-text-secondary hover:text-theme-primary transition-colors"
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

        <div className="mt-1.5 flex items-center gap-4 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-divider [&::-webkit-scrollbar-thumb]:rounded-full">
          {CATEGORY_KEYS.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`shrink-0 h-8 text-xs tracking-[0.08em] transition-colors border-b-2 ${
                selectedCategory === category
                  ? "text-theme-primary border-theme-primary"
                  : "text-theme-text-secondary border-transparent hover:text-theme-text hover:border-theme-divider"
              }`}
            >
              {t(`categories.${category}`) ||
                category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        <div className="mt-1 pb-1 flex items-center justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.08em] text-theme-text-secondary">
              {t("themeSort.label", "排序")}
            </span>
            <select
              value={sortMode}
              onChange={(event) =>
                setSortMode(event.target.value as ThemeSortMode)
              }
              className={`h-7 px-2 text-xs border border-theme-divider/70 bg-theme-bg text-theme-text focus:outline-none focus:border-theme-primary/60 ${
                isDesktop ? "min-w-[150px]" : "min-w-[132px]"
              }`}
              aria-label={t("themeSort.label", "排序")}
            >
              {THEME_SORT_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {t(`themeSort.options.${mode}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
