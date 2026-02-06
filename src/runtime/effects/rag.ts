import type { ForkTree } from "../../types";

interface EnsureRagSaveContextParams {
  embeddingEnabled: boolean | undefined;
  ragInitialized: boolean;
  saveId: string;
  forkId: number;
  forkTree: ForkTree;
  switchSave: (
    saveId: string,
    forkId: number,
    forkTree: ForkTree,
  ) => Promise<boolean>;
}

export async function ensureRagSaveContext({
  embeddingEnabled,
  ragInitialized,
  saveId,
  forkId,
  forkTree,
  switchSave,
}: EnsureRagSaveContextParams): Promise<boolean> {
  if (!saveId) return false;
  if (!embeddingEnabled || !ragInitialized) {
    return false;
  }

  try {
    return await switchSave(saveId, forkId, forkTree);
  } catch (error) {
    console.error("[Runtime/RAG] Failed to switch save context:", error);
    return false;
  }
}
