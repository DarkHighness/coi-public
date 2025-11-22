import React from "react";
import { SaveSlot, LanguageCode } from "../types";
import { THEMES, ENV_THEMES } from "../utils/constants";
import { useTranslation } from "react-i18next";

interface SaveManagerProps {
  slots: SaveSlot[];
  currentSlotId: string | null;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const SaveManager: React.FC<SaveManagerProps> = ({
  slots,
  currentSlotId,
  onSwitch,
  onDelete,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-theme-border flex justify-between items-center bg-theme-surface-highlight/50">
          <h2 className="text-xl font-bold text-theme-primary">
            {t("saves.title")}
          </h2>
          <button onClick={onClose}>
            <svg
              className="w-6 h-6 text-theme-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {slots.length === 0 && (
            <div className="text-center text-theme-muted py-8 italic">
              {t("saves.empty")}
            </div>
          )}

          {slots.map((slot) => {
            const themeConfig = THEMES[slot.theme];
            const envTheme = themeConfig?.defaultEnvTheme;
            const themeColor =
              (envTheme && ENV_THEMES[envTheme]?.vars["--theme-primary"]) ||
              "#ccc";
            const isCurrent = currentSlotId === slot.id;

            return (
              <div
                key={slot.id}
                className={`p-3 rounded border flex justify-between items-center group ${isCurrent ? "border-theme-primary bg-theme-primary/10" : "border-theme-border bg-theme-bg hover:border-theme-muted"}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div
                    className="w-2 h-12 rounded-full shrink-0"
                    style={{ backgroundColor: themeColor }}
                  ></div>
                  <div>
                    <h4 className="font-bold text-theme-text text-sm">
                      {t(`themes.${slot.theme}.name`)} : {slot.name}
                    </h4>
                    <p className="text-xs text-theme-muted truncate w-40">
                      {slot.summary}
                    </p>
                    <span className="text-[10px] text-theme-muted opacity-50">
                      {new Date(slot.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!isCurrent && (
                    <button
                      onClick={() => {
                        onSwitch(slot.id);
                        onClose();
                      }}
                      className="px-3 py-1 bg-theme-surface-highlight hover:bg-theme-primary hover:text-theme-bg text-xs rounded border border-theme-border transition-colors"
                    >
                      {t("saves.load")}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm("Delete?")) onDelete(slot.id);
                    }}
                    className="p-1 text-theme-muted hover:text-red-500"
                  >
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
