import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StoryThemeConfig } from "../../types";
import { CategoryKey } from "../../utils/constants/themes";
import { ThemeFilters } from "./ThemeFilters";
import { ThemeCard } from "./ThemeCard";
import { ThemePreviewModal } from "./ThemePreviewModal";
import { Pagination } from "./Pagination";

const ITEMS_PER_PAGE = 10; // 10 items per page on mobile

interface ThemeSelectorMobileProps {
  themes: Record<string, StoryThemeConfig>;
  onSelect: (theme: string, protagonistFeature?: string) => void;
  onPreviewTheme?: (theme: string | null) => void;
}

export const ThemeSelectorMobile: React.FC<ThemeSelectorMobileProps> = ({
  themes,
  onSelect,
  onPreviewTheme,
}) => {
  const { t } = useTranslation();
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("all");
  const [currentPage, setCurrentPage] = useState(0);

  const handlePreview = (key: string) => {
    setPreviewTheme(key);
    onPreviewTheme?.(key); // Update global theme for preview
  };

  const closePreview = () => {
    setPreviewTheme(null);
    onPreviewTheme?.(null); // Reset global theme preview
  };

  const filteredThemes = useMemo(() => {
    let keys = Object.keys(themes);

    // Filter by Category
    if (selectedCategory !== "all") {
      keys = keys.filter((key) =>
        themes[key].categories?.includes(selectedCategory),
      );
    }

    // Filter by Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      keys = keys.filter((key) => {
        const name = t(`${key}.name`, { ns: "themes" }).toLowerCase();
        const style = t(`${key}.narrativeStyle`, {
          ns: "themes",
        }).toLowerCase();
        return name.includes(query) || style.includes(query);
      });
    }

    return keys;
  }, [themes, searchQuery, selectedCategory, t]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(0);
  }, [searchQuery, selectedCategory]);

  // Pagination calculations
  // First page shows 9 items when random card is visible (total 10)
  // Other pages show 10 items
  const showRandomCard = selectedCategory === "all" && !searchQuery;
  const firstPageCount = showRandomCard ? ITEMS_PER_PAGE - 1 : ITEMS_PER_PAGE;

  const getItemsForPage = (page: number) => {
    if (page === 0) {
      return filteredThemes.slice(0, firstPageCount);
    }
    const offset = firstPageCount + (page - 1) * ITEMS_PER_PAGE;
    return filteredThemes.slice(offset, offset + ITEMS_PER_PAGE);
  };

  const totalPages =
    Math.ceil((filteredThemes.length - firstPageCount) / ITEMS_PER_PAGE) +
    (filteredThemes.length > 0 ? 1 : 0);
  const currentThemes = getItemsForPage(currentPage);

  const previewData = previewTheme ? themes[previewTheme] : null;

  return (
    <div className="w-full h-full relative flex flex-col bg-theme-bg/95 backdrop-blur-xl">
      {/* Header Area */}
      <div className="shrink-0 z-10 border-b border-theme-divider/60 bg-theme-surface/10 backdrop-blur-md">
        <ThemeFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          isScrolled={false}
          isDesktop={false}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3">
          <div
            key={`page-${currentPage}`}
            className="max-w-5xl mx-auto w-full flex flex-col gap-2.5 animate-fade-in"
          >
            {/* Random Option - only on first page */}
            {selectedCategory === "all" &&
              !searchQuery &&
              currentPage === 0 && (
                <button
                  onClick={() => onSelect("")}
                  className="relative w-full h-[96px] rounded-xl border border-theme-divider/60 bg-theme-surface/10 hover:bg-theme-surface-highlight/15 hover:border-theme-primary/40 transition-colors text-left group overflow-hidden animate-slide-in"
                  style={{ animationDelay: "0ms" }}
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-theme-primary/40 group-hover:bg-theme-primary/70 transition-colors" />
                  <div className="relative h-full px-3 py-2.5 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg border border-theme-divider/60 bg-theme-surface-highlight/15 grid place-items-center text-xl leading-none shrink-0">
                      🎲
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-theme-primary uppercase tracking-[0.1em]">
                        {t("randomTheme")}
                      </div>
                      <div className="mt-1 text-[11px] leading-relaxed text-theme-text-secondary line-clamp-2">
                        {t("randomThemeDesc")}
                      </div>
                    </div>
                    <svg
                      className="w-4 h-4 text-theme-primary shrink-0"
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
                  </div>
                </button>
              )}

            {currentThemes.map((key, index) => (
              <div
                key={key}
                className="animate-slide-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <ThemeCard
                  themeKey={key}
                  themeConfig={themes[key]}
                  onPreview={handlePreview}
                  isDesktop={false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="shrink-0 px-3 py-2.5 border-t border-theme-divider/60 bg-theme-surface/10 backdrop-blur-sm pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Preview Modal (Mobile) */}
      {previewTheme && previewData && (
        <ThemePreviewModal
          themeKey={previewTheme}
          themeConfig={previewData}
          onClose={closePreview}
          onSelect={(key, protagonistFeature) => {
            onSelect(key, protagonistFeature);
            closePreview();
          }}
        />
      )}
    </div>
  );
};
