/**
 * Story Query Tool Handlers
 *
 * Handlers for story memory query tools:
 * - query_story: Search through story history
 * - query_turn: Get current fork ID and turn number
 * - query_summary: Search through story summaries
 * - query_recent_context: Get recent story segments
 * - query_atmosphere_enums: Get atmosphere enum values
 * - query_atmosphere_enum_description: Get descriptions for atmosphere values
 */

import {
  QUERY_STORY_TOOL,
  QUERY_TURN_TOOL,
  QUERY_SUMMARY_TOOL,
  QUERY_RECENT_CONTEXT_TOOL,
  QUERY_ATMOSPHERE_ENUMS_TOOL,
  QUERY_ATMOSPHERE_ENUM_DESCRIPTION_TOOL,
  getTypedArgs,
} from "../../tools";
import { registerToolHandler } from "../toolHandlerRegistry";
import {
  envThemeSchema,
  ambienceSchema,
  weatherEffectSchema,
} from "../../zodSchemas";
import { ATMOSPHERE_DESCRIPTIONS } from "@/utils/constants/atmosphereDescriptions";
import type { StorySegment } from "../../../types";

// ============================================================================
// Helper Functions
// ============================================================================

function matchesPattern(text: string | undefined, pattern: string): boolean {
  if (!text) return false;
  try {
    const regex = new RegExp(pattern, "i");
    return regex.test(text);
  } catch {
    return text.toLowerCase().includes(pattern.toLowerCase());
  }
}

// ============================================================================
// Query Story
// ============================================================================

registerToolHandler(QUERY_STORY_TOOL, (args, ctx) => {
  const { gameState } = ctx;
  if (!gameState) {
    return { success: false, error: "Game state not available" };
  }

  const typedArgs = getTypedArgs("query_story", args);
  const {
    keyword,
    location,
    inGameTime,
    turnRange,
    order = "desc",
    limit = 10,
    page = 1,
    includeContext = true,
  } = typedArgs;

  const currentFork = gameState.currentFork || [];
  const narrativeSegments = currentFork.filter(
    (seg) => seg.role === "model" || seg.role === "command",
  );

  // Build filter function
  const matchesFilter = (segment: StorySegment, index: number): boolean => {
    if (keyword && !matchesPattern(segment.text, keyword)) return false;
    if (
      location &&
      !matchesPattern(segment.stateSnapshot?.currentLocation, location)
    )
      return false;
    if (inGameTime && !matchesPattern(segment.stateSnapshot?.time, inGameTime))
      return false;

    const turnNum = segment.segmentIdx ?? index;
    if (turnRange) {
      if (turnRange.start !== undefined && turnNum < turnRange.start)
        return false;
      if (turnRange.end !== undefined && turnNum > turnRange.end) return false;
    }
    return true;
  };

  // Filter and collect
  const filtered: Array<{ segment: StorySegment; index: number }> = [];
  narrativeSegments.forEach((segment) => {
    const idx = currentFork.findIndex((s) => s.id === segment.id);
    if (matchesFilter(segment, idx)) {
      filtered.push({ segment, index: idx });
    }
  });

  // Sort
  filtered.sort((a, b) => {
    const turnA = a.segment.segmentIdx ?? a.index;
    const turnB = b.segment.segmentIdx ?? b.index;
    return order === "asc" ? turnA - turnB : turnB - turnA;
  });

  // Paginate
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  // Build results
  const results = paginated.map(({ segment, index }) => {
    const result: Record<string, unknown> = {
      turnNumber: segment.segmentIdx ?? index,
      inGameTime: segment.stateSnapshot?.time,
      location: segment.stateSnapshot?.currentLocation,
      text: segment.text,
      segmentId: segment.id,
    };

    if (includeContext && index + 1 < currentFork.length) {
      const next = currentFork[index + 1];
      if (next && (next.role === "user" || next.role === "command")) {
        result.playerAction = next.text;
      }
    }
    return result;
  });

  return {
    success: true,
    query: { keyword, location, inGameTime, turnRange, order },
    pagination: {
      page,
      limit,
      totalResults: total,
      totalPages,
      hasMore: page < totalPages,
    },
    results,
    hint:
      results.length === 0
        ? "No matching segments found."
        : `Found ${total} segments. Page ${page}/${totalPages}.`,
  };
});

