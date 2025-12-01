import React from "react";
import { useTranslation } from "react-i18next";

interface StoryTextHeaderProps {
  isPlaying: boolean;
  isLoading: boolean;
  onPlay: () => void;
  label: string;
  onCopyPrompt?: () => string | Promise<string>;
  onUpload?: () => void;
}

export const StoryTextHeader: React.FC<StoryTextHeaderProps> = ({
  isPlaying,
  isLoading,
  onPlay,
  label,
  onCopyPrompt,
  onUpload,
}) => {
  const { t } = useTranslation();
  const [showCopied, setShowCopied] = React.useState(false);

  const handleCopyPrompt = async () => {
    if (onCopyPrompt) {
      const prompt = await onCopyPrompt();
      if (prompt) {
        navigator.clipboard.writeText(prompt);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    }
  };

  return (
    <div className="flex justify-between items-start mb-2">
      <span className="text-xs text-theme-primary font-bold uppercase tracking-widest opacity-50">
        {t("narrator")}
      </span>

      <div className="flex items-center gap-2">
        {onUpload && (
          <button
            onClick={onUpload}
            className="flex items-center gap-2 px-2 py-1 rounded text-[10px] uppercase tracking-wider text-theme-muted hover:text-theme-text transition-all"
            title={t("uploadImage", "Upload Image")}
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </button>
        )}

        {onCopyPrompt && (
          <button
            onClick={handleCopyPrompt}
            className="flex items-center gap-2 px-2 py-1 rounded text-[10px] uppercase tracking-wider text-theme-muted hover:text-theme-text transition-all"
            title={t("copyImagePrompt", "Copy Image Prompt")}
          >
            {showCopied ? (
              <span className="text-green-400 font-bold">
                {t("copied", "Copied!")}
              </span>
            ) : (
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
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        )}

        <button
          onClick={onPlay}
          disabled={isLoading}
          className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-all ${
            isPlaying
              ? "text-theme-primary animate-pulse"
              : "text-theme-muted hover:text-theme-text"
          }`}
          title={label}
        >
          {isLoading ? (
            <svg
              className="animate-spin h-3 w-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
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
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              ></path>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
