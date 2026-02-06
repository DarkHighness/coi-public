import { useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { generateSceneImage } from "../../services/aiService";
import { saveImage } from "../../utils/imageStorage";
import type { AISettings, GameState, StorySegment } from "../../types";

interface UseImageGenerationQueueParams {
  aiSettings: AISettings;
  currentSlotId: string | null;
  gameStateRef: MutableRefObject<GameState>;
  setGameState: Dispatch<SetStateAction<GameState>>;
  triggerSave: () => void;
}

export function useImageGenerationQueue({
  aiSettings,
  currentSlotId,
  gameStateRef,
  setGameState,
  triggerSave,
}: UseImageGenerationQueueParams) {
  const [imageQueue, setImageQueue] = useState<string[]>([]);
  const [failedImageNodes, setFailedImageNodes] = useState<Set<string>>(
    new Set(),
  );
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);

  useEffect(() => {
    const processQueue = async () => {
      if (isQueueProcessing || imageQueue.length === 0) return;

      const nodeId = imageQueue[0];
      const node = gameStateRef.current.nodes[nodeId];

      if (!node) {
        setImageQueue((prev) => prev.slice(1));
        return;
      }

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

      const imageTimeout = setTimeout(
        () => {
          setGameState((prev) => {
            if (prev.isImageGenerating && prev.generatingNodeId === nodeId) {
              console.warn("Image generation timeout for node:", nodeId);
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
          node.imagePrompt || "",
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
            imagePrompt: node.imagePrompt || "",
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
          triggerSave();
        } else {
          console.warn("Image generation returned empty URL for node:", nodeId);
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
        console.error("Failed to generate image for node:", nodeId, "Error:", e);
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
  }, [imageQueue, isQueueProcessing, aiSettings, currentSlotId, triggerSave, setGameState, gameStateRef]);

  const generateImageForNode = async (
    nodeId: string,
    nodeOverride?: StorySegment,
    _isManualClick: boolean = false,
  ) => {
    const node = nodeOverride || gameStateRef.current.nodes[nodeId];
    if (!node || !node.imagePrompt) {
      console.warn(
        "Cannot generate image: missing node or imagePrompt for nodeId:",
        nodeId,
      );
      return;
    }

    setImageQueue((prev) => {
      if (prev.includes(nodeId)) return prev;
      return [...prev, nodeId];
    });
  };

  return {
    failedImageNodes,
    generateImageForNode,
  };
}
