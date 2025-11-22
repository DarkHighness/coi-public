import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { THEMES, ENV_THEMES } from "../utils/constants";
import { StoryThemeConfig } from "../types";

interface ThemeSelectorProps {
  themes: Record<string, StoryThemeConfig>;
  onSelect: (theme: string) => void;
  onHover: (theme: string) => void;
}

const CATEGORY_KEYS = [
  "all",
  "ancient",
  "modern",
  "fantasy",
  "suspense",
] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

const CATEGORY_MAP: Record<Exclude<CategoryKey, "all">, string[]> = {
  ancient: [
    "wuxia",
    "xianxia",
    "demonic_cultivation",
    "palace_drama",
    "ancient_romance",
    "period_drama",
    "republican",
    "intrigue",
  ],
  modern: [
    "modern_romance",
    "ceo",
    "entertainment",
    "esports",
    "cs_student",
    "industry_elite",
    "rough_guy",
    "sweet_pet",
    "wild_youth",
    "love_after_marriage",
    "reunion",
    "wife_chasing",
    "son_in_law",
    "white_moonlight",
    "patriotism",
    "body_swap",
    "special_forces",
    "mutual_redemption",
  ],
  fantasy: ["fantasy", "scifi", "cyberpunk", "infinite_flow", "farming"],
  suspense: [
    "horror",
    "mystery",
    "survival",
    "zombie",
    "yandere",
    "villain_op",
    "angst",
    "long_aotian",
    "war_god",
    "return_strong",
    "female_growth",
  ],
};

