import React from "react";
import { useTranslation } from "react-i18next";
import { FeedLayout } from "../../types";

interface FeedHeaderProps {
  layout: FeedLayout;
  setLayout: (layout: FeedLayout) => void;
  activeIndex: number;
  totalSegments: number;
  environment?: string;
  ambience?: string;
  theme?: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

export const FeedHeader: React.FC<FeedHeaderProps> = ({
  layout,
  setLayout,
  activeIndex,
  totalSegments,
  environment,
  ambience,
  theme,
  isMuted,
  onToggleMute,
}) => {
  const { t } = useTranslation();

  let ambienceName = ambience ? t("ambienceNames." + ambience) : null;
  let environmentName = environment ? t("environmentNames." + environment) : null;

  // Fallback to raw names if translation missing
  // If the translation key is the same as the input, it means no translation was found
  if (ambience && (!ambienceName || ambienceName == "ambienceNames." + ambience)) {
    ambienceName = ambience;
  }

  if (environment && (!environmentName || environmentName == "environmentNames." + environment)) {
    environmentName = environment;
  }

  return (
    <div className="flex-none p-2 flex justify-between items-center border-b border-theme-border bg-theme-surface/50 backdrop-blur-sm z-10">
      <div className="flex items-center space-x-4 text-xs font-bold uppercase tracking-widest">
        <div className="flex items-center space-x-2">
          <span className="text-theme-muted">{t("turn")}:</span>
          <span className="text-theme-primary">
            {layout === "stack"
              ? `${activeIndex + 1} / ${totalSegments}`
              : totalSegments}
          </span>
        </div>

        {theme && (
          <div className="flex items-center space-x-2 border-l border-theme-border pl-4 opacity-70">
            <span className="text-lg leading-none" role="img" aria-label="theme">
              🎭
            </span>
            <span className="text-theme-text truncate text-xs md:text-sm">
              {t(`themes.${theme}.name`)}
            </span>
          </div>
        )}

        {(environment || ambience) && (
          <div className="flex items-center space-x-2 md:space-x-3 border-l border-theme-border pl-2 md:pl-4 opacity-70 overflow-hidden">
            {environment && (
              <div
                className="flex items-center space-x-1 max-w-[100px] md:max-w-[150px]"
                title={t("environment")}
              >
                <span
                  className="text-lg leading-none"
                  role="img"
                  aria-label="location"
                >
                  📍
                </span>
                <span className="text-theme-text truncate text-xs md:text-sm">
                  {environmentName}
                </span>
              </div>
            )}
            {ambience && (
              <button
                onClick={onToggleMute}
                className={`flex items-center space-x-1 max-w-[100px] md:max-w-[150px] hover:text-theme-primary transition-colors ${isMuted ? "opacity-50 grayscale" : ""}`}
                title={isMuted ? t("audioSettings.unmute") : t("audioSettings.mute")}
              >
                <span
                  className="text-lg leading-none"
                  role="img"
                  aria-label="music"
                >
                  {isMuted ? "🔇" : "🎵"}
                </span>
                <span className={`text-theme-text truncate text-xs md:text-sm ${isMuted ? "line-through text-theme-muted" : ""}`}>
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
