import type {
  TurnRecoveryAttempt,
  TurnRecoveryKind,
  TurnRecoveryTrace,
} from "@/types";
import {
  TURN_RECOVERY_AUTO_APPROVE_SESSION_REBUILD_KINDS,
  TURN_RECOVERY_MAX_DURATION_MS,
  classifyTurnError,
  getTurnRecoveryPlan,
  isTurnRecoveryRetryable,
} from "@/services/ai/recovery/turnRecoveryPolicy";

export interface TurnRecoveryRunnerParams<Result> {
  execute: () => Promise<Result>;
  executeWithRetryBoost?: () => Promise<Result>;
  rollbackToAnchor: () => boolean;
  resetSession: (kind: TurnRecoveryKind) => Promise<void>;
  confirmRecoveryAction?: (request: {
    type: "turn_retry_boost" | "session_rebuild";
    message: string;
  }) => boolean | Promise<boolean>;
  messages?: {
    turnRetryBoost?: string;
    sessionRebuild?: string;
  };
  autoApproveSessionRebuildKinds?: TurnRecoveryKind[];
  maxDurationMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onLog?: (payload: Record<string, unknown>) => void;
}

export interface TurnRecoveryRunnerResult<Result> {
  result: Result;
  recovery: TurnRecoveryTrace;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const DEFAULT_TURN_RETRY_BOOST_MESSAGE =
  "Turn was not committed. Retry once with temporary +30% tool/round budget?";

const DEFAULT_SESSION_REBUILD_MESSAGE =
  "Recovery still failed. Rebuild session context and retry?";

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error || "");

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(toErrorMessage(error));

const createAttemptRecord = (
  level: number,
  kind: TurnRecoveryKind,
  attempt: number,
  error?: unknown,
  delayMs?: number,
): TurnRecoveryAttempt => ({
  level,
  kind,
  attempt,
  error: error ? toErrorMessage(error) : undefined,
  delayMs,
  timestamp: Date.now(),
});

export function getRecoveryTrace(
  error: unknown,
): TurnRecoveryTrace | undefined {
  if (!error || typeof error !== "object") return undefined;
  return (error as any).recovery;
}

export function getRecoveryKind(error: unknown): TurnRecoveryKind | undefined {
  if (!error || typeof error !== "object") return undefined;
  return (error as any).recoveryKind;
}

export function annotateRecoveryError(
  error: unknown,
  recovery: TurnRecoveryTrace,
  recoveryKind: TurnRecoveryKind,
): Error {
  const normalized = toError(error);
  (normalized as any).recovery = recovery;
  (normalized as any).recoveryKind = recoveryKind;
  return normalized;
}

export async function executeTurnWithRecovery<Result>({
  execute,
  executeWithRetryBoost,
  rollbackToAnchor,
  resetSession,
  confirmRecoveryAction,
  messages,
  autoApproveSessionRebuildKinds = TURN_RECOVERY_AUTO_APPROVE_SESSION_REBUILD_KINDS,
  maxDurationMs = TURN_RECOVERY_MAX_DURATION_MS,
  sleep = defaultSleep,
  onLog,
}: TurnRecoveryRunnerParams<Result>): Promise<
  TurnRecoveryRunnerResult<Result>