// Placeholder for getThemeIcon - replace with actual implementation if available
const getThemeIcon = (key: string) => {
  switch (key) {
    case "wuxia":
      return "⚔️";
    case "xianxia":
      return "✨";
    case "demonic_cultivation":
      return "😈";
    case "palace_drama":
      return "👑";
    case "ancient_romance":
      return "💖";
    case "modern_romance":
      return "❤️";
    case "ceo":
      return "💼";
    case "entertainment":
      return "🎬";
    case "esports":
      return "🎮";
    case "cs_student":
      return "💻";
    case "fantasy":
      return "🐉";
    case "scifi":
      return "🚀";
    case "cyberpunk":
      return "🌃";
    case "horror":
      return "👻";
    case "mystery":
      return "🔍";
    case "survival":
      return "🏕️";
    case "zombie":
      return "🧟";
    case "yandere":
      return "🔪";
    case "villain_op":
      return "🦹";
    case "angst":
      return "💔";
    case "long_aotian":
      return "💪";
    case "war_god":
      return "🛡️";
    case "return_strong":
      return "🔥";
    case "female_growth":
      return "🌸";
    case "infinite_flow":
      return "♾️";
    case "farming":
      return "🌾";
    case "period_drama":
      return "🎭";
    case "republican":
      return "🎩";
    case "intrigue":
      return "🤫";
    case "industry_elite":
      return "🏢";
    case "rough_guy":
      return "👊";
    case "sweet_pet":
      return "🍬";
    case "wild_youth":
      return "🎸";
    case "love_after_marriage":
      return "💍";
    case "reunion":
      return "🤝";
    case "wife_chasing":
      return "🏃‍♀️";
    case "son_in_law":
      return "👨‍👩‍👧";
    case "white_moonlight":
      return "🌕";
    case "patriotism":
      return "🇨🇳";
    case "body_swap":
      return "👯";
    case "special_forces":
      return "🎖️";
    case "mutual_redemption":
      return "💞";
    default:
      return "📖";
  }
};

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
      const allowedKeys = CATEGORY_MAP[selectedCategory] || [];
      keys = keys.filter((key) => allowedKeys.includes(key));
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
    return keys;
  }, [themes, searchQuery, selectedCategory, t]);

  // Scroll Tracking for Mobile/Global Theme Update
  React.useEffect(() => {
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
  const previewName = previewTheme ? t(`themes.${previewTheme}.name`) : "";

  return (
    <div
      className="w-full h-full overflow-y-auto custom-scrollbar relative"
      onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 10)}
    >
      {/* Controls Header */}
      <div
        className={`sticky top-0 z-20 p-4 transition-all duration-300 ${
          isScrolled
            ? "bg-theme-bg/100 backdrop-blur-xl border-b border-theme-border/50 shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-theme-muted group-focus-within:text-theme-primary transition-colors duration-300"
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchThemes") || "Search themes..."}
              className={`block w-full pl-11 pr-10 py-3 border rounded-xl leading-5 text-theme-text placeholder-theme-muted/50 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary sm:text-sm transition-all duration-300 shadow-inner ${
                isScrolled
                  ? "bg-theme-surface-highlight/100 border-theme-border"
                  : "bg-theme-surface-highlight/20 border-theme-border/50"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-theme-muted hover:text-theme-text rounded-full hover:bg-theme-surface-highlight/50 transition-all"
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

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar mask-linear-fade">
            {CATEGORY_KEYS.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all border ${
                  selectedCategory === cat
                    ? "bg-theme-primary text-theme-bg border-theme-primary shadow-[0_0_10px_rgba(var(--theme-primary),0.3)]"
                    : "bg-theme-surface-highlight/30 text-theme-muted border-transparent hover:border-theme-border hover:text-theme-text hover:bg-theme-surface-highlight/50"
                }`}
              >
                {t(`categories.${cat}`) ||
                  cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

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

          {filteredThemes.map((key) => {
            const themeConfig = themes[key];
            const envTheme = ENV_THEMES[themeConfig.defaultEnvTheme];
            const primaryColor = envTheme?.vars["--theme-primary"] || "#f59e0b";
            const surfaceColor = envTheme?.vars["--theme-surface"] || "#0f172a";

            return (
              <button
                key={key}
                onClick={() => handlePreview(key)}
                onMouseEnter={() => onHover(key)}
                className="group relative w-full text-left transition-all duration-300 hover:scale-[1.01] theme-card"
                data-theme-key={key}
              >
                {/* Card Background with Gradient Border */}
                <div
                  className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
                  style={{
                    background: `linear-gradient(45deg, ${primaryColor}, transparent 60%)`,
                  }}
                ></div>

                <div
                  className="relative h-full p-4 md:p-6 rounded-xl border border-theme-border bg-theme-surface hover:border-theme-primary/50 transition-colors overflow-hidden"
                  style={
                    {
                      "--theme-primary": primaryColor,
                    } as React.CSSProperties
                  }
                >
                  {/* Hover Glow Effect */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at top right, ${primaryColor}15, transparent 70%)`,
                    }}
                  ></div>

                  <div className="flex items-start justify-between gap-4 relative z-10">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl md:text-3xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg">
                          {getThemeIcon(key)}
                        </span>
                        <h3 className="text-lg md:text-xl font-bold text-theme-text group-hover:text-theme-primary transition-colors truncate">
                          {t(`themes.${key}.name`)}
                        </h3>
                      </div>
                      <p className="text-xs md:text-sm text-theme-muted line-clamp-2 group-hover:text-theme-text/80 transition-colors">
                        {t(`themes.${key}.narrativeStyle`)}
                      </p>
                    </div>

                    {/* Arrow Icon */}
                    <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 text-theme-primary">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5l7 7-7 7"
                        ></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview Modal */}
      {previewTheme && previewData && (
        <div
          className="fixed inset-0 z-200 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4"
          onClick={closePreview}
        >
          <div
            className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-in relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dynamic Background */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${ENV_THEMES[previewData.defaultEnvTheme]?.vars["--theme-primary"] || "#f59e0b"}, transparent)`,
              }}
            ></div>

            {/* Header */}
            <div className="relative z-10 p-5 border-b border-theme-border flex items-center justify-between bg-theme-surface/50 backdrop-blur-sm">
              <div>
                <h2
                  className={`text-2xl font-bold uppercase tracking-tighter text-theme-text bg-clip-text bg-linear-to-r from-theme-text to-theme-muted ${ENV_THEMES[previewData.defaultEnvTheme]?.fontClass || "font-sans"}`}
                >
                  {previewName}
                </h2>
              </div>
              <button
                onClick={closePreview}
                className="p-2 text-theme-muted hover:text-theme-text transition-colors rounded-full hover:bg-theme-surface-highlight"
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
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 p-5 overflow-y-auto custom-scrollbar space-y-5">
              <div>
                <h3 className="text-xs text-theme-primary uppercase tracking-[0.2em] font-bold mb-2 opacity-70">
                  {t("narrativeStyle")}
                </h3>
                <p className="text-theme-muted text-sm leading-relaxed">
                  {t(`themes.${previewTheme}.narrativeStyle`)}
                </p>
              </div>

              <div className="bg-theme-bg/50 p-5 rounded-xl border border-theme-border/50 relative group">
                <div className="absolute -top-2 -left-2 text-3xl text-theme-primary/20 font-serif group-hover:text-theme-primary/30 transition-colors">
                  "
                </div>
                <p
                  className={`text-theme-text/90 leading-loose ${
                    (ENV_THEMES[previewData.defaultEnvTheme]?.fontClass ||
                      "font-sans") === "font-serif"
                      ? "font-serif text-base"
                      : "font-sans text-sm"
                  }`}
                >
                  {t(`themes.${previewTheme}.example`)}
                </p>
                <div className="absolute -bottom-2 -right-2 text-3xl text-theme-primary/20 font-serif rotate-180 group-hover:text-theme-primary/30 transition-colors">
                  "
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 p-5 border-t border-theme-border bg-theme-surface/50 backdrop-blur-sm">
              <button
                onClick={() => {
                  onSelect(previewTheme);
                  closePreview();
                }}
                className="w-full py-3 bg-theme-primary text-theme-bg font-bold text-lg uppercase tracking-widest hover:bg-theme-primary-hover transition-all shadow-[0_0_20px_rgba(var(--theme-primary),0.3)] hover:scale-[1.01] rounded-xl flex items-center justify-center gap-2"
              >
                <span>{t("startThisAdventure")}</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
