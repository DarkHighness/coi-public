import React from "react";
import { LogEntry } from "../../types";

interface LogPanelProps {
  logs: LogEntry[];
  onClose: () => void;
}

export const LogPanel: React.FC<LogPanelProps> = ({ logs, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col animate-fade-in text-theme-text font-mono">
      {/* Header */}
      <div className="flex-none p-6 border-b border-theme-border bg-theme-surface flex justify-between items-center shadow-md">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-theme-primary flex items-center gap-3">
            <svg
              className="w-6 h-6"
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
            System Logs & Debugger
          </h2>
          <p className="text-xs text-theme-muted mt-1">
            Trace raw API requests and token usage.
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-theme-surface-highlight hover:bg-theme-primary hover:text-theme-bg border border-theme-border rounded transition-colors uppercase text-xs font-bold tracking-widest"
        >
          Close Console
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-theme-bg/50">
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
          return (
            <div
              key={log.id}
              className={`border rounded-lg overflow-hidden shadow-sm transition-all ${isError ? "border-red-900/50 bg-red-900/5" : "border-theme-border bg-theme-surface"}`}
            >
              {/* Log Header */}
              <div
                className={`px-4 py-3 flex flex-wrap justify-between items-center border-b ${isError ? "border-red-900/30 bg-red-900/20" : "border-theme-border/50 bg-theme-surface-highlight/30"}`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isError ? "bg-red-500 text-white" : "bg-theme-primary text-theme-bg"}`}
                  >
                    {log.provider}
                  </span>
                  <span className="text-sm font-bold text-theme-text">
                    {log.model}
                  </span>
                  <span className="text-xs text-theme-muted font-normal">
                    {log.endpoint}
                  </span>
                </div>
                <div className="text-xs text-theme-muted font-mono">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>

              {/* Log Body */}
              <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2 min-w-0">
                  <label className="text-[10px] uppercase tracking-widest text-green-500 font-bold block">
                    Request Payload
                  </label>
                  <div className="bg-black/10 rounded border border-theme-border/30 p-3 overflow-auto max-h-[300px]">
                    <pre className="text-xs text-theme-muted/80 whitespace-pre-wrap break-words">
                      {typeof log.request === "string"
                        ? log.request
                        : JSON.stringify(log.request, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="space-y-2 min-w-0">
                  <label
                    className={`text-[10px] uppercase tracking-widest font-bold block ${isError ? "text-red-500" : "text-blue-500"}`}
                  >
                    {isError ? "Error Response" : "Response Data"}
                  </label>
                  <div className="bg-black/10 rounded border border-theme-border/30 p-3 overflow-auto max-h-[300px]">
                    <pre
                      className={`text-xs whitespace-pre-wrap break-words ${isError ? "text-red-400" : "text-theme-muted/80"}`}
                    >
                      {typeof log.response === "string"
                        ? log.response
                        : JSON.stringify(log.response, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Log Footer (Usage) */}
              {log.usage && (
                <div className="px-4 py-2 bg-theme-surface-highlight/10 border-t border-theme-border/30 flex justify-end gap-6 text-xs text-yellow-500/80 items-center">
                  <span>
                    <strong className="text-yellow-500">Prompt:</strong>{" "}
                    {log.usage.promptTokens}
                  </span>
                  <span>
                    <strong className="text-yellow-500">Completion:</strong>{" "}
                    {log.usage.completionTokens}
                  </span>
                  <span className="px-2 py-0.5 bg-yellow-900/10 border border-yellow-700/30 rounded">
                    <strong className="text-yellow-500">Total:</strong>{" "}
                    {log.usage.totalTokens}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
