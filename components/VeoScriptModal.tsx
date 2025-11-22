import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { generateVeoScript } from "../services/aiService";
import { GameState, StorySegment } from "../types";

interface VeoScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  currentHistory: StorySegment[];
  themeFont?: string;
  onScriptGenerated?: (script: string) => void; // Callback to save script to gameState
}

export const VeoScriptModal: React.FC<VeoScriptModalProps> = ({
  isOpen,
  onClose,
  gameState,
  currentHistory,
  themeFont = "font-fantasy",
  onScriptGenerated,
}) => {
  const [script, setScript] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      // Load cached script if available
      if (gameState.veoScript) {
        setScript(gameState.veoScript);
      } else if (!script) {
        // Only generate if no cached script and no current script
        generate();
      }
    }
  }, [isOpen, gameState.veoScript]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateVeoScript(
        gameState,
        currentHistory,
        i18n.language,
      );
      setScript(result);
      // Save to gameState via callback
      if (onScriptGenerated) {
        onScriptGenerated(result);
      }
    } catch (e) {
      console.error("Failed to generate script", e);
      setError("Failed to generate script. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(script);
    // Could add a toast here if we had access to the toaster
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-sm max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="p-6 border-b border-theme-border flex justify-between items-center bg-theme-surface-highlight/50">
          <h2 className={`text-2xl text-theme-primary ${themeFont}`}>
            {t("veoScriptModal.title")}
          </h2>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-text transition-colors"
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
        <div className="flex-1 p-6 overflow-y-auto bg-theme-bg/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-12 h-12 border-4 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-theme-primary animate-pulse">
                {t("veoScriptModal.loading")}
              </p>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 p-8 border border-red-900/30 bg-red-900/10 rounded">
              <p>{error}</p>
              <button
                onClick={generate}
                className="mt-4 px-4 py-2 bg-theme-surface border border-theme-border hover:border-theme-primary text-theme-text rounded transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none whitespace-pre-wrap font-mono text-sm text-theme-text/90">
              {script}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-theme-border bg-theme-surface flex justify-end gap-3">
          <button
            onClick={generate}
            disabled={loading}
            className="px-4 py-2 bg-theme-surface border border-theme-border hover:border-theme-primary text-theme-text rounded transition-colors disabled:opacity-50"
          >
            {t("veoScriptModal.regenerate")}
          </button>
          <button
            onClick={copyToClipboard}
            disabled={loading || !script}
            className="px-4 py-2 bg-theme-primary text-theme-bg font-bold rounded hover:bg-theme-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
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
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              ></path>
            </svg>
            {t("veoScriptModal.copy")}
          </button>
        </div>
      </div>
    </div>
  );
};
