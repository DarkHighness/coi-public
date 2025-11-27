import { useState, useEffect } from "react";
import {
  getEmbeddingManager,
  EmbeddingProgress,
} from "../services/embedding";

export const useEmbeddingStatus = () => {
  const [progress, setProgress] = useState<EmbeddingProgress | null>(null);

  useEffect(() => {
    const manager = getEmbeddingManager();
    if (!manager) return;

    const handleProgress = (newProgress: EmbeddingProgress) => {
      setProgress(newProgress);
    };

    manager.addProgressObserver(handleProgress);

    return () => {
      manager.removeProgressObserver(handleProgress);
    };
  }, []);

  return progress;
};
