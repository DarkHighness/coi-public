/**
 * Result Accumulator
 *
 * Handles accumulation of results during the agentic loop.
 */

import type { GameResponse, LogEntry, TokenUsage } from "../../../../types";
import { createLogEntry } from "../../utils";
import type { VfsSession } from "../../../vfs/vfsSession";
import { deriveGameStateFromVfs } from "../../../vfs/derivations";
import { readConversationIndex, readTurnFile } from "../../../vfs/conversation";
import { toJsonValue } from "../../../jsonValue";

// ============================================================================
// Response Processing
// ============================================================================

/**
 * Process turn output derived from VFS conversation files
 */
const createEmptyResponse = (): GameResponse => ({
  narrative: "",
  choices: [],
  inventoryActions: [],
  npcActions: [],
  locationActions: [],
  questActions: [],
  knowledgeActions: [],
  factionActions: [],
  characterUpdates: undefined,
  timelineEvents: [],
});

const parseTurnId = (
  turnId: string,
): { forkId: number; turnNumber: number } | null => {
  const match = /fork-(\d+)\/turn-(\d+)/.exec(turnId);
  if (!match) return null;
  return { forkId: Number(match[1]), turnNumber: Number(match[2]) };
};

export interface ConversationMarker {
  activeForkId: number;
  activeTurnId: string;
  latestTurnNumber: number | null;
}

export const getConversationMarker = (
  vfsSession: VfsSession,
): ConversationMarker | null => {
  const snapshot = vfsSession.snapshot();
  if (!snapshot || Object.keys(snapshot).length === 0) return null;
  const index = readConversationIndex(snapshot);
  if (!index) return null;
  const latestTurnNumber =
    index.latestTurnNumberByFork?.[String(index.activeForkId)] ?? null;
  return {
    activeForkId: index.activeForkId,
    activeTurnId: index.activeTurnId,
    latestTurnNumber,
  };
};

export const buildResponseFromVfs = (
  vfsSession: VfsSession,
  baseline?: ConversationMarker | null,
): GameResponse | null => {
  const snapshot = vfsSession.snapshot();
  if (!snapshot || Object.keys(snapshot).length === 0) return null;
  const index = readConversationIndex(snapshot);
  if (!index) return null;

  const latestTurnNumber =
    index.latestTurnNumberByFork?.[String(index.activeForkId)] ?? null;
  if (baseline) {
    const unchanged =
      baseline.activeForkId === index.activeForkId &&
      baseline.activeTurnId === index.activeTurnId &&
      baseline.latestTurnNumber === latestTurnNumber;
    if (unchanged) {
      return null;
    }
  }

  const activeTurnId = index.activeTurnId;
  const parsed = activeTurnId ? parseTurnId(activeTurnId) : null;
  if (!parsed) return null;
  const turn = readTurnFile(snapshot, parsed.forkId, parsed.turnNumber);
  if (!turn) return null;

  const response = createEmptyResponse();
  response.narrative = turn.assistant.narrative || "";
  response.choices = turn.assistant.choices as GameResponse["choices"];
  if (turn.assistant.atmosphere) {
    response.atmosphere = turn.assistant
      .atmosphere as GameResponse["atmosphere"];
  }
  if (turn.assistant.narrativeTone) {
    response.narrativeTone = turn.assistant.narrativeTone;
  }
  if (turn.assistant.ending) {
    response.ending = turn.assistant.ending as GameResponse["ending"];
  }
  if (turn.assistant.forceEnd === true || turn.assistant.forceEnd === false) {
    response.forceEnd = turn.assistant.forceEnd;
  }

  response.finalState = deriveGameStateFromVfs(snapshot);
  return response;
};

// ============================================================================
// Log Creation
// ============================================================================

/**
 * Create iteration log entry
 */
export function createIterationLog(
  protocol: string,
  modelId: string,
  iteration: number,
  toolCalls: Array<{ name: string; input: unknown; output: unknown }>,
  usage: TokenUsage,
  generationDetails?: LogEntry["generationDetails"],
): LogEntry {
  return createLogEntry({
    provider: protocol,
    model: modelId,
    endpoint: `adventure-iteration-${iteration}`,
    toolCalls: toolCalls.map((tc) => ({
      name: tc.name,
      input: toJsonValue(tc.input),
      output: toJsonValue(tc.output),
      timestamp: Date.now(),
    })),
    usage,
    generationDetails,
  });
}

/**
 * Create final result log entry
 */
export function createFinalLog(
  protocol: string,
  modelId: string,
  response: GameResponse,
  usage: TokenUsage,
  generationDetails?: LogEntry["generationDetails"],
): LogEntry {
  return createLogEntry({
    provider: protocol,
    model: modelId,
    endpoint: "adventure-complete",
    parsedResult: response,
    usage,
    generationDetails,
  });
}

// ============================================================================
// Entity Tracking
// ============================================================================

/**
 * Track changed entity
 */
export function trackChangedEntity(
  changedEntities: Map<string, string>,
  result: { success: boolean; id?: string },
  entityType: string,
): void {
  if (result.success && result.id) {
    changedEntities.set(result.id, entityType);
  }
}

/**
 * Convert changed entities map to array
 */
export function getChangedEntitiesArray(
  changedEntities: Map<string, string>,
): Array<{ id: string; type: string }> {
  return Array.from(changedEntities.entries()).map(([id, type]) => ({
    id,
    type,
  }));
}
