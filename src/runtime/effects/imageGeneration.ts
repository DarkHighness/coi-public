import {
  useEffect,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { saveImage } from "../../utils/imageStorage";
import type { AISettings, GameState, StorySegment } from "../../types";
import { generateSceneImage } from "../../services/aiService";
import {
  patchTurnMediaForNode,
  type TurnMediaPatch,
} from "../../services/vfs/turnMedia";
import type { VfsSession } from "../../services/vfs/vfsSession";

export type ImageGenerationIssueCode =
  | "missing_prompt"
  | "timeout"
  | "empty_result"
  | "generation_error";

export interface ImageGenerationIssue {
  code: ImageGenerationIssueCode;
  nodeId: string;
  error?: string;
}

interface UseImageGenerationQueueParams {
  aiSettings: AISettings;
  currentSlotId: string | null;
  vfsSession: VfsSession;
  gameStateRef: MutableRefObject<GameState>;
  setGameState: Dispatch<SetStateAction<GameState>>;
  triggerSave: () => void;
  onGenerationIssue?: (issue: ImageGenerationIssue) => void;
}

interface QueuedImageGeneration {
  nodeId: string;
  imagePrompt?: string;
}

export function useImageGenerationQueue({
  aiSettings,
  currentSlotId,
  vfsSession,
  gameStateRef,
  setGameState,
  triggerSave,
  onGenerationIssue,
}: UseImageGenerationQueueParams) {
  const [imageQueue, setImageQueue] = useState<QueuedImageGeneration[]>([]);
  const [failedImageNodes, setFailedImageNodes] = useState<Set<string>>(
    new Set(),
  );
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);

  useEffect(() => {
    const processQueue = async () => {
      if (isQueueProcessing || imageQueue.length === 0) return;

      const queueItem = imageQueue[0];
      const nodeId = queueItem.nodeId;
      const node = gameStateRef.current.nodes[nodeId];
      const effectivePrompt =
        typeof queueItem.imagePrompt === "string" &&
        queueItem.imagePrompt.trim().length > 0
          ? queueItem.imagePrompt
          : node?.imagePrompt || "";

      if (!node) {
        setImageQueue((prev) => prev.slice(1));
        return;
      }

      if (!effectivePrompt.trim()) {
        console.warn(
          "Cannot generate image from queue: missing imagePrompt for nodeId:",
          nodeId,
        );
        onGenerationIssue?.({
          code: "missing_prompt",
          nodeId,
        });
        setFailedImageNodes((prev) => new Set(prev).add(nodeId));
        setImageQueue((prev) => prev.slice(1));
        return;
      }

      patchTurnMediaForNode(vfsSession, nodeId, {
        imagePrompt: effectivePrompt,
      });

      setIsQueueProcessing(true);
      setGameState((prev) => ({
        ...prev,
        isImageGenerating: true,
        generatingNodeId: nodeId,
      }));

      setFailedImageNodes((prev) => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });

      console.log(
        "Processing image queue item:",
        nodeId,
        "Remaining:",
        imageQueue.length - 1,
      );

      let timedOut = false;
      const imageTimeout = setTimeout(
        () => {
          setGameState((prev) => {
            if (prev.isImageGenerating && prev.generatingNodeId === nodeId) {
              console.warn("Image generation timeout for node:", nodeId);
              timedOut = true;
              onGenerationIssue?.({
                code: "timeout",
                nodeId,
              });
              return {
                ...prev,
                isImageGenerating: false,
                generatingNodeId: null,
              };
            }
            return prev;
          });
        },
        (aiSettings.imageTimeout || 60) * 1000,
      );

      try {
        const snapshot = node.stateSnapshot || gameStateRef.current;

        const { url, log, blob } = await generateSceneImage(
          effectivePrompt,
          aiSettings,
          gameStateRef.current,
          snapshot,
        );
        clearTimeout(imageTimeout);

        if (blob) {
          const imageId = await saveImage(blob, {
            saveId: currentSlotId || "unsaved",
            forkId: gameStateRef.current.forkId,
            turnIdx: node.segmentIdx || gameStateRef.current.turnNumber,
            imagePrompt: effectivePrompt,
            storyTitle: gameStateRef.current.outline?.title || undefined,
            location: gameStateRef.current.currentLocation || undefined,
            storyTime: gameStateRef.current.time || undefined,
          });

          setGameState((prev) => ({
            ...prev,
            isImageGenerating: false,
            generatingNodeId: null,
            logs: [log, ...prev.logs].slice(0, 100),
            tokenUsage: {
              promptTokens:
                (prev.tokenUsage?.promptTokens || 0) +
                (log.usage?.promptTokens || 0),
              completionTokens:
                (prev.tokenUsage?.completionTokens || 0) +
                (log.usage?.completionTokens || 0),
              totalTokens:
                (prev.tokenUsage?.totalTokens || 0) +
                (log.usage?.totalTokens || 0),
              cacheRead:
                (prev.tokenUsage?.cacheRead || 0) + (log.usage?.cacheRead || 0),
              cacheWrite:
                (prev.tokenUsage?.cacheWrite || 0) +
                (log.usage?.cacheWrite || 0),
            },
            nodes: {
              ...prev.nodes,
              [nodeId]: {
                ...prev.nodes[nodeId],
                imageId,
                imageUrl: undefined,
              },
            },
          }));
          patchTurnMediaForNode(vfsSession, nodeId, {
            imagePrompt: effectivePrompt,
            imageId,
            imageUrl: null,
          });
          triggerSave();
        } else if (url && url.trim()) {
          setGameState((prev) => ({
            ...prev,
            isImageGenerating: false,
            generatingNodeId: null,
            logs: [log, ...prev.logs].slice(0, 100),
            tokenUsage: {
              promptTokens:
                (prev.tokenUsage?.promptTokens || 0) +
                (log.usage?.promptTokens || 0),
              completionTokens:
                (prev.tokenUsage?.completionTokens || 0) +
                (log.usage?.completionTokens || 0),
              totalTokens:
                (prev.tokenUsage?.totalTokens || 0) +
                (log.usage?.totalTokens || 0),
              cacheRead:
                (prev.tokenUsage?.cacheRead || 0) + (log.usage?.cacheRead || 0),
              cacheWrite:
                (prev.tokenUsage?.cacheWrite || 0) +
                (log.usage?.cacheWrite || 0),
            },
            nodes: {
              ...prev.nodes,
              [nodeId]: { ...prev.nodes[nodeId], imageUrl: url },
            },
          }));
          patchTurnMediaForNode(vfsSession, nodeId, {
            imagePrompt: effectivePrompt,
            imageId: null,
            imageUrl: url,
          });
          triggerSave();
        } else {
          console.warn("Image generation returned empty URL for node:", nodeId);
          if (!timedOut) {
            onGenerationIssue?.({
              code: "empty_result",
              nodeId,
            });
          }
          setGameState((prev) => ({
            ...prev,
            isImageGenerating: false,
            generatingNodeId: null,
            logs: [log, ...prev.logs].slice(0, 100),
            tokenUsage: {
              promptTokens:
                (prev.tokenUsage?.promptTokens || 0) +
                (log.usage?.promptTokens || 0),
              completionTokens:
                (prev.tokenUsage?.completionTokens || 0) +
                (log.usage?.completionTokens || 0),
              totalTokens:
                (prev.tokenUsage?.totalTokens || 0) +
                (log.usage?.totalTokens || 0),
              cacheRead:
                (prev.tokenUsage?.cacheRead || 0) + (log.usage?.cacheRead || 0),
              cacheWrite:
                (prev.tokenUsage?.cacheWrite || 0) +
                (log.usage?.cacheWrite || 0),
            },
          }));
          setFailedImageNodes((prev) => new Set(prev).add(nodeId));
        }
      } catch (e) {
        clearTimeout(imageTimeout);
        console.error(
          "Failed to generate image for node:",
          nodeId,
          "Error:",
          e,
        );
        if (!timedOut) {
          onGenerationIssue?.({
            code: "generation_error",
            nodeId,
            error: e instanceof Error ? e.message : String(e),
          });
        }
        setGameState((prev) => ({
          ...prev,
          isImageGenerating: false,
          generatingNodeId: null,
        }));
        setFailedImageNodes((prev) => new Set(prev).add(nodeId));
      } finally {
        setIsQueueProcessing(false);
        setImageQueue((prev) => prev.slice(1));
      }
    };

    processQueue();
  }, [
    imageQueue,
    isQueueProcessing,
    aiSettings,
    currentSlotId,
    vfsSession,
    triggerSave,
    setGameState,
    gameStateRef,
    onGenerationIssue,
  ]);

  const generateImageForNode = async (
    nodeId: string,
    nodeOverride?: StorySegment,
    _isManualClick: boolean = false,
  ) => {
    const node = nodeOverride || gameStateRef.current.nodes[nodeId];
    const imagePrompt =
      typeof node?.imagePrompt === "string" ? node.imagePrompt.trim() : "";
    if (!node || !imagePrompt) {
      console.warn(
        "Cannot generate image: missing node or imagePrompt for nodeId:",
        nodeId,
      );
      onGenerationIssue?.({
        code: "missing_prompt",
        nodeId,
      });
      return;
    }

    setImageQueue((prev) => {
      if (prev.some((item) => item.nodeId === nodeId)) return prev;
      return [...prev, { nodeId, imagePrompt }];
    });
  };

  return {
    failedImageNodes,
    generateImageForNode,
  };
}
