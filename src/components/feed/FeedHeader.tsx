import React from "react";
import { useTranslation } from "react-i18next";
import { FeedLayout } from "../../types";
import {
  normalizeAtmosphere,
  type AtmosphereObject,
} from "../../utils/constants/atmosphere";

interface FeedHeaderProps {
  layout: FeedLayout;
  setLayout: (layout: FeedLayout) => void;
  activeIndex: number;
  totalSegments: number;
  turnNumber?: number;
  /** Unified atmosphere object */
  atmosphere?: AtmosphereObject;
  /** Current playing ambience key (from audio system) */
  currentAmbience?: string;
  theme?: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  /** Whether envTheme is locked (follows story theme instead of atmosphere) */
  isEnvThemeLocked?: boolean;
  /** Toggle the lockEnvTheme setting */
  onToggleLockEnvTheme?: () => void;
}

export const FeedHeader: React.FC<FeedHeaderProps> = ({
  layout,
  setLayout,
  activeIndex,
  totalSegments,
  turnNumber,
  atmosphere,
  currentAmbience,
  theme,
  isMuted,
  onToggleMute,
  isEnvThemeLocked,
  onToggleLockEnvTheme,
}) => {
  const { t } = useTranslation();

  // Normalize atmosphere to get envTheme and ambience
  const normalizedAtmosphere = normalizeAtmosphere(atmosphere);
  const { envTheme, ambience } = normalizedAtmosphere;

  // Use currentAmbience (actual playing audio) if available, otherwise use atmosphere's ambience
  const displayAmbience = currentAmbience || ambience;

  // Get translated names - use envThemeNames for envTheme, ambienceNames for ambience
  let ambienceName = displayAmbience
    ? t("ambienceNames." + displayAmbience)
    : null;
  let envThemeName = envTheme ? t("envThemeNames." + envTheme) : null;

  // Fallback to raw names if translation missing
  if (
    displayAmbience &&
    (!ambienceName || ambienceName === "ambienceNames." + displayAmbience)
  ) {
    ambienceName = displayAmbience;
  }

  if (
    envTheme &&
    (!envThemeName || envThemeName === "envThemeNames." + envTheme)
  ) {
    envThemeName = envTheme;
  }

  return (
    <div className="flex-none p-2 flex justify-between items-center border-b border-theme-border bg-theme-surface/50 backdrop-blur-sm z-30">
      <div className="flex items-center space-x-2 md:space-x-4 text-xs font-bold uppercase tracking-widest flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-theme-muted hidden sm:inline">
            {t("turn")}:
          </span>
          <span className="text-theme-primary">
            {typeof turnNumber === "number"
              ? turnNumber
              : layout === "stack"
                ? `${activeIndex + 1} / ${totalSegments}`
                : totalSegments}
          </span>
        </div>

        {theme && (
          <div className="flex items-center space-x-1 md:space-x-2 border-l border-theme-border pl-2 md:pl-4 opacity-70 shrink-0">
            <span
              className="text-base md:text-lg leading-none"
              role="img"
              aria-label={t("feedHeader.theme")}
            >
              🎭
            </span>
            <span className="text-theme-text truncate text-xs md:text-sm max-w-[60px] sm:max-w-[100px] md:max-w-none">
              {t(`${theme}.name`, { ns: "themes" }) || theme}
            </span>
          </div>
        )}

        {(envTheme || displayAmbience) && (
          <div className="flex items-center space-x-2 md:space-x-3 border-l border-theme-border pl-2 md:pl-4 opacity-70 overflow-hidden flex-1 min-w-0">
            {envTheme && (
              <button
                onClick={onToggleLockEnvTheme}
                className={`flex items-center space-x-1 min-w-0 hover:text-theme-primary transition-colors ${isEnvThemeLocked ? "opacity-50" : ""}`}
                title={
                  isEnvThemeLocked
                    ? t("feedHeader.envThemeLockedHint") ||
                      "Environment theme is locked (click to unlock)"
                    : t("feedHeader.envThemeUnlockedHint") ||
                      "Environment theme follows ambience (click to lock)"
                }
              >
                <span
                  className="text-base md:text-lg leading-none shrink-0"
                  role="img"
                  aria-label={t("feedHeader.location")}
                >
                  {isEnvThemeLocked ? "🔒" : "📍"}
                </span>
                <span className="text-theme-text truncate text-xs md:text-sm">
                  {envThemeName}
                </span>
              </button>
            )}
            {displayAmbience && (
              <button
                onClick={onToggleMute}
                className={`flex items-center space-x-1 min-w-0 hover:text-theme-primary transition-colors ${isMuted ? "opacity-50 grayscale" : ""}`}
                title={
                  isMuted ? t("audioSettings.unmute") : t("audioSettings.mute")
                }
              >
                <span
                  className="text-base md:text-lg leading-none shrink-0"
                  role="img"
                  aria-label={t("feedHeader.music")}
                >
                  {isMuted ? "🔇" : "🎵"}
                </span>
                <span
                  className={`text-theme-text truncate text-xs md:text-sm ${isMuted ? "line-through text-theme-muted" : ""}`}
                >
                  {ambienceName}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex bg-theme-surface-highlight rounded border border-theme-border p-1">
        <button
          onClick={() => setLayout("scroll")}
          className={`px-3 py-1 text-xs rounded transition-colors ${layout === "scroll" ? "bg-theme-primary text-theme-bg font-bold" : "text-theme-muted hover:text-theme-text"}`}
        >
          {t("scroll")}
        </button>
        <button
          onClick={() => setLayout("stack")}
          className={`px-3 py-1 text-xs rounded transition-colors ${layout === "stack" ? "bg-theme-primary text-theme-bg font-bold" : "text-theme-muted hover:text-theme-text"}`}
        >
          {t("stack")}
        </button>
      </div>
    </div>
  );
};
