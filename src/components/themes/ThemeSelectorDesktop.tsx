import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StoryThemeConfig } from "../../types";
import { CategoryKey } from "../../utils/constants/themes";
import { ENV_THEMES } from "../../utils/constants/envThemes";
import { getValidIcon } from "../../utils/emojiValidator";
import { ThemeFilters } from "./ThemeFilters";
import { MarkdownText } from "../render/MarkdownText";
import { RoleSelectionModal } from "./RoleSelectionModal";

const RANDOM_THEME_KEY = "__random_theme__";

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

    setRoleSelectionTheme(selectedTheme);
    setShowRoleSelection(true);
  };

  return (
    <div className="w-full h-full relative flex flex-col bg-theme-bg text-theme-text z-[100]">
      <div className="shrink-0 px-4 md:px-6 pt-3 pb-2 border-b border-theme-divider/60 flex items-start gap-3">
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
            isScrolled={false}
            isDesktop
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto px-4 md:px-6 pb-24">
          <section className="pt-2">
            <div className="py-2 border-b border-theme-divider/60 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-theme-text-secondary">
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
                  const isActive = selectedTheme === themeKey;
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
                      className={`w-full text-left py-3 flex items-start gap-3 transition-colors ${
                        isActive
                          ? "text-theme-primary"
                          : "text-theme-text hover:text-theme-primary"
                      }`}
                    >
                      <div className="h-8 w-8 shrink-0 grid place-items-center text-lg leading-none">
                        {icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{name}</div>
                        <div className="mt-1 text-xs text-theme-text-secondary leading-relaxed line-clamp-2">
                          {description}
                        </div>
                      </div>

                      <svg
                        className={`w-4 h-4 shrink-0 mt-0.5 transition-opacity ${
                          isActive
                            ? "opacity-100 text-theme-primary"
                            : "opacity-45 text-theme-text-secondary"
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
          </section>

          <section className="pt-5">
            <div className="text-[10px] uppercase tracking-[0.14em] text-theme-text-secondary">
              {t("themePreview", "Theme Preview")}
            </div>

            <div className="mt-2 flex items-start gap-3">
              <div className="h-9 w-9 shrink-0 grid place-items-center text-xl leading-none">
                {previewData ? getValidIcon(previewData.icon, "📖") : "🎲"}
              </div>

              <div className="min-w-0">
                <h3
                  className={`text-xl font-semibold text-theme-primary truncate ${
                    previewData
                      ? ENV_THEMES[previewData.envTheme]?.fontClass || "font-sans"
                      : "font-sans"
                  }`}
                >
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
              <section className="pt-5 border-t border-theme-divider/60 mt-5">
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

              <section className="pt-5 border-t border-theme-divider/60 mt-5">
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

              <section className="pt-5 border-t border-theme-divider/60 mt-5">
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

              {(() => {
                const roles = t(`${previewThemeKey}.protagonist_preference`, {
                  ns: "themes",
                  returnObjects: true,
                }) as string[] | undefined;

                if (!Array.isArray(roles) || roles.length === 0) {
                  return null;
                }

                return (
                  <section className="pt-5 border-t border-theme-divider/60 mt-5">
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
            <section className="pt-5 border-t border-theme-divider/60 mt-5">
              <div className="text-sm text-theme-text-secondary leading-7">
                {t(
                  "randomThemePanelDesc",
                  "Pick random to start instantly. We will choose a world and tone for you.",
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-theme-divider/60 bg-theme-bg">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3">
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
