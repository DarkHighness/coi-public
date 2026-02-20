import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface VirtualizedThemeListViewport {
  firstVisibleIndex: number;
  lastVisibleIndex: number;
  totalCount: number;
  progressRatio: number;
}

interface VirtualizedThemeListProps<T> {
  items: readonly T[];
  itemHeight: number;
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  maintainTopItemAnchor?: boolean;
  onViewportChange?: (viewport: VirtualizedThemeListViewport) => void;
  emptyState?: React.ReactNode;
}

const DEFAULT_OVERSCAN = 8;

export const VirtualizedThemeList = <T,>({
  items,
  itemHeight,
  getKey,
  renderItem,
  className = "",
  overscan = DEFAULT_OVERSCAN,
  maintainTopItemAnchor = true,
  onViewportChange,
  emptyState = null,
}: VirtualizedThemeListProps<T>) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingScrollTopRef = useRef(0);
  const topAnchorRef = useRef<{ key: string; offsetWithin: number } | null>(
    null,
  );
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const syncTopAnchor = useCallback(
    (nextScrollTop: number) => {
      if (items.length === 0) {
        topAnchorRef.current = null;
        return;
      }

      const firstVisibleIndex = Math.min(
        items.length - 1,
        Math.max(0, Math.floor(nextScrollTop / itemHeight)),
      );
      const anchorItem = items[firstVisibleIndex];
      if (anchorItem === undefined) {
        topAnchorRef.current = null;
        return;
      }

      topAnchorRef.current = {
        key: getKey(anchorItem, firstVisibleIndex),
        offsetWithin: nextScrollTop - firstVisibleIndex * itemHeight,
      };
    },
    [getKey, itemHeight, items],
  );

  const commitScrollTop = useCallback(
    (nextScrollTop: number) => {
      setScrollTop(nextScrollTop);
      syncTopAnchor(nextScrollTop);
    },
    [syncTopAnchor],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateViewportHeight = () => {
      setViewportHeight(element.clientHeight);
    };

    updateViewportHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(updateViewportHeight);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const totalHeight = items.length * itemHeight;
  const itemIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item, index) => {
      map.set(getKey(item, index), index);
    });
    return map;
  }, [getKey, items]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let nextScrollTop = element.scrollTop;
    if (maintainTopItemAnchor && topAnchorRef.current) {
      const anchorIndex = itemIndexByKey.get(topAnchorRef.current.key);
      if (typeof anchorIndex === "number") {
        nextScrollTop =
          anchorIndex * itemHeight + topAnchorRef.current.offsetWithin;
      }
    }

    const maxScrollTop = Math.max(0, totalHeight - element.clientHeight);
    nextScrollTop = Math.max(0, Math.min(nextScrollTop, maxScrollTop));

    if (element.scrollTop !== nextScrollTop) {
      element.scrollTop = nextScrollTop;
    }

    commitScrollTop(nextScrollTop);
  }, [
    commitScrollTop,
    itemHeight,
    itemIndexByKey,
    maintainTopItemAnchor,
    totalHeight,
  ]);

  useEffect(() => {
    return () => {
      if (
        rafIdRef.current !== null &&
        typeof cancelAnimationFrame === "function"
      ) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const viewport = useMemo(() => {
    if (items.length === 0) {
      return {
        firstVisibleIndex: 0,
        lastVisibleIndex: 0,
        progressRatio: 0,
      };
    }

    if (viewportHeight <= 0) {
      const lastVisibleIndex = Math.min(
        items.length - 1,
        Math.max(0, overscan * 2 - 1),
      );
      return {
        firstVisibleIndex: 0,
        lastVisibleIndex,
        progressRatio: items.length > 1 ? 0 : 1,
      };
    }

    const firstVisibleIndex = Math.min(
      items.length - 1,
      Math.max(0, Math.floor(scrollTop / itemHeight)),
    );
    const lastVisibleIndex = Math.min(
      items.length - 1,
      Math.max(
        firstVisibleIndex,
        Math.ceil((scrollTop + viewportHeight) / itemHeight) - 1,
      ),
    );
    const progressRatio =
      items.length <= 1 ? 1 : firstVisibleIndex / (items.length - 1);

    return { firstVisibleIndex, lastVisibleIndex, progressRatio };
  }, [items.length, itemHeight, overscan, scrollTop, viewportHeight]);

  const { startIndex, endIndex } = useMemo(() => {
    if (items.length === 0) {
      return { startIndex: 0, endIndex: 0 };
    }
    const startIndex = Math.max(0, viewport.firstVisibleIndex - overscan);
    const endIndex = Math.min(
      items.length,
      viewport.lastVisibleIndex + 1 + overscan,
    );
    return { startIndex, endIndex };
  }, [
    items.length,
    overscan,
    viewport.firstVisibleIndex,
    viewport.lastVisibleIndex,
  ]);

  useEffect(() => {
    if (!onViewportChange) return;
    onViewportChange({
      firstVisibleIndex: viewport.firstVisibleIndex,
      lastVisibleIndex: viewport.lastVisibleIndex,
      totalCount: items.length,
      progressRatio: viewport.progressRatio,
    });
  }, [
    items.length,
    onViewportChange,
    viewport.firstVisibleIndex,
    viewport.lastVisibleIndex,
    viewport.progressRatio,
  ]);

  if (items.length === 0) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      onScroll={(event) => {
        const nextScrollTop = event.currentTarget.scrollTop;
        pendingScrollTopRef.current = nextScrollTop;

        if (rafIdRef.current !== null) {
          return;
        }

        if (typeof requestAnimationFrame !== "function") {
          commitScrollTop(nextScrollTop);
          return;
        }

        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          commitScrollTop(pendingScrollTopRef.current);
        });
      }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {items.slice(startIndex, endIndex).map((item, offset) => {
          const index = startIndex + offset;
          return (
            <div
              key={getKey(item, index)}
              style={{
                position: "absolute",
                top: index * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
