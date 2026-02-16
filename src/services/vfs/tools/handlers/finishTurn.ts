import { createError, createSuccess } from "../../../tools/toolResult";
import { applyCustomRulesRetconAck } from "../../../customRulesAckState";
import { buildTurnId, writeConversationIndex, writeTurnFile } from "../../conversation";
import {
  ensureConversationIndex,
  resolveAiWriteContext,
  runWithStructuredErrors,
  withAtomicSession,
  type VfsToolHandler,
} from "./shared";

export const handleFinishTurn: VfsToolHandler = (args, ctx) =>
  runWithStructuredErrors("vfs_finish_turn", args, () => {
    const typedArgs = args as any;

    return withAtomicSession(
      ctx,
      (draft) => {
        const normalizedRetconAck =
          typedArgs.retconAck && typeof typedArgs.retconAck.hash === "string"
            ? {
                hash: typedArgs.retconAck.hash,
                summary:
                  typeof typedArgs.retconAck.summary === "string" &&
                  typedArgs.retconAck.summary.trim().length > 0
                    ? typedArgs.retconAck.summary
                    : "Retcon acknowledgement applied.",
              }
            : undefined;

        if (typedArgs.retconAck && !normalizedRetconAck) {
          return createError(
            "vfs_finish_turn: retconAck must include a hash string",
            "INVALID_DATA",
          );
        }

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
            userAction: typedArgs.userAction,
            assistant: typedArgs.assistant as {
              narrative: string;
              choices: unknown[];
              narrativeTone?: string;
              atmosphere?: unknown;
              ending?: string;
              forceEnd?: boolean;
            },
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
