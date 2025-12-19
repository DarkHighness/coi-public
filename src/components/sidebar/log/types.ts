import { LogEntry, ToolCallRecord } from "../../../types";

/** Props for log entry body components */
export interface LogEntryBodyProps {
  log: LogEntry;
}

/** Props for the log entry card */
export interface LogEntryCardProps {
  log: LogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

/** Props for ToolCallItem */
export interface ToolCallItemProps {
  call: ToolCallRecord;
  index: number;
}

/** Re-export types for convenience */
export type { LogEntry, ToolCallRecord };