> {
  const startedAt = Date.now();
  const attempts: TurnRecoveryAttempt[] = [];
  const autoApproveSessionRebuildKindSet = new Set<TurnRecoveryKind>(
    autoApproveSessionRebuildKinds,
  );

  const withinTimeBudget = () => Date.now() - startedAt < maxDurationMs;

  const finalizeRecovery = (
    recovered: boolean,
    finalLevel: number,
    kind: TurnRecoveryKind,
  ): TurnRecoveryTrace => ({
    attempts,
    finalLevel,
    kind,
    recovered,
    durationMs: Date.now() - startedAt,
  });

  const runAttempt = async (
    level: number,
    kind: TurnRecoveryKind,
    attemptNo: number,
    delayMs?: number,
    runner: () => Promise<Result> = execute,
  ): Promise<Result> => {
    try {
      if (typeof delayMs === "number" && delayMs > 0) {
        await sleep(delayMs);
      }
      const result = await runner();
      attempts.push(
        createAttemptRecord(level, kind, attemptNo, undefined, delayMs),
      );
      onLog?.({
        phase: "attempt_success",
        level,
        kind,
        attempt: attemptNo,
        delayMs,
        elapsedMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      attempts.push(
        createAttemptRecord(level, kind, attemptNo, error, delayMs),
      );
      onLog?.({
        phase: "attempt_failure",
        level,
        kind,
        attempt: attemptNo,
        delayMs,
        elapsedMs: Date.now() - startedAt,
        error: toErrorMessage(error),
      });
      throw error;
    }
  };

  const confirmAction = async (
    type: "turn_retry_boost" | "session_rebuild",
    message: string,
  ): Promise<boolean> => {
    if (!confirmRecoveryAction) {
      return false;
    }

    try {
      return Boolean(
        await Promise.resolve(confirmRecoveryAction({ type, message })),
      );
    } catch {
      return false;
    }
  };

  let lastError: unknown;
  let errorKind: TurnRecoveryKind = "unknown";

  const failWithTrace = (): never => {
    const recovery = finalizeRecovery(false, 3, errorKind);
    throw annotateRecoveryError(lastError, recovery, errorKind);
  };

  try {
    const result = await runAttempt(0, "unknown", 1);
    return {
      result,
      recovery: finalizeRecovery(false, 0, "unknown"),
    };
  } catch (error) {
    lastError = error;
    errorKind = classifyTurnError(error);
  }

  if (!isTurnRecoveryRetryable(errorKind) || !withinTimeBudget()) {
    failWithTrace();
  }

  if (errorKind === "transient") {
    const plan = getTurnRecoveryPlan(errorKind);
    for (let index = 0; index < plan.transientBackoffMs.length; index += 1) {
      if (!withinTimeBudget()) break;
      const delayMs = plan.transientBackoffMs[index]!;
      try {
        const result = await runAttempt(1, "transient", index + 2, delayMs);
        return {
          result,
          recovery: finalizeRecovery(true, 1, "transient"),
        };
      } catch (error) {
        lastError = error;
        const classified = classifyTurnError(error);
        if (classified !== "transient") {
          errorKind = classified;
          break;
        }
      }
    }

    if (errorKind === "transient") {
      failWithTrace();
    }

    if (!isTurnRecoveryRetryable(errorKind) || !withinTimeBudget()) {
      failWithTrace();
    }
  }

  if (errorKind === "turn_not_committed" && withinTimeBudget()) {
    const approved = await confirmAction(
      "turn_retry_boost",
      messages?.turnRetryBoost ?? DEFAULT_TURN_RETRY_BOOST_MESSAGE,
    );

    onLog?.({
      phase: "turn_retry_boost_confirmation",
      level: 1,
      kind: errorKind,
      approved,
      elapsedMs: Date.now() - startedAt,
    });

    if (approved) {
      try {
        const result = await runAttempt(
          1,
          "turn_not_committed",
          2,
          undefined,
          executeWithRetryBoost ?? execute,
        );

        return {
          result,
          recovery: finalizeRecovery(true, 1, "turn_not_committed"),
        };
      } catch (error) {
        lastError = error;
        errorKind = classifyTurnError(error);
        if (!isTurnRecoveryRetryable(errorKind) || !withinTimeBudget()) {
          failWithTrace();
        }
      }
    }
  }

  const plan = getTurnRecoveryPlan(errorKind);

  for (
    let rollbackAttempt = 0;
    rollbackAttempt < plan.maxRollbackRetries;
    rollbackAttempt += 1
  ) {
    if (!withinTimeBudget()) break;

    const rolledBack = rollbackToAnchor();
    onLog?.({
      phase: "rollback",
      level: 1,
      kind: errorKind,
      attempt: rollbackAttempt + 1,
      rolledBack,
      elapsedMs: Date.now() - startedAt,
    });

    if (!rolledBack) {
      lastError = new Error("TURN_RECOVERY_ROLLBACK_MISSING_CHECKPOINT");
      break;
    }

    try {
      const result = await runAttempt(1, errorKind, rollbackAttempt + 2);
      return {
        result,
        recovery: finalizeRecovery(true, 1, errorKind),
      };
    } catch (error) {
      lastError = error;
      errorKind = classifyTurnError(error);
      if (!isTurnRecoveryRetryable(errorKind)) {
        break;
      }
    }
  }

  for (
    let resetAttempt = 0;
    resetAttempt < plan.maxSessionResetRetries;
    resetAttempt += 1
  ) {
    if (!withinTimeBudget()) break;

    const autoApproved = autoApproveSessionRebuildKindSet.has(errorKind);
    const approved = autoApproved
      ? true
      : await confirmAction(
          "session_rebuild",
          messages?.sessionRebuild ?? DEFAULT_SESSION_REBUILD_MESSAGE,
        );

    onLog?.({
      phase: "session_rebuild_confirmation",
      level: 2,
      kind: errorKind,
      attempt: resetAttempt + 1,
      approved,
      autoApproved,
      elapsedMs: Date.now() - startedAt,
    });

    if (!approved) {
      break;
    }

    await resetSession(errorKind);
    const rolledBack = rollbackToAnchor();

    onLog?.({
      phase: "session_reset",
      level: 2,
      kind: errorKind,
      attempt: resetAttempt + 1,
      rolledBack,
      elapsedMs: Date.now() - startedAt,
    });

    if (!rolledBack) {
      lastError = new Error("TURN_RECOVERY_RESET_ROLLBACK_MISSING_CHECKPOINT");
      break;
    }

    try {
      const result = await runAttempt(2, errorKind, resetAttempt + 3);
      return {
        result,
        recovery: finalizeRecovery(true, 2, errorKind),
      };
    } catch (error) {
      lastError = error;
      errorKind = classifyTurnError(error);
      if (!isTurnRecoveryRetryable(errorKind)) {
        break;
      }
    }
  }

  failWithTrace();
}
