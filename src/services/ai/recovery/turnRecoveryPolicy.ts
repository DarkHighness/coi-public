import type { TurnRecoveryKind } from "@/types";
import {
  ContextOverflowError,
  HistoryCorruptedError,
  isContextLengthError,
  isInvalidArgumentError,
} from "../contextCompressor";

export const TURN_RECOVERY_MAX_DURATION_MS = 12_000;
export const TURN_RECOVERY_TRANSIENT_DELAYS_MS = [300, 1200] as const;

const TRANSIENT_TURN_ERROR_PATTERN =
  /timeout|timed out|network|econnreset|connection reset|ehostunreach|enotfound|socket hang up|429|rate limit|overloaded|temporarily unavailable|service unavailable|502|503|504|gateway timeout|aborted/i;

const TURN_NOT_COMMITTED_PATTERN = /TURN_NOT_COMMITTED/i;

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error || "");

export function classifyTurnError(error: unknown): TurnRecoveryKind {
  if (error instanceof HistoryCorruptedError || isInvalidArgumentError(error)) {
    return "history";
  }

  if (error instanceof ContextOverflowError || isContextLengthError(error)) {
    return "context";
  }

  const message = toErrorMessage(error);
  if (TURN_NOT_COMMITTED_PATTERN.test(message)) {
    return "turn_not_committed";
  }

  if (TRANSIENT_TURN_ERROR_PATTERN.test(message)) {
    return "transient";
  }

  return "unknown";
}

export interface TurnRecoveryPlan {
  kind: TurnRecoveryKind;
  maxRollbackRetries: number;
  maxSessionResetRetries: number;
  transientBackoffMs: number[];
}

export function getTurnRecoveryPlan(kind: TurnRecoveryKind): TurnRecoveryPlan {
  if (kind === "transient") {
    return {
      kind,
      maxRollbackRetries: 0,
      maxSessionResetRetries: 0,
      transientBackoffMs: [...TURN_RECOVERY_TRANSIENT_DELAYS_MS],
    };
  }

  if (kind === "history" || kind === "context" || kind === "turn_not_committed") {
    return {
      kind,
      maxRollbackRetries: 1,
      maxSessionResetRetries: 1,
      transientBackoffMs: [],
    };
  }

  return {
    kind,
    maxRollbackRetries: 0,
    maxSessionResetRetries: 0,
    transientBackoffMs: [],
  };
}

export function isTurnRecoveryRetryable(kind: TurnRecoveryKind): boolean {
  return kind !== "unknown";
}
