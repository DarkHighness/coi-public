import { useCallback, useEffect } from "react";
import { ListState } from "../types";

export function useListManagement<T extends { id: string }>(
  items: T[],
  listState: ListState,
  onUpdate: (newState: ListState) => void,
  defaultLimit: number = 5,
) {
  // Fallback for initial load or missing state
  const safeListState = listState || { pinnedIds: [], customOrder: [] };
  const { pinnedIds, customOrder } = safeListState;

  const togglePin = useCallback(
    (id: string) => {
      const newPinnedIds = pinnedIds.includes(id)
        ? pinnedIds.filter((p) => p !== id)
        : [...pinnedIds, id];

      onUpdate({
        ...safeListState,
        pinnedIds: newPinnedIds,
      });
    },
    [pinnedIds, safeListState, onUpdate],
  );

  const reorderItem = useCallback(
    (dragId: string, hoverId: string) => {
      const currentOrder = [...customOrder];
      // Ensure both IDs are in the order list
      if (!currentOrder.includes(dragId)) currentOrder.push(dragId);
      if (!currentOrder.includes(hoverId)) currentOrder.push(hoverId);

      const dragIndex = currentOrder.indexOf(dragId);
      const hoverIndex = currentOrder.indexOf(hoverId);

      if (dragIndex === -1 || hoverIndex === -1) return;

      const newOrder = [...currentOrder];
      newOrder.splice(dragIndex, 1);
      newOrder.splice(hoverIndex, 0, dragId);

      onUpdate({
        ...safeListState,
        customOrder: newOrder,
      });
    },
    [customOrder, safeListState, onUpdate],
  );

  // Initialize customOrder with new items
  useEffect(() => {
    const newIds = items
      .map((i) => i.id)
      .filter((id) => !customOrder.includes(id));
    if (newIds.length > 0) {
      onUpdate({
        ...safeListState,
        customOrder: [...customOrder, ...newIds],
      });
    }
  }, [items, customOrder, onUpdate, safeListState]);

  const processedItems = items.map((item) => ({
    ...item,
    isPinned: pinnedIds.includes(item.id),
  }));

  const sortedItems = processedItems.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

    const indexA = customOrder.indexOf(a.id);
    const indexB = customOrder.indexOf(b.id);

    // If both are in customOrder, sort by index
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    // If one is missing, put it at the end
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return 0;
  });

  const pinnedItems = sortedItems.filter((i) => i.isPinned);

  const effectiveLimit = Math.max(defaultLimit, pinnedItems.length);
  const visibleItems = sortedItems.slice(0, effectiveLimit);
  const allItems = sortedItems;

  const isPinned = useCallback(
    (id: string) => pinnedIds.includes(id),
    [pinnedIds],
  );

  return {
    visibleItems,
    allItems,
    togglePin,
    reorderItem,
    isPinned,
  };
}
