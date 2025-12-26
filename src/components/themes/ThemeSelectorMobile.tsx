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
    <div className="w-full h-full relative flex flex-col">
      {/* Header Area */}
      <div className="shrink-0 z-10 backdrop-blur-md">
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
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
          <div
            key={`page-${currentPage}`}
            className="max-w-5xl mx-auto w-full flex flex-col gap-3 animate-fade-in"
          >
            {/* Random Option - only on first page */}
            {selectedCategory === "all" &&
              !searchQuery &&
              currentPage === 0 && (
                <button
                  onClick={() => onSelect("")}
                  className="relative w-full h-[80px] p-4 rounded-xl border border-theme-primary/30 hover:border-theme-primary transition-all text-left group overflow-hidden bg-linear-to-r from-theme-surface-highlight/50 to-theme-bg hover:shadow-[0_0_15px_rgba(var(--theme-primary),0.2)] flex items-center gap-4 animate-slide-in"
                  style={{ animationDelay: "0ms" }}
                >
                  <div className="w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shrink-0">
                    🎲
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-theme-primary uppercase tracking-wider text-base">
                      {t("randomTheme")}
                    </div>
                    <div className="text-xs text-theme-muted truncate">
                      {t("randomThemeDesc")}
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-theme-primary/10 text-theme-primary text-xs font-bold uppercase tracking-wider group-hover:bg-theme-primary group-hover:text-theme-bg transition-all shrink-0">
                    {t("surpriseMe")}
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
        <div className="shrink-0 px-4 py-2 backdrop-blur-sm border-t border-theme-border pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
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
