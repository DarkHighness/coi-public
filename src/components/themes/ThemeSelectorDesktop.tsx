import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StoryThemeConfig } from "../../types";
import { CategoryKey } from "../../utils/constants/themes";
import { ENV_THEMES } from "../../utils/constants/envThemes";
import { ThemeFilters } from "./ThemeFilters";
import { ThemeCard } from "./ThemeCard";
import { MarkdownText } from "../render/MarkdownText";
import { Pagination } from "./Pagination";
import { RoleSelectionModal } from "./RoleSelectionModal";
import i18n from "../../utils/i18n";

const ITEMS_PER_PAGE = 12; // 4 rows x 3 columns

interface ThemeSelectorDesktopProps {
  themes: Record<string, StoryThemeConfig>;
  onSelect: (theme: string, protagonistFeature?: string) => void;
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
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [roleSelectionTheme, setRoleSelectionTheme] = useState<string | null>(
    null,
  );

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

  const totalPages =
    Math.ceil((filteredThemes.length - firstPageCount) / ITEMS_PER_PAGE) +
    (filteredThemes.length > 0 ? 1 : 0);
  const currentThemes = getItemsForPage(currentPage);

  const previewData = previewTheme ? themes[previewTheme] : null;

  const content = (
    <div className="w-full h-full relative flex flex-col bg-theme-bg/95 backdrop-blur-xl z-[100]">
      {/* Header Area - Fixed on Desktop */}
      <div className="shrink-0 z-10 px-4 py-3 md:px-6 md:py-4 flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="h-9 w-9 grid place-items-center rounded-lg border border-theme-divider/60 text-theme-text-secondary hover:text-theme-primary hover:border-theme-primary/45 hover:bg-theme-surface-highlight/15 transition-colors"
            aria-label={t("back", "Back")}
          >
            <svg
              className="w-5 h-5"
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
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 py-3">
          <div
            key={`page-${currentPage}`}
            className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in"
          >
            {/* Random Option - only on first page */}
            {selectedCategory === "all" &&
              !searchQuery &&
              currentPage === 0 && (
                <button
                  onClick={() => onSelect("")}
                  className="relative w-full h-[232px] rounded-2xl border border-theme-divider/60 bg-gradient-to-br from-theme-surface/35 to-theme-bg/40 hover:bg-theme-surface-highlight/12 hover:border-theme-primary/40 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.22)] transition-all text-left group overflow-hidden animate-slide-in"
                  style={{ animationDelay: "0ms" }}
                >
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-theme-primary/35 group-hover:bg-theme-primary/65 transition-colors" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(var(--theme-primary-rgb),0.2),transparent_60%)]" />
                  <div className="relative h-full p-4 flex flex-col justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="h-12 w-12 rounded-xl border border-theme-divider/60 bg-theme-surface-highlight/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] grid place-items-center text-2xl leading-none shrink-0">
                        🎲
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-theme-primary uppercase tracking-[0.11em]">
                          {t("randomTheme")}
                        </div>
                        <div className="mt-1.5 text-xs leading-relaxed text-theme-text-secondary line-clamp-4">
                          {t("randomThemeDesc")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-theme-primary">
                      <span className="h-8 px-3 inline-flex items-center rounded-lg border border-theme-primary/40 bg-theme-primary/12 text-[11px] font-semibold tracking-[0.08em]">
                        {t("surpriseMe")}
                      </span>
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
                    </div>
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
        <div className="shrink-0 px-4 md:px-6 py-3 border-t border-theme-divider/60">
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
          <div className="fixed inset-y-0 right-0 w-[400px] lg:w-[480px] bg-theme-bg/95 backdrop-blur-xl border-l border-theme-divider/60 shadow-2xl z-50 animate-slide-in-right flex flex-col">
            {/* Close Button */}
            <button
              onClick={closePreview}
              className="absolute top-4 right-4 z-10 h-9 w-9 grid place-items-center rounded-lg border border-theme-divider/60 bg-theme-bg/60 text-theme-text-secondary hover:text-theme-primary hover:border-theme-primary/45 hover:bg-theme-surface-highlight/15 transition-colors"
              aria-label={t("close")}
            >
              <svg
                className="w-5 h-5"
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
                  <h2
                    className={`text-3xl font-bold text-theme-primary ${
                      ENV_THEMES[previewData.envTheme]?.fontClass || "font-sans"
                    } shadow-black/50 drop-shadow-lg`}
                  >
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
                    <div className="text-theme-text indent-4 text-lg leading-relaxed">
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
                    <div className="text-theme-text indent-4 text-lg leading-relaxed">
                      <MarkdownText
                        content={t(`${previewTheme}.worldSetting`, {
                          ns: "themes",
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wider font-sans">
                      {t("themeExample")}
                    </h3>
                    <div className="bg-theme-bg/50 p-5 rounded-xl border border-theme-border/50 relative group">
                      <div className="absolute -top-2 -left-2 text-3xl text-theme-primary/20 font-serif group-hover:text-theme-primary/30 transition-colors">
                        "
                      </div>
                      <div className="text-theme-text indent-4 text-lg leading-relaxed">
                        <MarkdownText
                          content={t(`${previewTheme}.example`, {
                            ns: "themes",
                          })}
                        />
                      </div>
                      <div className="absolute -bottom-2 -right-2 text-3xl text-theme-primary/20 font-serif rotate-180 group-hover:text-theme-primary/30 transition-colors">
                        "
                      </div>
                    </div>
                  </div>

                  {/* Role Preview */}
                  {(() => {
                    const roles = t(`${previewTheme}.protagonist_preference`, {
                      ns: "themes",
                      returnObjects: true,
                    }) as string[] | undefined;

                    if (!Array.isArray(roles) || roles.length === 0)
                      return null;

                    return (
                      <div className="space-y-3 pt-4 border-t border-theme-border/50 animate-fade-in animation-delay-300">
                        <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wider font-sans flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-theme-secondary/70"></span>
                          {t("availableRoles", "Possible Identities")}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {roles.slice(0, 8).map((role, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 bg-theme-surface-highlight/30 border border-theme-border/50 rounded-lg text-theme-text/80 text-xs font-medium backdrop-blur-sm"
                            >
                              {role.split(" (")[0]}
                            </span>
                          ))}
                          {roles.length > 8 && (
                            <span className="px-3 py-1.5 text-theme-muted text-xs font-medium italic opacity-70">
                              +{roles.length - 8}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t border-theme-divider/60 bg-theme-surface/10">
              <button
                onClick={() => {
                  const prefs = t(`${previewTheme}.protagonist_preference`, {
                    ns: "themes",
                    returnObjects: true,
                  }) as string[] | undefined;

                  // Always show selection, even if prefs is empty (to support custom roles)
                  setRoleSelectionTheme(previewTheme);
                  setShowRoleSelection(true);
                }}
                className="w-full h-11 rounded-lg bg-theme-primary/90 text-theme-bg text-sm font-bold uppercase tracking-[0.14em] hover:bg-theme-primary active:scale-[0.99] transition-all"
              >
                {t("startAdventure")}
              </button>
            </div>
          </div>

          {/* Desktop Backdrop */}
          <div
            className="fixed inset-0 ui-overlay backdrop-blur-sm z-40 animate-in fade-in duration-300"
            onClick={closePreview}
          />
        </>
      )}

      {showRoleSelection && roleSelectionTheme && (
        <RoleSelectionModal
          themeKey={roleSelectionTheme}
          roles={((): string[] => {
            const r = t(`${roleSelectionTheme}.protagonist_preference`, {
              ns: "themes",
              returnObjects: true,
            });
            return Array.isArray(r) ? (r as string[]) : [];
          })()}
          onSelect={(role) => {
            onSelect(roleSelectionTheme, role);
            setShowRoleSelection(false);
            setRoleSelectionTheme(null);
            closePreview();
          }}
          onCancel={() => {
            setShowRoleSelection(false);
            setRoleSelectionTheme(null);
          }}
        />
      )}
    </div>
  );

  return content;
};
