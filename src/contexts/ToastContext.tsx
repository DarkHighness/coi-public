import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { StateChanges } from "../types";
import { useIsMobile } from "../hooks/useMediaQuery";

// Toast item type
export interface ToastItem {
  id: string;
  message: string;
  type: "info" | "error" | "success" | "warning";
  duration?: number;
  // For grouped toasts on mobile
  items?: string[];
}

// Toast context type
interface ToastContextType {
  toasts: ToastItem[];
  showToast: (
    message: string,
    type?: ToastItem["type"],
    duration?: number,
    items?: string[],
  ) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  pushStateChangeToasts: (
    changes: StateChanges,
    t: (key: string) => string,
  ) => void;
}

// Create context with default values
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Provider component
interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);
  const isMobile = useIsMobile();

  const showToast = useCallback(
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
      const mobile = isMobile;

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
      if (changes.entitiesUnlocked && changes.entitiesUnlocked.length > 0) {
        allChanges.push({
          msg: t("toast.secretUnlocked"),
          type: "success",
          items: changes.entitiesUnlocked.map((i) => `${i.name}: ${i.reason}`),
        });
      }

      if (changes.systemToasts && changes.systemToasts.length > 0) {
        changes.systemToasts.forEach((st) => {
            allChanges.push({
                msg: st.message,
                type: st.type,
                items: [],
            });
        });
      }

      if (allChanges.length === 0) return;

      if (mobile && allChanges.length > 1) {
        // On mobile with multiple changes: show single grouped toast
        const allItems = allChanges.flatMap((c) =>
          c.items.map((item) => `${c.msg}: ${item}`),
        );
        showToast(
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
              showToast(`${change.msg}: ${change.items[0]}`, change.type, 3000);
            } else {
              // Multiple items: expandable toast
              showToast(change.msg, change.type, 4000, change.items);
            }
          }, idx * 200);
        });
      }
    },
    [showToast],
  );

  const value: ToastContextType = {
    toasts,
    showToast,
    removeToast,
    clearToasts,
    pushStateChangeToasts,
  };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

// Custom hook to use toast context
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// Re-export ToastItem type for convenience
export type { ToastItem as ToastItemType };
