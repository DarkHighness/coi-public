import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { StoryThemeConfig } from "../types";
import { CategoryKey } from "../utils/constants/themes";
import { ThemeFilters } from "./themes/ThemeFilters";
import { ThemeCard } from "./themes/ThemeCard";
import { ThemePreviewModal } from "./themes/ThemePreviewModal";

interface ThemeSelectorProps {
  themes: Record<string, StoryThemeConfig>;
  onSelect: (theme: string) => void;
  onHover: (theme: string) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  themes,
  onSelect,
  onHover,
}) => {
  const { t } = useTranslation();
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("all");
  const [isScrolled, setIsScrolled] = useState(false);

  const handlePreview = (key: string) => {
    setPreviewTheme(key);
    onHover(key); // Update global theme to match preview
  };

  const closePreview = () => {
    setPreviewTheme(null);
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
        const name = t(`themes.${key}.name`).toLowerCase();
        const style = t(`themes.${key}.narrativeStyle`).toLowerCase();
        return name.includes(query) || style.includes(query);
      });
    }

    return keys;
  }, [themes, searchQuery, selectedCategory, t]);

  // Scroll Tracking for Mobile/Global Theme Update
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Sort by intersection ratio to find the most visible one
          visibleEntries.sort(
            (a, b) => b.intersectionRatio - a.intersectionRatio,
          );
          const mostVisible = visibleEntries[0];
          const themeKey = mostVisible.target.getAttribute("data-theme-key");

          // Only update if we are not in preview mode (modal open)
          if (themeKey && !previewTheme) {
            onHover(themeKey);
          }
        }
      },
      {
        threshold: 0.6, // Trigger when 60% visible
        rootMargin: "-10% 0px -10% 0px", // Focus on center area
      },
    );

    const cards = document.querySelectorAll(".theme-card");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [filteredThemes, previewTheme, onHover]);

  const previewData = previewTheme ? themes[previewTheme] : null;

  return (
    <div
      className="w-full h-full overflow-y-auto custom-scrollbar relative"
      onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 10)}
    >
      <ThemeFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        isScrolled={isScrolled}
      />

      {/* Theme List */}
      <div className="px-4 pb-32 md:pb-8">
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-3">
          {/* Random Option */}
          {selectedCategory === "all" && !searchQuery && (
            <button
              onClick={() => onSelect("")}
              onMouseEnter={() => onHover("fantasy")}
              className="relative w-full p-4 rounded-xl border border-theme-primary/30 hover:border-theme-primary transition-all text-left group overflow-hidden bg-linear-to-r from-theme-surface-highlight/50 to-theme-bg hover:shadow-[0_0_15px_rgba(var(--theme-primary),0.2)] flex items-center gap-4"
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

          {filteredThemes.map((key) => (
            <ThemeCard
              key={key}
              themeKey={key}
              themeConfig={themes[key]}
              onPreview={handlePreview}
              onHover={onHover}
            />
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {previewTheme && previewData && (
        <ThemePreviewModal
          themeKey={previewTheme}
          themeConfig={previewData}
          onClose={closePreview}
          onSelect={(key) => {
            onSelect(key);
            closePreview();
          }}
        />
      )}
    </div>
  );
};
