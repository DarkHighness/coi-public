import React from "react";

interface InventoryItemHeaderProps {
  name: string;
  isOpen: boolean;
  isHighlight: boolean;
  onClick: () => void;
}

export const InventoryItemHeader: React.FC<InventoryItemHeaderProps> = ({
  name,
  isOpen,
  isHighlight,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2 rounded border transition-all duration-1000 flex justify-between items-center ${
      isHighlight
        ? "bg-theme-primary/20 border-theme-primary text-theme-text shadow-[0_0_10px_rgba(var(--theme-primary),0.3)]"
        : "bg-theme-surface-highlight hover:bg-theme-surface-highlight/80 border-theme-border text-theme-text"
    }`}
  >
    <span className="font-medium">{name}</span>
    <span
      className="text-xs text-theme-muted transition-transform duration-300"
      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      ▼
    </span>
  </button>
);
