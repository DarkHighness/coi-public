import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { GameState, StorySegment } from "../types";
import {
  parseCommand,
  executeCommandAction,
  CommandResult,
  CommandContext,
  CommandAction,
} from "../utils/commands";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useGameEngineContext } from "../contexts/GameEngineContext";

interface ActionPanelProps {
  onAction: (action: string) => void;
  onShowToast?: (message: string, type: "success" | "error" | "info") => void;
  onOpenStateEditor?: () => void;
  onOpenRAG?: () => void;
  onOpenViewer?: () => void;
  onOpenRules?: () => void;
  onTriggerSave?: () => void;
  onRetry?: () => void;
  onRebuildContext?: () => void;
  onCleanupEntities?: () => void;
  onForceUpdate?: (prompt: string) => void;
  onJumpToSegment?: (segmentId: string) => void;
}

const SUPPORTED_COMMANDS = [
  { cmd: "/god", desc: "Toggle God Mode" },
  { cmd: "/unlock", desc: "Unlock All Info" },
  { cmd: "/edit", desc: "Edit State" },
  { cmd: "/rag", desc: "RAG Debugger" },
  { cmd: "/view", desc: "View State" },
  { cmd: "/rules", desc: "Custom Rules" },
  { cmd: "/sudo", desc: "Force Update" },
];

