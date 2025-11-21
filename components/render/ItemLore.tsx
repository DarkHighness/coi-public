import React, { useState } from "react";

interface ItemLoreProps {
  lore: string;
  labelHistory: string;
  labelShowMore: string;
  labelShowLess: string;
}

export const ItemLore: React.FC<ItemLoreProps> = ({
  lore,
  labelHistory,
  labelShowMore,
  labelShowLess,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const LORE_LIMIT = 150;

  return (
    <div className="pt-2 border-t border-theme-border">
      <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold mb-1 block">
        {labelHistory}
      </span>
      <p className="text-xs text-theme-muted italic">
        {isExpanded || lore.length <= LORE_LIMIT
          ? lore
          : `${lore.substring(0, LORE_LIMIT)}...`}

        {lore.length > LORE_LIMIT && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="ml-2 text-[10px] text-theme-primary hover:text-theme-primary-hover hover:underline focus:outline-none transition-colors font-bold uppercase tracking-wide"
          >
            {isExpanded ? labelShowLess : labelShowMore}
          </button>
        )}
      </p>
    </div>
  );
};
