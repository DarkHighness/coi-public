import {
  readConversationIndex,
  readTurnFile,
  writeConversationIndex,
  writeTurnFile,
  type ConversationIndex,
  type TurnFile,
} from "../conversation";
import { VfsSession } from "../vfsSession";
import type { VfsWriteContext } from "./types";

export interface RewriteTurnParams {
  forkId: number;
  turnNumber: number;
  mutate: (turn: TurnFile) => TurnFile;
  writeContext: VfsWriteContext;
}

export interface RewriteIndexParams {
  mutate: (index: ConversationIndex) => ConversationIndex;
  writeContext: VfsWriteContext;
}

const ensureTurnIdentity = (
  original: TurnFile,
  next: TurnFile,
  forkId: number,
  turnNumber: number,
): TurnFile => {
  return {
    ...next,
    turnId: original.turnId,
    forkId,
    turnNumber,
  };
};

const withRewritePrivileges = (
  context: VfsWriteContext,
): VfsWriteContext => ({
  ...context,
  operation: "history_rewrite",
  allowFinishGuardedWrite: true,
});

const normalizeConversationIndex = (index: ConversationIndex): ConversationIndex => {
  const normalized: ConversationIndex = {
    ...index,
    rootTurnIdByFork: { ...index.rootTurnIdByFork },
    latestTurnNumberByFork: { ...index.latestTurnNumberByFork },
    turnOrderByFork: { ...index.turnOrderByFork },
  };

  for (const [forkKey, order] of Object.entries(normalized.turnOrderByFork)) {
    if (!Array.isArray(order)) {
      normalized.turnOrderByFork[forkKey] = [];
      continue;
    }

    const deduped = Array.from(new Set(order.filter((turnId) => typeof turnId === "string")));
    normalized.turnOrderByFork[forkKey] = deduped;

    if (deduped.length > 0 && !normalized.rootTurnIdByFork[forkKey]) {
      normalized.rootTurnIdByFork[forkKey] = deduped[0];
    }

    const maxTurn = deduped.reduce((max, turnId) => {
      const match = /fork-(\d+)\/turn-(\d+)/.exec(turnId);
      if (!match) {
        return max;
      }
      const turnNumber = Number(match[2]);
      return Number.isFinite(turnNumber) ? Math.max(max, turnNumber) : max;
    }, -1);

    if (maxTurn >= 0) {
      normalized.latestTurnNumberByFork[forkKey] = maxTurn;
    }
  }

  const activeForkKey = String(normalized.activeForkId ?? 0);
  const activeOrder = normalized.turnOrderByFork[activeForkKey] ?? [];
  if (
    activeOrder.length > 0 &&
    (typeof normalized.activeTurnId !== "string" ||
      !activeOrder.includes(normalized.activeTurnId))
  ) {
    normalized.activeTurnId = activeOrder[activeOrder.length - 1];
  }

  return normalized;
};

export class ConversationHistoryRewriteService {
  public rewriteTurn(session: VfsSession, params: RewriteTurnParams): TurnFile {
    const { forkId, turnNumber, mutate, writeContext } = params;
    const snapshot = session.snapshot();
    const existing = readTurnFile(snapshot, forkId, turnNumber);
    if (!existing) {
      throw new Error(
        `Conversation turn not found for rewrite: fork-${forkId}/turn-${turnNumber}`,
      );
    }

    const nextTurn = ensureTurnIdentity(
      existing,
      mutate({ ...existing }),
      forkId,
      turnNumber,
    );

    session.withWriteContext(withRewritePrivileges(writeContext), () => {
      writeTurnFile(session, forkId, turnNumber, nextTurn, {
        operation: "history_rewrite",
      });
    });

    return nextTurn;
  }

  public rewriteIndex(session: VfsSession, params: RewriteIndexParams): ConversationIndex {
    const { mutate, writeContext } = params;
    const snapshot = session.snapshot();
    const existing = readConversationIndex(snapshot);
    if (!existing) {
      throw new Error("Conversation index not found for rewrite");
    }

    const nextIndex = normalizeConversationIndex(mutate({ ...existing }));

    session.withWriteContext(withRewritePrivileges(writeContext), () => {
      writeConversationIndex(session, nextIndex, { operation: "history_rewrite" });
    });

    return nextIndex;
  }

  public recordRewriteEvent(
    session: VfsSession,
    options: {
      requestId: string;
      reason: string;
      payload: Record<string, unknown>;
      writeContext: VfsWriteContext;
    },
  ): string {
    const timestamp = Date.now();
    const safeId = options.requestId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const activeForkId =
      typeof options.writeContext.activeForkId === "number"
        ? options.writeContext.activeForkId
        : session.getActiveForkId();
    const path = `forks/${activeForkId}/ops/history_rewrites/${timestamp}-${safeId}.json`;

    session.withWriteContext(
      {
        ...options.writeContext,
        activeForkId,
        operation: "history_rewrite",
      },
      () => {
        session.writeFile(
          path,
          JSON.stringify({
            requestId: options.requestId,
            reason: options.reason,
            createdAt: timestamp,
            payload: options.payload,
          }),
          "application/json",
          { operation: "history_rewrite" },
        );
      },
    );

    return path;
  }
}

export const conversationHistoryRewriteService =
  new ConversationHistoryRewriteService();