// ============================================================================
// Query Turn
// ============================================================================

registerToolHandler(QUERY_TURN_TOOL, (_args, ctx) => {
  const { gameState } = ctx;
  if (!gameState) {
    return { success: false, error: "Game state not available" };
  }

  const latestSummary = gameState.summaries?.length
    ? gameState.summaries[gameState.summaries.length - 1]
    : null;

  return {
    success: true,
    forkId: gameState.forkId ?? 0,
    turnNumber: gameState.turnNumber ?? 0,
    totalSegments: gameState.currentFork?.length ?? 0,
    currentNodeId: gameState.currentFork?.length
      ? gameState.currentFork[gameState.currentFork.length - 1].id
      : undefined,
    totalSummaries: gameState.summaries?.length ?? 0,
    latestSummaryBrief: latestSummary
      ? {
          nodeRange: latestSummary.nodeRange,
          timeRange: latestSummary.timeRange,
          displayText:
            latestSummary.displayText?.substring(0, 100) +
            (latestSummary.displayText?.length > 100 ? "..." : ""),
        }
      : null,
    hint: `Turn ${gameState.turnNumber ?? 0}, Fork ${gameState.forkId ?? 0}.`,
  };
});

// ============================================================================
// Query Summary
// ============================================================================

registerToolHandler(QUERY_SUMMARY_TOOL, (args, ctx) => {
  const { gameState } = ctx;
  if (!gameState) {
    return { success: false, error: "Game state not available" };
  }

  const summaries = gameState.summaries || [];
  if (summaries.length === 0) {
    return {
      success: true,
      hasSummary: false,
      totalSummaries: 0,
      results: [],
      message: "No summaries available yet.",
    };
  }

  const latestIdx = summaries.length - 1;
  if (summaries.length === 1) {
    return {
      success: true,
      hasSummary: true,
      totalSummaries: 1,
      results: [],
      alreadyInContext: true,
      message: "The only summary is already in your context.",
    };
  }

  const typedArgs = getTypedArgs("query_summary", args);
  const { keyword, nodeRange, limit = 5, page = 1, order = "desc" } = typedArgs;

  // Filter (exclude latest)
  let filtered = summaries
    .map((s, i) => ({ summary: s, index: i }))
    .filter(({ index }) => index < latestIdx);

  if (keyword) {
    filtered = filtered.filter(({ summary }) => {
      const text = `${summary.displayText || ""} ${JSON.stringify(summary.visible || "")} ${JSON.stringify(summary.hidden || "")}`;
      return matchesPattern(text, keyword);
    });
  }

  if (nodeRange) {
    filtered = filtered.filter(({ summary }) => {
      const r = summary.nodeRange;
      if (!r) return true;
      if (nodeRange.start !== undefined && r.toIndex < nodeRange.start)
        return false;
      if (nodeRange.end !== undefined && r.fromIndex > nodeRange.end)
        return false;
      return true;
    });
  }

  // Sort and paginate
  filtered.sort((a, b) =>
    order === "asc" ? a.index - b.index : b.index - a.index,
  );
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const safePage = Math.max(1, Math.min(page, totalPages || 1));
  const start = (safePage - 1) * limit;

  const results = filtered
    .slice(start, start + limit)
    .map(({ summary, index }) => ({
      summaryIndex: index,
      displayText: summary.displayText || "",
      visible: summary.visible,
      hidden: summary.hidden,
      nodeRange: summary.nodeRange,
      timeRange: summary.timeRange,
    }));

  return {
    success: true,
    hasSummary: true,
    totalSummaries: summaries.length,
    matchedCount: total,
    pagination: { page: safePage, totalPages, totalResults: total },
    results,
  };
});

