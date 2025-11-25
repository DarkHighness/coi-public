import React, { useState, useCallback, useRef, useEffect } from "react";

// Toast item type
export interface ToastItem {
  id: string;
  message: string;
  type: "info" | "error" | "success";
  duration?: number;
}

// Toast context for global access
interface ToastContextType {
  toasts: ToastItem[];
  pushToast: (message: string, type?: ToastItem["type"], duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// Single Toast Component
interface SingleToastProps {
  toast: ToastItem;
  onRemove: (id: string) => void;
}

const SingleToast: React.FC<SingleToastProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

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
    error: "bg-red-900/90 text-red-100 border-red-700",
    success: "bg-green-900/90 text-green-100 border-green-700",
    info: "bg-theme-surface-highlight text-theme-primary border-theme-primary",
  }[toast.type];

  const icon = {
    error: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M5 13l4 4L19 7" />
      </svg>
    ),
    info: null,
  }[toast.type];

  return (
    <div
      className={`px-5 py-2.5 rounded-full shadow-lg transition-all duration-300 border ${bgColor} ${
        isVisible && !isExiting
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-4"
      }`}
    >
      <span className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
        {icon}
        {toast.message}
      </span>
    </div>
  );
};

// Toast Container Component
// Note: Positioned below the legacy Toast which uses top-24
interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-36 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <SingleToast
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

// Hook for managing toasts
export const useToastManager = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((
    message: string,
    type: ToastItem["type"] = "info",
    duration: number = 3000
  ) => {
    const id = `toast-${++toastIdRef.current}-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Helper to push multiple toasts for state changes
  const pushStateChangeToasts = useCallback((changes: {
    itemsAdded?: number;
    itemsRemoved?: number;
    npcsAdded?: number;
    npcsRemoved?: number;
    questsAdded?: number;
    questsCompleted?: number;
    locationsDiscovered?: number;
    skillsGained?: number;
    conditionsChanged?: number;
  }, t: (key: string) => string) => {
    const toastMessages: Array<{ msg: string; type: ToastItem["type"] }> = [];

    if (changes.itemsAdded && changes.itemsAdded > 0) {
      toastMessages.push({
        msg: changes.itemsAdded === 1 ? t("toast.itemAdded") : `${changes.itemsAdded} ${t("toast.itemsAdded")}`,
        type: "success"
      });
    }
    if (changes.itemsRemoved && changes.itemsRemoved > 0) {
      toastMessages.push({
        msg: changes.itemsRemoved === 1 ? t("toast.itemRemoved") : `${changes.itemsRemoved} ${t("toast.itemsRemoved")}`,
        type: "info"
      });
    }
    if (changes.npcsAdded && changes.npcsAdded > 0) {
      toastMessages.push({
        msg: changes.npcsAdded === 1 ? t("toast.charMet") : `${changes.npcsAdded} ${t("toast.charsMet")}`,
        type: "success"
      });
    }
    if (changes.questsAdded && changes.questsAdded > 0) {
      toastMessages.push({
        msg: changes.questsAdded === 1 ? t("toast.questAdded") : `${changes.questsAdded} ${t("toast.questsAdded")}`,
        type: "success"
      });
    }
    if (changes.questsCompleted && changes.questsCompleted > 0) {
      toastMessages.push({
        msg: t("toast.questCompleted"),
        type: "success"
      });
    }
    if (changes.locationsDiscovered && changes.locationsDiscovered > 0) {
      toastMessages.push({
        msg: changes.locationsDiscovered === 1 ? t("toast.locationDiscovered") : `${changes.locationsDiscovered} ${t("toast.locationsDiscovered")}`,
        type: "success"
      });
    }
    if (changes.skillsGained && changes.skillsGained > 0) {
      toastMessages.push({
        msg: t("toast.skillGained"),
        type: "success"
      });
    }
    if (changes.conditionsChanged && changes.conditionsChanged > 0) {
      toastMessages.push({
        msg: t("toast.conditionChanged"),
        type: "info"
      });
    }

    // Stagger toast display for better UX
    toastMessages.forEach((item, idx) => {
      setTimeout(() => {
        pushToast(item.msg, item.type);
      }, idx * 200);
    });
  }, [pushToast]);

  return {
    toasts,
    pushToast,
    removeToast,
    clearToasts,
    pushStateChangeToasts,
  };
};

// Legacy single Toast component for backwards compatibility
interface ToastProps {
  show: boolean;
  message: string;
  type?: "info" | "error";
}

export const Toast: React.FC<ToastProps> = ({
  show,
  message,
  type = "info",
}) => {
  return (
    <div
      className={`fixed top-24 right-4 px-6 py-3 rounded-full shadow-lg transition-all duration-300 z-[100] ${
        show
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-4 pointer-events-none"
      } ${
        type === "error"
          ? "bg-red-900/90 text-red-100 border border-red-700"
          : "bg-theme-surface-highlight text-theme-primary border border-theme-primary"
      }`}
    >
      <span className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
        {type === "error" && (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        )}
        {message}
      </span>
    </div>
  );
};
