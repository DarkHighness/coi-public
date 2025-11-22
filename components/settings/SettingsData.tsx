import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { formatBytes } from "../../utils/formatters";
import { SettingsDataProps } from "./types";

export const SettingsData: React.FC<SettingsDataProps> = ({
  saveCount = 0,
  onResetSettings,
  onClearAllSaves,
  showToast,
}) => {
  const { t } = useTranslation();
  const [storageEstimate, setStorageEstimate] = useState<{
    usage: number;
    quota: number;
  } | null>(null);

  useEffect(() => {
    fetchStorageEstimate();
  }, []);

  const fetchStorageEstimate = async () => {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage !== undefined && estimate.quota !== undefined) {
          setStorageEstimate({
            usage: estimate.usage,
            quota: estimate.quota,
          });
        }
      } catch (error) {
        console.error("Failed to fetch storage estimate:", error);
      }
    }
  };

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Storage Statistics */}
      <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">
            {t("data.storageInfo")}
          </h3>
          <button
            onClick={fetchStorageEstimate}
            className="text-xs text-theme-primary hover:text-theme-primary-hover underline"
          >
            {t("refresh")}
          </button>
        </div>

        <div className="space-y-3 text-sm">
          {/* Save Count */}
          <div className="flex justify-between items-center">
            <span className="text-theme-muted">{t("data.saveCount")}:</span>
            <span className="text-theme-text font-mono">{saveCount}</span>
          </div>

          {/* Storage Usage */}
          {storageEstimate && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-theme-muted">
                  {t("data.storageUsed")}:
                </span>
                <span className="text-theme-text font-mono">
                  {formatBytes(storageEstimate.usage)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-theme-muted">
                  {t("data.storageQuota")}:
                </span>
                <span className="text-theme-text font-mono">
                  {formatBytes(storageEstimate.quota)}
                </span>
              </div>

              {/* Storage Bar */}
              <div className="mt-2">
                <div className="flex justify-between text-xs text-theme-muted mb-1">
                  <span>{t("data.storageUsage")}</span>
                  <span>
                    {(
                      (storageEstimate.usage / storageEstimate.quota) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="w-full h-2 bg-theme-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-theme-primary transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        (storageEstimate.usage / storageEstimate.quota) * 100,
                        100,
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </>
          )}

          {!storageEstimate && (
            <p className="text-xs text-theme-muted italic">
              {t("data.storageUnavailable")}
            </p>
          )}
        </div>
      </div>

      {/* Reset Settings */}
      <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
        <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest mb-2">
          {t("data.resetSettings")}
        </h3>
        <p className="text-xs text-theme-muted mb-4">
          {t("data.resetSettingsDesc")}
        </p>
        <button
          onClick={() => {
            if (window.confirm(t("data.confirmReset"))) {
              onResetSettings?.();
              showToast(t("data.resetSuccess"), "info");
            }
          }}
          className="w-full px-4 py-3 bg-red-900/20 border border-red-700 text-red-400 rounded hover:bg-red-900/30 transition-colors font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2"
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            ></path>
          </svg>
          {t("data.resetSettings")}
        </button>
      </div>

      <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
        <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest mb-2">
          {t("data.clearSaves")}
        </h3>
        <p className="text-xs text-theme-muted mb-4">
          {t("data.clearSavesDesc")}
        </p>
        <button
          onClick={async () => {
            if (window.confirm(t("data.confirmClear"))) {
              const success = await onClearAllSaves?.();
              if (success) {
                showToast(t("data.clearSuccess"), "info");
                // Suggest page refresh
                if (window.confirm(t("data.refreshPrompt"))) {
                  window.location.reload();
                }
              } else {
                showToast(
                  t("data.clearError") || "Failed to clear saves",
                  "error",
                );
              }
            }
          }}
          className="w-full px-4 py-3 bg-red-900/20 border border-red-700 text-red-400 rounded hover:bg-red-900/30 transition-colors font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            ></path>
          </svg>
          {t("data.clearSaves")}
        </button>
      </div>
    </div>
  );
};
