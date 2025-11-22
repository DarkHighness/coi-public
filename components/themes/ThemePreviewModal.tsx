import React from "react";
import { useTranslation } from "react-i18next";
import { StoryThemeConfig } from "../../types";
import { ENV_THEMES } from "../../utils/constants";

interface ThemePreviewModalProps {
  themeKey: string;
  themeConfig: StoryThemeConfig;
  onClose: () => void;
  onSelect: (key: string) => void;
}

export const ThemePreviewModal: React.FC<ThemePreviewModalProps> = ({
  themeKey,
  themeConfig,
  onClose,
  onSelect,
}) => {
  const { t } = useTranslation();
  const previewName = t(`themes.${themeKey}.name`);
  const envTheme = ENV_THEMES[themeConfig.defaultEnvTheme];

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-in relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dynamic Background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${envTheme?.vars["--theme-primary"] || "#f59e0b"}, transparent)`,
          }}
        ></div>

        {/* Header */}
        <div className="relative z-10 p-5 border-b border-theme-border flex items-center justify-between bg-theme-surface/50 backdrop-blur-sm">
          <div>
            <h2
              className={`text-2xl font-bold uppercase tracking-tighter text-theme-text bg-clip-text bg-linear-to-r from-theme-text to-theme-muted ${envTheme?.fontClass || "font-sans"}`}
            >
              {previewName}
            </h2>
          </div>
          <button
            onClick={onClose}
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
              {t(`themes.${themeKey}.narrativeStyle`)}
            </p>
          </div>

          <div className="bg-theme-bg/50 p-5 rounded-xl border border-theme-border/50 relative group">
            <div className="absolute -top-2 -left-2 text-3xl text-theme-primary/20 font-serif group-hover:text-theme-primary/30 transition-colors">
              "
            </div>
            <p
              className={`text-theme-text/90 leading-loose ${
                (envTheme?.fontClass || "font-sans") === "font-serif"
                  ? "font-serif text-base"
                  : "font-sans text-sm"
              }`}
            >
              {t(`themes.${themeKey}.example`)}
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
              onSelect(themeKey);
              onClose();
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
  );
};
