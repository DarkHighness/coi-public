import React, { useState, useEffect, useRef } from "react";
import { LogEntry, ToolCallRecord } from "../../types";
import { useTranslation } from "react-i18next";

interface LogPanelProps {
  logs: LogEntry[];
  onClose: () => void;
}

// Component to render a single tool call
const ToolCallItem: React.FC<{ call: ToolCallRecord; index: number }> = ({
  call,
  index,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isQuery = call.name.startsWith("query_");
  const isFinish = call.name === "finish_turn";
  const { t } = useTranslation();

  // Determine status color
  const isSuccess = call.output?.success !== false;
  const statusColor = isSuccess ? "text-theme-success" : "text-theme-error";
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
              {/* @ts-ignore */}
              {t("logPanel.input") || "Input"}
            </label>
            <pre className="text-xs text-theme-muted/80 bg-black/10 rounded p-2 overflow-auto max-h-[150px] whitespace-pre-wrap wrap-break-words">
              {JSON.stringify(call.input, null, 2)}
            </pre>
          </div>
          <div>
            <label
              className={`text-xs uppercase tracking-widest font-bold block mb-1 ${isSuccess ? "text-theme-info" : "text-theme-error"}`}
            >
              {/* @ts-ignore */}
              {t("logPanel.output") || "Output"}
            </label>
            <pre
              className={`text-xs bg-black/10 rounded p-2 overflow-auto max-h-[150px] whitespace-pre-wrap wrap-break-words ${isSuccess ? "text-theme-muted/80" : "text-theme-error"}`}
            >
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

  // Calculate total stats
  const totalToolCalls = logs.reduce(
    (sum, log) => sum + (log.toolCalls?.length || 0),
    0,
  );
  const totalTokens = logs.reduce(
    (sum, log) => sum + (log.usage?.totalTokens || 0),
    0,
  );

  // Virtual list settings
  const VISIBLE_BUFFER = 10;
  const ESTIMATED_LOG_HEIGHT = 80; // Approximate height per collapsed log entry
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 30 });

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateVisibleRange = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      const firstVisible = Math.floor(scrollTop / ESTIMATED_LOG_HEIGHT);
      const visibleCount = Math.ceil(containerHeight / ESTIMATED_LOG_HEIGHT);
      const lastVisible = firstVisible + visibleCount;

      const newStart = Math.max(0, firstVisible - VISIBLE_BUFFER);
      const newEnd = Math.min(logs.length, lastVisible + VISIBLE_BUFFER);

      setVisibleRange((prev) => {
        // Always update when we're at the boundaries (start=0 or end=logs.length)
        // This ensures scrolling to the very beginning or end always works
        const atStartBoundary = newStart === 0 && prev.start !== 0;
        const atEndBoundary =
          newEnd === logs.length && prev.end !== logs.length;
        const startNeedsUpdate = Math.abs(prev.start - newStart) > 3;
        const endNeedsUpdate = Math.abs(prev.end - newEnd) > 3;

        if (
          atStartBoundary ||
          atEndBoundary ||
          startNeedsUpdate ||
          endNeedsUpdate
        ) {
          return { start: newStart, end: newEnd };
        }
        return prev;
      });
    };

    updateVisibleRange();
    container.addEventListener("scroll", updateVisibleRange, { passive: true });
    return () => container.removeEventListener("scroll", updateVisibleRange);
  }, [logs.length]);

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
        <button
          onClick={onClose}
          className="px-3 py-1.5 md:px-4 md:py-2 bg-theme-surface-highlight hover:bg-theme-primary hover:text-theme-bg border border-theme-border rounded transition-colors uppercase text-xs font-bold tracking-widest"
        >
          {t("close") || "Close"}
        </button>
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

        {/* Placeholder for logs above visible range */}
        {visibleRange.start > 0 && (
          <div
            style={{ height: visibleRange.start * ESTIMATED_LOG_HEIGHT }}
            aria-hidden="true"
          />
        )}

        {logs
          .slice(visibleRange.start, visibleRange.end)
          .map((log, sliceIndex) => {
            const isError = !!log.response?.error || !!log.request?.error;
            const isExpanded = expandedLogs.has(log.id);
            const hasToolCalls = log.toolCalls && log.toolCalls.length > 0;
            const isComplete = log.endpoint === "agentic_complete";

            return (
              <div
                key={log.id}
                className={`border rounded-lg overflow-hidden shadow-sm transition-all ${
                  isError
                    ? "border-theme-error/50 bg-theme-error/5"
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
                      {log.endpoint}
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
                        {log.usage.totalTokens}{" "}
                        {t("logPanel.tokens") || "tokens"}
                      </span>
                    )}
                    <span className="text-xs text-theme-muted">
                      {new Date(log.timestamp).toLocaleTimeString()}
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

                {/* Log Body - Expanded */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {/* Generation Details Section */}
                    {log.generationDetails && (
                      <div className="space-y-4 border-b border-theme-border/30 pb-4">
                        <label className="text-xs uppercase tracking-widest text-theme-primary font-bold block mb-2">
                          {t("logPanel.generationContext") ||
                            "Generation Context"}
                        </label>

                        {log.generationDetails.userPrompt && (
                          <div className="space-y-1">
                            <span className="text-xs text-theme-muted uppercase font-bold">
                              {t("logPanel.userAction") || "User Action"}
                            </span>
                            <div className="bg-black/10 rounded border border-theme-border/30 p-2">
                              <pre className="text-xs text-theme-text whitespace-pre-wrap wrap-break-words">
                                {log.generationDetails.userPrompt}
                              </pre>
                            </div>
                          </div>
                        )}

                        {log.generationDetails.dynamicContext && (
                          <div className="space-y-1">
                            <span className="text-xs text-theme-muted uppercase font-bold">
                              {t("logPanel.dynamicStoryMemory") ||
                                "Dynamic Story Memory"}
                            </span>
                            <div className="bg-black/10 rounded border border-theme-border/30 p-2 max-h-[150px] overflow-auto">
                              <pre className="text-xs text-theme-muted/80 whitespace-pre-wrap wrap-break-words">
                                {log.generationDetails.dynamicContext}
                              </pre>
                            </div>
                          </div>
                        )}

                        {log.generationDetails.ragContext && (
                          <div className="space-y-1">
                            <span className="text-xs text-theme-muted uppercase font-bold">
                              {t("logPanel.ragContext") || "RAG Context"}
                            </span>
                            <div className="bg-black/10 rounded border border-theme-border/30 p-2 max-h-[150px] overflow-auto">
                              <pre className="text-xs text-theme-muted/80 whitespace-pre-wrap wrap-break-words">
                                {log.generationDetails.ragContext}
                              </pre>
                            </div>
                          </div>
                        )}

                        {log.generationDetails.ragQueries &&
                          log.generationDetails.ragQueries.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-xs text-theme-muted uppercase font-bold">
                                {t("logPanel.ragQueries") || "RAG Queries"}
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {log.generationDetails.ragQueries.map(
                                  (q, i) => (
                                    <span
                                      key={i}
                                      className="text-xs bg-theme-surface-highlight border border-theme-border/50 px-2 py-1 rounded text-theme-muted"
                                    >
                                      {q}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                        {log.generationDetails.systemPrompt && (
                          <div className="space-y-1">
                            <span className="text-xs text-theme-muted uppercase font-bold">
                              {t("logPanel.systemPrompt") || "System Prompt"}
                            </span>
                            <details className="group">
                              <summary className="text-xs cursor-pointer hover:text-theme-primary transition-colors select-none">
                                {t("logPanel.showSystemPrompt") ||
                                  "Show System Prompt"}{" "}
                                ({log.generationDetails.systemPrompt.length}{" "}
                                {t("logPanel.chars") || "chars"})
                              </summary>
                              <div className="bg-black/10 rounded border border-theme-border/30 p-2 mt-2 max-h-[200px] overflow-auto">
                                <pre className="text-xs text-theme-muted/60 whitespace-pre-wrap wrap-break-words">
                                  {log.generationDetails.systemPrompt}
                                </pre>
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tool Calls Section */}
                    {hasToolCalls && (
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-theme-primary font-bold block">
                          {t("logPanel.toolCalls") || "Tool Calls"} (
                          {log.toolCalls!.length})
                        </label>
                        <div className="space-y-2">
                          {log.toolCalls!.map((call, idx) => (
                            <ToolCallItem key={idx} call={call} index={idx} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stage Input Section - for debugging agentic loops */}
                    {log.stageInput && (
                      <div className="space-y-4 border-t border-theme-border/30 pt-4">
                        <label className="text-xs uppercase tracking-widest text-yellow-500 font-bold block mb-2">
                          {t("logPanel.stageDebug") || "Stage Debug Info"}
                        </label>

                        {log.stageInput.stageInstruction && (
                          <div className="space-y-1">
                            <span className="text-xs text-theme-muted uppercase font-bold">
                              {t("logPanel.stageInstruction") ||
                                "Stage Instruction"}
                            </span>
                            <div className="bg-yellow-900/10 rounded border border-yellow-500/30 p-2 max-h-[100px] overflow-auto">
                              <pre className="text-xs text-theme-text whitespace-pre-wrap wrap-break-words">
                                {log.stageInput.stageInstruction}
                              </pre>
                            </div>
                          </div>
                        )}

                        {log.stageInput.availableTools &&
                          log.stageInput.availableTools.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-xs text-theme-muted uppercase font-bold">
                                {t("logPanel.availableTools") ||
                                  "Available Tools"}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {log.stageInput.availableTools.map(
                                  (tool, i) => (
                                    <span
                                      key={i}
                                      className="text-xs bg-theme-surface-highlight border border-theme-border/50 px-2 py-0.5 rounded text-theme-muted font-mono"
                                    >
                                      {tool}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                        {log.stageInput.conversationHistory && (
                          <div className="space-y-1">
                            <details className="group">
                              <summary className="text-xs cursor-pointer hover:text-yellow-400 transition-colors select-none text-theme-muted uppercase font-bold">
                                {t("logPanel.conversationHistory") ||
                                  "Conversation History"}{" "}
                                ({log.stageInput.conversationHistory.length}{" "}
                                {t("logPanel.chars") || "chars"})
                              </summary>
                              <div className="bg-black/10 rounded border border-theme-border/30 p-2 mt-2 max-h-[300px] overflow-auto">
                                <pre className="text-xs text-theme-muted/60 whitespace-pre-wrap wrap-break-words">
                                  {log.stageInput.conversationHistory}
                                </pre>
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Raw Response Section - for debugging */}
                    {log.rawResponse && (
                      <div className="space-y-1 border-t border-theme-border/30 pt-4">
                        <details className="group">
                          <summary className="text-xs cursor-pointer hover:text-cyan-400 transition-colors select-none text-cyan-500 uppercase font-bold">
                            {t("logPanel.rawResponse") || "Raw AI Response"} (
                            {log.rawResponse.length}{" "}
                            {t("logPanel.chars") || "chars"})
                          </summary>
                          <div className="bg-cyan-900/10 rounded border border-cyan-500/30 p-2 mt-2 max-h-[300px] overflow-auto">
                            <pre className="text-xs text-theme-muted/80 whitespace-pre-wrap wrap-break-words">
                              {log.rawResponse}
                            </pre>
                          </div>
                        </details>
                      </div>
                    )}

                    {/* Legacy Request/Response for non-agentic logs */}
                    {!hasToolCalls && (log.request || log.response) && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {log.request && (
                          <div className="space-y-2 min-w-0">
                            <label className="text-xs uppercase tracking-widest text-green-500 font-bold block">
                              {t("logPanel.request") || "Request"}
                            </label>
                            <div className="bg-black/10 rounded border border-theme-border/30 p-3 overflow-auto max-h-[200px]">
                              <pre className="text-sm text-theme-muted/80 whitespace-pre-wrap wrap-break-words">
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
                                className={`text-sm whitespace-pre-wrap wrap-break-words ${isError ? "text-theme-error" : "text-theme-muted/80"}`}
                              >
                                {typeof log.response === "string"
                                  ? log.response
                                  : JSON.stringify(log.response, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                        {log.parsedResult && (
                          <div className="space-y-2 min-w-0">
                            <label className="text-xs uppercase tracking-widest font-bold block text-theme-success">
                              {t("logPanel.parsedResult") || "Parsed Result"}
                            </label>
                            <div className="bg-black/10 rounded border border-theme-success/30 p-3 overflow-auto max-h-[300px]">
                              <pre className="text-sm whitespace-pre-wrap wrap-break-words text-theme-muted/80">
                                {typeof log.parsedResult === "string"
                                  ? log.parsedResult
                                  : JSON.stringify(log.parsedResult, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Token Usage Footer */}
                    {log.usage && (
                      <div className="pt-2 border-t border-theme-border/30 flex flex-wrap justify-end gap-4 text-sm text-theme-primary/80 items-center">
                        <span>
                          <strong className="text-theme-primary">
                            {t("logPanel.prompt") || "Prompt:"}
                          </strong>{" "}
                          {log.usage.promptTokens}
                        </span>
                        <span>
                          <strong className="text-theme-primary">
                            {t("logPanel.completion") || "Completion:"}
                          </strong>{" "}
                          {log.usage.completionTokens}
                        </span>
                        {(log.usage.cacheRead || 0) > 0 && (
                          <span>
                            <strong className="text-theme-primary">
                              {t("logPanel.cacheRead") || "Cache Read:"}
                            </strong>{" "}
                            {log.usage.cacheRead}
                          </span>
                        )}
                        {(log.usage.cacheWrite || 0) > 0 && (
                          <span>
                            <strong className="text-theme-primary">
                              {t("logPanel.cacheWrite") || "Cache Write:"}
                            </strong>{" "}
                            {log.usage.cacheWrite}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-theme-primary/10 border border-theme-primary/30 rounded">
                          <strong className="text-theme-primary">
                            {t("logPanel.total") || "Total:"}
                          </strong>{" "}
                          {log.usage.totalTokens}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

        {/* Placeholder for logs below visible range */}
        {visibleRange.end < logs.length && (
          <div
            style={{
              height: (logs.length - visibleRange.end) * ESTIMATED_LOG_HEIGHT,
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};
