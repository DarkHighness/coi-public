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
} from "../types";
import { generateAdventureTurn } from "../services/aiService";
import { HistoryCorruptedError } from "../services/ai/contextCompressor";
import { LANG_MAP } from "../utils/constants";
import { deriveHistory, getSegmentsForAI } from "../utils/storyUtils";
import {
  updateProviderStats,
  handleForking,
  handleSummarization,
  createModelNode,
  notifySessionSummaryCreated,
} from "./gameActionHelpers";
import { sessionManager } from "../services/ai/sessionManager";

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
}: UseGameActionProps) => {
  const { t } = useTranslation();
  const { showToast } = useToast();

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
      if (
        (processingRef.current && !isInit) ||
        (gameStateRef.current.isProcessing && !isInit) ||
        isTranslating
      )
        return null;

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
        baseSummaries = pNode.summaries || [];
        baseIndex = pNode.summarizedIndex || 0;
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
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
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
        setGameState((prev) => ({ ...prev, isProcessing: true, error: null }));
      }

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

          // Notify session manager that summary was created
          // This clears the cached history so the next turn starts fresh
          if (summarySnapshot) {
            await notifySessionSummaryCreated(
              aiSettings,
              currentSlotId || "default",
              currentForkId,
              summarySnapshot.id || Date.now(),
            );
          }
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

        // Apply freshSegmentCount overlap for narrative continuity
        // [FIX] Derive history from PARENT node to avoid including the current optimistic user node
        // This prevents double-submission of the user action (once in history, once as prompt)
        const freshCount = aiSettings.freshSegmentCount ?? 4;

        // We use the UPDATED nodes from gameStateRef (which includes the new node),
        // but we start traversal from the PARENT to get "history before this turn"
        const parentHistory = effectiveParentId
          ? deriveHistory(gameStateRef.current.nodes, effectiveParentId)
          : []; // If no parent (start of game), history is empty

        const segmentsToSend = getSegmentsForAI(
          parentHistory,
          lastIndex,
          freshCount,
        );

        // Prepare state for generation
        // Note: History is now managed internally by session manager
        const effectiveGameState = {
          ...gameStateRef.current,
        };

        // Generate Turn - pass GameState directly with TurnContext
        const {
          response,
          logs: turnLogs,
          usage,
          changedEntities,
        } = await generateAdventureTurn(effectiveGameState, {
          recentHistory: segmentsToSend,
          userAction: action,
          language: LANG_MAP[language],
          themeKey: gameStateRef.current.theme,
          tFunc: t,
          settings: aiSettings,
          slotId: currentSlotId || "default",
          isInit: isInit,
        });

        // ===== STATE UPDATE =====
        const finalState = response.finalState;

        if (!finalState) {
          throw new Error(
            "AI Service did not return a final state. Agentic loop failed?",
          );
        }

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

        // Check relationship unlocks
        response.relationshipActions
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
              name: a.title || "Unknown Quest",
              reason: a.unlockReason || "",
            });
          });

        // Check knowledge unlocks
        response.knowledgeActions
          ?.filter((a) => a.unlocked === true && a.unlockReason)
          .forEach((a) => {
            unlockEvents.push({
              name: a.title || "Unknown Knowledge",
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
              .map((a) => ({ name: a.name || "Unknown Item" })) || [],
          itemsRemoved:
            response.inventoryActions
              ?.filter((a) => a.action === "remove")
              .map((a) => ({ name: a.name || "Unknown Item" })) || [],
          npcsAdded:
            response.relationshipActions
              ?.filter((a) => a.action === "add")
              .map((a) => ({ name: a.visible?.name || "Unknown NPC" })) || [],
          questsAdded:
            response.questActions
              ?.filter((a) => a.action === "add")
              .map((a) => ({ name: a.title || "Unknown Quest" })) || [],
          questsCompleted:
            response.questActions
              ?.filter((a) => a.action === "complete")
              .map((a) => ({ name: a.title || "Unknown Quest" })) || [],
          locationsDiscovered:
            response.locationActions
              ?.filter((a) => a.action === "add")
              .map((a) => ({ name: a.name || "Unknown Location" })) || [],
          entitiesUnlocked: unlockEvents.length > 0 ? unlockEvents : undefined,
          // NEW: System Toasts - Enforce required types
          systemToasts: [
            ...(response.systemToasts?.map((t) => ({
              message: t.message || "Unknown system alert",
              type: (t.type || "info") as
                | "info"
                | "warning"
                | "error"
                | "success",
            })) || []),
            ...(summaryError
              ? [
                  {
                    message: `${t("game.errors.summaryFailed")}: ${summaryError}`,
                    type: "warning" as const,
                  },
                ]
              : []),
          ],
        };

        // Create Model Node using Helper
        const { modelNode, responseAtmosphere, modelNodeId } = createModelNode(
          response,
          gameStateRef.current,
          effectiveUserNodeId,
          isInit,
          effectiveSummaries,
          lastIndex,
          summarySnapshot,
          usage,
          newSegmentId,
          forceTheme,
        );

        // Update State with Response
        setGameState((prev) => {
          const newNodes = {
            ...prev.nodes,
            [modelNodeId]: modelNode,
          };

          const updatedState = {
            ...prev,
            nodes: newNodes,
            activeNodeId: modelNodeId,
            rootNodeId: isInit ? modelNodeId : prev.rootNodeId || modelNodeId,
            currentFork: deriveHistory(newNodes, modelNodeId),

            // Apply the full new state from the database
            inventory: finalState.inventory,
            relationships: finalState.relationships,
            quests: finalState.quests,
            currentLocation: finalState.currentLocation,
            locations: finalState.locations,
            character: finalState.character,
            knowledge: finalState.knowledge,
            factions: finalState.factions,
            time: finalState.time,
            timeline: finalState.timeline,
            causalChains: finalState.causalChains,
            // History is now managed internally by session manager
            turnNumber: prev.turnNumber + 1,

            summaries: effectiveSummaries,
            isProcessing: false,
            // Only trigger image generation if there's a valid imagePrompt
            // In manual mode, don't auto-set generating state - wait for user click
            isImageGenerating: !!(
              modelNode.imagePrompt &&
              modelNode.imagePrompt.trim() &&
              !aiSettings.manualImageGen
            ),
            generatingNodeId:
              modelNode.imagePrompt &&
              modelNode.imagePrompt.trim() &&
              !aiSettings.manualImageGen
                ? modelNodeId
                : null,
            atmosphere: responseAtmosphere,
            theme: prev.theme,
            logs: [...turnLogs, ...prev.logs].slice(0, 100),
            tokenUsage: {
              promptTokens:
                (prev.tokenUsage?.promptTokens || 0) +
                (usage.promptTokens || 0),
              completionTokens:
                (prev.tokenUsage?.completionTokens || 0) +
                (usage.completionTokens || 0),
              totalTokens:
                (prev.tokenUsage?.totalTokens || 0) + (usage.totalTokens || 0),
              cacheRead:
                (prev.tokenUsage?.cacheRead || 0) + (usage.cacheRead || 0),
              cacheWrite:
                (prev.tokenUsage?.cacheWrite || 0) + (usage.cacheWrite || 0),
            },
          };

          // CRITICAL: Update ref immediately to ensure generateImageForNode can see the new node
          gameStateRef.current = updatedState;

          // Trigger save
          triggerSave();

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
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";

        // Check for history corrupted error (e.g., invalid argument errors)
        const isHistoryCorrupted = error instanceof HistoryCorruptedError;

        // Check for context overflow
        if (
          errorMsg.includes("CONTEXT_LENGTH_EXCEEDED") ||
          isHistoryCorrupted
        ) {
          console.log(
            `[Context] ${isHistoryCorrupted ? "History corrupted" : "Overflow"} detected - session manager will handle cache clearing`,
          );
          // Session manager handles history clearing on context overflow
          showToast(
            isHistoryCorrupted
              ? "History cache corrupted. The cache has been cleared. Please retry."
              : "Context too long. Please create a summary to continue.",
            "warning",
            5000,
          );
        } else {
          showToast(errorMsg, "error", 5000);
        }

        setGameState((prev) => ({
          ...prev,
          isProcessing: false,
          error: error instanceof Error ? error.message : "Unknown error",
          // History clearing handled by session manager
        }));
        processingRef.current = false;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      } finally {
        processingRef.current = false;
      }
    },
    [
      aiSettings,
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
  }, [aiSettings, currentSlotId]);

  const handleRebuildContext = useCallback(async () => {
    if (processingRef.current || gameStateRef.current.isProcessing) return;

    if (!window.confirm(t("confirmRebuildContext"))) return;

    processingRef.current = true;
    setGameState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      const parentId = gameStateRef.current.activeNodeId;
      if (!parentId) throw new Error("No active node to rebuild context from");

      const pNode = gameStateRef.current.nodes[parentId];
      const baseSummaries = pNode.summaries || [];
      const baseIndex = pNode.summarizedIndex || 0;

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
            return {
              ...prev,
              summaries: effectiveSummaries,
              lastSummarizedIndex: lastIndex,
              isProcessing: false,
            };
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

          return {
            ...prev,
            nodes: {
              ...prev.nodes,
              [activeNodeId]: updatedActiveNode,
            },
            summaries: effectiveSummaries,
            lastSummarizedIndex: lastIndex,
            isProcessing: false,
          };
        });

        // Clear history cache in session manager
        await notifySessionSummaryCreated(
          aiSettings,
          currentSlotId || "default",
          gameStateRef.current.forkId ?? 0,
          summarySnapshot.id || Date.now(),
        );

        showToast(t("game.success.contextRebuilt"), "success");
        triggerSave();
      } else {
        // No new summary created (maybe already summarized or no new nodes)
        setGameState((prev) => ({ ...prev, isProcessing: false }));
        showToast(t("game.info.noNewNodesToSummarize"), "info");
      }
    } catch (error) {
      console.error("Rebuild context failed:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      showToast(errorMsg, "error", 5000);
      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        error: errorMsg,
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
  ]);

  return { handleAction, handleRebuildContext, handleInvalidateSession };
};
