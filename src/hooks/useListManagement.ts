import { useCallback, useEffect, useMemo } from "react";
import { ListState } from "../types";

interface UseListManagementOptions {
  enabled?: boolean;
}

const FALLBACK_LIST_STATE: ListState = {
  pinnedIds: [],
  customOrder: [],
  hiddenIds: [],
};

export function useListManagement<T extends { id: string | number }>(
  items: T[],
  listState: ListState | undefined,
  onUpdate: (newState: ListState) => void,
  options?: UseListManagementOptions,
) {
  const enabled = options?.enabled ?? true;

  // Fallback for initial load or missing state
  const safeListState = useMemo(
    () => listState || FALLBACK_LIST_STATE,
    [listState],
  );
  const { pinnedIds, customOrder, hiddenIds = [] } = safeListState;

  const togglePin = useCallback(
    (id: string | number) => {
      if (!enabled) return;
      const idStr = id.toString();
      const newPinnedIds = pinnedIds.includes(idStr)
        ? pinnedIds.filter((p) => p !== idStr)
        : [...pinnedIds, idStr];

      onUpdate({
        ...safeListState,
        pinnedIds: newPinnedIds,
      });
    },
    [enabled, pinnedIds, safeListState, onUpdate],
  );

  const toggleHide = useCallback(
    (id: string | number) => {
      if (!enabled) return;
      const idStr = id.toString();
      const newHiddenIds = hiddenIds.includes(idStr)
        ? hiddenIds.filter((h) => h !== idStr)
        : [...hiddenIds, idStr];

      onUpdate({
        ...safeListState,
        hiddenIds: newHiddenIds,
      });
    },
    [enabled, hiddenIds, safeListState, onUpdate],
  );

  const reorderItem = useCallback(
    (dragId: string | number, hoverId: string | number) => {
      if (!enabled) return;
      const dragIdStr = dragId.toString();
      const hoverIdStr = hoverId.toString();

      const currentOrder = [...customOrder];
      // Ensure both IDs are in the order list
      if (!currentOrder.includes(dragIdStr)) currentOrder.push(dragIdStr);
      if (!currentOrder.includes(hoverIdStr)) currentOrder.push(hoverIdStr);

      const dragIndex = currentOrder.indexOf(dragIdStr);
      const hoverIndex = currentOrder.indexOf(hoverIdStr);

      if (dragIndex === -1 || hoverIndex === -1) return;

      const newOrder = [...currentOrder];
      newOrder.splice(dragIndex, 1);
      newOrder.splice(hoverIndex, 0, dragIdStr);

      onUpdate({
        ...safeListState,
        customOrder: newOrder,
      });
    },
    [enabled, customOrder, safeListState, onUpdate],
  );

  const itemIds = useMemo(() => {
    if (!enabled) return [];
    return items
      .filter((i) => i.id !== undefined && i.id !== null)
      .map((i) => i.id.toString());
  }, [enabled, items]);

  // Initialize customOrder with new items
  useEffect(() => {
    if (!enabled) return;
    const newIds = itemIds.filter((id) => !customOrder.includes(id));
    if (newIds.length > 0) {
      onUpdate({
        ...safeListState,
        customOrder: [...customOrder, ...newIds],
      });
    }
  }, [enabled, itemIds, customOrder, onUpdate, safeListState]);

  const orderIndexById = useMemo(() => {
    const indexMap = new Map<string, number>();
    customOrder.forEach((id, index) => {
      indexMap.set(id, index);
    });
    return indexMap;
  }, [customOrder]);

  const processedItems = useMemo(() => {
    if (!enabled) return [] as Array<T & { isPinned: boolean }>;
    return items
      .filter((item) => item.id !== undefined && item.id !== null)
      .map((item) => ({
        ...item,
        isPinned: pinnedIds.includes(item.id.toString()),
      }));
  }, [enabled, items, pinnedIds]);

  const sortedItems = useMemo(() => {
    if (!enabled) return [] as Array<T & { isPinned: boolean }>;
    const next = [...processedItems];
    next.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

      const indexA = orderIndexById.get(a.id.toString());
      const indexB = orderIndexById.get(b.id.toString());

      // If both are in customOrder, sort by index
      if (indexA !== undefined && indexB !== undefined) return indexA - indexB;
      // If one is missing, put it at the end
      if (indexA === undefined) return 1;
      if (indexB === undefined) return -1;
      return 0;
    });
    return next;
  }, [enabled, processedItems, orderIndexById]);

  // Filter out hidden items for sidebar display
  const visibleItems = useMemo(
    () =>
      enabled
        ? sortedItems.filter((item) => !hiddenIds.includes(item.id.toString()))
        : ([] as Array<T & { isPinned: boolean }>),
    [enabled, sortedItems, hiddenIds],
  );
  const allItems = sortedItems;

  const isPinned = useCallback(
    (id: string | number) => enabled && pinnedIds.includes(id.toString()),
    [enabled, pinnedIds],
  );

  const isHidden = useCallback(
    (id: string | number) => enabled && hiddenIds.includes(id.toString()),
    [enabled, hiddenIds],
  );

  return {
    visibleItems,
    allItems,
    togglePin,
    toggleHide,
    reorderItem,
    isPinned,
    isHidden,
  };
}
