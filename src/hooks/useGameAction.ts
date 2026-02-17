import { useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../contexts/ToastContext";
import {
  AISettings,
  StorySegment,
  StorySummary,
  ActionResult,
  GameState,
  LanguageCode,
  ToolCallRecord,
  TurnRecoveryTrace,
  TokenUsage,
} from "../types";
import type { VfsSession } from "../services/vfs/vfsSession";
import { vfsElevationTokenManager } from "../services/vfs/core/elevation";
import { generateAdventureTurn } from "../services/aiService";
import { HistoryCorruptedError } from "../services/ai/contextCompressor";
import { LANG_MAP } from "../utils/constants";
import { deriveHistory } from "../utils/storyUtils";
import { deriveGameStateFromVfs } from "../services/vfs/derivations";
import {
  readConversationIndex,
  readTurnFile,
  writeTurnFile,
} from "../services/vfs/conversation";
import { syncSettingsFromGlobalSoulAfterTurn } from "../services/vfs/soulSync";
import {
  updateProviderStats,
  handleForking,
  handleSummarization,
  createModelNode,
  notifySessionSummaryCreated,
} from "./gameActionHelpers";
import { mergeDerivedViewState } from "./vfsViewState";
import { sessionManager } from "../services/ai/sessionManager";
import {
  DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
  buildModelContextWindowKey,
  deriveLearnedContextWindowFromOverflow,
  parseContextOverflowDiagnostics,
  relaxLearnedContextWindowOnSuccess,
  resolveModelContextWindowUpperBound,
  upsertLearnedModelContextWindow,
} from "../services/modelContextWindows";

interface UseGameActionProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  aiSettings: AISettings;
  handleSaveSettings: (settings: AISettings) => void;
  language: LanguageCode;
  isTranslating: boolean;
  currentSlotId: string | null;
  generateImageForNode: (
    nodeId: string,
    nodeOverride?: StorySegment,
  ) => Promise<void>;
  triggerSave: () => void;
  vfsSession: VfsSession;
  onLiveToolCallsUpdate?: (calls: ToolCallRecord[]) => void;
}

