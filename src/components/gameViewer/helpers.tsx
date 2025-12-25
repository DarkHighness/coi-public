/**
 * Shared helper components for GameStateViewer
 * These are UI primitives used across all tab components
 */

import React from "react";
import { MarkdownText } from "../render/MarkdownText";

// ============================================================================
// Section - Collapsible section with toggle
// ============================================================================

interface SectionProps {
  id: string;
  title: string;
  icon: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

export const Section = ({
  id,
  title,
  icon,
  children,
  isExpanded,
  onToggle,
}: SectionProps) => {
  return (
    <div className="border border-theme-border rounded-lg overflow-hidden mb-4 bg-theme-bg/30">
      <button
        onClick={() => onToggle(id)}
        className="w-full px-4 py-3 bg-theme-bg/50 flex items-center justify-between hover:bg-theme-surface/50 transition-colors"
      >
        <span className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="font-bold text-theme-primary uppercase tracking-wider text-sm">
            {title}
          </span>
        </span>
        <svg
          className={`w-5 h-5 text-theme-muted transition-transform duration-300 ${
            isExpanded ? "rotate-180" : ""
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
          />
        </svg>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 border-t border-theme-border bg-theme-surface/30">
            {children}
          </div>
        </div>
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
  <div className="mt-3 p-3 bg-theme-surface/50 border border-theme-unlocked/30 rounded">
    <span className="text-theme-unlocked text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      {label || t("gameViewer.hiddenRevealed")}
    </span>
    <div className="text-theme-text/90 text-sm leading-relaxed">{content}</div>
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
  let valueStr: string;
  if (typeof value === "string") {
    valueStr = value;
  } else if (typeof value === "number") {
    valueStr = value.toString();
  } else {
    valueStr = JSON.stringify(value);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2 border-b border-theme-border/30 last:border-0">
      <span className="text-theme-primary text-xs uppercase tracking-wider font-bold min-w-[120px] shrink-0 pt-0.5">
        {label}:
      </span>
      <div
        className={`text-sm flex-1 ${
          hidden ? "text-theme-unlocked" : "text-theme-text"
        }`}
      >
        <MarkdownText content={valueStr} />
      </div>
    </div>
  );
};

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
    primary: "text-theme-primary/80",
    unlocked: "text-theme-unlocked/80",
    danger: "text-theme-danger/80",
  };
  return (
    <span
      className={`text-xs uppercase tracking-wider font-bold block mb-1 ${colorMap[variant]}`}
    >
      {children}
    </span>
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
    className={`text-theme-text/90 text-sm pl-2 border-l-2 border-theme-border/50 ${className}`}
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
  <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border/50 rounded text-center">
    {message}
  </p>
);
