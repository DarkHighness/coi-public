import React from "react";
import {
  SIDEBAR_ENTITY_ROW_CLASS,
  SIDEBAR_ENTITY_TITLE_CLASS,
} from "./sidebarTokens";

interface SidebarEntityRowProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  tags?: React.ReactNode;
  summary?: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  accentClassName?: string;
}

export const SidebarEntityRow: React.FC<SidebarEntityRowProps> = ({
  title,
  icon,
  tags,
  summary,
  isExpanded = false,
  onToggle,
  children,
  className = "",
  bodyClassName = "",
  accentClassName = "border-l-theme-divider/70",
}) => {
  return (
    <div
      className={`${SIDEBAR_ENTITY_ROW_CLASS} ${accentClassName} ${className}`.trim()}
    >
      <div
        className={`py-2 pl-2 pr-1 min-h-[2.25rem] flex items-start justify-between gap-2 ${
          onToggle
            ? "cursor-pointer hover:bg-theme-surface-highlight/15 transition-colors"
            : ""
        }`}
        onClick={onToggle}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            {icon ? (
              <span className="shrink-0 ui-emoji-slot">{icon}</span>
            ) : null}
            <div
              className={`${SIDEBAR_ENTITY_TITLE_CLASS} min-w-0 break-words whitespace-normal`}
            >
              {title}
            </div>
          </div>
          {tags ? (
            <div className="mt-1 flex flex-wrap gap-1.5">{tags}</div>
          ) : null}
          {!isExpanded && summary ? (
            <div className="mt-1 pr-1 text-xs text-theme-text-secondary leading-relaxed line-clamp-2">
              {summary}
            </div>
          ) : null}
        </div>
      </div>
      {isExpanded && children ? (
        <div
          className={`overflow-hidden animate-sidebar-expand ${bodyClassName}`.trim()}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
};
