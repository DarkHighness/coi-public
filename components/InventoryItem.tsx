import React, { useState, useEffect } from "react";
import { InventoryItem as InventoryItemType } from "../types";
import { InventoryItemDetail } from "./render/InventoryItemDetail";
import { InventoryItemHeader } from "./render/InventoryItemHeader";

interface InventoryItemProps {
  item: InventoryItemType;
  language: string;
  context: string;
  isPinned?: boolean;
  onPin?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isEditMode?: boolean;
  isDragging?: boolean;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({
  item,
  language,
  context,
  isPinned,
  onPin,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  isEditMode,
  isDragging,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Animation states
  const [isVisible, setIsVisible] = useState(false);
  const [isHighlight, setIsHighlight] = useState(true);

  useEffect(() => {
    // Trigger slide-in
    const entryTimer = setTimeout(() => setIsVisible(true), 50);

    // Remove highlight after a few seconds
    const highlightTimer = setTimeout(() => setIsHighlight(false), 2000);

    return () => {
      clearTimeout(entryTimer);
      clearTimeout(highlightTimer);
    };
  }, []);

  const handleClick = () => {
    if (!isEditMode) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div
      className={`mb-2 transform transition-all duration-300 ease-in-out ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
      } ${isDragging ? "opacity-50 scale-95" : "opacity-100 scale-100"}`}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDrop={onDrop}
    >
      <InventoryItemHeader
        name={item.name}
        isOpen={isOpen}
        isHighlight={isHighlight}
        onClick={handleClick}
        isPinned={isPinned}
        onPin={(e) => {
          e.stopPropagation();
          onPin?.();
        }}
        dragHandleProps={
          onDragStart
            ? {
                draggable: true,
                onDragStart: (e: React.DragEvent) => {
                  onDragStart(e);
                },
              }
            : undefined
        }
        isEditMode={isEditMode}
      />
      <div
        className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0"}`}
      >
        <InventoryItemDetail
          loading={false}
          details={{ description: item.description, lore: item.lore || "" }}
        />
      </div>
    </div>
  );
};
