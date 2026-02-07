import type { LogEntry, TokenUsage } from "../types";

export interface RuntimeStatsSnapshot {
  tokenUsage: TokenUsage;
  logs: LogEntry[];
}

export const normalizeTokenUsage = (value: unknown): TokenUsage => {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  const read = (key: keyof TokenUsage): number => {
    const next = source[key];
    if (typeof next === "number" && Number.isFinite(next) && next >= 0) {
      return next;
    }
    return 0;
  };

  return {
    promptTokens: read("promptTokens"),
    completionTokens: read("completionTokens"),
    totalTokens: read("totalTokens"),
    cacheRead: read("cacheRead"),
    cacheWrite: read("cacheWrite"),
  };
};

export const normalizeLogs = (value: unknown): LogEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is LogEntry => {
      return typeof entry === "object" && entry !== null;
    })
    .slice(0, 100);
};

export const parseRuntimeStats = (value: unknown): RuntimeStatsSnapshot => {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    tokenUsage: normalizeTokenUsage(source.tokenUsage),
    logs: normalizeLogs(source.logs),
  };
};

