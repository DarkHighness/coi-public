import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { GameState, StorySegment, StorySummary } from "../types";
import {
  parseCommand,
  executeCommandAction,
  CommandContext,
  CommandAction,
  COMMAND_DEFINITIONS,
} from "../utils/commands";
import { useRuntimeContext } from "../runtime/context";
import { useSettingsContext } from "../contexts/SettingsContext";
import {
  DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
  resolveModelContextWindowTokens,
} from "../services/modelContextWindows";
import { pickLatestToolCallContextUsage } from "../services/ai/contextUsage";

interface ActionPanelProps {
  onAction: (action: string) => void;
  onShowToast?: (message: string, type: "success" | "error" | "info") => void;
  onOpenStateEditor?: () => void;
  onOpenViewer?: () => void;
  onTriggerSave?: () => void;
  onRetry?: () => void;
  onRebuildContext?: () => void;
  onCleanupEntities?: () => void;
  onForceUpdate?: (prompt: string) => void;
  onJumpToSegment?: (segmentId: string) => void;
}

type ConfirmTone = "neutral" | "warning" | "danger";

interface ConfirmDialogContent {
  badge: string;
  title: string;
  description: string;
  detail?: string;
  confirmLabel: string;
  tone: ConfirmTone;
}

interface ActiveConfirmDialog {
  content: ConfirmDialogContent;
  onConfirm: () => void;
  onCancel: () => void;
}

const CONFIRM_TONE_STYLES: Record<
  ConfirmTone,
  {
    iconWrapper: string;
    badge: string;
    confirmButton: string;
    iconPath: string;
  }
> = {
  neutral: {
    iconWrapper:
      "bg-theme-primary/12 text-theme-primary border border-theme-primary/25",
    badge:
      "bg-theme-primary/12 text-theme-primary border border-theme-primary/25",
    confirmButton:
      "bg-theme-primary hover:bg-theme-primary-hover text-theme-bg focus-visible:ring-theme-primary/35",
    iconPath: "M9 12.75l2.25 2.25L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  warning: {
    iconWrapper:
      "bg-theme-warning/12 text-theme-warning border border-theme-warning/30",
    badge:
      "bg-theme-warning/12 text-theme-warning border border-theme-warning/30",
    confirmButton:
      "bg-theme-warning text-theme-bg hover:opacity-90 focus-visible:ring-theme-warning/35",
    iconPath:
      "M12 9v3.75m0 3.75h.008v.008H12v-.008zm8.714-4.5L13.714 4a2 2 0 00-3.428 0L3.286 12a2 2 0 001.714 3h13.999a2 2 0 001.715-3z",
  },
  danger: {
    iconWrapper:
      "bg-theme-error/12 text-theme-error border border-theme-error/30",
    badge: "bg-theme-error/12 text-theme-error border border-theme-error/30",
    confirmButton:
      "bg-theme-error text-theme-bg hover:opacity-90 focus-visible:ring-theme-error/35",
    iconPath:
      "M12 9v3.75m0 3.75h.008v.008H12v-.008zM9.172 4.172a4 4 0 015.656 0l4.999 4.999a4 4 0 010 5.656l-4.999 4.999a4 4 0 01-5.656 0l-5-5a4 4 0 010-5.655l5-5z",
  },
};

