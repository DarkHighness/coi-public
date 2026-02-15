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

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
};

const resolveDisplayProgress = (
  event: ProgressEvent["data"],
): { current: number; total: number } => {
  const paramCurrent = toFiniteNumber(event.messageParams?.current);
  const paramTotal = toFiniteNumber(event.messageParams?.total);

  if (paramCurrent !== null && paramTotal !== null && paramTotal > 0) {
    return {
      current: Math.max(0, Math.min(paramTotal, paramCurrent)),
      total: paramTotal,
    };
  }

  const count = toFiniteNumber(event.messageParams?.count);
  if (count !== null && count > 0) {
    return { current: count, total: count };
  }

  return {
    current: Math.max(0, event.current),
    total: Math.max(1, event.total),
  };
};

export const useEmbeddingStatus = () => {
  const [progress, setProgress] = useState<EmbeddingProgress | null>(null);

  const handleProgress = useCallback((event: ProgressEvent["data"]) => {
    setProgress((prev) => {
      const display = resolveDisplayProgress(event);
      const next: EmbeddingProgress = {
        stage: event.phase as EmbeddingProgress["stage"],
        current: display.current,
        total: display.total,
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
