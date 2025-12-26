/**
 * Result Accumulator
 *
 * Handles accumulation of results during the agentic loop.
 */

import type { GameResponse, LogEntry, TokenUsage } from "../../../../types";
import type { GameDatabase } from "../../../gameDatabase";
import { createLogEntry } from "../../utils";

// ============================================================================
// Response Processing
// ============================================================================

/**
 * Process finish_turn response data
 */
export function processFinishTurnData(
  data: Record<string, unknown>,
  response: GameResponse,
  db: GameDatabase,
): void {
  // Extract narrative and choices
  response.narrative = (data.narrative as string)
    ?.replace(/\\n/g, "\n")
    .replace(/\\"/g, '"');
  response.choices = data.choices as GameResponse["choices"];
  response.imagePrompt = data.imagePrompt as string;

  // Extract atmosphere
  if (data.atmosphere) {
    response.atmosphere = data.atmosphere as GameResponse["atmosphere"];
  }
  if (data.narrativeTone) {
    response.narrativeTone = data.narrativeTone as string;
  }

  // Extract ending type
  if (data.ending && data.ending !== "continue") {
    response.ending = data.ending as GameResponse["ending"];
  }

  // Extract forceEnd flag
  if (data.forceEnd === true || data.forceEnd === false) {
    response.forceEnd = data.forceEnd;
  }

  // Attach final state from DB
  (response as GameResponse & { finalState: unknown }).finalState =
    db.getState();
}

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
      input: tc.input,
      output: tc.output,
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
