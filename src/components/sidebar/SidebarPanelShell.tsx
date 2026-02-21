import React from "react";
import { SidebarPanelType } from "../../types";

interface SidebarPanelShellProps {
  panel: SidebarPanelType;
  title: string;
  icon: React.ReactNode;
  count?: number;
  summaryLines: string[];
  active?: boolean;
  onViewDetails: () => void;
}

const SidebarPanelShellComponent: React.FC<SidebarPanelShellProps> = ({
  panel,
  title,
  icon,
  count,
  summaryLines,
  active = false,
  onViewDetails,
}) => {
  const nonEmptyLines = summaryLines.filter((line) => line.trim().length > 0);

  return (
    <article
      data-testid={`sidebar-summary-${panel}`}
      className={`border border-theme-divider/60 bg-theme-surface/10 px-3 py-2.5 transition-[opacity,transform,border-color] duration-200 ease-out ${
        active
          ? "opacity-100 translate-y-0 border-theme-primary/40"
          : "opacity-95 hover:opacity-100 hover:-translate-y-[1px] hover:border-theme-primary/25"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-theme-primary flex items-center gap-2">
            <span className="ui-emoji-slot">{icon}</span>
            <span className="truncate">{title}</span>
          </h3>
          {typeof count === "number" && (
            <p className="mt-1 text-[10px] text-theme-text-secondary font-mono">
              {count.toLocaleString()}
            </p>
          )}
        </div>

        <button
          type="button"
          className="shrink-0 h-8 px-2.5 text-[10px] uppercase tracking-[0.12em] border border-theme-divider/70 text-theme-text-secondary hover:text-theme-primary hover:border-theme-primary/40 transition-colors"
          onClick={onViewDetails}
          aria-label={`View details: ${title}`}
          title="View details"
        >
          View details
        </button>
      </div>

      {nonEmptyLines.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {nonEmptyLines.slice(0, 3).map((line, index) => (
            <li
              key={`${panel}-line-${index}`}
              className="text-xs leading-relaxed text-theme-text-secondary line-clamp-2"
            >
              {line}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
};

export const SidebarPanelShell = React.memo(SidebarPanelShellComponent);
