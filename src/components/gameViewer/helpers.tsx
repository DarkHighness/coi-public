/**
 * Shared helper components for GameStateViewer
 * These are UI primitives used across all tab components
 */

import React from "react";
import { MarkdownText } from "../render/MarkdownText";
import {
  SIDEBAR_BODY_TEXT_CLASS,
  SIDEBAR_PANEL_TITLE_CLASS,
  SIDEBAR_SECTION_TITLE_CLASS,
} from "../sidebar/sidebarTokens";

// ============================================================================
// Section - Always-expanded section block
// ============================================================================

interface SectionProps {
  id: string;
  title: string;
  icon: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

export const Section = ({ title, icon, children }: SectionProps) => {
  return (
    <div className="pb-1 mb-1">
      <div className="w-full py-2 pl-1 pr-1 sm:pr-0 bg-transparent flex items-center justify-between text-left">
        <span className="flex items-center gap-3">
          <span className="ui-emoji-slot">{icon}</span>
          <span className={SIDEBAR_PANEL_TITLE_CLASS}>{title}</span>
        </span>
      </div>
      <div className="animate-sidebar-expand pl-2 sm:pl-2.5 pr-1 sm:pr-1.5 pb-1 ml-1 mt-1 space-y-1.5">
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// HiddenContent - Display for revealed hidden/secret information
// ============================================================================

interface HiddenContentProps {
  content: React.ReactNode;
  label?: string;
  t: (key: string) => string;
}

export const HiddenContent = ({ content, label, t }: HiddenContentProps) => (
  <div className="pt-2 mt-2 border-t border-theme-primary/25 sidebar-hidden-divider">
    <div className="flex items-center gap-2">
      <div
        className={`${SIDEBAR_SECTION_TITLE_CLASS} normal-case tracking-[0.06em] text-theme-primary/90`}
      >
        {label || t("gameViewer.hiddenRevealed")}
      </div>
      <div className="flex-1 h-px bg-theme-primary/45" />
    </div>
    <div className="mt-2 pl-2 text-xs text-theme-text leading-relaxed space-y-1">
      {content}
    </div>
  </div>
);

// ============================================================================
// InfoRow - Key-value display row
// ============================================================================

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  hidden?: boolean;
}

export const InfoRow = ({ label, value, hidden = false }: InfoRowProps) => {
  const valueIsPrimitive =
    typeof value === "string" || typeof value === "number";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(72px,104px)_minmax(0,1fr)] lg:grid-cols-[minmax(80px,112px)_minmax(0,1fr)] gap-y-1 sm:gap-y-0 gap-x-1.5 sm:gap-x-2 py-2 border-b border-theme-divider/20 last:border-b-0">
      <div className="pt-0.5 text-[9px] sm:text-[10px] normal-case sm:uppercase tracking-[0.03em] sm:tracking-[0.09em] text-theme-text-secondary font-medium sm:font-semibold break-words">
        {label}
      </div>
      <div
        className={`${SIDEBAR_BODY_TEXT_CLASS} min-w-0 break-words leading-relaxed sm:pt-0.5 [&_.markdown-content_p]:mb-0 [&_.markdown-content_p]:leading-relaxed [&_.markdown-content_ul]:my-1 [&_.markdown-content_ol]:my-1 [&_ul]:my-1 [&_ol]:my-1 ${hidden ? "text-theme-primary" : "text-theme-text"}`}
      >
        {valueIsPrimitive ? <MarkdownText content={String(value)} /> : value}
      </div>
    </div>
  );
};

// ============================================================================
// EntityBlock - Flat entity container with sidebar-like separators
// ============================================================================

interface EntityBlockProps {
  children: React.ReactNode;
  className?: string;
}

export const EntityBlock = ({ children, className = "" }: EntityBlockProps) => (
  <div
    className={`py-2 pl-2.5 sm:pl-3 pr-1 sm:pr-1.5 border-l border-theme-divider/45 text-xs text-theme-text ${className}`.trim()}
  >
    {children}
  </div>
);

// ============================================================================
// SubsectionLabel - Subsection header styling
// ============================================================================

interface SubsectionLabelProps {
  children: React.ReactNode;
  variant?: "primary" | "unlocked" | "danger";
}

export const SubsectionLabel = ({
  children,
  variant = "primary",
}: SubsectionLabelProps) => {
  const colorMap = {
    primary: "text-theme-primary",
    unlocked: "text-theme-primary",
    danger: "text-theme-primary",
  };
  return (
    <div className="flex items-center gap-2 py-2 mt-1">
      <span
        className={`${SIDEBAR_SECTION_TITLE_CLASS} normal-case tracking-[0.06em] text-[11px] sm:text-xs ${colorMap[variant]}`.trim()}
      >
        {children}
      </span>
      <div className="flex-1 h-px bg-theme-divider/60" />
    </div>
  );
};

// ============================================================================
// ContentBlock - Content with left border accent
// ============================================================================

interface ContentBlockProps {
  children: React.ReactNode;
  className?: string;
}

export const ContentBlock = ({
  children,
  className = "",
}: ContentBlockProps) => (
  <div
    className={`py-2 pl-2 text-xs text-theme-text leading-relaxed border-b border-theme-divider/20 last:border-b-0 ${className}`.trim()}
  >
    {children}
  </div>
);

// ============================================================================
// EmptyState - Empty/no data message
// ============================================================================

interface EmptyStateProps {
  message: string;
}

export const EmptyState = ({ message }: EmptyStateProps) => (
  <div className="py-3 text-theme-text-secondary text-xs italic">{message}</div>
);
