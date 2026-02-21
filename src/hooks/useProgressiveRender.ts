import { useCallback, useEffect, useMemo, useState } from "react";

export function useProgressiveRender<T>(
  items: T[],
  initialBatchSize = 30,
  enabled = true,
) {
  const [limit, setLimit] = useState(initialBatchSize);

  useEffect(() => {
    setLimit(initialBatchSize);
  }, [items, initialBatchSize]);

  useEffect(() => {
    if (!enabled) {
      setLimit(items.length);
    }
  }, [enabled, items.length]);

  const visibleItems = useMemo(() => {
    if (!enabled) {
      return items;
    }
    return items.slice(0, limit);
  }, [enabled, items, limit]);

  const hasMore = enabled && limit < items.length;

  const loadMore = useCallback(() => {
    if (!enabled) {
      return;
    }
    setLimit((prev) => Math.min(prev + initialBatchSize, items.length));
  }, [enabled, initialBatchSize, items.length]);

  return {
    visibleItems,
    hasMore,
    loadMore,
    renderedCount: visibleItems.length,
    totalCount: items.length,
  };
}
