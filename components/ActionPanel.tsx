import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { GameState, StorySegment } from "../types";

interface ActionPanelProps {
  gameState: GameState;
  currentHistory: StorySegment[];
  isTranslating: boolean;
  onAction: (action: string) => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  gameState,
  currentHistory,
  isTranslating,
  onAction,
}) => {
  const [customInput, setCustomInput] = useState("");
  const [isChoicesExpanded, setIsChoicesExpanded] = useState(false);
  const { t } = useTranslation();

  const lastSegment = currentHistory
    .filter((s) => s.role === "model")
    .slice(-1)[0];
  const availableChoices = lastSegment?.choices || [];
  const isDisabled = gameState.isProcessing || isTranslating;

  // Helper to handle potential malformed choice objects (fixing React Error #31)
  const getChoiceLabel = (choice: any): string => {
    if (typeof choice === "string") return choice;
    if (typeof choice === "object" && choice !== null) {
      // Handle cases where AI returns { choice: "...", effect: "..." }
      return (
        choice.choice || choice.text || choice.label || JSON.stringify(choice)
      );
    }
    return String(choice);
  };

  // Keyboard shortcuts for choices (1-4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDisabled) return;
      // Only trigger if not typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      )
        return;

      const key = parseInt(e.key);
      if (!isNaN(key) && key >= 1 && key <= (availableChoices?.length || 0)) {
        onAction(getChoiceLabel(availableChoices[key - 1]));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [availableChoices, isDisabled, onAction]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onAction(customInput);
      setCustomInput("");
    }
  };

  const calculateRoll = () => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    let outcome = t("fail");

    if (d20 === 1) outcome = t("critFail");
    else if (d20 < 10) outcome = t("fail");
    else if (d20 < 20) outcome = t("success");
    else outcome = t("critSuccess");
    return { d20, outcome };
  };

  const handleRollClick = (e: React.MouseEvent, actionText: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!actionText.trim()) return;

    const { d20, outcome } = calculateRoll();
    const actionWithRoll = `${actionText} [${t("rollResult")}: ${d20} - ${outcome}]`;
    onAction(actionWithRoll);
    if (actionText === customInput) setCustomInput("");
  };

  return (
    <div className="flex-none w-full z-30">
      {/* Gradient fade to blend with content */}
      <div className="h-8 bg-gradient-to-t from-theme-bg to-transparent pointer-events-none"></div>

      <div className="bg-theme-bg p-4 pb-6 md:px-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Action Chips (Choices) */}
          {!gameState.isProcessing &&
            !isTranslating &&
            availableChoices.length > 0 && (
              <div className="animate-fade-in-up">
                {/* Mobile Toggle */}
                <div className="md:hidden flex justify-center mb-2">
                  <button
                    onClick={() => setIsChoicesExpanded(!isChoicesExpanded)}
                    className="flex items-center gap-2 px-4 py-1.5 bg-theme-surface border border-theme-primary/50 rounded-full text-xs font-bold text-theme-primary uppercase tracking-widest hover:bg-theme-primary hover:text-theme-bg transition-colors shadow-sm"
                  >
                    {isChoicesExpanded ? (
                      <>
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          ></path>
                        </svg>
                        {t("hideChoices")}
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 15l7-7 7 7"
                          ></path>
                        </svg>
                        {t("showChoices")} ({availableChoices.length})
                      </>
                    )}
                  </button>
                </div>

                {/* Choices List */}
                <div
                  className={`flex flex-wrap gap-2 justify-center transition-all duration-300 overflow-hidden pt-2 ${isChoicesExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 md:max-h-none md:opacity-100"}`}
                >
                  {availableChoices.map((rawChoice, idx) => {
                    const label = getChoiceLabel(rawChoice);
                    return (
                      <div
                        key={idx}
                        className="group relative inline-flex rounded-full shadow-sm hover:shadow-[0_0_15px_rgba(var(--theme-primary),0.4)] transition-all duration-300"
                      >
                        <button
                          onClick={() => onAction(label)}
                          className="px-4 py-2 bg-theme-surface-highlight/80 hover:bg-theme-primary text-theme-text hover:text-theme-bg border border-theme-border hover:border-theme-primary rounded-l-full border-r-0 text-sm transition-all duration-300"
                        >
                          <span className="absolute -top-2 -left-2 w-5 h-5 bg-theme-bg border border-theme-muted/30 text-[10px] text-theme-muted rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {idx + 1}
                          </span>
                          {label}
                        </button>
                        <button
                          onClick={(e) => handleRollClick(e, label)}
                          className="px-2 py-2 bg-theme-surface-highlight/80 hover:bg-theme-primary text-theme-muted hover:text-theme-bg border border-theme-border hover:border-theme-primary rounded-r-full border-l border-l-theme-border/30 text-sm transition-all duration-300 flex items-center justify-center z-0"
                          title={t("roll")}
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
                              strokeWidth="1.5"
                              d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
                            ></path>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Input Bar */}
          <div className="relative">
            <form
              onSubmit={handleCustomSubmit}
              className="relative flex items-end gap-2 bg-theme-surface border border-theme-border rounded-xl shadow-lg p-2 transition-colors focus-within:border-theme-primary/50 focus-within:ring-1 focus-within:ring-theme-primary/50"
            >
              {/* Roll Button (Integrated) */}
              <button
                type="button"
                onClick={(e) => handleRollClick(e, customInput)}
                disabled={isDisabled || !customInput.trim()}
                className="p-2 mb-0.5 text-theme-muted hover:text-theme-primary hover:bg-theme-surface-highlight rounded-lg transition-colors disabled:opacity-30 flex-none"
                title={t("roll")}
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
                    strokeWidth="1.5"
                    d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
                  ></path>
                </svg>
              </button>

              {/* Main Input */}
              <textarea
                value={customInput}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleCustomSubmit(e);
                  }
                }}
                placeholder={t("placeholder")}
                disabled={isDisabled}
                rows={1}
                className="flex-1 bg-transparent text-theme-text px-2 py-3 focus:outline-none placeholder-theme-muted/50 resize-none min-h-[44px] max-h-[120px] self-center"
                style={{ height: "auto" }}
              />

              {/* Send/Act Button */}
              <button
                type="submit"
                disabled={isDisabled || !customInput.trim()}
                className="p-2 mb-0.5 bg-theme-primary hover:bg-theme-primary-hover text-theme-bg rounded-lg font-bold transition-all disabled:bg-theme-surface-highlight disabled:text-theme-muted shadow-md flex-none"
              >
                <svg
                  className="w-5 h-5 transform rotate-90"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  ></path>
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
