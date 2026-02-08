import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StoryThemeConfig } from "../../types";
import { CategoryKey } from "../../utils/constants/themes";
import { getValidIcon } from "../../utils/emojiValidator";
import { ThemeFilters } from "./ThemeFilters";
import { MarkdownText } from "../render/MarkdownText";
import { RoleSelectionModal } from "./RoleSelectionModal";

const RANDOM_THEME_KEY = "__random_theme__";

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

  const filteredThemes = useMemo(() => {
    let keys = Object.keys(themes);

    if (selectedCategory !== "all") {
      keys = keys.filter((key) =>
        themes[key].categories?.includes(selectedCategory),
      );
    }

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

    setRoleSelectionTheme(activeTheme);
    setShowRoleSelection(true);
  };

  return (
    <div className="w-full h-full relative flex flex-col bg-theme-bg text-theme-text">
      {mode === "list" ? (
        <>
          <div className="shrink-0 px-3 pt-2 pb-1 border-b border-theme-divider/60">
            <ThemeFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              isScrolled={false}
              isDesktop={false}
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3">
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
                      className="w-full py-3 text-left flex items-start gap-3 hover:text-theme-primary transition-colors"
                    >
                      <div className="h-8 w-8 shrink-0 grid place-items-center text-lg leading-none">
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-theme-text truncate">
                          {name}
                        </div>
                        <div className="mt-1 text-xs text-theme-text-secondary leading-relaxed line-clamp-2">
                          {description}
                        </div>
                      </div>
                      <svg
                        className="w-4 h-4 text-theme-text-secondary shrink-0 mt-0.5"
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
          <div className="shrink-0 px-3 py-2 border-b border-theme-divider/60 flex items-center justify-between gap-3">
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
              <div className="text-xs text-theme-text-secondary uppercase tracking-[0.12em]">
                {t("themePreview", "Theme Preview")}
              </div>
            </div>

            <div className="w-8" />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-20">
            <section className="pt-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 shrink-0 grid place-items-center text-xl leading-none">
                  {previewData ? getValidIcon(previewData.icon, "📖") : "🎲"}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-theme-primary truncate">
                    {previewData
                      ? t(`${previewThemeKey}.name`, { ns: "themes" })
                      : t("randomTheme")}
                  </h3>
                  <p className="mt-1 text-sm text-theme-text-secondary leading-relaxed">
                    {previewData
                      ? t(
                          "themeSelectionHint",
                          "Preview details and start when ready.",
                        )
                      : t("randomThemeDesc")}
                  </p>
                </div>
              </div>
            </section>

            {previewData ? (
              <>
                <section className="pt-4 border-t border-theme-divider/60 mt-4">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-theme-text-secondary mb-2">
                    {t("narrativeStyle")}
                  </div>
                  <div className="text-sm text-theme-text leading-7">
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
                  <div className="text-sm text-theme-text leading-7">
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
                  <div className="text-sm text-theme-text leading-7">
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
                  {t(
                    "randomThemePanelDesc",
                    "Pick random to start instantly. We will choose a world and tone for you.",
                  )}
                </div>
              </section>
            )}
          </div>

          <div className="shrink-0 px-3 py-2.5 border-t border-theme-divider/60 bg-theme-bg pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
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
