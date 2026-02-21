import React from "react";
import { SidebarPanelType } from "../../types";

interface SidebarDetailLayerProps {
  panel: SidebarPanelType | null;
  title: string;
  isOpen: boolean;
  mobile?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

const SCROLL_LOAD_THRESHOLD_PX = 120;
const SCROLL_LOAD_THROTTLE_MS = 120;

const SidebarDetailLayerComponent: React.FC<SidebarDetailLayerProps> = ({
  panel,
  title,
  isOpen,
  mobile = false,
  hasMore = false,
  onLoadMore,
  onClose,
  children,
}) => {
  const lastScrollLoadRef = React.useRef(0);

  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore || !onLoadMore) {
        return;
      }

      const now = Date.now();
      if (now - lastScrollLoadRef.current < SCROLL_LOAD_THROTTLE_MS) {
        return;
      }

      const target = event.currentTarget;
      const distanceToBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight;
      if (distanceToBottom > SCROLL_LOAD_THRESHOLD_PX) {
        return;
      }

      lastScrollLoadRef.current = now;
      onLoadMore();
    },
    [hasMore, onLoadMore],
  );

  return (
    <div
      className={`absolute inset-0 z-30 transition-opacity duration-200 ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!isOpen}
    >
      <div
        className="absolute inset-0 bg-theme-bg/55 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside
        className={`absolute border-theme-divider/70 bg-theme-bg shadow-xl transition-[transform,opacity] duration-200 ease-out ${
          mobile
            ? `left-0 right-0 bottom-0 max-h-[92%] border-t ${
                isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`
            : `top-0 bottom-0 right-0 w-full max-w-[34rem] border-l ${
                isOpen ? "translate-x-0 opacity-100" : "translate-x-5 opacity-0"
              }`
        }`}
      >
        <header className="px-4 py-3 border-b border-theme-divider/60 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-theme-text-secondary">
              Detail
            </p>
            <h2 className="text-sm text-theme-primary truncate" title={title}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="h-8 w-8 grid place-items-center text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors"
            onClick={onClose}
            title="Close detail"
            aria-label="Close detail"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </header>

        <div
          data-testid="sidebar-detail-scroll"
          className={`h-full overflow-y-auto custom-scrollbar px-4 py-4 ${
            mobile ? "pb-[calc(1.25rem+env(safe-area-inset-bottom))]" : "pb-6"
          }`}
          onScroll={handleScroll}
        >
          {panel ? children : null}
        </div>
      </aside>
    </div>
  );
};

export const SidebarDetailLayer = React.memo(SidebarDetailLayerComponent);