export const ActionPanel: React.FC<ActionPanelProps> = ({
  onAction,
  onShowToast,
  onOpenStateEditor,
  onOpenViewer,
  onTriggerSave,
  onRetry,
  onRebuildContext,
  onCleanupEntities,
  onForceUpdate,
  onJumpToSegment,
}) => {
  const { state, actions } = useRuntimeContext();
  const { gameState, currentHistory, isTranslating, aiSettings } = state;
  const { toggleGodMode, setUnlockMode } = actions;
  const { providerModels } = useSettingsContext();
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const [jumpInputValue, setJumpInputValue] = useState("");
  const [customInput, setCustomInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isChoicesExpanded, setIsChoicesExpanded] = useState(false);
  const [isCustomChoiceOpen, setIsCustomChoiceOpen] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<{
    message: string;
    action: CommandAction;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "retry" | "rebuild" | "cleanup" | null
  >(null);
  const { t } = useTranslation();

  const lastSegment = currentHistory
    .filter((s) => s.role === "model" || s.role === "system")
    .slice(-1)[0];
  const availableChoices = lastSegment?.choices || [];
  const isDisabled = gameState.isProcessing || isTranslating;
  const hasChoices = availableChoices.length > 0;
  const customChoiceIndex = availableChoices.length + 1;
  const showCommandHints = customInput.startsWith("/");
  const commandHints = COMMAND_DEFINITIONS;

  const contextWindowResolution = (() => {
    const provider = aiSettings.providers.instances.find(
      (p) => p.id === aiSettings.story.providerId,
    );
    const models = providerModels?.[aiSettings.story.providerId];
    const ctx = models?.find(
      (m) => m.id === aiSettings.story.modelId,
    )?.contextLength;
    return resolveModelContextWindowTokens({
      settings: aiSettings,
      providerId: aiSettings.story.providerId,
      providerProtocol: provider?.protocol,
      modelId: aiSettings.story.modelId,
      providerReportedContextLength: ctx,
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });
  })();
  const contextWindowTokens = contextWindowResolution.value;
  const autoCompactEnabled = aiSettings.extra?.autoCompactEnabled ?? true;
  const autoCompactThreshold = aiSettings.extra?.autoCompactThreshold ?? 0.7;
  const liveContextUsage =
    gameState.isProcessing && gameState.liveToolCalls
      ? pickLatestToolCallContextUsage(gameState.liveToolCalls)
      : null;

  const displayContextWindowTokens =
    liveContextUsage?.contextWindowTokens ?? contextWindowTokens;
  const displayAutoCompactThreshold =
    liveContextUsage?.autoCompactThreshold ?? autoCompactThreshold;
  const thresholdTokens =
    liveContextUsage?.thresholdTokens ??
    Math.max(
      1,
      Math.floor(displayContextWindowTokens * displayAutoCompactThreshold),
    );

  const historicalPromptTokens = (() => {
    for (let i = currentHistory.length - 1; i >= 0; i--) {
      const seg = currentHistory[i];
      if (
        seg?.role !== "model" ||
        typeof seg.usage?.promptTokens !== "number"
      ) {
        continue;
      }

      const usage = seg.usage;
      const hasLegacyPositiveSignal =
        (usage.promptTokens || 0) > 0 ||
        (usage.totalTokens || 0) > 0 ||
        (usage.completionTokens || 0) > 0;

      // Prefer any positive promptTokens (provider-reported or estimated fallback).
      if ((usage.promptTokens || 0) > 0) {
        return usage.promptTokens;
      }

      // Backward compatibility for older payloads without explicit reported flag.
      if (usage.reported !== false && hasLegacyPositiveSignal) {
        return usage.promptTokens;
      }
    }
    return null;
  })();

  const displayPromptTokens =
    liveContextUsage?.promptTokens ?? historicalPromptTokens;

  const hasPromptUsage =
    typeof displayPromptTokens === "number" && displayPromptTokens >= 0;

  const usageRatio =
    liveContextUsage?.usageRatio ??
    (hasPromptUsage ? displayPromptTokens / displayContextWindowTokens : null);

  const tokensToThreshold =
    liveContextUsage?.tokensToThreshold ??
    (autoCompactEnabled && hasPromptUsage
      ? Math.max(0, thresholdTokens - displayPromptTokens)
      : null);

  const latestSummary: StorySummary | null =
    Array.isArray(gameState.summaries) && gameState.summaries.length > 0
      ? gameState.summaries[gameState.summaries.length - 1]
      : null;
  const lastCompactId =
    latestSummary && typeof latestSummary.id === "number"
      ? latestSummary.id
      : null;
  const lastCompactAt =
    latestSummary && typeof latestSummary.createdAt === "number"
      ? latestSummary.createdAt
      : null;

  const formatTokens = (n: number, style: "full" | "compact"): string => {
    if (!Number.isFinite(n)) return "—";
    if (style === "full") return n.toLocaleString();
    if (n >= 1000) {
      const k = Math.round((n / 1000) * 10) / 10;
      return `${k}k`;
    }
    return String(n);
  };

  const formatAgo = (ts: number): string => {
    const deltaMs = Date.now() - ts;
    if (!Number.isFinite(deltaMs) || deltaMs < 0) return "—";
    const sec = Math.floor(deltaMs / 1000);
    const nowLabel = t("timeNow") || "now";
    if (sec < 60) return nowLabel;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const day = Math.floor(hr / 24);
    return `${day}d`;
  };

  const openCustomChoice = useCallback(() => {
    setIsCustomChoiceOpen(true);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  // Command context for command parsing
  const commandContext: CommandContext = {
    gameState,
    runtimeActions: { toggleGodMode, setUnlockMode },
    t,
  };

  // Helper to handle potential malformed choice objects (fixing React Error #31)
  const getChoiceLabel = (choice: unknown): string => {
    if (typeof choice === "string") return choice;
    if (typeof choice === "object" && choice !== null) {
      const choiceRecord = choice as JsonObject;
      const description =
        typeof choiceRecord.description === "string"
          ? choiceRecord.description
          : undefined;
      const legacyChoice =
        typeof choiceRecord.choice === "string"
          ? choiceRecord.choice
          : undefined;
      const text =
        typeof choiceRecord.text === "string" ? choiceRecord.text : undefined;
      const label =
        typeof choiceRecord.label === "string" ? choiceRecord.label : undefined;
      // Handle cases where AI returns { choice: "...", effect: "..." }
      // Also handle new schema { description: "...", consequence: "..." }
      return (
        description || legacyChoice || text || label || JSON.stringify(choice)
      );
    }
    return String(choice);
  };

  const getChoiceConsequence = (choice: unknown): string | null => {
    if (!choice || typeof choice !== "object") return null;
    const consequence = (choice as { consequence?: unknown }).consequence;
    return typeof consequence === "string" ? consequence : null;
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
        return;
      }

      if (!isNaN(key) && hasChoices && key === customChoiceIndex) {
        openCustomChoice();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    availableChoices,
    customChoiceIndex,
    hasChoices,
    isDisabled,
    onAction,
    openCustomChoice,
  ]);

  // Auto-collapse choices on mobile when processing finishes
  useEffect(() => {
    if (!gameState.isProcessing) {
      setIsChoicesExpanded(false);
    }
  }, [gameState.isProcessing]);

  // Auto-expand choices on mobile when new choices appear
  useEffect(() => {
    if (!hasChoices) return;
    if (window.matchMedia("(max-width: 767px)").matches) {
      setIsChoicesExpanded(true);
    }
  }, [hasChoices, availableChoices.length]);

  // Helper to clear input and reset textarea height
  const clearInput = useCallback(() => {
    setCustomInput("");
    setIsCustomChoiceOpen(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, []);

  const handleCommandAction = useCallback(
    (action: CommandAction) => {
      switch (action.type) {
        case "open_editor":
          onOpenStateEditor?.();
          return;
        case "open_viewer":
          onOpenViewer?.();
          return;
        case "force_update":
          onForceUpdate?.(action.prompt);
          return;
        case "none":
          return;
        default:
          executeCommandAction(action, gameState, {
            toggleGodMode,
            setUnlockMode,
          });

          if (action.type === "god_mode" || action.type === "unlock_mode") {
            onTriggerSave?.();
          }

          const successMessage =
            action.type === "god_mode"
              ? action.enable
                ? t("commands.godMode.enabled") || "🔱 GOD MODE ENABLED"
                : t("commands.godMode.disabled") || "God Mode disabled"
              : action.type === "unlock_mode"
                ? t("commands.unlock.success") ||
                  `🔓 Unlock mode ${action.enable ? "enabled" : "disabled"}.`
                : "";

          if (successMessage) {
            onShowToast?.(successMessage, "success");
          }
      }
    },
    [
      gameState,
      onForceUpdate,
      onOpenStateEditor,
      onOpenViewer,
      onShowToast,
      onTriggerSave,
      t,
      toggleGodMode,
      setUnlockMode,
    ],
  );

  const normalizeJumpTarget = useCallback((value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed === "start" || trimmed === "end") {
      return trimmed;
    }

    if (/^\d+$/.test(trimmed)) {
      return trimmed;
    }

    if (/^[a-zA-Z0-9_./-]+$/.test(trimmed)) {
      return trimmed;
    }

    return null;
  }, []);

  const submitJumpToSegment = useCallback(
    (value: string) => {
      const target = normalizeJumpTarget(value);
      if (!target || !onJumpToSegment) {
        return false;
      }

      onJumpToSegment(target);
      setIsJumpOpen(false);
      setJumpInputValue("");
      return true;
    },
    [normalizeJumpTarget, onJumpToSegment],
  );

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    const commandResult = parseCommand(customInput, commandContext);
    if (commandResult.handled) {
      clearInput();

      if (commandResult.action && commandResult.message) {
        setPendingCommand({
          message: commandResult.message,
          action: commandResult.action,
        });
        return;
      }

      if (commandResult.action) {
        handleCommandAction(commandResult.action);
      }

      if (commandResult.message) {
        onShowToast?.(commandResult.message, "info");
      }

      if (!commandResult.preventAction) {
        onAction(customInput);
      }
      return;
    }

    onAction(customInput);
    clearInput();
  };

  const handleConfirmCommand = () => {
    if (!pendingCommand) return;

    handleCommandAction(pendingCommand.action);
    setPendingCommand(null);
  };

  const handleCancelCommand = () => {
    setPendingCommand(null);
  };

  const pendingActionConfig =
    pendingAction === "retry"
      ? {
          badge: t("retryGeneration") || "Retry",
          title: t("retryGeneration") || "Retry",
          description:
            t("confirmRetry") ||
            "Regenerate the current turn from the same input.",
          confirmLabel: t("actionPanel.confirm.retry") || "Retry now",
          tone: "neutral" as const,
        }
      : pendingAction === "rebuild"
        ? {
            badge: t("rebuildContext") || "Rebuild Context",
            title: t("rebuildContext") || "Rebuild Context",
            description:
              t("confirmRebuildContext") ||
              "Summarize history and clear model cache before continuing.",
            confirmLabel: t("actionPanel.confirm.rebuild") || "Rebuild now",
            tone: "warning" as const,
          }
        : pendingAction === "cleanup"
          ? {
              badge: t("cleanupEntities") || "Cleanup",
              title: t("cleanupEntities") || "Cleanup Entities",
              description:
                t("confirmCleanupEntities") ||
                "Remove invalid or duplicate entities from game state.",
              confirmLabel: t("actionPanel.confirm.cleanup") || "Cleanup now",
              tone: "warning" as const,
            }
          : null;

  const commandTone =
    pendingCommand?.action.type === "god_mode" ||
    pendingCommand?.action.type === "unlock_mode" ||
    pendingCommand?.action.type === "force_update"
      ? "danger"
      : "warning";

  const commandTitle =
    pendingCommand?.action.type === "god_mode"
      ? pendingCommand.action.enable
        ? t("commands.godMode.titleEnable") || "Enable God Mode"
        : t("commands.godMode.titleDisable") || "Disable God Mode"
      : pendingCommand?.action.type === "unlock_mode"
        ? t("commands.unlock.title") || "Set Unlock Mode"
        : pendingCommand?.action.type === "force_update"
          ? t("commands.sudo.title") || "Force World Update"
          : t("commands.confirmTitle") || "Confirm Command";

  const commandBadge =
    pendingCommand?.action.type === "god_mode"
      ? t("commands.godMode.short") || "/god"
      : pendingCommand?.action.type === "unlock_mode"
        ? t("commands.unlock.short") || "/unlock"
        : pendingCommand?.action.type === "force_update"
          ? t("commands.sudo.short") || "/sudo"
          : t("commands.confirmBadge") || "Command";

  const commandConfirmLabel =
    pendingCommand?.action.type === "god_mode"
      ? pendingCommand.action.enable
        ? t("commands.godMode.confirmEnableCta") || "Enable"
        : t("commands.godMode.confirmDisableCta") || "Disable"
      : pendingCommand?.action.type === "unlock_mode"
        ? t("commands.unlock.confirmCta") || "Apply unlock mode"
        : pendingCommand?.action.type === "force_update"
          ? t("commands.sudo.confirmCta") || "Apply update"
          : t("confirm") || "Confirm";

  const commandDescription =
    pendingCommand?.action.type === "god_mode"
      ? pendingCommand.action.enable
        ? t("commands.godMode.enableSummary") ||
          "All actions will succeed and world consistency constraints become permissive."
        : t("commands.godMode.disableSummary") ||
          "Return to normal success/failure logic and standard world constraints."
      : pendingCommand?.action.type === "unlock_mode"
        ? t("commands.unlock.summary") ||
          (pendingCommand.action.enable
            ? "Unlock mode is ON. Hidden information may be shown in viewer panels."
            : "Unlock mode is OFF. Hidden information follows normal discovery flow.")
        : pendingCommand?.action.type === "force_update"
          ? t("commands.sudo.summary") ||
            "Apply a direct world instruction that bypasses normal progression checks."
          : t("commands.confirmDescription") ||
            "Please review this command before continuing.";

  const commandDetail =
    pendingCommand?.action.type === "force_update"
      ? `${t("commands.sudo.promptPreview") || "Instruction"}:\n${pendingCommand.action.prompt}`
      : undefined;

  const activeConfirmDialog: ActiveConfirmDialog | null = useMemo(() => {
    if (pendingCommand) {
      return {
        content: {
          badge: commandBadge,
          title: commandTitle,
          description: commandDescription,
          detail: commandDetail,
          confirmLabel: commandConfirmLabel,
          tone: commandTone,
        },
        onConfirm: handleConfirmCommand,
        onCancel: handleCancelCommand,
      };
    }

    if (pendingAction && pendingActionConfig) {
      return {
        content: pendingActionConfig,
        onConfirm: () => {
          if (pendingAction === "retry") onRetry?.();
          else if (pendingAction === "rebuild") onRebuildContext?.();
          else if (pendingAction === "cleanup") onCleanupEntities?.();
          setPendingAction(null);
        },
        onCancel: () => setPendingAction(null),
      };
    }

    return null;
  }, [
    commandBadge,
    commandDetail,
    commandDescription,
    commandConfirmLabel,
    commandTitle,
    commandTone,
    handleCancelCommand,
    onCleanupEntities,
    onRebuildContext,
    onRetry,
    pendingAction,
    pendingActionConfig,
    pendingCommand,
  ]);

  useEffect(() => {
    if (!activeConfirmDialog) {
      return;
    }

    const handleConfirmKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        activeConfirmDialog.onCancel();
        return;
      }

      if (e.key === "Enter") {
        const target = e.target as HTMLElement | null;
        const tagName = target?.tagName;
        if (tagName === "TEXTAREA" || tagName === "INPUT") {
          return;
        }
        e.preventDefault();
        activeConfirmDialog.onConfirm();
      }
    };

    window.addEventListener("keydown", handleConfirmKeydown);
    return () => window.removeEventListener("keydown", handleConfirmKeydown);
  }, [activeConfirmDialog]);

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

  const showCustomAsOption =
    hasChoices &&
    !isCustomChoiceOpen &&
    !customInput.trim() &&
    !showCommandHints;

  const customChoiceRow = (
    <form
      onSubmit={handleCustomSubmit}
      className="group -mx-2 px-2 py-2 md:py-2.5 border-b border-theme-divider/60 hover:bg-theme-surface/10 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-[11px] tabular-nums text-theme-text-secondary/70 select-none w-5 text-right">
          {customChoiceIndex}
        </div>

        <div className="flex-1">
          {showCustomAsOption ? (
            <button
              type="button"
              onClick={openCustomChoice}
              className="w-full text-left font-serif text-[15px] md:text-base text-theme-text-secondary italic py-0.5 hover:text-theme-text transition-colors"
            >
              {t("placeholder")}
            </button>
          ) : (
            <textarea
              ref={textareaRef}
              value={customInput}
              onFocus={() => setIsCustomChoiceOpen(true)}
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
              className="w-full bg-transparent text-theme-text px-2 py-1.5 focus:outline-none placeholder-theme-muted/50 resize-none min-h-10 max-h-[120px] font-serif leading-6"
              style={{ height: "auto" }}
            />
          )}

          {showCommandHints && hasChoices && (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-theme-text-secondary/80">
              {commandHints.map((cmd) => (
                <button
                  key={cmd.cmd}
                  type="button"
                  onClick={() => {
                    setCustomInput(cmd.cmd + " ");
                    openCustomChoice();
                  }}
                  disabled={isDisabled}
                  className="px-0.5 py-0.5 border-b border-transparent hover:border-theme-primary/60 hover:text-theme-primary transition-colors disabled:opacity-50"
                  title={cmd.desc}
                >
                  {cmd.cmd}
                </button>
              ))}
            </div>
          )}
        </div>

        {!showCustomAsOption && (
          <div className="flex-none flex items-center gap-1.5 mt-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => handleRollClick(e, customInput)}
              disabled={isDisabled || !customInput.trim()}
              className="p-1.5 text-theme-text-secondary hover:text-theme-primary disabled:opacity-30 transition-colors"
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

            <button
              type="submit"
              disabled={isDisabled || !customInput.trim()}
              className="p-1.5 text-theme-primary hover:text-theme-primary-hover transition-colors disabled:text-theme-muted/50"
              title={t("send") || "Send"}
            >
              <svg
                className="w-4 h-4 transform rotate-90"
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
          </div>
        )}
      </div>
    </form>
  );

  return (
    <div className="flex-none w-full z-30">
      {/* God Mode Indicator */}
      {gameState.godMode && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 animate-pulse">
          <div className="px-4 py-1.5 bg-theme-warning/15 border border-theme-warning/35 rounded-full text-theme-warning text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="text-lg">🔱</span>
            <span>{t("commands.godMode.indicator") || "GOD MODE"}</span>
            <span className="text-lg">🔱</span>
          </div>
        </div>
      )}

      {/* Unified Confirmation Modal */}
      {activeConfirmDialog && (
        <div
          className="fixed inset-0 ui-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              activeConfirmDialog.onCancel();
            }
          }}
        >
          <div
            className="bg-theme-bg border border-theme-divider/60 rounded-xl shadow-lg max-w-lg w-full p-5 md:p-6 animate-fade-in-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-confirm-title"
            aria-describedby="action-confirm-detail"
          >
            <div className="flex items-start gap-3 md:gap-4">
              <div
                className={`mt-0.5 shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${CONFIRM_TONE_STYLES[activeConfirmDialog.content.tone].iconWrapper}`}
              >
                <svg
                  className="w-4.5 h-4.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.75"
                    d={
                      CONFIRM_TONE_STYLES[activeConfirmDialog.content.tone]
                        .iconPath
                    }
                  ></path>
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold ${CONFIRM_TONE_STYLES[activeConfirmDialog.content.tone].badge}`}
                  >
                    {activeConfirmDialog.content.badge}
                  </span>
                </div>

                <h3
                  id="action-confirm-title"
                  className="text-theme-text text-base md:text-lg font-semibold leading-tight"
                >
                  {activeConfirmDialog.content.title}
                </h3>

                <p className="mt-2 text-theme-text-secondary text-sm leading-6">
                  {activeConfirmDialog.content.description}
                </p>

                {activeConfirmDialog.content.detail && (
                  <pre
                    id="action-confirm-detail"
                    className="mt-3 whitespace-pre-wrap break-words text-[12px] leading-5 bg-theme-surface/50 border border-theme-divider/70 rounded-lg px-3 py-2 text-theme-text"
                  >
                    {activeConfirmDialog.content.detail}
                  </pre>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={activeConfirmDialog.onCancel}
                className="px-4 py-2 rounded-lg border border-theme-divider/70 text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/30"
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                type="button"
                onClick={activeConfirmDialog.onConfirm}
                className={`px-4 py-2 rounded-lg font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 ${CONFIRM_TONE_STYLES[activeConfirmDialog.content.tone].confirmButton}`}
              >
                {activeConfirmDialog.content.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gradient fade to blend with content */}
      <div className="h-8 bg-linear-to-t from-theme-bg/80 to-transparent pointer-events-none backdrop-blur-md"></div>

      <div className="bg-theme-bg/80 backdrop-blur-md px-3 py-3 md:px-8 md:py-4 border-t border-theme-divider/60">
        <div className="max-w-4xl mx-auto space-y-2 md:space-y-4">
          <div className="flex justify-center">
            <div
              className={[
                "text-[10px] uppercase tracking-widest font-bold select-none",
                usageRatio !== null && usageRatio >= displayAutoCompactThreshold
                  ? "text-theme-warning"
                  : "text-theme-muted",
              ].join(" ")}
              title={[
                usageRatio !== null
                  ? `${t("contextUsage") || "Context"}: ${displayPromptTokens?.toLocaleString()}/${displayContextWindowTokens.toLocaleString()} (${Math.round(
                      usageRatio * 100,
                    )}%)`
                  : `${t("contextUsage") || "Context"}: —/${displayContextWindowTokens.toLocaleString()}`,
                autoCompactEnabled
                  ? `Auto: ${Math.round(displayAutoCompactThreshold * 100)}% (${thresholdTokens.toLocaleString()})`
                  : "Auto: off",
                tokensToThreshold !== null
                  ? `${t("tokensToCompact") || "To compact"}: ${tokensToThreshold.toLocaleString()}`
                  : "",
                lastCompactId !== null
                  ? `${t("lastCompact") || "Last"}: #${lastCompactId}${lastCompactAt ? ` (${new Date(lastCompactAt).toLocaleString()})` : ""}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n")}
            >
              {/* Mobile: short + glanceable */}
              <span className="sm:hidden">
                {t("contextUsage") || "Context"}:{" "}
                {usageRatio === null
                  ? `—/${formatTokens(displayContextWindowTokens, "compact")}`
                  : [
                      `${Math.round(usageRatio * 100)}%`,
                      tokensToThreshold !== null
                        ? `${t("tokensToCompact") || "To compact"} ${formatTokens(tokensToThreshold, "compact")}`
                        : "",
                      lastCompactId !== null ? `#${lastCompactId}` : "",
                    ]
                      .filter(Boolean)
                      .join(" • ")}
              </span>

              {/* Desktop: full breakdown */}
              <span className="hidden sm:inline">
                {t("contextUsage") || "Context"}:{" "}
                {usageRatio === null
                  ? `—/${formatTokens(displayContextWindowTokens, "full")}`
                  : `${formatTokens(displayPromptTokens!, "full")}/${formatTokens(displayContextWindowTokens, "full")} (${Math.round(
                      usageRatio * 100,
                    )}%)`}
                {"  "}
                {autoCompactEnabled
                  ? `• auto ${Math.round(displayAutoCompactThreshold * 100)}% (${formatTokens(thresholdTokens, "full")})`
                  : "• auto off"}
                {"  "}
                {tokensToThreshold !== null
                  ? `• ${t("tokensToCompact") || "To compact"} ${formatTokens(tokensToThreshold, "full")}`
                  : ""}
                {"  "}
                {lastCompactId !== null
                  ? `• ${t("lastCompact") || "Last"} #${lastCompactId}${lastCompactAt ? ` ${formatAgo(lastCompactAt)}` : ""}`
                  : ""}
              </span>
            </div>
          </div>

          {/* Action Controls - Always show retry/jump buttons when not processing */}
          {!gameState.isProcessing && !isTranslating && (
            <div className="animate-fade-in-up">
              {/* Retry + Jump Buttons - Always visible */}
              <div className="flex justify-center items-center gap-1.5 mb-2 flex-wrap">
                {/* Retry Button - Always show */}
                {onRetry && (
                  <button
                    onClick={() => setPendingAction("retry")}
                    disabled={isDisabled}
                    className="flex min-h-9 items-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-bold text-theme-primary uppercase tracking-widest border border-transparent hover:border-theme-primary/35 hover:bg-theme-surface/10 transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    onClick={() => setPendingAction("rebuild")}
                    disabled={isDisabled}
                    className="flex min-h-9 items-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-bold text-theme-warning uppercase tracking-widest border border-transparent hover:border-theme-warning/35 hover:bg-theme-surface/10 transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-warning/25 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    onClick={() => setPendingAction("cleanup")}
                    disabled={isDisabled}
                    className="flex min-h-9 items-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-bold text-theme-info uppercase tracking-widest border border-transparent hover:border-theme-info/35 hover:bg-theme-surface/10 transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-info/25 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="flex min-h-9 items-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-bold text-theme-text-secondary uppercase tracking-widest border border-transparent hover:border-theme-primary/35 hover:bg-theme-surface/10 hover:text-theme-primary transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/25"
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
                      <div className="flex items-center gap-1 animate-fade-in-right bg-theme-surface/20 border border-theme-divider/60 rounded-md px-2.5 py-1.5">
                        <input
                          autoFocus
                          type="text"
                          value={jumpInputValue}
                          placeholder={t("jumpPlaceholder") || "Seg #"}
                          onChange={(e) => setJumpInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              submitJumpToSegment(jumpInputValue);
                            } else if (e.key === "Escape") {
                              setIsJumpOpen(false);
                            }
                          }}
                          className="w-16 bg-transparent text-xs font-mono text-theme-primary placeholder-theme-muted/50 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            submitJumpToSegment(jumpInputValue);
                          }}
                          className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20 transition-colors touch-manipulation"
                        >
                          {t("jumpGo") || "Go"}
                        </button>
                        <div className="w-px h-3 bg-theme-divider mx-1" />
                        <button
                          onClick={() => {
                            onJumpToSegment("start");
                            setIsJumpOpen(false);
                          }}
                          className="px-2 py-1 rounded text-[10px] font-bold uppercase text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface/10 transition-colors touch-manipulation"
                        >
                          {t("jumpToStart") || "Top"}
                        </button>
                        <button
                          onClick={() => {
                            onJumpToSegment("end");
                            setIsJumpOpen(false);
                          }}
                          className="px-2 py-1 rounded text-[10px] font-bold uppercase text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface/10 transition-colors touch-manipulation"
                        >
                          {t("jumpToEnd") || "Bot"}
                        </button>
                        <button
                          onClick={() => setIsJumpOpen(false)}
                          className="ml-1 rounded p-1.5 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface/10 transition-colors touch-manipulation"
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
                    className="md:hidden flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-[11px] font-bold text-theme-primary uppercase tracking-widest border border-transparent hover:border-theme-primary/35 hover:bg-theme-surface/10 transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/25"
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
                  className={`transition-all duration-300 overflow-hidden pt-2 ${isChoicesExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 md:max-h-none md:opacity-100"}`}
                >
                  <div className="mx-auto max-w-[72ch]">
                    {availableChoices.map((rawChoice, idx) => {
                      const label = getChoiceLabel(rawChoice);
                      const consequence = getChoiceConsequence(rawChoice);
                      return (
                        <div
                          key={idx}
                          className="group relative -mx-2 border-b border-theme-divider/60 hover:bg-theme-surface/10 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => onAction(label)}
                            disabled={isDisabled}
                            className="w-full flex items-start gap-3 px-2 py-2 md:py-2.5 pr-12 text-left text-theme-text font-serif leading-6 md:leading-7 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                          >
                            <div className="mt-0.5 text-[11px] tabular-nums text-theme-text-secondary/70 select-none w-5 text-right">
                              {idx + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="text-[15px] md:text-base font-medium">
                                <span className="whitespace-pre-wrap break-words">
                                  {label}
                                </span>
                              </div>
                              {consequence && gameState.unlockMode && (
                                <div className="mt-1 text-[11px] text-theme-text-secondary/80 italic">
                                  {consequence}
                                </div>
                              )}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleRollClick(e, label)}
                            disabled={isDisabled}
                            className="absolute right-1.5 top-1.5 md:top-2 flex-none p-2 rounded-md text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 transition-opacity disabled:opacity-30 touch-manipulation"
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
                    {customChoiceRow}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Command Hints - Only show when user starts with / */}
          {showCommandHints && !hasChoices && (
            <div
              className={`flex flex-wrap gap-x-3 gap-y-1 px-2 text-[11px] text-theme-text-secondary/80 ${hasChoices ? "mx-auto max-w-[72ch]" : "justify-center"}`}
            >
              {commandHints.map((cmd) => (
                <button
                  key={cmd.cmd}
                  onClick={() => setCustomInput(cmd.cmd + " ")}
                  disabled={isDisabled}
                  className="px-0.5 py-0.5 border-b border-transparent hover:border-theme-primary/60 hover:text-theme-primary transition-colors disabled:opacity-50"
                  title={cmd.desc}
                >
                  {cmd.cmd}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="relative">
            {hasChoices ? null : (
              <form
                onSubmit={handleCustomSubmit}
                className="relative flex items-end gap-2 bg-theme-bg/60 backdrop-blur-sm border border-theme-divider/60 border-t border-t-theme-divider/60 rounded-none px-1.5 py-2 transition-colors focus-within:border-t-theme-primary/50"
              >
                {/* Roll Button (Integrated) */}
                <button
                  type="button"
                  onClick={(e) => handleRollClick(e, customInput)}
                  disabled={isDisabled || !customInput.trim()}
                  className="p-2 mb-0.5 text-theme-text-secondary hover:text-theme-primary transition-colors disabled:opacity-30 flex-none"
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
                  className="flex-1 bg-transparent text-theme-text px-2 py-3 focus:outline-none placeholder-theme-muted/50 resize-none min-h-11 max-h-[120px] self-center font-serif"
                  style={{ height: "auto" }}
                />

                {/* Send/Act Button */}
                <button
                  type="submit"
                  disabled={isDisabled || !customInput.trim()}
                  className="p-2 mb-0.5 text-theme-primary hover:text-theme-primary-hover transition-colors disabled:text-theme-muted/50 flex-none"
                  title={t("send") || "Send"}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
