import { createError, createSuccess } from "../../../tools/toolResult";
import { applyCustomRulesRetconAck } from "../../../customRulesAckState";
import {
  buildTurnId,
  writeConversationIndex,
  writeTurnFile,
  type TurnFile,
} from "../../conversation";
import {
  ensureConversationIndex,
  resolveAiWriteContext,
  runWithStructuredErrors,
  withAtomicSession,
  type VfsToolHandler,
} from "./shared";

const toObjectRecord = (value: unknown): JsonObject | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonObject;
};

const toTurnAssistant = (value: unknown): TurnFile["assistant"] | null => {
  const record = toObjectRecord(value);
  if (!record) {
    return null;
  }
  if (typeof record.narrative !== "string" || !Array.isArray(record.choices)) {
    return null;
  }

  return {
    narrative: record.narrative,
    choices: record.choices,
    ...(typeof record.narrativeTone === "string"
      ? { narrativeTone: record.narrativeTone }
      : {}),
    ...(record.atmosphere !== undefined ? { atmosphere: record.atmosphere } : {}),
    ...(typeof record.ending === "string" ? { ending: record.ending } : {}),
    ...(typeof record.forceEnd === "boolean"
      ? { forceEnd: record.forceEnd }
      : {}),
  };
};

export const handleFinishTurn: VfsToolHandler = (args, ctx) =>
  runWithStructuredErrors("vfs_finish_turn", args, () => {
    const runtime = args as JsonObject;
    const userAction =
      typeof ctx.vfsTurnUserAction === "string" &&
      ctx.vfsTurnUserAction.trim().length > 0
        ? ctx.vfsTurnUserAction
        : typeof runtime.userAction === "string"
          ? runtime.userAction
          : null;
    const assistant = toTurnAssistant(runtime.assistant);

    if (typeof userAction !== "string" || !assistant) {
      return createError(
        "vfs_finish_turn: runtime-injected userAction and assistant payload are required.",
        "INVALID_DATA",
      );
    }

    return withAtomicSession(
      ctx,
      (draft) => {
        const retconAck = toObjectRecord(runtime.retconAck);
        const normalizedRetconAck =
          retconAck && typeof retconAck.summary === "string"
            ? {
                summary: retconAck.summary,
              }
            : undefined;

        const retconAckResult = applyCustomRulesRetconAck(
          draft,
          normalizedRetconAck,
        );
        if (retconAckResult.ok === false) {
          return createError(retconAckResult.message, retconAckResult.code);
        }

        const existingIndex = ensureConversationIndex(draft, {
          operation: "finish_commit",
        });

        const forkId = existingIndex.activeForkId ?? 0;
        const forkKey = String(forkId);
        const order = existingIndex.turnOrderByFork?.[forkKey] ?? [];
        const latestFromIndex = existingIndex.latestTurnNumberByFork?.[forkKey];
        const latestFromOrder = order.reduce((max, id) => {
          const match = /fork-(\d+)\/turn-(\d+)/.exec(id);
          if (!match) return max;
          const turn = Number(match[2]);
          return Number.isFinite(turn) ? Math.max(max, turn) : max;
        }, -1);
        const latest =
          typeof latestFromIndex === "number" ? latestFromIndex : latestFromOrder;

        const turnNumber = latest + 1;
        const turnId = buildTurnId(forkId, turnNumber);

        const parentTurnId =
          typeof existingIndex.activeTurnId === "string" &&
          existingIndex.activeTurnId.length > 0
            ? existingIndex.activeTurnId
            : order.length > 0
              ? order[order.length - 1]
              : null;

        writeTurnFile(
          draft,
          forkId,
          turnNumber,
          {
            turnId,
            forkId,
            turnNumber,
            parentTurnId,
            createdAt: Date.now(),
            userAction,
            assistant,
          },
          { operation: "finish_commit" },
        );

        const nextOrder = order.includes(turnId) ? order : [...order, turnId];

        writeConversationIndex(
          draft,
          {
            ...existingIndex,
            activeForkId: forkId,
            activeTurnId: turnId,
            rootTurnIdByFork:
              existingIndex.rootTurnIdByFork?.[forkKey] != null
                ? existingIndex.rootTurnIdByFork
                : { ...existingIndex.rootTurnIdByFork, [forkKey]: turnId },
            latestTurnNumberByFork: {
              ...existingIndex.latestTurnNumberByFork,
              [forkKey]: turnNumber,
            },
            turnOrderByFork: {
              ...existingIndex.turnOrderByFork,
              [forkKey]: nextOrder,
            },
          },
          { operation: "finish_commit" },
        );

        return createSuccess({ turnId, forkId, turnNumber }, "Turn committed");
      },
      {
        writeContext: resolveAiWriteContext(ctx, {
          allowFinishGuardedWrite: true,
        }),
      },
    );
  });
