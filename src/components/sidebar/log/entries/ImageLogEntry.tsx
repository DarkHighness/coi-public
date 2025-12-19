import React from "react";
import { useTranslation } from "react-i18next";
import type { LogEntryBodyProps } from "../types";

/** Entry body for image generation logs (type="image") */
export const ImageLogEntry: React.FC<LogEntryBodyProps> = ({ log }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {/* Image Prompt */}
      {log.imagePrompt && (
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-purple-400 font-bold block">
            {t("logPanel.prompt") || "Prompt"}
          </label>
          <div className="bg-purple-900/10 rounded border border-purple-500/30 p-3 overflow-auto max-h-[200px]">
            <pre className="text-sm whitespace-pre-wrap break-words text-theme-text">
              {log.imagePrompt}
            </pre>
          </div>
        </div>
      )}

      {/* Resolution */}
      {log.imageResolution && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-theme-muted uppercase">
            Resolution:
          </span>
          <span className="text-sm font-mono text-theme-text px-2 py-0.5 bg-theme-surface-highlight rounded">
            {log.imageResolution}
          </span>
        </div>
      )}

      {/* Response (raw image data info) */}
      {log.response && (
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-theme-info font-bold">
            {t("logPanel.response") || "Response"}
          </label>
          <pre className="text-xs text-theme-muted/80 bg-black/10 rounded p-2 overflow-auto max-h-[150px] whitespace-pre-wrap break-words">
            {typeof log.response === "string"
              ? log.response
              : JSON.stringify(log.response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
