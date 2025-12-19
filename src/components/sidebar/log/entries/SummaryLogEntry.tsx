import React from "react";
import { useTranslation } from "react-i18next";
import type { LogEntryBodyProps } from "../types";
import { ToolCallItem } from "../ToolCallItem";
import { StageInputSection, RawResponseSection } from "../sections";

/** Entry body for summary logs (type="summary") */
export const SummaryLogEntry: React.FC<LogEntryBodyProps> = ({ log }) => {
  const { t } = useTranslation();
  const hasToolCalls = log.toolCalls && log.toolCalls.length > 0;

  // Stage info
  const stageLabels: Record<string, string> = {
    query: t("logPanel.endpoint.summary-query", "Query"),
    complete: t("logPanel.endpoint.summary-complete", "Complete"),
    error: t("logPanel.endpoint.summary-error", "Error"),
  };

  return (
    <div className="space-y-4">
      {/* Stage Indicator */}
      {log.stage && (
        <div className="flex items-center gap-3">
          <span
            className={`px-2 py-1 rounded text-xs font-bold uppercase ${
              log.stage === "complete"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : log.stage === "error"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
            }`}
          >
            {stageLabels[log.stage] || log.stage}
          </span>
        </div>
      )}

      {/* Summary Result */}
      {log.parsedResult && (
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-theme-success font-bold block">
            {t("logPanel.parsedResult") || "Summary Result"}
          </label>
          <div className="bg-green-900/10 rounded border border-green-500/30 p-3 overflow-auto max-h-[300px]">
            <pre className="text-sm whitespace-pre-wrap break-words text-theme-text">
              {typeof log.parsedResult === "string"
                ? log.parsedResult
                : JSON.stringify(log.parsedResult, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Tool Calls */}
      {hasToolCalls && (
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-theme-primary font-bold block">
            {t("logPanel.toolCalls") || "Tool Calls"} ({log.toolCalls!.length})
          </label>
          <div className="space-y-2">
            {log.toolCalls!.map((call, idx) => (
              <ToolCallItem key={idx} call={call} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Stage Input Debug */}
      {log.stageInput && <StageInputSection stageInput={log.stageInput} />}

      {/* Raw Response */}
      {log.rawResponse && <RawResponseSection rawResponse={log.rawResponse} />}
    </div>
  );
};
