import React from "react";
import { useTranslation } from "react-i18next";
import { VisualProgress } from "../services/ai/agentic/visual/visualLoop";

interface VisualProgressModalProps {
  isOpen: boolean;
  progress: VisualProgress | null;
  onClose: () => void;
  target: "image_prompt" | "veo_script" | "both";
}

export const VisualProgressModal: React.FC<VisualProgressModalProps> = ({
  isOpen,
  progress,
  onClose,
  target,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const getTitle = () => {
    switch (target) {
      case "image_prompt":
        return t("visual.generatingPrompt") || "Generating Image Prompt";
      case "veo_script":
        return t("visual.generatingCinematic") || "Generating Cinematic Script";
      default:
        return t("visual.generatingVisuals") || "Generating Visual Elements";
    }
  };

  const percentage = progress
    ? Math.round((progress.iteration / progress.totalIterations) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md p-6 bg-theme-surface border border-theme-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* AI Brain Icon */}
          <div className="relative">
            <div className="w-20 h-20 bg-theme-primary/10 rounded-full flex items-center justify-center animate-pulse">
              <svg
                className="w-10 h-10 text-theme-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            {/* Orbiting dots */}
            <div className="absolute inset-0 animate-spin-slow">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-theme-primary rounded-full shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.8)]"></div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-theme-text tracking-tight">
              {getTitle()}
            </h3>
            <p className="text-theme-muted text-sm font-medium">
              {progress?.status
                ? t(progress.status)
                : t("visual.initializingAgent")}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-theme-muted font-mono tracking-widest uppercase">
              <span>{t("visual.progress")}</span>
              <span>{percentage}%</span>
            </div>
            <div className="h-2 w-full bg-theme-border/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-theme-primary transition-all duration-500 ease-out shadow-[0_0_12px_rgba(var(--theme-primary-rgb),0.4)]"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center pt-1">
              <div className="flex space-x-1">
                {[...Array(progress?.totalIterations || 3)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 w-4 rounded-full transition-colors duration-300 ${
                      i < (progress?.iteration || 0)
                        ? "bg-theme-primary"
                        : "bg-theme-border"
                    }`}
                  ></div>
                ))}
              </div>
              <span className="text-[10px] text-theme-muted font-mono">
                {t("visual.iteration")} {progress?.iteration || 0}/
                {progress?.totalIterations || 3}
              </span>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-theme-muted hover:text-theme-text hover:bg-theme-surface-hover rounded-lg transition-all border border-theme-border"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
