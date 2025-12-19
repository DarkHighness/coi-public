import React from "react";
import { useTranslation } from "react-i18next";
import type { LogEntryBodyProps } from "../types";

/** Fallback entry body for generic/legacy logs */
export const GenericLogEntry: React.FC<LogEntryBodyProps> = ({ log }) => {
  const { t } = useTranslation();
  const isError = !!log.response?.error || !!log.request?.error;

  return (
    <div className="space-y-4">
      {/* Request/Response Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {log.request && (
          <div className="space-y-2 min-w-0">
            <label className="text-xs uppercase tracking-widest text-green-500 font-bold block">
              {t("logPanel.request") || "Request"}
            </label>
            <div className="bg-black/10 rounded border border-theme-border/30 p-3 overflow-auto max-h-[200px]">
              <pre className="text-sm text-theme-muted/80 whitespace-pre-wrap break-words">
                {typeof log.request === "string"
                  ? log.request
                  : JSON.stringify(log.request, null, 2)}
              </pre>
            </div>
          </div>
        )}
        {log.response && (
          <div className="space-y-2 min-w-0">
            <label
              className={`text-xs uppercase tracking-widest font-bold block ${isError ? "text-theme-error" : "text-theme-info"}`}
            >
              {t("logPanel.response") || "Response"}
            </label>
            <div className="bg-black/10 rounded border border-theme-border/30 p-3 overflow-auto max-h-[200px]">
              <pre
                className={`text-sm whitespace-pre-wrap break-words ${isError ? "text-theme-error" : "text-theme-muted/80"}`}
              >
                {typeof log.response === "string"
                  ? log.response
                  : JSON.stringify(log.response, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Parsed Result */}
      {log.parsedResult && (
        <div className="space-y-2 min-w-0">
          <label className="text-xs uppercase tracking-widest font-bold block text-theme-success">
            {t("logPanel.parsedResult") || "Parsed Result"}
          </label>
          <div className="bg-black/10 rounded border border-theme-success/30 p-3 overflow-auto max-h-[300px]">
            <pre className="text-sm whitespace-pre-wrap break-words text-theme-muted/80">
              {typeof log.parsedResult === "string"
                ? log.parsedResult
                : JSON.stringify(log.parsedResult, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
