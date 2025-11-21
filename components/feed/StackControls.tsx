import React from "react";
import { useTranslation } from "react-i18next";

interface StackControlsProps {
  onPrev: () => void;
  onNext: () => void;
  onLatest: () => void;
  activeIndex: number;
  totalSegments: number;
}

export const StackControls: React.FC<StackControlsProps> = ({
  onPrev,
  onNext,
  onLatest,
  activeIndex,
  totalSegments,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-theme-surface/80 backdrop-blur-md border border-theme-border/50 rounded-full p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex items-center gap-3 transition-all duration-300 hover:bg-theme-surface/95 hover:scale-105">
      <button
        onClick={onPrev}
        disabled={activeIndex === 0}
        className="p-2 rounded-full hover:bg-theme-primary/20 hover:text-theme-primary disabled:opacity-30 disabled:hover:bg-transparent text-theme-text transition-colors"
        title={`${t("previous")} (←)`}
      >
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
            d="M15 19l-7-7 7-7"
          ></path>
        </svg>
      </button>

      <div className="flex flex-col items-center w-16">
        <span className="text-xs font-bold text-theme-primary font-mono select-none">
          {activeIndex + 1} <span className="text-theme-muted">/</span>{" "}
          {totalSegments}
        </span>
      </div>

      <button
        onClick={onNext}
        disabled={activeIndex === totalSegments - 1}
        className="p-2 rounded-full hover:bg-theme-primary/20 hover:text-theme-primary disabled:opacity-30 disabled:hover:bg-transparent text-theme-text transition-colors"
        title={`${t("next")} (→)`}
      >
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
            d="M9 5l7 7-7 7"
          ></path>
        </svg>
      </button>

      <div className="w-[1px] h-5 bg-theme-border/50 mx-1"></div>

      <button
        onClick={onLatest}
        disabled={activeIndex === totalSegments - 1}
        className="px-3 py-1.5 rounded-full hover:bg-theme-primary hover:text-theme-bg disabled:opacity-30 text-[10px] font-bold text-theme-primary uppercase tracking-widest transition-colors"
      >
        {t("latest")}
      </button>
    </div>
  );
};
