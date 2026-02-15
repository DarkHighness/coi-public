import { useState, useEffect, useCallback } from "react";
import { getRAGService, type ProgressEvent } from "../services/rag";

export interface EmbeddingProgress {
  stage: "embedding" | "indexing" | "searching" | "cleanup" | "idle";
  current: number;
  total: number;
  message?: string;
}

export const useEmbeddingStatus = () => {
  const [progress, setProgress] = useState<EmbeddingProgress | null>(null);

  const handleProgress = useCallback((event: ProgressEvent["data"]) => {
    setProgress({
      stage: event.phase as EmbeddingProgress["stage"],
      current: event.current,
      total: event.total,
      message: event.message,
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
