import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StoryThemeConfig } from "../../types";
import { CategoryKey } from "../../utils/constants/themeCategories";
import { ENV_THEMES } from "../../utils/constants/envThemes";
import { getValidIcon } from "../../utils/emojiValidator";
import { ThemeFilters } from "./ThemeFilters";
import { buildFilteredThemeKeys } from "./themeSort";
import { MarkdownText } from "../render/MarkdownText";
import { RoleSelectionModal } from "./RoleSelectionModal";
import { useThemePreferences } from "./useThemePreferences";

const RANDOM_THEME_KEY = "__random_theme__";
const CUSTOM_THEME_KEY = "custom";

interface ThemeSelectorDesktopProps {
  themes: Record<string, StoryThemeConfig>;
  onSelect: (theme: string, protagonistFeature?: string) => void;
  onPreviewTheme?: (theme: string | null) => void;
  onBack?: () => void;
}

const stripMarkdown = (text: string) =>
  text
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[*_`>#~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const ThemeSelectorDesktop: React.FC<ThemeSelectorDesktopProps> = ({
  themes,
  onSelect,
  onPreviewTheme,
  onBack,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("all");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
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
      setSelectedTheme(null);
      return;
    }

    setSelectedTheme((previous) => {
      if (previous && selectorItems.includes(previous)) {
        return previous;
      }
      return selectorItems[0];
    });
  }, [selectorItems]);

  useEffect(() => {
    if (!selectedTheme || selectedTheme === RANDOM_THEME_KEY) {
      onPreviewTheme?.(null);
      return;
    }

    onPreviewTheme?.(selectedTheme);
  }, [selectedTheme, onPreviewTheme]);

  useEffect(() => {
    return () => {
      onPreviewTheme?.(null);
    };
  }, [onPreviewTheme]);

  const previewThemeKey =
    selectedTheme && selectedTheme !== RANDOM_THEME_KEY ? selectedTheme : null;
  const previewData = previewThemeKey ? themes[previewThemeKey] : null;

  const handleStart = () => {
    if (!selectedTheme) return;

    if (selectedTheme === RANDOM_THEME_KEY) {
      onSelect("");
      return;
    }

    if (selectedTheme === CUSTOM_THEME_KEY) {
      markThemeUsed(selectedTheme);
      onSelect(selectedTheme, "");
      return;
    }

    setRoleSelectionTheme(selectedTheme);
    setShowRoleSelection(true);
  };

  return (
    <div className="w-full h-full relative flex flex-col bg-theme-bg text-theme-text z-[100]">
      <div className="shrink-0 px-4 md:px-6 pt-3 pb-2 flex items-start gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="h-9 w-9 grid place-items-center text-theme-text-secondary hover:text-theme-primary transition-colors"
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

        <div className="flex-1 min-w-0">
          <ThemeFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            sortMode={sortMode}
            setSortMode={setSortMode}
            isScrolled={false}
            isDesktop
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 px-4 md:px-6 pb-3">
        <div className="max-w-[1320px] mx-auto h-full bg-theme-bg grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="min-h-0 overflow-hidden flex flex-col">
            <div className="shrink-0 px-3 md:px-4 py-2 border-b border-theme-divider/60 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-theme-text-secondary">
              <span>{t("selectTheme")}</span>
              <span>{selectorItems.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {selectorItems.length === 0 ? (
                <div className="px-4 py-8 text-sm text-theme-text-secondary">
                  {t("noThemesFound", "No themes found")}
                </div>
              ) : (
                <div className="divide-y divide-theme-divider/60">
                  {selectorItems.map((themeKey) => {
                    const isRandom = themeKey === RANDOM_THEME_KEY;
                    const isActive = selectedTheme === themeKey;
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
                        onClick={() => setSelectedTheme(themeKey)}
                        className={`group relative w-full text-left px-3 md:px-4 py-3.5 flex items-start gap-3 transition-colors ${
                          isActive
                            ? "bg-theme-surface-highlight/15 text-theme-primary before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-theme-primary"
                            : "text-theme-text hover:text-theme-primary hover:bg-theme-surface-highlight/10"
                        }`}
                      >
                        <div className="mt-0.5 h-8 w-8 shrink-0 grid place-items-center text-[18px] leading-none">
                          {icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold tracking-[0.01em] truncate flex items-center gap-1">
                            {name}
                            {isFavorite && (
                              <span
                                className="text-theme-primary/90"
                                aria-hidden
                              >
                                ★
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-theme-text-secondary leading-[1.45] line-clamp-2">
                            {description}
                          </div>
                        </div>

                        <svg
                          className={`w-4 h-4 shrink-0 mt-1 transition-all ${
                            isActive
                              ? "opacity-100 text-theme-primary"
                              : "opacity-35 text-theme-text-secondary group-hover:opacity-70 group-hover:translate-x-0.5"
                          }`}
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
          </section>

          <aside className="min-h-0 overflow-hidden flex flex-col border-t lg:border-t-0 lg:border-l border-theme-divider/60">
            <div className="shrink-0 px-4 md:px-5 py-3 border-b border-theme-divider/60 flex items-start gap-3">
              <div className="mt-0.5 h-9 w-9 shrink-0 grid place-items-center text-[20px] leading-none">
                {previewData ? getValidIcon(previewData.icon, "📖") : "🎲"}
              </div>

              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-theme-text-secondary mb-1">
                  {t("themePreview", "Theme Preview")}
                </div>
                <h3
                  className={`text-[1.05rem] font-semibold text-theme-primary truncate ${
                    previewData
                      ? ENV_THEMES[previewData.envTheme]?.fontClass ||
                        "font-sans"
                      : "font-sans"
                  }`}
                >
                  {previewData
                    ? t(`${previewThemeKey}.name`, { ns: "themes" })
                    : t("randomTheme")}
                </h3>
                <p className="mt-1 text-xs text-theme-text-secondary leading-relaxed">
                  {previewData ? t("themeSelectionHint") : t("randomThemeDesc")}
                </p>
              </div>

              {previewData && previewThemeKey && (
                <button
                  onClick={() => toggleFavoriteTheme(previewThemeKey)}
                  className={`ml-auto h-8 w-8 shrink-0 grid place-items-center border border-theme-divider/60 transition-colors ${
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
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {previewData ? (
                <>
                  <section className="px-4 md:px-5 py-3.5 border-b border-theme-divider/60">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-theme-text-secondary mb-2">
                      {t("narrativeStyle")}
                    </div>
                    <div className="text-[13px] md:text-sm text-theme-text leading-[1.8]">
                      <MarkdownText
                        content={t(`${previewThemeKey}.narrativeStyle`, {
                          ns: "themes",
                        })}
                      />
                    </div>
                  </section>

                  <section className="px-4 md:px-5 py-3.5 border-b border-theme-divider/60">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-theme-text-secondary mb-2">
                      {t("worldSetting")}
                    </div>
                    <div className="text-[13px] md:text-sm text-theme-text leading-[1.8]">
                      <MarkdownText
                        content={t(`${previewThemeKey}.worldSetting`, {
                          ns: "themes",
                        })}
                      />
                    </div>
                  </section>

                  <section className="px-4 md:px-5 py-3.5 border-b border-theme-divider/60">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-theme-text-secondary mb-2">
                      {t("themeExample")}
                    </div>
                    <div className="text-[13px] md:text-sm text-theme-text leading-[1.8]">
                      <MarkdownText
                        content={t(`${previewThemeKey}.example`, {
                          ns: "themes",
                        })}
                      />
                    </div>
                  </section>

                  {(() => {
                    const roles = t(
                      `${previewThemeKey}.protagonist_preference`,
                      {
                        ns: "themes",
                        returnObjects: true,
                      },
                    ) as string[] | undefined;

                    if (!Array.isArray(roles) || roles.length === 0) {
                      return null;
                    }

                    return (
                      <section className="px-4 md:px-5 py-3.5">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-theme-text-secondary mb-2">
                          {t("availableRoles", "Possible Identities")}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {roles.slice(0, 8).map((role, index) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 text-xs text-theme-text-secondary border border-theme-divider/60"
                            >
                              {role.split(" (")[0]}
                            </span>
                          ))}
                          {roles.length > 8 && (
                            <span className="px-2 py-0.5 text-xs text-theme-text-secondary">
                              +{roles.length - 8}
                            </span>
                          )}
                        </div>
                      </section>
                    );
                  })()}
                </>
              ) : (
                <section className="px-4 md:px-5 py-4 text-sm text-theme-text-secondary leading-7">
                  {t("randomThemePanelDesc")}
                </section>
              )}
            </div>

            <div className="shrink-0 p-3 border-t border-theme-divider/60">
              <button
                onClick={handleStart}
                disabled={!selectedTheme}
                className="w-full h-11 text-sm tracking-[0.12em] font-semibold uppercase border border-theme-primary/45 text-theme-primary hover:bg-theme-primary/12 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {selectedTheme === RANDOM_THEME_KEY
                  ? t("surpriseMe")
                  : t("startAdventure")}
              </button>
            </div>
          </aside>
        </div>
      </div>

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
