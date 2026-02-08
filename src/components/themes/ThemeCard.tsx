import React from "react";
import { useTranslation } from "react-i18next";
import { StoryThemeConfig } from "../../types";
import { ENV_THEMES } from "../../utils/constants/envThemes";
import { getValidIcon } from "../../utils/emojiValidator";
import { MarkdownText } from "../render/MarkdownText";

interface ThemeCardProps {
  themeKey: string;
  themeConfig: StoryThemeConfig;
  onPreview: (key: string) => void;
  isDesktop: boolean;
}

export const ThemeCard: React.FC<ThemeCardProps> = ({
  themeKey,
  themeConfig,
  onPreview,
  isDesktop,
}) => {
  const { t } = useTranslation();
  const envTheme = ENV_THEMES[themeConfig.envTheme];
  const primaryColor = envTheme?.vars["--theme-primary"] || "#f59e0b";

  const lineClampClass = isDesktop ? "line-clamp-4" : "line-clamp-2";

  return (
    <button
      onClick={() => onPreview(themeKey)}
      className="group relative w-full h-full text-left transition-all duration-300 theme-card"
      data-theme-key={themeKey}
    >
      <div
        className={`relative h-full rounded-2xl border border-theme-divider/60 bg-gradient-to-br from-theme-surface/35 to-theme-bg/40 hover:bg-theme-surface-highlight/12 hover:border-theme-primary/40 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.22)] transition-all overflow-hidden ${
          isDesktop ? "h-full min-h-[188px]" : "h-[104px]"
        }`}
      >
        <div className="absolute inset-y-0 left-0 w-1.5 bg-theme-primary/32 group-hover:bg-theme-primary/65 transition-colors" />

        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at top right, ${primaryColor}24, transparent 60%)`,
          }}
        />

        <div className="relative z-10 h-full p-3.5 md:p-4 flex items-start gap-3.5">
          <div className="h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-xl border border-theme-divider/60 bg-theme-surface-highlight/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] grid place-items-center text-xl md:text-2xl leading-none">
            {getValidIcon(themeConfig.icon, "📖")}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm md:text-[15px] font-semibold text-theme-text group-hover:text-theme-primary transition-colors truncate leading-tight">
              {t(`${themeKey}.name`, { ns: "themes" })}
            </h3>

            <div
              className={`mt-1.5 text-[11px] md:text-xs leading-relaxed text-theme-text-secondary group-hover:text-theme-text/90 transition-colors ${lineClampClass}`}
            >
              <MarkdownText
                content={t(`${themeKey}.narrativeStyle`, { ns: "themes" })}
                disableIndent
                components={{
                  p: ({ node, ...props }: any) => <span {...props} />,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};
