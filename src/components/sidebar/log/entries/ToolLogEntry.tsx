import React from "react";
import { useTranslation } from "react-i18next";
import type { LogEntryBodyProps } from "../types";

/** Entry body for tool execution logs (type="tool") */
export const ToolLogEntry: React.FC<LogEntryBodyProps> = ({ log }) => {
  const { t } = useTranslation();
  const isSuccess = log.toolOutput?.success !== false;

  return (
    <div className="space-y-3">
      {/* Tool Name */}
      {log.toolName && (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-theme-primary font-bold">
            {t("logPanel.toolName") || "Tool Name"}
          </span>
          <span className="text-sm font-mono font-bold text-theme-text">
            {log.toolName}
          </span>
        </div>
      )}

      {/* Input */}
      {log.toolInput && (
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-green-500 font-bold block">
            {t("logPanel.input") || "Input"}
          </label>
          <pre className="text-xs text-theme-muted/80 bg-black/10 rounded p-2 overflow-auto max-h-[200px] whitespace-pre-wrap break-words">
            {JSON.stringify(log.toolInput, null, 2)}
          </pre>
        </div>
      )}

      {/* Output */}
      {log.toolOutput !== undefined && (
        <div className="space-y-1">
          <label
            className={`text-xs uppercase tracking-widest font-bold block ${
              isSuccess ? "text-theme-info" : "text-theme-error"
            }`}
          >
            {t("logPanel.output") || "Output"}
          </label>
          <pre
            className={`text-xs bg-black/10 rounded p-2 overflow-auto max-h-[200px] whitespace-pre-wrap break-words ${
              isSuccess ? "text-theme-muted/80" : "text-theme-error"
            }`}
          >
            {JSON.stringify(log.toolOutput, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
