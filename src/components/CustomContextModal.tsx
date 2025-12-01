import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface CustomContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  customContext: string;
  setCustomContext: (context: string) => void;
}

export const CustomContextModal: React.FC<CustomContextModalProps> = ({
  isOpen,
  onClose,
  customContext,
  setCustomContext,
}) => {
  const { t } = useTranslation();
  const [localContext, setLocalContext] = useState(customContext);

  if (!isOpen) return null;

  const handleSave = () => {
    setCustomContext(localContext);
    onClose();
  };

  const handleClear = () => {
    setLocalContext("");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-slide-in">
        {/* Header */}
        <div className="p-6 border-b border-theme-border flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-theme-primary uppercase tracking-wider">
              {t("customContext")}
            </h2>
            <p className="text-sm text-theme-muted mt-1">{t("customTips")}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-theme-muted hover:text-theme-text transition-colors rounded-full hover:bg-theme-surface-highlight"
          >
            <svg
              className="w-6 h-6"
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

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <textarea
            value={localContext}
            onChange={(e) => setLocalContext(e.target.value)}
            placeholder={t("customContextPlaceholder")}
            className="w-full h-64 bg-theme-surface-highlight/30 border border-theme-border rounded-lg p-4 text-theme-text focus:border-theme-primary outline-none resize-none placeholder-theme-muted"
            autoFocus
          />

          <div className="mt-4 p-4 bg-theme-bg/50 rounded-lg border border-theme-border/50">
            <p className="text-xs text-theme-muted leading-relaxed">
              <strong className="text-theme-primary">{t("tip")}:</strong>{" "}
              {t("customWritingTips")}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-theme-border flex gap-3">
          <button
            onClick={handleClear}
            className="px-4 py-2 border border-theme-border text-theme-muted hover:text-theme-text hover:border-theme-muted transition-all rounded-lg"
          >
            {t("clear")}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-theme-border text-theme-text hover:bg-theme-surface-highlight transition-all rounded-lg"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-theme-primary text-theme-bg font-bold hover:bg-theme-primary-hover transition-all rounded-lg shadow-lg"
          >
            {t("saveApply")}
          </button>
        </div>
      </div>
    </div>
  );
};
