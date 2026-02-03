import { StorySegment } from "../types";

/** Default number of fresh segments to keep before summary cutoff */
export const DEFAULT_FRESH_SEGMENT_COUNT = 4;

/**
 * Helper: Traverse tree to derive history from a leaf node
 * @param nodes Map of all story nodes
 * @param leafId The ID of the leaf node to start traversal from
 * @param truncateToLastSummary Whether to stop traversal at the last summarized index
 */
export const deriveHistory = (
  nodes: Record<string, StorySegment>,
  leafId: string | null,
  truncateToLastSummary: boolean = false,
): StorySegment[] => {
  const history: StorySegment[] = [];
  let currentId = leafId;

  // Get cutoff index from leaf node if truncating
  let cutoffIndex = -1;
  if (truncateToLastSummary && leafId && nodes[leafId]) {
    cutoffIndex = nodes[leafId].summarizedIndex || 0;
  }

  while (currentId && nodes[currentId]) {
    const node = nodes[currentId];
    if (!truncateToLastSummary || node.segmentIdx >= cutoffIndex) {
      history.unshift(node);
      currentId = node.parentId;
    } else {
      break;
    }
  }
  return history;
};

/**
 * Get segments to send to AI, applying freshCount overlap for narrative continuity.
 *
 * This ensures that even after summarization, AI has access to some segments
 * BEFORE the summary cutoff point for better context continuity.
 *
 * @param segments All context segments (from deriveHistory with truncation)
 * @param lastSummarizedIndex The index where summarization occurred
 * @param freshSegmentCount Number of segments to keep before the summary point
 * @returns Segments ready to send to AI
 */
export const getSegmentsForAI = (
  segments: StorySegment[],
  lastSummarizedIndex: number,
  freshSegmentCount: number = DEFAULT_FRESH_SEGMENT_COUNT,
): StorySegment[] => {
  if (segments.length === 0) return [];

  // Find the position in the array where summarization occurred
  // We want to include freshSegmentCount segments BEFORE this point
  const summaryPosition = segments.findIndex(
    (seg) => (seg.segmentIdx ?? 0) >= lastSummarizedIndex,
  );

  // If lastSummarizedIndex is beyond the end of the current segment list (common when
  // the summary boundary is "one past" the last segmentIdx), keep a small overlap
  // instead of returning the full history.
  if (summaryPosition === -1) {
    const safeFreshCount = Math.max(0, freshSegmentCount);
    const startPosition = Math.max(0, segments.length - safeFreshCount);
    return segments.slice(startPosition);
  }

  if (summaryPosition <= 0) {
    // No summary yet or already at start, return all
    return segments;
  }

  // Calculate start position: keep freshSegmentCount segments before summary point
  const startPosition = Math.max(0, summaryPosition - Math.max(0, freshSegmentCount));
  return segments.slice(startPosition);
};
