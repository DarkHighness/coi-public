import React from "react";
import {
  SIDEBAR_BODY_TEXT_CLASS,
  SIDEBAR_LABEL_CLASS,
  SIDEBAR_SECTION_TITLE_CLASS,
} from "./sidebarTokens";

interface SidebarSectionProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  withDivider?: boolean;
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  children,
  className = "",
  withDivider = true,
}) => {
  return (
    <section
      className={`${withDivider ? "pt-3 mt-3" : "pt-2"} ${className}`.trim()}
    >
      <div className="flex items-center gap-2">
        <div className={SIDEBAR_SECTION_TITLE_CLASS}>{title}</div>
        <div className="sidebar-section-title-line" />
      </div>
      <div className="mt-2.5 space-y-2">{children}</div>
    </section>
  );
};

interface SidebarFieldProps {
  label: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const SidebarField: React.FC<SidebarFieldProps> = ({
  label,
  children,
  className = "",
}) => {
  return (
    <div className={`space-y-1 ${className}`.trim()}>
      <div className={SIDEBAR_LABEL_CLASS}>{label}</div>
      <div className={SIDEBAR_BODY_TEXT_CLASS}>{children}</div>
    </div>
  );
};
