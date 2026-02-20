import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ToolCallItemProps } from "./types";

const isToolErrorOutput = (value: unknown): value is { success: false } => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as { success?: unknown };
  return record.success === false;
};

/** Component to render a single tool call with expandable input/output */
export const ToolCallItem: React.FC<ToolCallItemProps> = ({ call, index }) => {
  const isError = isToolErrorOutput(call.output);
  const [isExpanded, setIsExpanded] = useState(isError); // Auto-expand errors
  const { t } = useTranslation();

  const isQuery = new Set([
    "vfs_ls",
    "vfs_schema",
    "vfs_read_chars",
    "vfs_read_lines",
    "vfs_read_json",
    "vfs_search",
  ]).has(call.name);

  const isOutlineCommit = call.name.startsWith("vfs_finish_outline_");

  const isFinish =
    call.name === "vfs_finish_turn" ||
    call.name === "vfs_end_turn" ||
    call.name === "vfs_finish_summary" ||
    isOutlineCommit;
  const isSuccess = !isError;

  const statusColor = isSuccess ? "text-theme-success" : "text-theme-error";
  const bgColor = isError
    ? "bg-red-900/20 border-red-500/50"
    : isFinish
      ? "bg-theme-primary/10 border-theme-primary/30"
      : isQuery
        ? "bg-blue-900/10 border-blue-500/30"
        : "bg-theme-surface-highlight/30 border-theme-border/50";

  return (
    <div className={`rounded border ${bgColor} overflow-hidden`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-theme-muted opacity-50">
            #{index + 1}
          </span>
          <span
            className={`text-sm font-mono font-bold ${isFinish ? "text-theme-primary" : isQuery ? "text-blue-400" : "text-theme-text"}`}
          >
            {call.name}
          </span>
          <span className={`text-xs ${statusColor}`}>
            {isSuccess ? "✓" : "✗"}
          </span>
        </div>
        <svg
          className={`w-3 h-3 text-theme-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-theme-border/20 pt-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-green-500 font-bold block mb-1">
              {t("logPanel.input") || "Input"}
            </label>
            <pre className="text-xs text-theme-muted/80 bg-black/10 rounded p-2 overflow-auto max-h-[150px] whitespace-pre-wrap break-words">
              {JSON.stringify(call.input, null, 2)}
            </pre>
          </div>
          <div>
            <label
              className={`text-xs uppercase tracking-widest font-bold block mb-1 ${isSuccess ? "text-theme-info" : "text-theme-error"}`}
            >
              {t("logPanel.output") || "Output"}
            </label>
            <pre
              className={`text-xs bg-black/10 rounded p-2 overflow-auto max-h-[150px] whitespace-pre-wrap break-words ${isSuccess ? "text-theme-muted/80" : "text-theme-error"}`}
            >
              {JSON.stringify(call.output, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
