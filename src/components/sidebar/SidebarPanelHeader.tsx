import React from "react";
import { SidebarTag } from "./SidebarTag";
import {
  SIDEBAR_PANEL_HEADER_ICON_CLASS,
  SIDEBAR_PANEL_TITLE_CLASS,
} from "./sidebarTokens";

interface SidebarPanelHeaderProps {
  title: React.ReactNode;
  icon: React.ReactNode;
  count?: React.ReactNode;
  isOpen: boolean;
  onToggle?: () => void;
  actions?: React.ReactNode;
  themeFont?: string;
  className?: string;
  openMarginClassName?: string;
  closedMarginClassName?: string;
  showChevron?: boolean;
}

export const SidebarPanelHeader: React.FC<SidebarPanelHeaderProps> = ({
  title,
  icon,
  count,
  isOpen,
  onToggle,
  actions,
  themeFont = "",
  className = "",
  openMarginClassName = "mb-3",
  closedMarginClassName = "mb-0",
  showChevron = true,
}) => {
  return (
    <div
      onClick={onToggle}
      className={`flex items-center justify-between group ${onToggle ? "cursor-pointer" : ""} ${
        isOpen ? openMarginClassName : closedMarginClassName
      } ${className}`.trim()}
    >
      <div
        className={`${SIDEBAR_PANEL_TITLE_CLASS} ${themeFont} flex items-center gap-2 min-w-0`}
      >
        <span className={SIDEBAR_PANEL_HEADER_ICON_CLASS}>{icon}</span>
        <span className="truncate">{title}</span>
        {count !== undefined && count !== null ? (
          <SidebarTag className="text-theme-text-secondary border-theme-divider/70 text-[10px]">
            {count}
          </SidebarTag>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-1 shrink-0 min-w-[5.5rem]">
        {actions}
        {showChevron ? (
          <div className="h-8 w-8 grid place-items-center rounded text-theme-text-secondary group-hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors">
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${
                isOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </div>
        ) : null}
      </div>
    </div>
  );
};