export const ActionPanel: React.FC<ActionPanelProps> = ({
  onAction,
  onShowToast,
  onOpenStateEditor,
  onOpenRAG,
  onOpenViewer,
  onOpenRules,
  onTriggerSave,
  onRetry,
  onRebuildContext,
  onCleanupEntities,
  onForceUpdate,
  onJumpToSegment,
}) => {
  const { state, actions } = useGameEngineContext();
  const { gameState, currentHistory, isTranslating } = state;
  const { setGameState } = actions;
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const [jumpInputValue, setJumpInputValue] = useState("");
  const [customInput, setCustomInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isChoicesExpanded, setIsChoicesExpanded] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<{
    message: string;
    action: CommandAction;
  } | null>(null);
  const { t } = useTranslation();

  const lastSegment = currentHistory
    .filter((s) => s.role === "model" || s.role === "system")
    .slice(-1)[0];
  const availableChoices = lastSegment?.choices || [];
  const isDisabled = gameState.isProcessing || isTranslating;

  // Command context for command parsing
  const commandContext: CommandContext = {
    gameState,
    setGameState,
    t,
  };

  // Helper to handle potential malformed choice objects (fixing React Error #31)
  const getChoiceLabel = (choice: any): string => {
    if (typeof choice === "string") return choice;
    if (typeof choice === "object" && choice !== null) {
      // Handle cases where AI returns { choice: "...", effect: "..." }
      // Also handle new schema { description: "...", consequence: "..." }
      return (
        choice.description ||
        choice.choice ||
        choice.text ||
        choice.label ||
        JSON.stringify(choice)
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

  // Auto-collapse choices on mobile when processing finishes
  useEffect(() => {
    if (!gameState.isProcessing) {
      setIsChoicesExpanded(false);
    }
  }, [gameState.isProcessing]);

  // Helper to clear input and reset textarea height
  const clearInput = useCallback(() => {
    setCustomInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, []);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    // Check for commands first
    const commandResult = parseCommand(customInput, commandContext);
    if (commandResult.handled) {
      clearInput();

      // If command needs confirmation, show confirmation dialog
      if (commandResult.action && commandResult.message) {
        setPendingCommand({
          message: commandResult.message,
          action: commandResult.action,
        });
        return;
      }

      // If command just shows a message (like /help), show it via toast
      if (commandResult.message) {
        onShowToast?.(commandResult.message, "info");
        return;
      }

      // If command opens editor, trigger it
      if (commandResult.action?.type === "open_editor") {
        onOpenStateEditor?.();
        return;
      }

      if (commandResult.action?.type === "open_rag") {
        onOpenRAG?.();
        return;
      }

      if (commandResult.action?.type === "open_viewer") {
        onOpenViewer?.();
        return;
      }

      if (commandResult.action?.type === "open_rules") {
        onOpenRules?.();
        return;
      }

      // If command doesn't prevent action, continue with normal flow
      if (!commandResult.preventAction) {
        onAction(customInput);
      }
      return;
    }

    // Normal action
    onAction(customInput);
    clearInput();
  };

  const handleConfirmCommand = () => {
    if (!pendingCommand) return;

    const { action } = pendingCommand;

    // Handle editor separately since it doesn't modify state
    if (action.type === "open_editor") {
      onOpenStateEditor?.();
    } else if (action.type === "open_rag") {
      onOpenRAG?.();
    } else if (action.type === "open_viewer") {
      onOpenViewer?.();
    } else if (action.type === "open_rules") {
      onOpenRules?.();
    } else if (action.type === "force_update") {
      onForceUpdate?.(action.prompt);
    } else {
      executeCommandAction(action, gameState, setGameState);

      // Trigger save for state-modifying commands (/god, /unlock)
      if (action.type === "god_mode" || action.type === "unlock_all") {
        onTriggerSave?.();
      }

      // Show success message
      const successMessage =
        action.type === "god_mode"
          ? action.enable
            ? t("commands.godMode.enabled") || "🔱 GOD MODE ENABLED"
            : t("commands.godMode.disabled") || "God Mode disabled"
          : action.type === "unlock_all"
            ? t("commands.unlock.success") ||
              "🔓 All hidden information unlocked!"
            : "";

      if (successMessage) {
        onShowToast?.(successMessage, "success");
      }
    }

    setPendingCommand(null);
  };

  const handleCancelCommand = () => {
    setPendingCommand(null);
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
      {/* God Mode Indicator */}
      {gameState.godMode && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 animate-pulse">
          <div className="px-4 py-1.5 bg-theme-warning/20 border border-theme-warning/50 rounded-full text-theme-warning text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="text-lg">🔱</span>
            <span>{t("commands.godMode.indicator") || "GOD MODE"}</span>
            <span className="text-lg">🔱</span>
          </div>
        </div>
      )}

      {/* Command Confirmation Modal */}
      {pendingCommand && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="text-theme-text whitespace-pre-wrap text-sm mb-6">
              {pendingCommand.message}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelCommand}
                className="px-4 py-2 text-theme-muted hover:text-theme-text hover:bg-theme-surface-highlight rounded-lg transition-colors"
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                onClick={handleConfirmCommand}
                className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-bg rounded-lg font-bold transition-colors"
              >
                {t("confirm") || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gradient fade to blend with content */}
      <div className="h-8 bg-linear-to-t from-theme-bg/80 to-transparent pointer-events-none backdrop-blur-md"></div>

      <div className="bg-theme-bg/80 backdrop-blur-md p-4 md:px-8">
        <div className="max-w-4xl mx-auto space-y-2 md:space-y-4">
          {/* Action Controls - Always show retry/jump buttons when not processing */}
          {!gameState.isProcessing && !isTranslating && (
            <div className="animate-fade-in-up">
              {/* Retry + Jump Buttons - Always visible */}
              <div className="flex justify-center items-center gap-2 mb-2">
                {/* Retry Button - Always show */}
                {onRetry && (
                  <button
                    onClick={onRetry}
                    disabled={isDisabled}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface border border-theme-primary/50 rounded-full text-xs font-bold text-theme-primary uppercase tracking-widest hover:bg-theme-primary hover:text-theme-bg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t("retryGeneration")}
                  >
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      ></path>
                    </svg>
                    <span className="hidden sm:inline">
                      {t("retryGeneration")}
                    </span>
                  </button>
                )}

                {/* Rebuild Context Button */}
                {onRebuildContext && (
                  <button
                    onClick={onRebuildContext}
                    disabled={isDisabled}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface border border-theme-warning/50 rounded-full text-xs font-bold text-theme-warning uppercase tracking-widest hover:bg-theme-warning hover:text-theme-bg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t("rebuildContext") || "Rebuild Context"}
                  >
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
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      ></path>
                    </svg>
                    <span className="hidden sm:inline">
                      {t("rebuildContext") || "Rebuild Context"}
                    </span>
                  </button>
                )}

                {/* Cleanup Entities Button */}
                {onCleanupEntities && (
                  <button
                    onClick={onCleanupEntities}
                    disabled={isDisabled}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface border border-theme-info/50 rounded-full text-xs font-bold text-theme-info uppercase tracking-widest hover:bg-theme-info hover:text-theme-bg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t("cleanupEntities") || "Cleanup Entities"}
                  >
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                    <span className="hidden sm:inline">
                      {t("cleanupEntities") || "Cleanup"}
                    </span>
                  </button>
                )}

                {/* Jump Button & Inline UI */}
                {onJumpToSegment && (
                  <>
                    {!isJumpOpen ? (
                      <button
                        onClick={() => setIsJumpOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface border border-theme-border rounded-full text-xs font-bold text-theme-muted uppercase tracking-widest hover:text-theme-primary hover:border-theme-primary transition-colors shadow-sm"
                        title={t("jumpToSegment") || "Jump to Segment"}
                      >
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
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          ></path>
                        </svg>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 animate-fade-in-right bg-theme-surface border border-theme-primary/30 rounded-full pl-3 pr-1 py-1">
                        <input
                          autoFocus
                          type="text"
                          value={jumpInputValue}
                          placeholder={t("jumpPlaceholder") || "Seg #"}
                          onChange={(e) => setJumpInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              onJumpToSegment(jumpInputValue);
                              setIsJumpOpen(false);
                              setJumpInputValue("");
                            } else if (e.key === "Escape") {
                              setIsJumpOpen(false);
                            }
                          }}
                          className="w-16 bg-transparent text-xs font-mono text-theme-primary placeholder-theme-muted/50 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            if (jumpInputValue) {
                              onJumpToSegment(jumpInputValue);
                              setIsJumpOpen(false);
                              setJumpInputValue("");
                            }
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20 transition-colors"
                        >
                          {t("jumpGo") || "Go"}
                        </button>
                        <div className="w-px h-3 bg-theme-border mx-1" />
                        <button
                          onClick={() => {
                            onJumpToSegment("start");
                            setIsJumpOpen(false);
                          }}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase text-theme-muted hover:text-theme-primary transition-colors"
                        >
                          {t("jumpToStart") || "Top"}
                        </button>
                        <button
                          onClick={() => {
                            onJumpToSegment("end");
                            setIsJumpOpen(false);
                          }}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase text-theme-muted hover:text-theme-primary transition-colors"
                        >
                          {t("jumpToEnd") || "Bot"}
                        </button>
                        <button
                          onClick={() => setIsJumpOpen(false)}
                          className="ml-1 p-1 rounded-full text-theme-muted hover:text-theme-primary hover:bg-theme-muted/10 transition-colors"
                        >
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
                              d="M6 18L18 6M6 6l12 12"
                            ></path>
                          </svg>
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Mobile Toggle - Only show when there are choices */}
                {availableChoices.length > 0 && (
                  <button
                    onClick={() => setIsChoicesExpanded(!isChoicesExpanded)}
                    className="md:hidden flex items-center gap-2 px-4 py-1 bg-theme-surface border border-theme-primary/50 rounded-full text-xs font-bold text-theme-primary uppercase tracking-widest hover:bg-theme-primary hover:text-theme-bg transition-colors shadow-sm"
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
                )}
              </div>

              {/* Choices List - Only show when there are choices */}
              {availableChoices.length > 0 && (
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
                          className="px-4 py-2 bg-theme-surface-highlight/80 hover:bg-theme-primary text-theme-text hover:text-theme-bg border border-theme-border hover:border-theme-primary rounded-l-full border-r-0 text-sm transition-all duration-300 text-left flex flex-col items-start"
                        >
                          <span className="absolute -top-2 -left-2 w-5 h-5 bg-theme-bg border border-theme-muted/30 text-[10px] text-theme-muted rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {idx + 1}
                          </span>
                          <div className="font-medium">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => (
                                  <span className="inline">{children}</span>
                                ),
                                strong: ({ children }) => (
                                  <span className="font-bold">{children}</span>
                                ),
                                em: ({ children }) => (
                                  <span className="italic">{children}</span>
                                ),
                              }}
                            >
                              {label}
                            </ReactMarkdown>
                          </div>
                          {(rawChoice as any).consequence &&
                            gameState.unlockMode && (
                              <span className="text-[10px] text-theme-muted opacity-80 mt-0.5 font-normal italic block">
                                {(rawChoice as any).consequence}
                              </span>
                            )}
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
              )}
            </div>
          )}

          {/* Command Hints - Only show when user starts with / */}
          {customInput.startsWith("/") && (
            <div className="flex flex-wrap gap-2 justify-center px-4">
              {SUPPORTED_COMMANDS.map((cmd) => (
                <button
                  key={cmd.cmd}
                  onClick={() => setCustomInput(cmd.cmd + " ")}
                  disabled={isDisabled}
                  className="px-2 py-1 text-[10px] bg-theme-surface/30 border border-theme-border/50 rounded-md text-theme-muted hover:text-theme-primary hover:border-theme-primary/50 transition-colors"
                  title={cmd.desc}
                >
                  {cmd.cmd}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="relative">
            <form
              onSubmit={handleCustomSubmit}
              className="relative flex items-end gap-2 bg-theme-surface/50 backdrop-blur-sm border border-theme-border rounded-xl shadow-lg p-2 transition-colors focus-within:border-theme-primary/50 focus-within:ring-1 focus-within:ring-theme-primary/50"
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
                ref={textareaRef}
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
                className="flex-1 bg-transparent text-theme-text px-2 py-3 focus:outline-none placeholder-theme-muted/50 resize-none min-h-11 max-h-[120px] self-center"
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