// ============================================================================
// Query Recent Context
// ============================================================================

registerToolHandler(QUERY_RECENT_CONTEXT_TOOL, (args, ctx) => {
  const { gameState, settings } = ctx;
  if (!gameState) {
    return { success: false, error: "Game state not available" };
  }

  const typedArgs = getTypedArgs("query_recent_context", args);
  const requestedCount = Math.min(Math.max(typedArgs.count || 10, 1), 40);
  const page = typedArgs.page || 1;
  const currentFork = gameState.currentFork || [];

  if (currentFork.length === 0) {
    return {
      success: true,
      segments: [],
      message: "No story history available.",
    };
  }

  const freshSegmentCount = settings?.freshSegmentCount ?? 4;
  const activeNode = gameState.nodes?.[gameState.activeNodeId || ""];
  const summarizedIndex = activeNode?.summarizedIndex || 0;
  const segmentsInContext = Math.min(
    currentFork.length,
    currentFork.length - summarizedIndex + freshSegmentCount,
  );

  if (
    requestedCount <= segmentsInContext &&
    currentFork.length >= requestedCount
  ) {
    return {
      success: true,
      alreadyInContext: true,
      requestedCount,
      contextIncludesLast: segmentsInContext,
      segments: [],
      message: `Last ${segmentsInContext} segments already in context.`,
    };
  }

  const startIndex = Math.max(0, currentFork.length - requestedCount);
  const relevantSegments = currentFork.slice(startIndex);
  const totalPages = Math.ceil(relevantSegments.length / 10);
  const safePage = Math.max(1, Math.min(page, totalPages || 1));
  const pageStart = (safePage - 1) * 10;
  const recentSegments = relevantSegments.slice(pageStart, pageStart + 10);

  const segments = recentSegments.map((seg) => ({
    segmentIdx: seg.segmentIdx,
    role: seg.role,
    text: seg.text,
    location: seg.stateSnapshot?.currentLocation,
    inGameTime: seg.stateSnapshot?.time,
  }));

  return {
    success: true,
    requestedCount,
    returnedCount: segments.length,
    currentTurn: gameState.turnNumber ?? 0,
    totalSegments: currentFork.length,
    segments,
  };
});

// ============================================================================
// Query Atmosphere Enums
// ============================================================================

registerToolHandler(QUERY_ATMOSPHERE_ENUMS_TOOL, (args) => {
  const typedArgs = getTypedArgs("query_atmosphere_enums", args);
  const categories = typedArgs.categories || [
    "envTheme",
    "ambience",
    "weather",
  ];
  const result: Record<string, string[]> = {};

  if (categories.includes("envTheme")) result.envTheme = envThemeSchema.options;
  if (categories.includes("ambience")) result.ambience = ambienceSchema.options;
  if (categories.includes("weather"))
    result.weather = weatherEffectSchema.options;

  return {
    success: true,
    categories: Object.keys(result),
    enums: result,
  };
});

// ============================================================================
// Query Atmosphere Enum Description
// ============================================================================

registerToolHandler(QUERY_ATMOSPHERE_ENUM_DESCRIPTION_TOOL, (args) => {
  const typedArgs = getTypedArgs("query_atmosphere_enum_description", args);
  const items = typedArgs.items;

  if (!items || !Array.isArray(items)) {
    return { success: false, error: "Invalid items parameter" };
  }

  const results = items.map((item) => {
    const categoryDesc = (ATMOSPHERE_DESCRIPTIONS as Record<string, unknown>)[
      item.category
    ] as Record<string, string> | undefined;
    return {
      category: item.category,
      value: item.value,
      description: categoryDesc?.[item.value] || "No description available.",
    };
  });

  return { success: true, results };
});
