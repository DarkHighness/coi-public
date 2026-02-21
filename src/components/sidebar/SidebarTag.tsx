import React from "react";
import { SIDEBAR_TAG_CLASS } from "./sidebarTokens";

interface SidebarTagProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const SidebarTag: React.FC<SidebarTagProps> = ({
  children,
  className = "",
  title,
}) => {
  return (
    <span className={`${SIDEBAR_TAG_CLASS} ${className}`.trim()} title={title}>
      {children}
    </span>
  );
};
