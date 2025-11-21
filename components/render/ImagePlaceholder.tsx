import React from "react";
import { useTranslation } from "react-i18next";

interface ImagePlaceholderProps {
  isGenerating: boolean;
  hasFailed?: boolean;
  labelVision: string;
  labelUnavailable: string;
  labelFailed?: string;
  themeFont?: string;
  onRegenerate?: () => void;
}

export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  isGenerating,
  hasFailed,
  labelVision,
  labelUnavailable,
  labelFailed,
  themeFont,
  onRegenerate,
}) => {
  const { t } = useTranslation();

  return (
    <div className="w-full h-full bg-theme-surface-highlight flex flex-col items-center justify-center">
      {isGenerating ? (
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="w-12 h-12 rounded-full border-2 border-theme-primary border-t-transparent animate-spin"></div>
          <span
            className={`text-theme-primary text-xs uppercase tracking-widest ${themeFont}`}
          >
            {labelVision}
          </span>
        </div>
      ) : onRegenerate ? (
        <button
          onClick={onRegenerate}
          className="flex flex-col items-center gap-3 hover:bg-theme-surface-highlight/50 p-6 rounded transition-all group"
        >
          <div className="relative">
            <svg
              className="w-12 h-12 text-theme-muted group-hover:text-theme-primary transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            <div className="absolute -bottom-1 -right-1 bg-theme-primary text-white rounded-full p-1">
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
                  d="M12 4v16m8-8H4"
                ></path>
              </svg>
            </div>
          </div>
          <span
            className={`text-xs uppercase tracking-widest transition-colors ${hasFailed ? "text-red-400 group-hover:text-red-500" : "text-theme-muted group-hover:text-theme-primary"}`}
          >
            {hasFailed
              ? labelFailed || t("generationFailed")
              : t("clickToGenerate")}
          </span>
        </button>
      ) : (
        <span className="text-theme-muted text-sm italic opacity-50">
          {labelUnavailable}
        </span>
      )}
    </div>
  );
};
