import React from "react";
import {
  SIDEBAR_ENTITY_ROW_CLASS,
  SIDEBAR_ENTITY_TITLE_CLASS,
} from "./sidebarTokens";

interface SidebarEntityRowProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const SidebarEntityRow: React.FC<SidebarEntityRowProps> = ({
  title,
  icon,
  rightSlot,
  isExpanded = false,
  onToggle,
  children,
  className = "",
  bodyClassName = "",
}) => {
  return (
    <div className={`${SIDEBAR_ENTITY_ROW_CLASS} ${className}`.trim()}>
      <div
        className={`py-2 pl-2 pr-1 min-h-[2.25rem] flex items-center justify-between gap-2 ${
          onToggle
            ? "cursor-pointer hover:bg-theme-surface-highlight/20 transition-colors"
            : ""
        }`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon ? <span className="shrink-0">{icon}</span> : null}
          <div className={`${SIDEBAR_ENTITY_TITLE_CLASS} min-w-0 break-words`}>
            {title}
          </div>
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
      {isExpanded && children ? (
        <div
          className={`overflow-hidden animate-sidebar-expand ${bodyClassName}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
};
