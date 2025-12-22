import React from "react";
import { useTranslation } from "react-i18next";
import type { LogEntry } from "./types";

interface LogHeaderProps {
  log: LogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

/** Common header for all log entry types */
export const LogHeader: React.FC<LogHeaderProps> = ({
  log,
  isExpanded,
  onToggle,
}) => {
  const { t } = useTranslation();

  const isError = !!log.response?.error || !!log.request?.error;
  const isComplete = log.endpoint === "agentic_complete";
  const hasToolCalls = log.toolCalls && log.toolCalls.length > 0;

  return (
    <button
      onClick={onToggle}
      className={`w-full px-4 py-3 flex flex-wrap justify-between items-center border-b text-left hover:bg-white/5 transition-colors ${
        isError
          ? "border-theme-error/30 bg-theme-error/20"
          : isComplete
            ? "border-theme-primary/30 bg-theme-primary/10"
            : "border-theme-border/50 bg-theme-surface-highlight/30"
      }`}
    >
      <div className="flex items-center gap-2 md:gap-4 flex-wrap">
        <span
          className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
            isError
              ? "bg-theme-error text-white"
              : isComplete
                ? "bg-theme-primary text-theme-bg"
                : "bg-theme-surface-highlight text-theme-text"
          }`}
        >
          {log.provider}
        </span>
        <span className="text-sm md:text-base font-bold text-theme-text">
          {t(`logPanel.endpoint.${log.endpoint}`, log.endpoint)}
          {log.type === "tool" && log.toolName && (
            <span className="text-theme-primary ml-1">: {log.toolName}</span>
          )}
        </span>
        {hasToolCalls && (
          <span className="text-xs text-theme-primary bg-theme-primary/10 px-1.5 py-0.5 rounded">
            {log.toolCalls!.length} {t("logPanel.calls") || "calls"}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {log.usage && (
          <span className="text-xs text-theme-muted hidden md:inline">
            {log.usage.totalTokens} {t("logPanel.tokens") || "tokens"}
          </span>
        )}
        <span className="text-xs text-theme-muted">
          {new Date(log.timestamp).toLocaleTimeString()}.
          {String(log.timestamp % 1000).padStart(3, "0")}
        </span>
        <svg
          className={`w-4 h-4 text-theme-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </button>
  );
};
