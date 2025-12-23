import React, { useState, useRef, useMemo } from "react";
import { LogEntry } from "../../types";
import { useTranslation } from "react-i18next";
import { LogEntryCard } from "./log";

interface LogPanelProps {
  logs: LogEntry[];
  onClose: () => void;
}

type SortOrder = "newest" | "oldest";

export const LogPanel: React.FC<LogPanelProps> = ({ logs, onClose }) => {
  const { t } = useTranslation();
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const toggleLog = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  // Sort logs by timestamp
  const sortedLogs = useMemo(() => {
    const sorted = [...logs].sort((a, b) => {
      return sortOrder === "newest"
        ? b.timestamp - a.timestamp
        : a.timestamp - b.timestamp;
    });
    return sorted;
  }, [logs, sortOrder]);

  // Calculate total stats
  const totalToolCalls = logs.reduce(
    (sum, log) => sum + (log.toolCalls?.length || 0),
    0,
  );
  const totalTokens = logs.reduce(
    (sum, log) => sum + (log.usage?.totalTokens || 0),
    0,
  );

  return (
    <div className="fixed inset-0 z-100 bg-theme-surface backdrop-blur-md flex flex-col animate-fade-in text-theme-text font-mono">
      {/* Header */}
      <div className="flex-none p-4 md:p-6 border-b border-theme-border bg-theme-surface flex justify-between items-center shadow-md">
        <div>
          <h2 className="text-lg md:text-2xl font-bold text-theme-primary flex items-center gap-3">
            <svg
              className="w-5 h-5 md:w-6 md:h-6"
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
            {t("apiConsole") || "API Console"}
          </h2>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm text-theme-muted">
              {logs.length} {t("turn") || "turns"}
            </span>
            <span className="text-sm text-theme-primary">
              {totalToolCalls} {t("logPanel.calls") || "tool calls"}
            </span>
            <span className="text-sm text-theme-muted">
              {totalTokens.toLocaleString()} {t("logPanel.tokens") || "tokens"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort Order Toggle */}
          <button
            onClick={() =>
              setSortOrder(sortOrder === "newest" ? "oldest" : "newest")
            }
            className="px-3 py-1.5 bg-theme-surface-highlight hover:bg-theme-primary/20 border border-theme-border rounded transition-colors text-xs font-bold tracking-wider flex items-center gap-2"
            title={
              sortOrder === "newest"
                ? t("logPanel.sortNewest") || "Showing newest first"
                : t("logPanel.sortOldest") || "Showing oldest first"
            }
          >
            <svg
              className={`w-4 h-4 transition-transform ${sortOrder === "oldest" ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
              />
            </svg>
            <span className="hidden md:inline">
              {sortOrder === "newest"
                ? t("logPanel.newest") || "Newest"
                : t("logPanel.oldest") || "Oldest"}
            </span>
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 md:px-4 md:py-2 bg-theme-surface-highlight hover:bg-theme-primary hover:text-theme-bg border border-theme-border rounded transition-colors uppercase text-xs font-bold tracking-widest"
          >
            {t("close") || "Close"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-theme-bg/50"
      >
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-theme-muted opacity-50">
            <svg
              className="w-16 h-16 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              ></path>
            </svg>
            <p>{t("logPanel.noLogs") || "No logs recorded in this session."}</p>
          </div>
        )}

        {sortedLogs.map((log, index) => {
          // Use content-visibility: auto for items not near viewport for performance
          const useContentVisibility = index > 10;

          // Determine if we need a phase separator for outline logs
          // Show separator when phase number changes between consecutive outline logs
          const prevLog = index > 0 ? sortedLogs[index - 1] : null;
          const showPhaseSeparator =
            log.type === "outline" &&
            log.phase !== undefined &&
            prevLog?.type === "outline" &&
            prevLog?.phase !== undefined &&
            log.phase !== prevLog.phase;

          // Determine if we need a turn separator for tool logs
          // Show separator when turnNumber or forkId changes between consecutive logs
          // Handle Phase 10 outline as Turn 1 for consistent separation
          const getLogTurn = (l: typeof log | null) => {
            if (!l) return undefined;
            if (l.type === "tool") return l.turnNumber;
            if (l.type === "outline" && l.phase === 10) return 1;
            return undefined;
          };

          const logTurn = getLogTurn(log);
          const prevLogTurn = getLogTurn(prevLog);

          const showTurnSeparator =
            logTurn !== undefined &&
            prevLogTurn !== undefined &&
            (logTurn !== prevLogTurn || log.forkId !== prevLog.forkId);

          return (
            <div
              key={log.id}
              style={{
                contentVisibility: useContentVisibility ? "auto" : "visible",
                containIntrinsicSize: useContentVisibility
                  ? "auto 100px"
                  : "auto",
              }}
            >
              {/* Phase separator for outline logs */}
              {showPhaseSeparator && (
                <div className="flex items-center gap-3 py-4 text-theme-muted">
                  <div className="flex-1 h-px bg-theme-primary/30" />
                  <span className="text-xs uppercase tracking-widest font-bold text-theme-primary/60">
                    {t("logPanel.phase", { defaultValue: "Phase" })}{" "}
                    {sortOrder === "newest" ? prevLog?.phase : log.phase}
                  </span>
                  <div className="flex-1 h-px bg-theme-primary/30" />
                </div>
              )}
              {/* Turn separator for tool logs */}
              {showTurnSeparator && (
                <div className="flex items-center gap-3 py-3 text-theme-muted">
                  <div className="flex-1 h-px bg-theme-secondary/30" />
                  <span className="text-xs uppercase tracking-widest font-bold text-theme-secondary/60">
                    {t("logPanel.turn", { defaultValue: "Turn" })}{" "}
                    {sortOrder === "newest" ? prevLogTurn : logTurn}
                  </span>
                  <div className="flex-1 h-px bg-theme-secondary/30" />
                </div>
              )}
              <LogEntryCard
                log={log}
                isExpanded={expandedLogs.has(log.id)}
                onToggle={() => toggleLog(log.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
