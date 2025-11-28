import React, { useState, useCallback, useRef, useEffect } from "react";
import { StateChanges } from "../types";

// Toast item type
export interface ToastItem {
  id: string;
  message: string;
  type: "info" | "error" | "success";
  duration?: number;
  // For grouped toasts on mobile
  items?: string[];
}

// Toast context for global access
interface ToastContextType {
  toasts: ToastItem[];
  pushToast: (
    message: string,
    type?: ToastItem["type"],
    duration?: number,
  ) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// Check if we're on mobile
const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

// Single Toast Component
interface SingleToastProps {
  toast: ToastItem;
  onRemove: (id: string) => void;
}

const SingleToast: React.FC<SingleToastProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-remove after duration
    const duration = toast.duration || 3000;
    const hideTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, duration);

    return () => clearTimeout(hideTimer);
  }, [toast.id, toast.duration, onRemove]);

  const bgColor = {
    error: "bg-theme-error/20 text-theme-error border-theme-error",
    success: "bg-theme-success/20 text-theme-success border-theme-success",
    info: "bg-theme-surface-highlight text-theme-primary border-theme-primary",
  }[toast.type];

  const icon = {
    error: (
      <svg
        className="w-4 h-4 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    success: (
      <svg
        className="w-4 h-4 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
    info: null,
  }[toast.type];

  const hasItems = toast.items && toast.items.length > 0;

  return (
    <div
      className={`shadow-lg transition-all duration-300 border ${bgColor} ${
        isVisible && !isExiting
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-4"
      } ${hasItems ? "rounded-lg" : "rounded-full px-5 py-2.5"}`}
    >
      {hasItems ? (
        // Expandable toast with items
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-2.5 flex items-center justify-between gap-2"
          >
            <span className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              {icon}
              {toast.message}
              <span className="text-xs opacity-70 normal-case">
                ({toast.items!.length})
              </span>
            </span>
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
          {isExpanded && (
            <div className="px-4 pb-3 pt-1 border-t border-current/20">
              <ul className="space-y-1">
                {toast.items!.map((item, idx) => (
                  <li
                    key={idx}
                    className="text-xs opacity-90 flex items-center gap-1"
                  >
                    <span className="text-current/50">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        // Simple toast
        <span className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
          {icon}
          {toast.message}
        </span>
      )}
    </div>
  );
};

// Toast Container Component
interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
}) => {
  return (
    <div className="fixed top-36 right-4 z-100 flex flex-col gap-2 max-w-[90vw] md:max-w-sm">
      {toasts.map((toast) => (
        <SingleToast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

// Hook for managing toasts
export const useToastManager = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback(
    (
      message: string,
      type: ToastItem["type"] = "info",
      duration: number = 3000,
      items?: string[],
    ) => {
      const id = `toast-${++toastIdRef.current}-${Date.now()}`;
      setToasts((prev) => [...prev, { id, message, type, duration, items }]);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Helper to push state change toasts with detailed items
  const pushStateChangeToasts = useCallback(
    (changes: StateChanges, t: (key: string) => string) => {
      const mobile = isMobile();

      // Collect all changes for potential grouping on mobile
      const allChanges: Array<{
        msg: string;
        type: ToastItem["type"];
        items: string[];
      }> = [];

      if (changes.itemsAdded && changes.itemsAdded.length > 0) {
        allChanges.push({
          msg: t("toast.itemAdded"),
          type: "success",
          items: changes.itemsAdded.map((i) => i.name),
        });
      }
      if (changes.itemsRemoved && changes.itemsRemoved.length > 0) {
        allChanges.push({
          msg: t("toast.itemRemoved"),
          type: "info",
          items: changes.itemsRemoved.map((i) => i.name),
        });
      }
      if (changes.npcsAdded && changes.npcsAdded.length > 0) {
        allChanges.push({
          msg: t("toast.charMet"),
          type: "success",
          items: changes.npcsAdded.map((i) => i.name),
        });
      }
      if (changes.questsAdded && changes.questsAdded.length > 0) {
        allChanges.push({
          msg: t("toast.questAdded"),
          type: "success",
          items: changes.questsAdded.map((i) => i.name),
        });
      }
      if (changes.questsCompleted && changes.questsCompleted.length > 0) {
        allChanges.push({
          msg: t("toast.questCompleted"),
          type: "success",
          items: changes.questsCompleted.map((i) => i.name),
        });
      }
      if (
        changes.locationsDiscovered &&
        changes.locationsDiscovered.length > 0
      ) {
        allChanges.push({
          msg: t("toast.locationDiscovered"),
          type: "success",
          items: changes.locationsDiscovered.map((i) => i.name),
        });
      }
      if (changes.skillsGained && changes.skillsGained.length > 0) {
        allChanges.push({
          msg: t("toast.skillGained"),
          type: "success",
          items: changes.skillsGained.map((i) => i.name),
        });
      }
      if (changes.conditionsChanged && changes.conditionsChanged.length > 0) {
        allChanges.push({
          msg: t("toast.conditionChanged"),
          type: "info",
          items: changes.conditionsChanged.map((i) => i.name),
        });
      }

      if (allChanges.length === 0) return;

      if (mobile && allChanges.length > 1) {
        // On mobile with multiple changes: show single grouped toast
        const totalItems = allChanges.reduce(
          (sum, c) => sum + c.items.length,
          0,
        );
        const allItems = allChanges.flatMap((c) =>
          c.items.map((item) => `${c.msg}: ${item}`),
        );
        pushToast(
          t("toast.stateUpdated") || "State Updated",
          "success",
          5000,
          allItems,
        );
      } else {
        // Desktop or single change: show individual toasts with item details
        allChanges.forEach((change, idx) => {
          setTimeout(() => {
            if (change.items.length === 1) {
              // Single item: show name directly in message
              pushToast(`${change.msg}: ${change.items[0]}`, change.type, 3000);
            } else {
              // Multiple items: expandable toast
              pushToast(change.msg, change.type, 4000, change.items);
            }
          }, idx * 200);
        });
      }
    },
    [pushToast],
  );

  return {
    toasts,
    pushToast,
    removeToast,
    clearToasts,
    pushStateChangeToasts,
  };
};