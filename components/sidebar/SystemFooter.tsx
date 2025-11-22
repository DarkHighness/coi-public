import React from "react";
import { useTranslation } from "react-i18next";

interface SystemFooterProps {
  themeFont: string;
  onMagicMirror: () => void;
  onNewGame: () => void;
  onSave: () => void;
  onSettings: () => void;
  onCloseMobile: () => void;
  currentAmbience?: string;
  onVeoScript: () => void;
}

export const SystemFooter: React.FC<SystemFooterProps> = ({
  themeFont,
  onMagicMirror,
  onNewGame,
  onSave,
  onSettings,
  onCloseMobile,
  currentAmbience,
  onVeoScript,
}) => {
  const { t } = useTranslation();

  return (
    <div className="shrink-0 p-6 border-t border-theme-border bg-theme-surface/30 space-y-6 mt-auto">
      {/* Tools Panel */}
      <div>
        <div className="flex rounded-md overflow-hidden border border-theme-border hover:border-theme-primary transition-colors group">
          <button
            onClick={() => {
              onMagicMirror();
              onCloseMobile();
            }}
            className="flex-1 py-3 px-4 bg-theme-surface-highlight hover:bg-theme-surface-highlight/80 transition-all flex items-center justify-center text-theme-text relative border-r border-theme-border"
            title={t("magicMirror")}
          >
            <svg
              className="w-5 h-5 mr-2 text-theme-primary group-hover:scale-110 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              ></path>
            </svg>
            <span className="text-sm font-medium">{t("magicMirror")}</span>
          </button>
          <button
            onClick={() => {
              onVeoScript();
              onCloseMobile();
            }}
            className="w-12 py-3 bg-theme-surface-highlight hover:bg-theme-surface-highlight/80 transition-all flex items-center justify-center text-theme-text relative"
            title={t("veoScript.title")}
          >
            <svg
              className="w-5 h-5 text-theme-muted hover:text-theme-primary transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      {/* System Panel */}
      <div>
        <h2
          className={`text-theme-primary uppercase text-xs font-bold tracking-widest mb-4 flex items-center ${themeFont}`}
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            ></path>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            ></path>
          </svg>
          {t("system")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              onNewGame();
              onCloseMobile();
            }}
            className="px-3 py-2 bg-theme-surface-highlight/50 hover:bg-theme-primary/20 border border-theme-border hover:border-theme-primary text-theme-text text-xs rounded transition-colors"
          >
            {t("mainMenu")}
          </button>
          <div className="relative">
            <button
              onClick={onSave}
              className="w-full px-3 py-2 bg-theme-surface-highlight/50 hover:bg-theme-primary/20 border border-theme-border hover:border-theme-primary text-theme-text text-xs rounded transition-colors"
            >
              {t("saveGame")}
            </button>
          </div>
        </div>
        {/* Second Row of System Buttons */}
        <div className="grid grid-cols-1 gap-2 mt-2">
          <button
            onClick={() => {
              onSettings();
              onCloseMobile();
            }}
            className="px-3 py-2 bg-theme-surface-highlight/50 hover:bg-theme-surface-highlight border border-theme-border hover:border-theme-muted text-theme-muted hover:text-theme-text text-xs rounded transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              ></path>
            </svg>
            {t("settings")}
          </button>
        </div>

        <div className="p-4 text-xs text-theme-muted text-center mt-4 border-t border-theme-border pt-4">
          {t("builtWith")}
        </div>
      </div>
    </div>
  );
};
