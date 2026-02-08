import React from "react";
import { useTranslation } from "react-i18next";
import { BUILD_INFO } from "../../utils/constants";

interface SystemFooterProps {
  themeFont: string;
  onMagicMirror: () => void;
  onCloseMobile: () => void;
  onVeoScript: () => void;
}

export const SystemFooter: React.FC<SystemFooterProps> = ({
  themeFont,
  onMagicMirror,
  onCloseMobile,
  onVeoScript,
}) => {
  const { t } = useTranslation();

  const openAndCloseOnMobile = (action: () => void) => {
    action();
    onCloseMobile();
  };

  return (
    <div className="shrink-0 px-4 pt-2 pb-4 border-t border-theme-divider/60 bg-theme-surface/10 mt-auto space-y-3">
      <div>
        <h2
          className={`text-theme-primary uppercase text-[10px] font-bold tracking-[0.16em] mb-2 flex items-center ${themeFont}`}
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

        <div className="border-y border-theme-divider/60 divide-y divide-theme-divider/60">
          <button
            onClick={() => openAndCloseOnMobile(onMagicMirror)}
            className="w-full py-2.5 pl-2 pr-1 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/20 transition-colors text-theme-text"
            title={t("magicMirror.title")}
          >
            <span className="flex items-center gap-2 min-w-0">
              <svg
                className="w-5 h-5 text-theme-primary shrink-0"
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
              <span className="text-sm truncate">{t("magicMirror.title")}</span>
            </span>
            <svg
              className="w-4 h-4 text-theme-text-secondary shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          <button
            onClick={() => openAndCloseOnMobile(onVeoScript)}
            className="w-full py-2.5 pl-2 pr-1 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/20 transition-colors text-theme-text"
            title={t("veoScript.title")}
          >
            <span className="flex items-center gap-2 min-w-0">
              <svg
                className="w-5 h-5 text-theme-primary shrink-0"
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
              <span className="text-sm truncate">{t("veoScript.title")}</span>
            </span>
            <svg
              className="w-4 h-4 text-theme-text-secondary shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        <div className="mt-2 pt-2 border-t border-theme-divider/60 text-[10px] text-theme-text-secondary text-center">
          {t("builtWith")}
          <div className="opacity-60 mt-1 font-mono">
            {BUILD_INFO.gitHash} ({BUILD_INFO.buildTime})
          </div>
        </div>
      </div>
    </div>
  );
};
