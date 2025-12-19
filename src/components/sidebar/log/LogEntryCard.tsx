import React from "react";
import type { LogEntryCardProps, LogEntry } from "./types";
import { LogHeader } from "./LogHeader";
import { LogUsageFooter } from "./LogUsageFooter";
import {
  ToolLogEntry,
  TurnLogEntry,
  OutlineLogEntry,
  SummaryLogEntry,
  ImageLogEntry,
  GenericLogEntry,
} from "./entries";

/** Get the appropriate entry body component based on log type */
const getEntryComponent = (log: LogEntry): React.FC<{ log: LogEntry }> => {
  switch (log.type) {
    case "tool":
      return ToolLogEntry;
    case "turn":
      return TurnLogEntry;
    case "outline":
      return OutlineLogEntry;
    case "summary":
      return SummaryLogEntry;
    case "image":
      return ImageLogEntry;
    default:
      return GenericLogEntry;
  }
};

/** Log entry card with header, type-specific body, and footer */
export const LogEntryCard: React.FC<LogEntryCardProps> = ({
  log,
  isExpanded,
  onToggle,
}) => {
  const isError = !!log.response?.error || !!log.request?.error;
  const isComplete = log.endpoint === "agentic_complete";

  const EntryBody = getEntryComponent(log);

  return (
    <div
      className={`border rounded-lg overflow-hidden shadow-sm transition-all ${
        isError
          ? "border-theme-error/50 bg-theme-error/5"
          : isComplete
            ? "border-theme-primary/50 bg-theme-primary/5"
            : "border-theme-border bg-theme-surface"
      }`}
    >
      <LogHeader log={log} isExpanded={isExpanded} onToggle={onToggle} />

      {isExpanded && (
        <div className="p-4 space-y-4">
          <EntryBody log={log} />

          {log.usage && <LogUsageFooter usage={log.usage} />}
        </div>
      )}
    </div>
  );
};
