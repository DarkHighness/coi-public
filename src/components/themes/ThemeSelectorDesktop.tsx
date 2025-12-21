import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StoryThemeConfig } from "../../types";
import { CategoryKey } from "../../utils/constants/themes";
import { ENV_THEMES } from "../../utils/constants/envThemes";
import { ThemeFilters } from "./ThemeFilters";
import { ThemeCard } from "./ThemeCard";
import { MarkdownText } from "../render/MarkdownText";
import { Pagination } from "./Pagination";

const ITEMS_PER_PAGE = 12; // 4 rows x 3 columns

interface ThemeSelectorDesktopProps {
  themes: Record<string, StoryThemeConfig>;
  onSelect: (theme: string) => void;
  onPreviewTheme?: (theme: string | null) => void;
  onBack?: () => void;
}

export const ThemeSelectorDesktop: React.FC<ThemeSelectorDesktopProps> = ({
  themes,
  onSelect,
  onPreviewTheme,
  onBack,
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
  // First page shows 11 items when random card is visible (total 12 = 4 rows of 3)
  // Other pages show 12 items
  const showRandomCard = selectedCategory === "all" && !searchQuery;
  const firstPageCount = showRandomCard ? ITEMS_PER_PAGE - 1 : ITEMS_PER_PAGE;

  const getItemsForPage = (page: number) => {
    if (page === 0) {
      return filteredThemes.slice(0, firstPageCount);
    }
    const offset = firstPageCount + (page - 1) * ITEMS_PER_PAGE;
    return filteredThemes.slice(offset, offset + ITEMS_PER_PAGE);
  };

  const totalPages = Math.ceil(
    (filteredThemes.length - firstPageCount) / ITEMS_PER_PAGE
  ) + (filteredThemes.length > 0 ? 1 : 0);
  const currentThemes = getItemsForPage(currentPage);

  const previewData = previewTheme ? themes[previewTheme] : null;

  const content = (
    <div className="w-full h-full relative flex flex-col bg-theme-bg/95 backdrop-blur-xl z-[100]">
      {/* Header Area - Fixed on Desktop */}
      <div className="shrink-0 z-10 bg-theme-bg/80 backdrop-blur-md pt-4 px-6 flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex p-2 rounded-full hover:bg-theme-surface-highlight text-theme-muted hover:text-theme-text transition-colors"
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
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
        )}
        <div className="flex-1">
          <ThemeFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            isScrolled={false}
            isDesktop
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pt-4 pb-4">
          <div
            key={`page-${currentPage}`}
            className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in"
          >
            {/* Random Option - only on first page */}
            {selectedCategory === "all" && !searchQuery && currentPage === 0 && (
              <button
                onClick={() => onSelect("")}
                className="relative w-full h-[250px] p-4 rounded-xl border border-theme-primary/30 hover:border-theme-primary transition-all text-left group overflow-hidden bg-linear-to-r from-theme-surface-highlight/50 to-theme-bg hover:shadow-[0_0_15px_rgba(var(--theme-primary),0.2)] flex flex-col items-start justify-between animate-slide-in"
                style={{ animationDelay: "0ms" }}
              >
                <div className="w-16 h-16 rounded-full bg-theme-primary/10 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform shrink-0">
                  🎲
                </div>
                <div className="flex-1 min-w-0 w-full mt-4">
                  <div className="font-bold text-theme-primary uppercase tracking-wider text-lg mb-2">
                    {t("randomTheme")}
                  </div>
                  <div className="text-xs text-theme-muted truncate whitespace-normal line-clamp-3">
                    {t("randomThemeDesc")}
                  </div>
                </div>
                <div className="mt-4 px-4 py-2 rounded-lg bg-theme-primary/10 text-theme-primary text-xs font-bold uppercase tracking-wider group-hover:bg-theme-primary group-hover:text-theme-bg transition-all shrink-0 w-full text-center">
                  {t("surpriseMe")}
                </div>
              </button>
            )}

            {currentThemes.map((key, index) => (
              <div
                key={key}
                className="animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ThemeCard
                  themeKey={key}
                  themeConfig={themes[key]}
                  onPreview={handlePreview}
                  isDesktop
                />
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="shrink-0 px-6 py-4 bg-theme-bg/80 backdrop-blur-sm border-t border-theme-border">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Desktop Side Panel */}
      {previewTheme && previewData && (
        <>
          <div className="fixed inset-y-0 right-0 w-[400px] lg:w-[480px] bg-theme-surface border-l border-theme-border shadow-2xl z-50 animate-slide-in-right flex flex-col">
            {/* Close Button */}
            <button
              onClick={closePreview}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
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
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Content reused from Modal but styled for panel */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Hero Header (Gradient + Icon) */}
              <div className="relative h-48 w-full shrink-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-theme-primary/20 to-theme-bg" />
                <div className="absolute inset-0 flex items-center justify-center opacity-10 text-9xl select-none pointer-events-none">
                  {previewData.icon || "🎲"}
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="text-4xl mb-2">{previewData.icon}</div>
                  <h2 className="text-3xl font-bold text-theme-primary font-display shadow-black/50 drop-shadow-lg">
                    {t(`${previewTheme}.name`, { ns: "themes" })}
                  </h2>
                </div>
              </div>

              <div
                className={`p-6 space-y-6 ${ENV_THEMES[previewData.envTheme]?.fontClass || "font-sans"}`}
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wider font-sans">
                      {t("narrativeStyle")}
                    </h3>
                    <div className="text-theme-text-primary indent-4 text-lg leading-relaxed">
                      <MarkdownText
                        content={t(`${previewTheme}.narrativeStyle`, {
                          ns: "themes",
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wider font-sans">
                      {t("worldSetting")}
                    </h3>
                    <div className="text-theme-text-primary indent-4 text-lg leading-relaxed">
                      <MarkdownText
                        content={t(`${previewTheme}.worldSetting`, {
                          ns: "themes",
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-theme-border bg-theme-surface-highlight/10">
              <button
                onClick={() => {
                  onSelect(previewTheme);
                  closePreview();
                }}
                className="w-full py-4 rounded-xl bg-theme-primary text-theme-bg font-bold text-lg uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(var(--theme-primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--theme-primary),0.5)]"
              >
                {t("startAdventure")}
              </button>
            </div>
          </div>

          {/* Desktop Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-300"
            onClick={closePreview}
          />
        </>
      )}
    </div>
  );

  return content;
};
