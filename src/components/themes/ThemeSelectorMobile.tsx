import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StoryThemeConfig } from "../../types";
import { CategoryKey } from "../../utils/constants/themeCategories";
import { getValidIcon } from "../../utils/emojiValidator";
import { ThemeFilters } from "./ThemeFilters";
import { buildFilteredThemeKeys } from "./themeSort";
import { MarkdownText } from "../render/MarkdownText";
import { RoleSelectionModal } from "./RoleSelectionModal";
import { useThemePreferences } from "./useThemePreferences";

const RANDOM_THEME_KEY = "__random_theme__";
const CUSTOM_THEME_KEY = "custom";

type MobileMode = "list" | "detail";

interface ThemeSelectorMobileProps {
  themes: Record<string, StoryThemeConfig>;
  onSelect: (theme: string, protagonistFeature?: string) => void;
  onPreviewTheme?: (theme: string | null) => void;
}

const stripMarkdown = (text: string) =>
  text
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[*_`>#~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const ThemeSelectorMobile: React.FC<ThemeSelectorMobileProps> = ({
  themes,
  onSelect,
  onPreviewTheme,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("all");
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [mode, setMode] = useState<MobileMode>("list");
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [roleSelectionTheme, setRoleSelectionTheme] = useState<string | null>(
    null,
  );
  const {
    sortMode,
    setSortMode,
    favoriteSet,
    toggleFavoriteTheme,
    usageByTheme,
    markThemeUsed,
  } = useThemePreferences();

  const filteredThemes = useMemo(
    () =>
      buildFilteredThemeKeys({
        themes,
        selectedCategory,
        searchQuery,
        sortMode,
        favoriteThemeKeys: favoriteSet,
        usageByTheme,
        t,
      }),
    [
      themes,
      selectedCategory,
      searchQuery,
      sortMode,
      favoriteSet,
      usageByTheme,
      t,
    ],
  );

  const showRandomOption = selectedCategory === "all" && !searchQuery.trim();

  const selectorItems = useMemo(
    () =>
      showRandomOption
        ? [RANDOM_THEME_KEY, ...filteredThemes]
        : [...filteredThemes],
    [showRandomOption, filteredThemes],
  );

  useEffect(() => {
    if (selectorItems.length === 0) {
      setActiveTheme(null);
      setMode("list");
      return;
    }

    setActiveTheme((previous) => {
      if (previous && selectorItems.includes(previous)) {
        return previous;
      }
      return selectorItems[0];
    });
  }, [selectorItems]);

  useEffect(() => {
    if (!activeTheme || activeTheme === RANDOM_THEME_KEY) {
      onPreviewTheme?.(null);
      return;
    }

    onPreviewTheme?.(activeTheme);
  }, [activeTheme, onPreviewTheme]);

  useEffect(() => {
    return () => {
      onPreviewTheme?.(null);
    };
  }, [onPreviewTheme]);

  const previewThemeKey =
    activeTheme && activeTheme !== RANDOM_THEME_KEY ? activeTheme : null;
  const previewData = previewThemeKey ? themes[previewThemeKey] : null;

  const openThemeDetail = (themeKey: string) => {
    setActiveTheme(themeKey);
    setMode("detail");
  };

  const handleStart = () => {
    if (!activeTheme) return;

    if (activeTheme === RANDOM_THEME_KEY) {
      onSelect("");
      return;
    }

    if (activeTheme === CUSTOM_THEME_KEY) {
      markThemeUsed(activeTheme);
      onSelect(activeTheme, "");
      return;
    }

    setRoleSelectionTheme(activeTheme);
    setShowRoleSelection(true);
  };

  return (
    <div className="w-full h-full relative flex flex-col bg-theme-bg text-theme-text">
      {mode === "list" ? (
        <>
          <div className="shrink-0 px-2 pt-2 pb-1 border-b border-theme-divider/60">
            <ThemeFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              sortMode={sortMode}
              setSortMode={setSortMode}
              isScrolled={false}
              isDesktop={false}
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-3">
            <div className="py-2 border-b border-theme-divider/60 text-[11px] uppercase tracking-[0.12em] text-theme-text-secondary flex items-center justify-between">
              <span>{t("selectTheme")}</span>
              <span>{selectorItems.length}</span>
            </div>

            {selectorItems.length === 0 ? (
              <div className="py-8 text-sm text-theme-text-secondary border-b border-theme-divider/60">
                {t("noThemesFound", "No themes found")}
              </div>
            ) : (
              <div className="divide-y divide-theme-divider/60">
                {selectorItems.map((themeKey) => {
                  const isRandom = themeKey === RANDOM_THEME_KEY;
                  const isFavorite = !isRandom && favoriteSet.has(themeKey);
                  const icon = isRandom
                    ? "🎲"
                    : getValidIcon(themes[themeKey]?.icon, "📖");
                  const name = isRandom
                    ? t("randomTheme")
                    : t(`${themeKey}.name`, { ns: "themes" });
                  const description = isRandom
                    ? t("randomThemeDesc")
                    : stripMarkdown(
                        t(`${themeKey}.narrativeStyle`, {
                          ns: "themes",
                        }) as string,
                      );

                  return (
                    <button
                      key={themeKey}
                      onClick={() => openThemeDetail(themeKey)}
                      className="group w-full py-3.5 px-0 text-left flex items-start gap-3 hover:text-theme-primary hover:bg-theme-surface-highlight/10 transition-colors"
                    >
                      <div className="mt-0.5 h-8 w-8 shrink-0 grid place-items-center text-[18px] leading-none">
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-theme-text tracking-[0.01em] truncate flex items-center gap-1">
                          {name}
                          {isFavorite && (
                            <span className="text-theme-primary/90" aria-hidden>
                              ★
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-theme-text-secondary leading-[1.45] line-clamp-2">
                          {description}
                        </div>
                      </div>
                      <svg
                        className="w-4 h-4 text-theme-text-secondary opacity-45 group-hover:opacity-75 group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
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
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="shrink-0 px-2 py-2 border-b border-theme-divider/60 flex items-center justify-between gap-3">
            <button
              onClick={() => setMode("list")}
              className="h-8 w-8 grid place-items-center text-theme-text-secondary hover:text-theme-primary transition-colors"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="min-w-0 flex-1 text-center">
              <div className="text-[10px] text-theme-text-secondary uppercase tracking-[0.12em]">
                {t("themePreview", "Theme Preview")}
              </div>
              <div className="mt-0.5 text-sm font-semibold text-theme-primary truncate">
                {previewData
                  ? t(`${previewThemeKey}.name`, { ns: "themes" })
                  : t("randomTheme")}
              </div>
            </div>

            {previewData && previewThemeKey ? (
              <button
                onClick={() => toggleFavoriteTheme(previewThemeKey)}
                className={`h-8 w-8 shrink-0 grid place-items-center border border-theme-divider/60 transition-colors ${
                  favoriteSet.has(previewThemeKey)
                    ? "text-theme-primary border-theme-primary/60 bg-theme-primary/10"
                    : "text-theme-text-secondary hover:text-theme-primary hover:border-theme-primary/45"
                }`}
                aria-label={
                  favoriteSet.has(previewThemeKey)
                    ? t("themeSort.unfavorite", "取消收藏")
                    : t("themeSort.favorite", "收藏")
                }
                title={
                  favoriteSet.has(previewThemeKey)
                    ? t("themeSort.unfavorite", "取消收藏")
                    : t("themeSort.favorite", "收藏")
                }
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 20 20"
                  fill={
                    favoriteSet.has(previewThemeKey) ? "currentColor" : "none"
                  }
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.08 3.324a1 1 0 00.95.69h3.495c.969 0 1.371 1.24.588 1.81l-2.828 2.055a1 1 0 00-.364 1.118l1.08 3.324c.3.921-.755 1.688-1.54 1.118l-2.829-2.055a1 1 0 00-1.175 0l-2.828 2.055c-.784.57-1.838-.197-1.539-1.118l1.08-3.324a1 1 0 00-.364-1.118L2.935 8.75c-.783-.57-.38-1.81.588-1.81h3.494a1 1 0 00.951-.69l1.08-3.324z" />
                </svg>
              </button>
            ) : (
              <div className="w-8" />
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-20">
            <section className="pt-3.5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-9 w-9 shrink-0 grid place-items-center text-[20px] leading-none">
                  {previewData ? getValidIcon(previewData.icon, "📖") : "🎲"}
                </div>
                <p className="text-xs text-theme-text-secondary leading-relaxed">
                  {previewData ? t("themeSelectionHint") : t("randomThemeDesc")}
                </p>
              </div>
            </section>

            {previewData ? (
              <>
                <section className="pt-4 border-t border-theme-divider/60 mt-4">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-theme-text-secondary mb-2">
                    {t("narrativeStyle")}
                  </div>
                  <div className="text-[13px] text-theme-text leading-[1.8]">
                    <MarkdownText
                      content={t(`${previewThemeKey}.narrativeStyle`, {
                        ns: "themes",
                      })}
                    />
                  </div>
                </section>

                <section className="pt-4 border-t border-theme-divider/60 mt-4">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-theme-text-secondary mb-2">
                    {t("worldSetting")}
                  </div>
                  <div className="text-[13px] text-theme-text leading-[1.8]">
                    <MarkdownText
                      content={t(`${previewThemeKey}.worldSetting`, {
                        ns: "themes",
                      })}
                    />
                  </div>
                </section>

                <section className="pt-4 border-t border-theme-divider/60 mt-4">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-theme-text-secondary mb-2">
                    {t("themeExample")}
                  </div>
                  <div className="text-[13px] text-theme-text leading-[1.8]">
                    <MarkdownText
                      content={t(`${previewThemeKey}.example`, {
                        ns: "themes",
                      })}
                    />
                  </div>
                </section>
              </>
            ) : (
              <section className="pt-4 border-t border-theme-divider/60 mt-4">
                <div className="text-sm text-theme-text-secondary leading-7">
                  {t("randomThemePanelDesc")}
                </div>
              </section>
            )}
          </div>

          <div className="shrink-0 px-2 py-2.5 border-t border-theme-divider/60 bg-theme-bg pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
            <button
              onClick={handleStart}
              disabled={!activeTheme}
              className="w-full h-11 text-sm tracking-[0.12em] font-semibold uppercase border border-theme-primary/45 text-theme-primary hover:bg-theme-primary/12 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {activeTheme === RANDOM_THEME_KEY
                ? t("surpriseMe")
                : t("startAdventure")}
            </button>
          </div>
        </>
      )}

      {showRoleSelection && roleSelectionTheme && (
        <RoleSelectionModal
          themeKey={roleSelectionTheme}
          roles={((): string[] => {
            const result = t(`${roleSelectionTheme}.protagonist_preference`, {
              ns: "themes",
              returnObjects: true,
            });
            return Array.isArray(result) ? (result as string[]) : [];
          })()}
          onSelect={(role) => {
            if (roleSelectionTheme) {
              markThemeUsed(roleSelectionTheme);
            }
            onSelect(roleSelectionTheme, role);
            setShowRoleSelection(false);
            setRoleSelectionTheme(null);
          }}
          onCancel={() => {
            setShowRoleSelection(false);
            setRoleSelectionTheme(null);
          }}
        />
      )}
    </div>
  );
};
