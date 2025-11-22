import React from "react";

interface InventoryItemHeaderProps {
  name: string;
  isOpen: boolean;
  isHighlight: boolean;
  onClick: () => void;
  isPinned?: boolean;
  onPin?: (e: React.MouseEvent) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isEditMode?: boolean;
}

export const InventoryItemHeader: React.FC<InventoryItemHeaderProps> = ({
  name,
  isOpen,
  isHighlight,
  onClick,
  isPinned,
  onPin,
  dragHandleProps,
  isEditMode,
}) => (
  <div className="flex items-center gap-1">
    <button
      onClick={onClick}
      className={`flex-1 text-left px-3 py-2 rounded border transition-all duration-1000 flex justify-between items-center ${
        isHighlight
          ? "bg-theme-primary/20 border-theme-primary text-theme-text shadow-[0_0_10px_rgba(var(--theme-primary),0.3)]"
          : "bg-theme-surface-highlight hover:bg-theme-surface-highlight/80 border-theme-border text-theme-text"
      }`}
    >
      <span className="font-medium truncate mr-2">{name}</span>
      <div className="flex items-center gap-2">
        {onPin && (
          <div
            onClick={onPin}
            className={`p-1 rounded hover:bg-theme-bg transition-colors ${
              isPinned
                ? "text-theme-primary"
                : "text-theme-muted hover:text-theme-text"
            }`}
            title={isPinned ? "Unpin" : "Pin to top"}
          >
            <svg
              className="w-3 h-3"
              fill={isPinned ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              ></path>
            </svg>
          </div>
        )}
        {!isEditMode && (
          <span
            className="text-xs text-theme-muted transition-transform duration-300"
            style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            ▼
          </span>
        )}
      </div>
    </button>
    {isEditMode && dragHandleProps && (
      <div
        {...dragHandleProps}
        className="cursor-grab active:cursor-grabbing text-theme-muted hover:text-theme-primary p-2 bg-theme-surface-highlight border border-theme-border rounded ml-1 touch-none"
        title="Drag to reorder"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </div>
    )}
  </div>
);
