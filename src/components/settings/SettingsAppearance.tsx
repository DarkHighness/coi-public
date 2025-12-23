import React from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";
import { ENV_THEMES } from "../../utils/constants";

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

          {/* Fixed EnvTheme Dropdown - shown when lockEnvTheme is enabled */}
          {currentSettings.lockEnvTheme && (
            <div className="mt-4 pt-4 border-t border-theme-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-theme-text">
                    {t("fixedEnvTheme") || "Fixed Theme"}
                  </div>
                  <div className="text-xs text-theme-muted">
                    {t("fixedEnvThemeDesc") ||
                      "Select a specific visual theme to use regardless of story context"}
                  </div>
                </div>
                <select
                  value={currentSettings.fixedEnvTheme || ""}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...currentSettings,
                      fixedEnvTheme: e.target.value || undefined,
                    })
                  }
                  className="bg-theme-bg border border-theme-border rounded px-3 py-1.5 text-sm text-theme-text focus:outline-none focus:border-theme-primary max-w-[180px]"
                >
                  <option value="">
                    {t("fixedEnvThemeAuto") || "Auto (Story Default)"}
                  </option>
                  {Object.keys(ENV_THEMES).map((themeKey) => (
                    <option key={themeKey} value={themeKey}>
                      {themeKey}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-theme-border/50">
            <div>
              <div className="font-bold text-theme-text">
                {t("disableEnvironmentalEffects") ||
                  "Disable Environmental Effects"}
              </div>
              <div className="text-xs text-theme-muted">
                {t("disableEnvironmentalEffectsDesc") ||
                  "Disable visual weather effects like rain, snow, and fog"}
              </div>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({
                  ...currentSettings,
                  disableEnvironmentalEffects:
                    !currentSettings.disableEnvironmentalEffects,
                })
              }
              className={`w-12 h-6 rounded-full transition-colors relative ${
                currentSettings.disableEnvironmentalEffects
                  ? "bg-theme-primary"
                  : "bg-theme-border"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  currentSettings.disableEnvironmentalEffects
                    ? "left-7"
                    : "left-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-theme-border/50">
            <div>
              <div className="font-bold text-theme-text">
                {t("galleryBackground") || "Gallery Background"}
              </div>
              <div className="text-xs text-theme-muted">
                {t("galleryBackgroundDesc") ||
                  "Show photos from gallery as floating background on start screen"}
              </div>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({
                  ...currentSettings,
                  galleryBackground: !currentSettings.galleryBackground,
                })
              }
              className={`w-12 h-6 rounded-full transition-colors relative ${
                currentSettings.galleryBackground
                  ? "bg-theme-primary"
                  : "bg-theme-border"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  currentSettings.galleryBackground ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-theme-border/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-bold text-theme-text">
                  {t("typewriterSpeed")}
                </div>
                <div className="text-xs text-theme-muted">
                  {t("typewriterSpeedDesc")}
                </div>
              </div>
              <span className="text-sm font-mono text-theme-primary bg-theme-primary/10 px-2 py-1 rounded">
                {currentSettings.typewriterSpeed}
                {t("common.ms")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-theme-muted">{t("fast")}</span>
              <input
                type="range"
                min="1"
                max="100"
                value={currentSettings.typewriterSpeed}
                onChange={(e) =>
                  onUpdateSettings({
                    ...currentSettings,
                    typewriterSpeed: parseInt(e.target.value),
                  })
                }
                className="flex-1 h-2 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-primary"
              />
              <span className="text-xs text-theme-muted">{t("slow")}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-theme-border/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-bold text-theme-text">
                  {t("stackItemsPerPage") || "Stack Layout Items Per Page"}
                </div>
                <div className="text-xs text-theme-muted">
                  {t("stackItemsPerPageDesc") ||
                    "Number of story segments shown per page in stack layout (must be even)"}
                </div>
              </div>
              <select
                value={currentSettings.stackItemsPerPage ?? 10}
                onChange={(e) =>
                  onUpdateSettings({
                    ...currentSettings,
                    stackItemsPerPage: parseInt(e.target.value),
                  })
                }
                className="bg-theme-bg border border-theme-border rounded px-3 py-1.5 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
              >
                {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map((num) => (
                  <option key={num} value={num}>
                    {num} {t("items") || "items"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-theme-border/50">
            <div>
              <div className="font-bold text-theme-text">
                {t("stackShowOutline") || "Show Outline in Stack Mode"}
              </div>
              <div className="text-xs text-theme-muted">
                {t("stackShowOutlineDesc") ||
                  "Display the story outline at the top of each page in stack layout"}
              </div>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({
                  ...currentSettings,
                  stackShowOutline: !(currentSettings.stackShowOutline ?? true),
                })
              }
              className={`w-12 h-6 rounded-full transition-colors relative ${
                (currentSettings.stackShowOutline ?? true)
                  ? "bg-theme-primary"
                  : "bg-theme-border"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  (currentSettings.stackShowOutline ?? true)
                    ? "left-7"
                    : "left-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-theme-border/50">
            <div>
              <div className="font-bold text-theme-text">
                {t("exportIncludeUserActions") || "Include Actions in Export"}
              </div>
              <div className="text-xs text-theme-muted">
                {t("exportIncludeUserActionsDesc") ||
                  "Include your choices and commands in timeline export, displayed as chat messages"}
              </div>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({
                  ...currentSettings,
                  exportIncludeUserActions: !(
                    currentSettings.exportIncludeUserActions ?? false
                  ),
                })
              }
              className={`w-12 h-6 rounded-full transition-colors relative ${
                (currentSettings.exportIncludeUserActions ?? false)
                  ? "bg-theme-primary"
                  : "bg-theme-border"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  (currentSettings.exportIncludeUserActions ?? false)
                    ? "left-7"
                    : "left-1"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
