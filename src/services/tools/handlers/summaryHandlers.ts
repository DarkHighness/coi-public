/**
 * Summary Tool Handlers
 *
 * Handlers for summary-specific tools.
 */

import {
  SUMMARY_QUERY_SEGMENTS_TOOL,
  SUMMARY_QUERY_STATE_TOOL,
} from "../../tools";
import { registerToolHandler } from "../../tools/toolHandlerRegistry";

// ============================================================================
// Summary Query Segments Handler
// ============================================================================

registerToolHandler(SUMMARY_QUERY_SEGMENTS_TOOL, (args, ctx) => {
  const { gameState } = ctx;
  if (!gameState) {
    return { success: false, error: "Game state not available" };
  }

  const turnRange = args.turnRange as
    | { start: number; end: number }
    | undefined;
  const keyword = args.keyword as string | undefined;
  const currentFork = gameState.currentFork || [];

  let filtered = currentFork;

  // Filter by turn range
  if (turnRange) {
    filtered = filtered.filter((seg) => {
      const turn = seg.segmentIdx ?? 0;
      return turn >= turnRange.start && turn <= turnRange.end;
    });
  }

  // Filter by keyword
  if (keyword) {
    try {
      const regex = new RegExp(keyword, "i");
      filtered = filtered.filter((seg) => regex.test(seg.text || ""));
    } catch {
      filtered = filtered.filter((seg) =>
        (seg.text || "").toLowerCase().includes(keyword.toLowerCase()),
      );
    }
  }

  return {
    success: true,
    totalSegments: filtered.length,
    segments: filtered.map((seg) => ({
      turn: seg.segmentIdx,
      role: seg.role,
      text: seg.text,
      location: seg.stateSnapshot?.currentLocation,
      time: seg.stateSnapshot?.time,
    })),
  };
});

// ============================================================================
// Summary Query State Handler
// ============================================================================

registerToolHandler(SUMMARY_QUERY_STATE_TOOL, (args, ctx) => {
  const { db } = ctx;
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  const entities = args.entities as string[];
  const result: Record<string, unknown> = { success: true };

  for (const entity of entities) {
    switch (entity) {
      case "inventory":
        result.inventory = db.query("inventory");
        break;
      case "npcs":
        result.npcs = db.query("npc");
        break;
      case "locations":
        result.locations = db.query("location");
        break;
      case "quests":
        result.quests = db.query("quest");
        break;
      case "knowledge":
        result.knowledge = db.query("knowledge");
        break;
      case "character":
        result.character = {
          profile: db.query("character", "profile"),
          attributes: db.query("character", "attributes"),
          conditions: db.query("character", "conditions"),
        };
        break;
    }
  }

  return result;
});