export const useGameAction = ({
  gameState,
  setGameState,
  aiSettings,
  handleSaveSettings,
  language,
  isTranslating,
  currentSlotId,
  generateImageForNode,
  triggerSave,
  vfsSession,
  onLiveToolCallsUpdate,
}: UseGameActionProps) => {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const getRecoveryTrace = (error: unknown): TurnRecoveryTrace | undefined => {
    if (!error || typeof error !== "object") return undefined;
    return (error as { recovery?: TurnRecoveryTrace }).recovery;
  };

  const getRecoveryKind = (error: unknown): string | undefined => {
    if (!error || typeof error !== "object") return undefined;
    return (error as { recoveryKind?: string }).recoveryKind;
  };

  const normalizeUsageForPersistence = (usage: TokenUsage): TokenUsage => {
    const normalize = (value: unknown): number => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return 0;
      }
      return Math.max(0, Math.floor(value));
    };

    const cacheRead =
      typeof usage.cacheRead === "number" && Number.isFinite(usage.cacheRead)
        ? Math.max(0, Math.floor(usage.cacheRead))
        : undefined;
    const cacheWrite =
      typeof usage.cacheWrite === "number" && Number.isFinite(usage.cacheWrite)
        ? Math.max(0, Math.floor(usage.cacheWrite))
        : undefined;

    return {
      promptTokens: normalize(usage.promptTokens),
      completionTokens: normalize(usage.completionTokens),
      totalTokens: normalize(usage.totalTokens),
      ...(typeof cacheRead === "number" ? { cacheRead } : {}),
      ...(typeof cacheWrite === "number" ? { cacheWrite } : {}),
      reported: usage.reported === true,
    };
  };

  const isSameUsage = (
    current: TokenUsage | undefined,
    next: TokenUsage,
  ): boolean => {
    if (!current) return false;

    return (
      current.promptTokens === next.promptTokens &&
      current.completionTokens === next.completionTokens &&
      current.totalTokens === next.totalTokens &&
      current.cacheRead === next.cacheRead &&
      current.cacheWrite === next.cacheWrite &&
      current.reported === next.reported
    );
  };

  const persistUsageToActiveTurn = useCallback(
    (usage: TokenUsage) => {
      const snapshot = vfsSession.snapshot();
      const index = readConversationIndex(snapshot);
      if (!index?.activeTurnId) {
        return;
      }

      const matched = /fork-(\d+)\/turn-(\d+)/.exec(index.activeTurnId);
      if (!matched) {
        return;
      }

      const forkId = Number(matched[1]);
      const turnNumber = Number(matched[2]);
      if (!Number.isFinite(forkId) || !Number.isFinite(turnNumber)) {
        return;
      }

      const turn = readTurnFile(snapshot, forkId, turnNumber);
      if (!turn) {
        return;
      }

      const normalizedUsage = normalizeUsageForPersistence(usage);
      if (isSameUsage(turn.assistant.usage, normalizedUsage)) {
        return;
      }

      writeTurnFile(vfsSession, forkId, turnNumber, {
        ...turn,
        assistant: {
          ...turn.assistant,
          usage: normalizedUsage,
        },
      });
    },
    [vfsSession],
  );

  const maybeRelaxLearnedContextWindow = useCallback(() => {
    const providerId = aiSettings.story.providerId;
    const modelId = aiSettings.story.modelId;
    const key = buildModelContextWindowKey(providerId, modelId);
    if (!key) return;

    const currentLearned = aiSettings.learnedModelContextWindows?.[key];
    if (
      typeof currentLearned !== "number" ||
      !Number.isFinite(currentLearned) ||
      currentLearned <= 0
    ) {
      return;
    }

    const currentStreak =
      aiSettings.learnedModelContextSuccessStreaks?.[key] || 0;
    const provider = aiSettings.providers.instances.find(
      (p) => p.id === providerId,
    );

    const result = relaxLearnedContextWindowOnSuccess({
      currentLearned,
      successStreak: currentStreak,
      providerProtocol: provider?.protocol,
      modelId,
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    const shouldPersist =
      result.nextLearned !== currentLearned ||
      result.relaxed ||
      result.nextSuccessStreak !== currentStreak;
    if (!shouldPersist) {
      return;
    }

    const nextStreaks = {
      ...(aiSettings.learnedModelContextSuccessStreaks || {}),
      [key]: result.nextSuccessStreak,
    };

    const nextLearned = {
      ...(aiSettings.learnedModelContextWindows || {}),
      [key]: result.nextLearned,
    };

    handleSaveSettings({
      ...aiSettings,
      learnedModelContextWindows: nextLearned,
      learnedModelContextSuccessStreaks: nextStreaks,
    });

    if (result.relaxed) {
      console.info("[ContextWindow][Learned] Relaxed learned limit", {
        providerId,
        modelId,
        previous: currentLearned,
        next: result.nextLearned,
      });
      showToast(t("game.info.learnedContextRelaxed"), "info", 2500);
    }
  }, [aiSettings, handleSaveSettings, showToast, t]);

  const recordLearnedOverflow = useCallback(
    (error: unknown) => {
      const diagnostics = parseContextOverflowDiagnostics(error);
      const learnedLimit = deriveLearnedContextWindowFromOverflow(diagnostics);
      if (!learnedLimit) {
        return;
      }

      const providerId = aiSettings.story.providerId;
      const modelId = aiSettings.story.modelId;
      const key = buildModelContextWindowKey(providerId, modelId);
      if (!key) {
        return;
      }

      const provider = aiSettings.providers.instances.find(
        (p) => p.id === providerId,
      );
      const learnedUpperBound = resolveModelContextWindowUpperBound({
        settings: aiSettings,
        providerId,
        providerProtocol: provider?.protocol,
        modelId,
        fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
      });

      const prevLearned = aiSettings.learnedModelContextWindows?.[key];
      const nextLearnedMap = upsertLearnedModelContextWindow(
        aiSettings.learnedModelContextWindows,
        providerId,
        modelId,
        learnedLimit,
        learnedUpperBound,
      );
      const nextLearned = nextLearnedMap[key];

      const nextSettings: AISettings = {
        ...aiSettings,
        learnedModelContextWindows: nextLearnedMap,
        learnedModelContextSuccessStreaks: {
          ...(aiSettings.learnedModelContextSuccessStreaks || {}),
          [key]: 0,
        },
      };
      handleSaveSettings(nextSettings);

      if (!prevLearned || (nextLearned && nextLearned < prevLearned)) {
        console.info("[ContextWindow][Learned] Updated learned limit", {
          providerId,
          modelId,
          learnedLimit: nextLearned,
          previousLimit: prevLearned,
          upperBound: learnedUpperBound,
          diagnostics,
        });
      }
    },
    [aiSettings, handleSaveSettings],
  );

  // Ref to access latest state in async callbacks/closures
  const gameStateRef = useRef(gameState);
  const processingRef = useRef(false);

  // Update refs when state changes
  gameStateRef.current = gameState;
  processingRef.current = gameState.isProcessing;

  const handleAction = useCallback(
    async (
      action: string,
      isInit: boolean = false,
      forceTheme?: string,
      fromNodeId?: string,
      preventFork: boolean = false,
    ): Promise<ActionResult | null> => {
      console.log("[useGameAction] handleAction called", {
        action,
        isInit,
        forceTheme,
        fromNodeId,
        preventFork,
      });

      // Check both the ref (immediate) and state (persisted)
      const blockedByProcessingRef = processingRef.current && !isInit;
      const blockedByGameStateProcessing =
        gameStateRef.current.isProcessing && !isInit;
      const blockedByTranslating = isTranslating;
      if (
        blockedByProcessingRef ||
        blockedByGameStateProcessing ||
        blockedByTranslating
      ) {
        console.warn("[useGameAction] handleAction ignored", {
          reason: {
            processingRef: blockedByProcessingRef,
            gameStateProcessing: blockedByGameStateProcessing,
            translating: blockedByTranslating,
          },
          isInit,
          turnNumber: gameStateRef.current.turnNumber,
          activeNodeId: gameStateRef.current.activeNodeId,
          actionPreview:
            typeof action === "string"
              ? action.slice(0, 120)
              : String(action).slice(0, 120),
        });
        return null;
      }

      // Immediately lock
      if (!isInit) processingRef.current = true;

      const newSegmentId = Date.now().toString();
      const userNodeId = `user-${newSegmentId}`;
      // If fromNodeId is provided, use it as parent. Otherwise use activeNodeId.
      const parentId =
        fromNodeId || (isInit ? null : gameStateRef.current.activeNodeId);

      let effectiveUserNodeId = userNodeId;
      let effectiveParentId = parentId;
      let reuseExistingNode = false;

      // --- Fork Logic ---
      const { currentForkId, currentForkTree } = handleForking(
        gameStateRef.current,
        parentId,
        preventFork,
        isInit,
        aiSettings,
        currentSlotId,
      );

      // --- Reuse Logic ---
      if (!isInit && parentId) {
        const parentNode = gameStateRef.current.nodes[parentId];

        // 1. Check if we are explicitly retrying the same node (same text, same parent)
        // This handles the case where we might have just clicked "Retry" on a user node
        if (
          parentNode &&
          parentNode.role === "user" &&
          parentNode.text === action
        ) {
          effectiveUserNodeId = parentId;
          effectiveParentId = parentNode.parentId;
          reuseExistingNode = true;
        }

        // 2. If preventFork is true (Retry Mode), try to find an existing sibling with the same text
        // This prevents creating a duplicate User Node when retrying a turn
        if (!reuseExistingNode && preventFork) {
          const siblingNode = Object.values(gameStateRef.current.nodes).find(
            (n) =>
              n.parentId === parentId && n.role === "user" && n.text === action,
          );

          if (siblingNode) {
            effectiveUserNodeId = siblingNode.id;
            effectiveParentId = parentId;
            reuseExistingNode = true;
            console.log(
              `[HandleAction] Reusing existing sibling node ${siblingNode.id} for retry`,
            );
          }
        }
      }

      // --- Fork-Safe Summary Retrieval ---
      let baseSummaries: StorySummary[] = [];
      let baseIndex = 0;

      // Use effectiveParentId for context
      if (effectiveParentId && gameStateRef.current.nodes[effectiveParentId]) {
        const pNode = gameStateRef.current.nodes[effectiveParentId];
        baseSummaries = pNode.summaries ?? gameStateRef.current.summaries ?? [];
        baseIndex =
          pNode.summarizedIndex ??
          gameStateRef.current.lastSummarizedIndex ??
          0;
      } else {
        baseSummaries = gameStateRef.current.summaries ?? [];
        baseIndex = gameStateRef.current.lastSummarizedIndex ?? 0;
      }
      // -----------------------------------

      if (!isInit) {
        setGameState((prev) => {
          // Check if fork ID changed - clear history for KV cache rebuild
          const forkChanged = currentForkId !== prev.forkId;

          // If reusing, just set processing and clear error
          if (reuseExistingNode) {
            return {
              ...prev,
              isProcessing: true,
              liveToolCalls: [],
              error: null,
              forkId: currentForkId,
              forkTree: currentForkTree,
              // History invalidation handled by session manager
            };
          }

          // Otherwise add new node
          const newNode: StorySegment = {
            segmentIdx:
              (gameStateRef.current.nodes[effectiveParentId || ""]
                ?.segmentIdx ?? -1) + 1,
            id: userNodeId,
            parentId: parentId,
            text: action,
            choices: [],
            imagePrompt: "",
            role: "user",
            timestamp: Date.now(),
            usage: {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              reported: false,
            },
            summaries: baseSummaries,
            summarizedIndex: baseIndex,
            ending: "continue",
          };

          const newNodes = {
            ...prev.nodes,
            [userNodeId]: newNode,
          };

          return {
            ...prev,
            isProcessing: true,
            liveToolCalls: [],
            error: null,
            nodes: newNodes,
            activeNodeId: userNodeId,
            currentFork: deriveHistory(newNodes, userNodeId),
            forkId: currentForkId,
            forkTree: currentForkTree,
            // History invalidation handled by session manager (forkId change creates new session)
          };
        });
      } else {
        setGameState((prev) => ({
          ...prev,
          isProcessing: true,
          liveToolCalls: [],
          error: null,
        }));
      }

      onLiveToolCallsUpdate?.([]);

      try {
        // --- Summarization Logic ---
        const {
          effectiveSummaries,
          lastIndex,
          summarySnapshot,
          contextNodes,
          logs: summaryLogs,
          error: summaryError,
        } = await handleSummarization(
          gameStateRef.current,
          effectiveParentId,
          effectiveUserNodeId,
          action,
          baseSummaries,
          baseIndex,
          isInit,
          aiSettings,
          language,
          vfsSession,
          currentSlotId,
          currentForkId,
        );

        // Update logs if summarization occurred
        if (summaryLogs && summaryLogs.length > 0) {
          // Aggregate usage from all summary logs
          const aggregatedUsage = summaryLogs.reduce(
            (acc, log) => ({
              promptTokens: acc.promptTokens + (log.usage?.promptTokens || 0),
              completionTokens:
                acc.completionTokens + (log.usage?.completionTokens || 0),
              totalTokens: acc.totalTokens + (log.usage?.totalTokens || 0),
              cacheRead: acc.cacheRead + (log.usage?.cacheRead || 0),
              cacheWrite: acc.cacheWrite + (log.usage?.cacheWrite || 0),
            }),
            {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              cacheRead: 0,
              cacheWrite: 0,
            },
          );

          setGameState((prev) => ({
            ...prev,
            logs: [...summaryLogs, ...prev.logs].slice(0, 100),
            tokenUsage: {
              promptTokens:
                (prev.tokenUsage?.promptTokens || 0) +
                aggregatedUsage.promptTokens,
              completionTokens:
                (prev.tokenUsage?.completionTokens || 0) +
                aggregatedUsage.completionTokens,
              totalTokens:
                (prev.tokenUsage?.totalTokens || 0) +
                aggregatedUsage.totalTokens,
              cacheRead:
                (prev.tokenUsage?.cacheRead || 0) + aggregatedUsage.cacheRead,
              cacheWrite:
                (prev.tokenUsage?.cacheWrite || 0) + aggregatedUsage.cacheWrite,
            },
          }));

          updateProviderStats(
            handleSaveSettings,
            aiSettings.story.providerId,
            aggregatedUsage,
          );
        }

        // Notify session manager that summary was created
        // This clears the cached history so the next turn starts fresh
        if (summarySnapshot) {
          await notifySessionSummaryCreated(
            aiSettings,
            currentSlotId || "default",
            currentForkId,
            summarySnapshot.id || Date.now(),
            vfsSession,
          );
        }

        // Update the user node in state with the FINAL summary state for this turn
        if (!isInit) {
          setGameState((prev) => {
            const updatedUserNode = {
              ...prev.nodes[effectiveUserNodeId],
              summaries: effectiveSummaries,
              summarizedIndex: lastIndex,
            };

            const newNodes = {
              ...prev.nodes,
              [effectiveUserNodeId]: updatedUserNode,
            };

            return {
              ...prev,
              nodes: newNodes,
              // Update global view for UI (optional, but good for debugging)
              summaries: effectiveSummaries,
              lastSummarizedIndex: lastIndex,
              currentFork: deriveHistory(newNodes, effectiveUserNodeId),
            };
          });
        }

        // New Summary/Compact behavior: for each turn, only include the unsummarized
        // portion of history (no “keep last N turns” overlap).
        // [FIX] Traverse from the PARENT to avoid including the current optimistic user node.
        const segmentsToSend = effectiveParentId
          ? deriveHistory(
              gameStateRef.current.nodes,
              effectiveParentId,
              true,
              lastIndex,
            )
          : [];

        // Prepare state for generation
        // Note: History is now managed internally by session manager
        const effectiveGameState = {
          ...gameStateRef.current,
        };

        const runtimeVfsMode: "normal" | "god" = gameStateRef.current.godMode
          ? "god"
          : "normal";
        const confirmRecoveryAction = ({
          type: _type,
          message,
        }: {
          type: "turn_retry_boost" | "session_rebuild";
          message: string;
        }) => (typeof window !== "undefined" ? window.confirm(message) : false);
        let vfsElevationToken: string | null = null;
        let vfsElevationIntent:
          | "god_turn"
          | "sudo_command"
          | "outline_submit"
          | "history_rewrite"
          | "editor_session"
          | undefined;
        let vfsElevationScopeTemplateIds: string[] | "all_elevated" | undefined;

        if (runtimeVfsMode === "god") {
          const allowElevatedWrite =
            typeof window !== "undefined"
              ? window.confirm(
                  t("commands.godMode.elevationConfirm") ||
                    "God mode is active. Allow elevated VFS writes for this request?",
                )
              : false;

          if (allowElevatedWrite) {
            vfsElevationIntent = "god_turn";
            vfsElevationScopeTemplateIds = "all_elevated";
            vfsElevationToken = vfsElevationTokenManager.issueAiElevationToken({
              intent: "god_turn",
              scopeTemplateIds: "all_elevated",
            });
          }
        }

        // Generate Turn - pass GameState directly with TurnContext
        const {
          response,
          logs: turnLogs,
          usage,
          changedEntities,
          recovery,
        } = await generateAdventureTurn(effectiveGameState, {
          recentHistory: segmentsToSend,
          userAction: action,
          isRetryGeneration: preventFork,
          language: LANG_MAP[language],
          themeKey: gameStateRef.current.theme,
          tFunc: t,
          settings: aiSettings,
          slotId: currentSlotId || "default",
          isInit: isInit,
          vfsSession,
          onToolCallsUpdate: onLiveToolCallsUpdate,
          vfsMode: runtimeVfsMode,
          vfsElevationToken,
          vfsElevationIntent,
          vfsElevationScopeTemplateIds,
          confirmRecoveryAction,
        });

        persistUsageToActiveTurn(usage);
        maybeRelaxLearnedContextWindow();

        if (recovery?.recovered) {
          console.info("[TurnRecovery][GameAction]", {
            mode: "normal",
            kind: recovery.kind,
            finalLevel: recovery.finalLevel,
            attemptCount: recovery.attempts.length,
            durationMs: recovery.durationMs,
            recovered: recovery.recovered,
          });
          showToast(
            t("game.info.autoRecoverySuccess", {
              defaultValue:
                "Auto-recovery succeeded. Continued from the latest stable checkpoint.",
            }),
            "info",
            3500,
          );
        }

        // ===== STATE UPDATE =====
        const vfsSnapshot = vfsSession.snapshot();
        if (Object.keys(vfsSnapshot).length === 0) {
          throw new Error(
            "VFS snapshot is empty after turn. Ensure tools wrote state files.",
          );
        }
        const derivedState = deriveGameStateFromVfs(vfsSnapshot);
        const viewState = mergeDerivedViewState(
          gameStateRef.current,
          derivedState,
        );
        syncSettingsFromGlobalSoulAfterTurn({
          snapshot: vfsSnapshot,
          settings: aiSettings,
          updateSettings: handleSaveSettings,
        });
        const activeModelNodeId = derivedState.activeNodeId;
        if (!activeModelNodeId) {
          throw new Error(
            "VFS conversation missing active turn after turn completion.",
          );
        }
        const derivedUserNodeId = activeModelNodeId.startsWith("model-")
          ? activeModelNodeId.replace(/^model-/, "user-")
          : null;
        const effectiveModelNodeId = activeModelNodeId;
        const effectiveViewUserNodeId =
          derivedUserNodeId && viewState.nodes[derivedUserNodeId]
            ? derivedUserNodeId
            : effectiveUserNodeId;

        // Collect state changes for toast notifications (with names)
        // Collect unlock events from all action types
        const unlockEvents: Array<{ name: string; reason: string }> = [];

        // Check inventory unlocks
        response.inventoryActions
          ?.filter((a) => a.unlocked === true && a.unlockReason)
          .forEach((a) => {
            unlockEvents.push({
              name: a.name || "Unknown Item",
              reason: a.unlockReason || "",
            });
          });

        // Check npc unlocks
        response.npcActions
          ?.filter((a) => a.unlocked === true && a.unlockReason)
          .forEach((a) => {
            unlockEvents.push({
              name: a.visible?.name || "Unknown NPC",
              reason: a.unlockReason || "",
            });
          });

        // Check location unlocks
        response.locationActions
          ?.filter((a) => a.unlocked === true && a.unlockReason)
          .forEach((a) => {
            unlockEvents.push({
              name: a.name || "Unknown Location",
              reason: a.unlockReason || "",
            });
          });

        // Check quest unlocks
        response.questActions
          ?.filter((a) => a.unlocked === true && a.unlockReason)
          .forEach((a) => {
            unlockEvents.push({
              name: a.title || t("game.unknown.quest"),
              reason: a.unlockReason || "",
            });
          });

        // Check knowledge unlocks
        response.knowledgeActions
          ?.filter((a) => a.unlocked === true && a.unlockReason)
          .forEach((a) => {
            unlockEvents.push({
              name: a.title || t("game.unknown.knowledge"),
              reason: a.unlockReason || "",
            });
          });

        // Check for System Toasts (e.g. from Context Compression)
        if (response.systemToasts && response.systemToasts.length > 0) {
          // We need to import useToast hook logic here or dispatch event.
          // Since useGameAction is a hook, we can just use the toast context if we had it passed in.
          // Wait, useGameAction doesn't have toast context. It returns stateChanges.
          // But we ARE returning stateChanges. Let's add them there?
          // "entitiesUnlocked" is part of state changes.
          // We need to modify stateChanges to include system alerts?
          // Or better, let's look at where handleAction is called.
          // Ah, AdventurePage calls handleAction.
          // Actually, we can just hack it here if we want or return it.
          // Let's add "systemNotifications" to "stateChanges" returned by handleAction.
        }

        const stateChanges = {
          itemsAdded:
            response.inventoryActions
              ?.filter((a) => a.action === "add")
              .map((a) => ({ name: a.name || t("game.unknown.item") })) || [],
          itemsRemoved:
            response.inventoryActions
              ?.filter((a) => a.action === "remove")
              .map((a) => ({ name: a.name || t("game.unknown.item") })) || [],
          npcsAdded:
            response.npcActions
              ?.filter((a) => a.action === "add")
              .map((a) => ({
                name: a.visible?.name || t("game.unknown.npc"),
              })) || [],
          questsAdded:
            response.questActions
              ?.filter((a) => a.action === "add")
              .map((a) => ({ name: a.title || t("game.unknown.quest") })) || [],
          questsCompleted:
            response.questActions
              ?.filter((a) => a.action === "complete")
              .map((a) => ({ name: a.title || t("game.unknown.quest") })) || [],
          locationsDiscovered:
            response.locationActions
              ?.filter((a) => a.action === "add")
              .map((a) => ({
                name: a.name || t("game.unknown.location"),
              })) || [],
          entitiesUnlocked: unlockEvents.length > 0 ? unlockEvents : undefined,
          // NEW: System Toasts - Enforce required types
          systemToasts: [
            ...(response.systemToasts?.map((toast) => ({
              message: toast.message || t("game.unknown.systemAlert"),
              type: (toast.type || "info") as
                | "info"
                | "warning"
                | "error"
                | "success",
            })) || []),
            ...(summaryError
              ? [
                  {
                    message: t("game.errors.summaryFailed"),
                    type: "warning" as const,
                  },
                ]
              : []),
          ],
        };

        // Create Model Node using Helper
        const { modelNode, responseAtmosphere, modelNodeId } = createModelNode(
          response,
          viewState,
          effectiveViewUserNodeId,
          isInit,
          effectiveSummaries,
          lastIndex,
          summarySnapshot,
          usage,
          newSegmentId,
          forceTheme,
          {
            finalState: derivedState,
            modelNodeId: effectiveModelNodeId,
          },
        );

        // Update State with Response
        setGameState((prev) => {
          const mergedBase = mergeDerivedViewState(prev, derivedState);
          const newNodes = {
            ...mergedBase.nodes,
            [modelNodeId]: modelNode,
          };

          const updatedState = {
            ...mergedBase,
            nodes: newNodes,
            activeNodeId: modelNodeId,
            rootNodeId: isInit
              ? modelNodeId
              : mergedBase.rootNodeId || modelNodeId,
            currentFork: deriveHistory(newNodes, modelNodeId),
            summaries: effectiveSummaries,
            lastSummarizedIndex: lastIndex,
            isProcessing: false,
            // Only trigger image generation if there's a valid imagePrompt
            // In manual mode, don't auto-set generating state - wait for user click
            isImageGenerating: !!(
              modelNode.imagePrompt && modelNode.imagePrompt.trim()
            ),
            generatingNodeId:
              modelNode.imagePrompt && modelNode.imagePrompt.trim()
                ? modelNodeId
                : null,
            atmosphere: responseAtmosphere,
            liveToolCalls: [],
            logs: [...turnLogs, ...mergedBase.logs].slice(0, 100),
            tokenUsage: {
              promptTokens:
                (mergedBase.tokenUsage?.promptTokens || 0) +
                (usage.promptTokens || 0),
              completionTokens:
                (mergedBase.tokenUsage?.completionTokens || 0) +
                (usage.completionTokens || 0),
              totalTokens:
                (mergedBase.tokenUsage?.totalTokens || 0) +
                (usage.totalTokens || 0),
              cacheRead:
                (mergedBase.tokenUsage?.cacheRead || 0) +
                (usage.cacheRead || 0),
              cacheWrite:
                (mergedBase.tokenUsage?.cacheWrite || 0) +
                (usage.cacheWrite || 0),
            },
          };

          // CRITICAL: Update ref immediately to ensure generateImageForNode can see the new node
          gameStateRef.current = updatedState;

          return updatedState;
        });

        // Update provider stats
        updateProviderStats(
          handleSaveSettings,
          aiSettings.story.providerId,
          usage,
        );

        // Trigger image generation if there's a valid imagePrompt
        // The ref has been updated above, so this should work now
        if (modelNode.imagePrompt && modelNode.imagePrompt.trim()) {
          console.log(
            "[handleAction] Triggering image generation for node:",
            modelNodeId,
          );
          // Call async but don't await - let it run in background
          generateImageForNode(modelNodeId, modelNode).catch((error) => {
            console.error("[handleAction] Image generation failed:", error);
          });
        }

        // Trigger auto-save after successful turn generation
        triggerSave();

        return {
          success: true,
          stateChanges,
        };
      } catch (error) {
        console.error("Game Loop Error:", error);
        const debugErrorMsg =
          error instanceof Error ? error.message : String(error);
        const recoveryTrace = getRecoveryTrace(error);
        const recoveryKind = getRecoveryKind(error);

        // Check for history corrupted error (e.g., invalid argument errors)
        const isHistoryCorrupted =
          error instanceof HistoryCorruptedError || recoveryKind === "history";

        const isContextOverflow =
          debugErrorMsg.includes("CONTEXT_LENGTH_EXCEEDED") ||
          recoveryKind === "context";

        const isUnknownProviderError = debugErrorMsg.includes(
          "[ERROR: UNKNOWN_PROVIDER_ERROR]",
        );

        if (isContextOverflow) {
          recordLearnedOverflow(error);
        }

        if (recoveryTrace) {
          console.warn("[TurnRecovery][GameAction] final_failure", {
            mode: "normal",
            kind: recoveryKind,
            finalLevel: recoveryTrace.finalLevel,
            attemptCount: recoveryTrace.attempts.length,
            durationMs: recoveryTrace.durationMs,
            recovered: recoveryTrace.recovered,
          });
        }

        // Check for context overflow
        if (isContextOverflow || isHistoryCorrupted) {
          console.log(
            `[Context] ${isHistoryCorrupted ? "History corrupted" : "Overflow"} detected - session manager will handle cache clearing`,
          );
          // Session manager handles history clearing on context overflow
          showToast(
            isHistoryCorrupted
              ? t("game.errors.historyCacheCorrupted")
              : t("game.errors.contextTooLongAdaptive"),
            "warning",
            5000,
          );
        } else {
          showToast(
            isUnknownProviderError
              ? t("game.errors.unknownProviderManualRetry")
              : t("game.errors.turnGenerationFailed"),
            "error",
            5000,
          );
        }

        const userFacingErrorMessage = isHistoryCorrupted
          ? t("game.errors.historyCacheCorrupted")
          : isContextOverflow
            ? t("game.errors.contextTooLongAdaptive")
            : isUnknownProviderError
              ? t("game.errors.unknownProviderManualRetry")
              : t("game.errors.turnGenerationFailed");

        setGameState((prev) => ({
          ...prev,
          isProcessing: false,
          liveToolCalls: [],
          error: userFacingErrorMessage,
          // History clearing handled by session manager
        }));
        processingRef.current = false;
        return {
          success: false,
          error: userFacingErrorMessage,
        };
      } finally {
        onLiveToolCallsUpdate?.([]);
        processingRef.current = false;
      }
    },
    [
      aiSettings,
      maybeRelaxLearnedContextWindow,
      recordLearnedOverflow,
      persistUsageToActiveTurn,
      handleSaveSettings,
      language,
      isTranslating,
      setGameState,
      t,
      currentSlotId,
    ],
  );

  const handleInvalidateSession = useCallback(async () => {
    const { story } = aiSettings;
    if (!story || !currentSlotId) return;

    const sessionId = `${currentSlotId}:${gameStateRef.current.forkId ?? 0}:${story.providerId}:${story.modelId}`;
    console.log(`[useGameAction] Manually invalidating session: ${sessionId}`);
    await sessionManager.invalidate(sessionId, "manual_clear");
    vfsSession.beginReadEpoch("manual_invalidate");
  }, [aiSettings, currentSlotId, vfsSession]);

  const handleRebuildContext = useCallback(async () => {
    if (processingRef.current || gameStateRef.current.isProcessing) return;

    // Confirmation is handled by ActionPanel modal

    processingRef.current = true;
    setGameState((prev) => ({
      ...prev,
      isProcessing: true,
      liveToolCalls: [],
      error: null,
    }));

    try {
      const parentId = gameStateRef.current.activeNodeId;
      if (!parentId) throw new Error("No active node to rebuild context from");

      const pNode = gameStateRef.current.nodes[parentId];
      const baseSummaries =
        pNode.summaries ?? gameStateRef.current.summaries ?? [];
      const baseIndex =
        pNode.summarizedIndex ?? gameStateRef.current.lastSummarizedIndex ?? 0;

      const { effectiveSummaries, lastIndex, summarySnapshot, logs } =
        await handleSummarization(
          gameStateRef.current,
          parentId,
          `rebuild-${Date.now()}`,
          "", // No new action
          baseSummaries,
          baseIndex,
          false,
          aiSettings,
          language,
          vfsSession,
          currentSlotId,
          gameStateRef.current.forkId ?? 0,
          true, // FORCE SUMMARIZE
        );

      if (logs && logs.length > 0) {
        const aggregatedUsage = logs.reduce(
          (acc, log) => ({
            promptTokens: acc.promptTokens + (log.usage?.promptTokens || 0),
            completionTokens:
              acc.completionTokens + (log.usage?.completionTokens || 0),
            totalTokens: acc.totalTokens + (log.usage?.totalTokens || 0),
            cacheRead: acc.cacheRead + (log.usage?.cacheRead || 0),
            cacheWrite: acc.cacheWrite + (log.usage?.cacheWrite || 0),
          }),
          {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            cacheRead: 0,
            cacheWrite: 0,
          },
        );

        setGameState((prev) => ({
          ...prev,
          logs: [...logs, ...prev.logs].slice(0, 100),
          tokenUsage: {
            promptTokens:
              (prev.tokenUsage?.promptTokens || 0) +
              aggregatedUsage.promptTokens,
            completionTokens:
              (prev.tokenUsage?.completionTokens || 0) +
              aggregatedUsage.completionTokens,
            totalTokens:
              (prev.tokenUsage?.totalTokens || 0) + aggregatedUsage.totalTokens,
            cacheRead:
              (prev.tokenUsage?.cacheRead || 0) + aggregatedUsage.cacheRead,
            cacheWrite:
              (prev.tokenUsage?.cacheWrite || 0) + aggregatedUsage.cacheWrite,
          },
        }));
      }

      if (summarySnapshot) {
        // Update the active node to become a node WITH the summary attached
        // The summary covers all content from the previous summary to this node
        // The active node (last model/command output) gets the summarySnapshot
        setGameState((prev) => {
          const activeNodeId = prev.activeNodeId;

          // If no active node, just update global state
          if (!activeNodeId || !prev.nodes[activeNodeId]) {
            const newState = {
              ...prev,
              summaries: effectiveSummaries,
              lastSummarizedIndex: lastIndex,
              isProcessing: false,
              liveToolCalls: [],
            };
            // CRITICAL: Update ref immediately for subsequent handleAction calls
            gameStateRef.current = newState;
            return newState;
          }

          // Update the active node with new summarization metadata
          // Set summarySnapshot to make this node "the node with summary"
          const activeNode = prev.nodes[activeNodeId];
          const updatedActiveNode: StorySegment = {
            ...activeNode,
            summaries: effectiveSummaries,
            summarizedIndex: lastIndex,
            summarySnapshot: summarySnapshot, // Attach the summary to this node
          };

          const newState = {
            ...prev,
            nodes: {
              ...prev.nodes,
              [activeNodeId]: updatedActiveNode,
            },
            summaries: effectiveSummaries,
            lastSummarizedIndex: lastIndex,
            isProcessing: false,
            liveToolCalls: [],
          };
          // CRITICAL: Update ref immediately for subsequent handleAction calls
          gameStateRef.current = newState;
          return newState;
        });

        // Clear history cache in session manager
        await notifySessionSummaryCreated(
          aiSettings,
          currentSlotId || "default",
          gameStateRef.current.forkId ?? 0,
          summarySnapshot.id || Date.now(),
          vfsSession,
        );

        showToast(t("game.success.contextRebuilt"), "success");
        triggerSave();
      } else {
        // No new summary created (maybe already summarized or no new nodes)
        setGameState((prev) => ({
          ...prev,
          isProcessing: false,
          liveToolCalls: [],
        }));
        showToast(t("game.info.noNewNodesToSummarize"), "info");
      }
    } catch (error) {
      console.error("Rebuild context failed:", error);
      const message = t("game.errors.contextRebuildFailed");
      showToast(message, "error", 5000);
      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        liveToolCalls: [],
        error: message,
      }));
    } finally {
      processingRef.current = false;
    }
  }, [
    aiSettings,
    language,
    currentSlotId,
    t,
    showToast,
    setGameState,
    triggerSave,
    vfsSession,
  ]);

  return { handleAction, handleRebuildContext, handleInvalidateSession };
};
