import React from "react";
import { useTranslation } from "react-i18next";
import { StoryThemeConfig } from "../../types";
import { ENV_THEMES } from "../../utils/constants";

interface ThemeCardProps {
  themeKey: string;
  themeConfig: StoryThemeConfig;
  onPreview: (key: string) => void;
  onHover: (key: string) => void;
}

export const ThemeCard: React.FC<ThemeCardProps> = ({
  themeKey,
  themeConfig,
  onPreview,
  onHover,
}) => {
  const { t } = useTranslation();
  const envTheme = ENV_THEMES[themeConfig.defaultEnvTheme];
  const primaryColor = envTheme?.vars["--theme-primary"] || "#f59e0b";

  return (
    <button
      onClick={() => onPreview(themeKey)}
      onMouseEnter={() => onHover(themeKey)}
      className="group relative w-full text-left transition-all duration-300 hover:scale-[1.01] theme-card"
      data-theme-key={themeKey}
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
                {themeConfig.icon || "📖"}
              </span>
              <h3 className="text-lg md:text-xl font-bold text-theme-text group-hover:text-theme-primary transition-colors truncate">
                {t(`themes.${themeKey}.name`)}
              </h3>
            </div>
            <p className="text-xs md:text-sm text-theme-muted line-clamp-2 group-hover:text-theme-text/80 transition-colors">
              {t(`themes.${themeKey}.narrativeStyle`)}
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
};
