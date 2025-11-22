import React from "react";
import { useTranslation } from "react-i18next";
import { SettingsAppearanceProps } from "./types";

export const SettingsAppearance: React.FC<SettingsAppearanceProps> = ({
  themeMode,
  onSetThemeMode,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 animate-slide-in">
      <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
        <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest mb-4">
          {t("themeMode")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["day", "night", "system"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onSetThemeMode && onSetThemeMode(mode)}
              className={`p-4 rounded border transition-all flex flex-col items-center gap-2 ${
                themeMode === mode
                  ? "bg-theme-primary/10 border-theme-primary"
                  : "bg-theme-bg border-theme-border hover:border-theme-primary/50"
              }`}
            >
              <span className="text-2xl">
                {mode === "day" ? "☀️" : mode === "night" ? "🌙" : "💻"}
              </span>
              <div className="text-center">
                <div
                  className={`font-bold uppercase tracking-wider text-sm ${
                    themeMode === mode
                      ? "text-theme-primary"
                      : "text-theme-text"
                  }`}
                >
                  {t(`modes.${mode}`)}
                </div>
                <div className="text-xs text-theme-muted mt-1">
                  {t(`modes.desc.${mode}`)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
