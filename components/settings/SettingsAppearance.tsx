import React from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";

export const SettingsAppearance: React.FC = () => {
  const { t } = useTranslation();
  const {
    settings: currentSettings,
    updateSettings: onUpdateSettings,
    themeMode,
    setThemeMode: onSetThemeMode,
  } = useSettings();

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

      {currentSettings && onUpdateSettings && (
        <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
          <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest mb-4">
            {t("visualEffects")}
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-theme-text">
                {t("enableFallbackBackground")}
              </div>
              <div className="text-xs text-theme-muted">
                {t("enableFallbackBackgroundDesc")}
              </div>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({
                  ...currentSettings,
                  enableFallbackBackground:
                    !currentSettings.enableFallbackBackground,
                })
              }
              className={`w-12 h-6 rounded-full transition-colors relative ${
                currentSettings.enableFallbackBackground
                  ? "bg-theme-primary"
                  : "bg-theme-border"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  currentSettings.enableFallbackBackground ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-theme-border/50">
            <div>
              <div className="font-bold text-theme-text">
                {t("lockEnvTheme")}
              </div>
              <div className="text-xs text-theme-muted">
                {t("lockEnvThemeDesc")}
              </div>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({
                  ...currentSettings,
                  lockEnvTheme: !currentSettings.lockEnvTheme,
                })
              }
              className={`w-12 h-6 rounded-full transition-colors relative ${
                currentSettings.lockEnvTheme
                  ? "bg-theme-primary"
                  : "bg-theme-border"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  currentSettings.lockEnvTheme ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
