import type { ToolCallRecord, ToolCallRuntimeStage } from "../types";

const READ_TOOL_NAMES = new Set([
  "vfs_ls",
  "vfs_schema",
  "vfs_read_chars",
  "vfs_read_lines",
  "vfs_read_json",
  "vfs_read_markdown",
]);

const SEARCH_TOOL_NAMES = new Set(["vfs_search"]);
const VM_TOOL_NAMES = new Set(["vfs_vm"]);

const WRITE_TOOL_NAMES = new Set([
  "vfs_write_file",
  "vfs_write_markdown",
  "vfs_append_text",
  "vfs_edit_lines",
  "vfs_patch_json",
  "vfs_merge_json",
  "vfs_move",
  "vfs_delete",
  "vfs_finish_turn",
  "vfs_end_turn",
  "vfs_finish_summary",
]);

const STAGE_FALLBACK_LABELS: Record<ToolCallRuntimeStage, string> = {
  turn: "Turn",
  summary: "Summary",
  force_update: "Force Update",
  cleanup: "Cleanup",
  player_rate: "Player Rate",
  outline: "Outline",
};

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const truncate = (value: string, max = 44): string => {
  if (value.length <= max) return value;
  if (max <= 10) return value.slice(0, max);
  return `${value.slice(0, max - 9)}...${value.slice(-6)}`;
};

const normalizePath = (value: string): string =>
  truncate(value.replace(/^current\//, ""));

const toFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toPathHint = (input: unknown): string | null => {
  if (!isRecordObject(input)) return null;

  const singlePathKeys = [
    "path",
    "from",
    "to",
    "targetPath",
    "sourcePath",
    "destinationPath",
  ] as const;

  for (const key of singlePathKeys) {
    const candidate = input[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return normalizePath(candidate.trim());
    }
  }

  const paths = input.paths;
  if (Array.isArray(paths)) {
    const normalized = paths
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    if (normalized.length > 0) {
      const first = normalizePath(normalized[0]);
      return normalized.length > 1
        ? `${first} (+${normalized.length - 1})`
        : first;
    }
  }

  return null;
};

const toReadRangeHint = (name: string, input: unknown): string | null => {
  if (!isRecordObject(input)) return null;

  if (name === "vfs_read_lines") {
    const startLine = toFiniteNumber(input.startLine);
    const lineCount = toFiniteNumber(input.lineCount);
    if (startLine !== null && lineCount !== null && lineCount > 0) {
      return `L${Math.floor(startLine)}+${Math.floor(lineCount)}`;
    }
    if (startLine !== null) {
      return `L${Math.floor(startLine)}`;
    }
  }

  if (name === "vfs_read_chars") {
    const start = toFiniteNumber(input.start);
    const maxChars = toFiniteNumber(input.maxChars);
    if (start !== null && maxChars !== null && maxChars > 0) {
      return `C${Math.floor(start)}+${Math.floor(maxChars)}`;
    }
  }

  if (name === "vfs_read_json") {
    const pointers = input.pointers;
    if (Array.isArray(pointers) && pointers.length > 0) {
      return `${pointers.length} ptr`;
    }
  }

  if (name === "vfs_search") {
    const query =
      (typeof input.query === "string" && input.query) ||
      (typeof input.pattern === "string" && input.pattern) ||
      "";
    if (query.trim().length > 0) {
      return `"${truncate(query.trim(), 28)}"`;
    }
  }

  return null;
};

const resolveActionLabel = (name: string): string => {
  if (name.startsWith("vfs_finish_outline_")) {
    return "write";
  }
  if (READ_TOOL_NAMES.has(name)) return "read";
  if (SEARCH_TOOL_NAMES.has(name)) return "search";
  if (VM_TOOL_NAMES.has(name)) return "vm";
  if (WRITE_TOOL_NAMES.has(name)) return "write";
  if (name.startsWith("vfs_")) {
    return "write";
  }
  return name;
};

export interface ToolCallSummaryParts {
  action: string;
  detail: string | null;
  text: string;
}

export const getToolCallSummaryParts = (
  call: ToolCallRecord,
): ToolCallSummaryParts => {
  const action = resolveActionLabel(call.name);
  const pathHint = toPathHint(call.input);
  const rangeHint = toReadRangeHint(call.name, call.input);
  const hints = [pathHint, rangeHint].filter(
    (hint): hint is string => typeof hint === "string" && hint.length > 0,
  );
  const detail = hints.length > 0 ? hints.join(" • ") : null;

  return {
    action,
    detail,
    text: detail ? `${action} ${detail}` : action,
  };
};

export const formatToolCallSummary = (call: ToolCallRecord): string => {
  return getToolCallSummaryParts(call).text;
};

export const annotateToolCallsWithStage = (
  calls: ToolCallRecord[],
  runtimeStage: ToolCallRuntimeStage,
): ToolCallRecord[] =>
  calls.map((call) =>
    call.runtimeStage === runtimeStage ? call : { ...call, runtimeStage },
  );

export const pickLatestToolCallRuntimeStage = (
  calls: ToolCallRecord[] | undefined,
): ToolCallRuntimeStage | null => {
  if (!Array.isArray(calls) || calls.length === 0) {
    return null;
  }

  for (let index = calls.length - 1; index >= 0; index -= 1) {
    const stage = calls[index]?.runtimeStage;
    if (stage) {
      return stage;
    }
  }

  return null;
};

export const getToolCallRuntimeStageFallbackLabel = (
  stage: ToolCallRuntimeStage,
): string => STAGE_FALLBACK_LABELS[stage];
