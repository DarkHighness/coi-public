import { StorySegment } from "../types";

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
  cutoffIndexOverride?: number,
): StorySegment[] => {
  const history: StorySegment[] = [];
  let currentId = leafId;

  // Get cutoff index from leaf node if truncating
  let cutoffIndex = -1;
  if (truncateToLastSummary && leafId && nodes[leafId]) {
    cutoffIndex =
      typeof cutoffIndexOverride === "number"
        ? cutoffIndexOverride
        : nodes[leafId].summarizedIndex || 0;
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
