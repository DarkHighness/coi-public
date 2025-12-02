import React, { useState, useEffect } from "react";
import {
  ToastProvider,
  useToast,
  ToastItemType as ToastItem,
} from "../contexts/ToastContext";

// Re-export context utilities for convenience
export { ToastProvider, useToast };
export type { ToastItemType as ToastItem } from "../contexts/ToastContext";

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
    <div className="fixed top-16 right-4 z-100 flex flex-col gap-2 max-w-[90vw] md:max-w-sm">
      {toasts.map((toast) => (
        <SingleToast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

/**
 * ConnectedToastContainer - Auto-connected to ToastContext
 * Use this component when you want automatic connection to the toast context
 * without manually passing toasts and onRemove props.
 */
export const ConnectedToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} onRemove={removeToast} />;
};
