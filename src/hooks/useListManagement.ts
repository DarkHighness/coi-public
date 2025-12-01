import { useCallback, useEffect } from "react";
import { ListState } from "../types";

export function useListManagement<T extends { id: string | number }>(
  items: T[],
  listState: ListState,
  onUpdate: (newState: ListState) => void,
  defaultLimit: number = 5,
) {
  // Fallback for initial load or missing state
  const safeListState = listState || { pinnedIds: [], customOrder: [] };
  const { pinnedIds, customOrder } = safeListState;

  const togglePin = useCallback(
    (id: string | number) => {
      const idStr = id.toString();
      const newPinnedIds = pinnedIds.includes(idStr)
        ? pinnedIds.filter((p) => p !== idStr)
        : [...pinnedIds, idStr];

      onUpdate({
        ...safeListState,
        pinnedIds: newPinnedIds,
      });
    },
    [pinnedIds, safeListState, onUpdate],
  );

  const reorderItem = useCallback(
    (dragId: string | number, hoverId: string | number) => {
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
    [customOrder, safeListState, onUpdate],
  );

  // Initialize customOrder with new items
  useEffect(() => {
    const newIds = items
      .map((i) => i.id.toString())
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
    isPinned: pinnedIds.includes(item.id.toString()),
  }));

  const sortedItems = processedItems.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

    const indexA = customOrder.indexOf(a.id.toString());
    const indexB = customOrder.indexOf(b.id.toString());

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
    (id: string | number) => pinnedIds.includes(id.toString()),
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
