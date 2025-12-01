import { useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  AISettings,
  StorySegment,
  StorySummary,
  ActionResult,
  GameState,
  LanguageCode,
} from "../types";
import { generateAdventureTurn } from "../services/aiService";
import { LANG_MAP } from "../utils/constants";
import { normalizeAliveEntities } from "../utils/snapshotManager";
import { deriveHistory } from "../utils/storyUtils";
import {
  updateProviderStats,
  handleForking,
  handleSummarization,
  createModelNode,
} from "./gameActionHelpers";

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
          // If reusing, just set processing and clear error
          if (reuseExistingNode) {
            return {
              ...prev,
              isProcessing: true,
              error: null,
              forkId: currentForkId,
              forkTree: currentForkTree,
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
          log: summaryLog,
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
        if (summaryLog) {
          setGameState((prev) => ({
            ...prev,
            logs: [summaryLog, ...prev.logs].slice(0, 50),
            tokenUsage: {
              promptTokens:
                (prev.tokenUsage?.promptTokens || 0) +
                (summaryLog.usage?.promptTokens || 0),
              completionTokens:
                (prev.tokenUsage?.completionTokens || 0) +
                (summaryLog.usage?.completionTokens || 0),
              totalTokens:
                (prev.tokenUsage?.totalTokens || 0) +
                (summaryLog.usage?.totalTokens || 0),
              cacheRead:
                (prev.tokenUsage?.cacheRead || 0) +
                (summaryLog.usage?.cacheRead || 0),
              cacheWrite:
                (prev.tokenUsage?.cacheWrite || 0) +
                (summaryLog.usage?.cacheWrite || 0),
            },
          }));

          updateProviderStats(
            aiSettings,
            handleSaveSettings,
            aiSettings.story.providerId,
            summaryLog.usage,
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

        // We send everything from the last summarized point onwards
        const startIndex = Math.max(0, lastIndex - 1);
        let segmentsToSend = contextNodes.slice(startIndex);

        // Generate Turn - pass GameState directly with TurnContext
        const {
          response,
          logs: turnLogs,
          usage,
          changedEntities,
        } = await generateAdventureTurn(gameStateRef.current, {
          recentHistory: segmentsToSend,
          userAction: action,
          language: LANG_MAP[language],
          themeKey: gameStateRef.current.theme,
          tFunc: t,
          settings: aiSettings,
        });

        // ===== STATE UPDATE =====
        const finalState = response.finalState;

        if (!finalState) {
          throw new Error(
            "AI Service did not return a final state. Agentic loop failed?",
          );
        }

        // Collect state changes for toast notifications (with names)
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
            nextIds: finalState.nextIds,
            timeline: finalState.timeline,
            causalChains: finalState.causalChains,

            // Context Priority System: update alive entities and increment turn
            aliveEntities: normalizeAliveEntities(response.aliveEntities),
            turnNumber: prev.turnNumber + 1,

            summaries: effectiveSummaries,
            isProcessing: false,
            // Only trigger image generation if there's a valid imagePrompt
            isImageGenerating: !!(
              modelNode.imagePrompt && modelNode.imagePrompt.trim()
            ),
            generatingNodeId:
              modelNode.imagePrompt && modelNode.imagePrompt.trim()
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
          aiSettings,
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
        setGameState((prev) => ({
          ...prev,
          isProcessing: false,
          error: error instanceof Error ? error.message : "Unknown error",
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

  return { handleAction };
};
