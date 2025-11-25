import React, { useState } from "react";
import { LogEntry, ToolCallRecord } from "../../types";
import { useTranslation } from "react-i18next";

interface LogPanelProps {
  logs: LogEntry[];
  onClose: () => void;
}

// Component to render a single tool call
const ToolCallItem: React.FC<{ call: ToolCallRecord; index: number }> = ({ call, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isQuery = call.name.startsWith("query_");
  const isFinish = call.name === "finish_turn";

  // Determine status color
  const isSuccess = call.output?.success !== false;
  const statusColor = isSuccess ? "text-green-400" : "text-red-400";
  const bgColor = isFinish
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
          <span className="text-[10px] text-theme-muted opacity-50">#{index + 1}</span>
          <span className={`text-xs font-mono font-bold ${isFinish ? "text-theme-primary" : isQuery ? "text-blue-400" : "text-theme-text"}`}>
            {call.name}
          </span>
          <span className={`text-[10px] ${statusColor}`}>
            {isSuccess ? "✓" : "✗"}
          </span>
        </div>
        <svg
          className={`w-3 h-3 text-theme-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-theme-border/20 pt-2">
          <div>
            <label className="text-[9px] uppercase tracking-widest text-green-500 font-bold block mb-1">Input</label>
            <pre className="text-[10px] text-theme-muted/80 bg-black/20 rounded p-2 overflow-auto max-h-[150px] whitespace-pre-wrap break-words">
              {JSON.stringify(call.input, null, 2)}
            </pre>
          </div>
          <div>
            <label className={`text-[9px] uppercase tracking-widest font-bold block mb-1 ${isSuccess ? "text-blue-500" : "text-red-500"}`}>
              Output
            </label>
            <pre className={`text-[10px] bg-black/20 rounded p-2 overflow-auto max-h-[150px] whitespace-pre-wrap break-words ${isSuccess ? "text-theme-muted/80" : "text-red-400"}`}>
              {JSON.stringify(call.output, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export const LogPanel: React.FC<LogPanelProps> = ({ logs, onClose }) => {
  const { t } = useTranslation();
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const toggleLog = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  // Calculate total stats
  const totalToolCalls = logs.reduce((sum, log) => sum + (log.toolCalls?.length || 0), 0);
  const totalTokens = logs.reduce((sum, log) => sum + (log.usage?.totalTokens || 0), 0);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col animate-fade-in text-theme-text font-mono">
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
            <span className="text-xs text-theme-muted">
              {logs.length} {t("turns") || "turns"}
            </span>
            <span className="text-xs text-theme-primary">
              {totalToolCalls} {t("toolCalls") || "tool calls"}
            </span>
            <span className="text-xs text-theme-muted">
              {totalTokens.toLocaleString()} tokens
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 md:px-4 md:py-2 bg-theme-surface-highlight hover:bg-theme-primary hover:text-theme-bg border border-theme-border rounded transition-colors uppercase text-xs font-bold tracking-widest"
        >
          {t("close") || "Close"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-theme-bg/50">
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
            <p>No logs recorded in this session.</p>
          </div>
        )}

        {logs.map((log) => {
          const isError = !!log.response?.error || !!log.request?.error;
          const isExpanded = expandedLogs.has(log.id);
          const hasToolCalls = log.toolCalls && log.toolCalls.length > 0;
          const isComplete = log.endpoint === "agentic_complete";

          return (
            <div
              key={log.id}
              className={`border rounded-lg overflow-hidden shadow-sm transition-all ${
                isError
                  ? "border-red-900/50 bg-red-900/5"
                  : isComplete
                    ? "border-theme-primary/50 bg-theme-primary/5"
                    : "border-theme-border bg-theme-surface"
              }`}
            >
              {/* Log Header */}
              <button
                onClick={() => toggleLog(log.id)}
                className={`w-full px-4 py-3 flex flex-wrap justify-between items-center border-b text-left hover:bg-white/5 transition-colors ${
                  isError
                    ? "border-red-900/30 bg-red-900/20"
                    : isComplete
                      ? "border-theme-primary/30 bg-theme-primary/10"
                      : "border-theme-border/50 bg-theme-surface-highlight/30"
                }`}
              >
                <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isError
                        ? "bg-red-500 text-white"
                        : isComplete
                          ? "bg-theme-primary text-theme-bg"
                          : "bg-theme-surface-highlight text-theme-text"
                    }`}
                  >
                    {log.provider}
                  </span>
                  <span className="text-xs md:text-sm font-bold text-theme-text">
                    {log.endpoint}
                  </span>
                  {hasToolCalls && (
                    <span className="text-[10px] text-theme-primary bg-theme-primary/10 px-1.5 py-0.5 rounded">
                      {log.toolCalls!.length} calls
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {log.usage && (
                    <span className="text-[10px] text-theme-muted hidden md:inline">
                      {log.usage.totalTokens} tokens
                    </span>
                  )}
                  <span className="text-[10px] text-theme-muted">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <svg
                    className={`w-4 h-4 text-theme-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Log Body - Expanded */}
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {/* Tool Calls Section */}
                  {hasToolCalls && (
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-theme-primary font-bold block">
                        Tool Calls ({log.toolCalls!.length})
                      </label>
                      <div className="space-y-2">
                        {log.toolCalls!.map((call, idx) => (
                          <ToolCallItem key={idx} call={call} index={idx} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Legacy Request/Response for non-agentic logs */}
                  {!hasToolCalls && (log.request || log.response) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {log.request && (
                        <div className="space-y-2 min-w-0">
                          <label className="text-[10px] uppercase tracking-widest text-green-500 font-bold block">
                            Request
                          </label>
                          <div className="bg-black/10 rounded border border-theme-border/30 p-3 overflow-auto max-h-[200px]">
                            <pre className="text-xs text-theme-muted/80 whitespace-pre-wrap break-words">
                              {typeof log.request === "string"
                                ? log.request
                                : JSON.stringify(log.request, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                      {log.response && (
                        <div className="space-y-2 min-w-0">
                          <label className={`text-[10px] uppercase tracking-widest font-bold block ${isError ? "text-red-500" : "text-blue-500"}`}>
                            Response
                          </label>
                          <div className="bg-black/10 rounded border border-theme-border/30 p-3 overflow-auto max-h-[200px]">
                            <pre className={`text-xs whitespace-pre-wrap break-words ${isError ? "text-red-400" : "text-theme-muted/80"}`}>
                              {typeof log.response === "string"
                                ? log.response
                                : JSON.stringify(log.response, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Token Usage Footer */}
                  {log.usage && (
                    <div className="pt-2 border-t border-theme-border/30 flex flex-wrap justify-end gap-4 text-xs text-theme-primary/80 items-center">
                      <span>
                        <strong className="text-theme-primary">Prompt:</strong>{" "}
                        {log.usage.promptTokens}
                      </span>
                      <span>
                        <strong className="text-theme-primary">Completion:</strong>{" "}
                        {log.usage.completionTokens}
                      </span>
                      <span className="px-2 py-0.5 bg-theme-primary/10 border border-theme-primary/30 rounded">
                        <strong className="text-theme-primary">Total:</strong>{" "}
                        {log.usage.totalTokens}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
