import { useState, useEffect, useCallback } from "react";
import { getRAGService, type ProgressEvent } from "../services/rag";

export interface EmbeddingProgress {
  stage: "embedding" | "indexing" | "searching" | "cleanup" | "idle";
  current: number;
  total: number;
  message?: string;
  messageKey?: string;
  messageParams?: Record<string, string | number>;
}

const areMessageParamsEqual = (
  left?: Record<string, string | number>,
  right?: Record<string, string | number>,
): boolean => {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return !left && !right;
  }
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  return leftKeys.every((key) => left[key] === right[key]);
};

export const useEmbeddingStatus = () => {
  const [progress, setProgress] = useState<EmbeddingProgress | null>(null);

  const handleProgress = useCallback((event: ProgressEvent["data"]) => {
    setProgress((prev) => {
      const next: EmbeddingProgress = {
        stage: event.phase as EmbeddingProgress["stage"],
        current: event.current,
        total: event.total,
        message: event.message,
        messageKey: event.messageKey,
        messageParams: event.messageParams,
      };

      if (
        prev &&
        prev.stage === next.stage &&
        prev.current === next.current &&
        prev.total === next.total &&
        prev.message === next.message &&
        prev.messageKey === next.messageKey &&
        areMessageParamsEqual(prev.messageParams, next.messageParams)
      ) {
        return prev;
      }

      return next;
    });
  }, []);

  useEffect(() => {
    const ragService = getRAGService();
    if (!ragService) return;

    ragService.on("progress", handleProgress);

    return () => {
      ragService.off("progress", handleProgress);
    };
  }, [handleProgress]);

  return progress;
};
