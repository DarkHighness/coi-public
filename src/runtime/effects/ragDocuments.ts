import type { GameState, ResolvedThemeConfig } from "../../types";
import type { VfsFileMap } from "../../services/vfs/types";
import type { VfsSession } from "../../services/vfs/vfsSession";
import { getRAGService } from "../../services/rag";
import {
  diffSnapshotFiles,
  extractFileChunksFromSnapshot,
} from "../../services/rag/vfsExtraction";

interface SaveAwareGameState extends GameState {
  saveId?: string;
}

const snapshotCache = new Map<string, VfsFileMap>();

const buildCacheKey = (saveId: string, forkId: number): string =>
  `${saveId}::${forkId}`;

const cloneSnapshot = (snapshot: VfsFileMap): VfsFileMap => {
  const next: VfsFileMap = {};
  for (const [path, file] of Object.entries(snapshot)) {
    next[path] = { ...file };
  }
  return next;
};

function extractXmlTagValue(
  input: string | undefined,
  tagName: string,
): string | undefined {
  if (!input) return undefined;
  const regex = new RegExp(
    `<${tagName}>\\s*([\\s\\S]*?)\\s*<\\/${tagName}>`,
    "i",
  );
  const match = input.match(regex);
  const value = match?.[1]?.trim();
  return value ? value : undefined;
}

export function applyCustomContextThemeOverrides(
  themeConfig: ResolvedThemeConfig,
  customContext?: string,
): ResolvedThemeConfig {
  const narrativeStyleOverride = extractXmlTagValue(
    customContext,
    "narrative_style",
  );
  if (!narrativeStyleOverride) return themeConfig;
  return { ...themeConfig, narrativeStyle: narrativeStyleOverride };
}

const buildIndexOptions = (state: SaveAwareGameState) => ({
  saveId: state.saveId || "unknown",
  forkId: state.forkId || 0,
  turnNumber: state.turnNumber || 0,
});

const getChangedSnapshot = (
  snapshot: VfsFileMap,
  changedPaths: string[],
): VfsFileMap => {
  const changed: VfsFileMap = {};
  for (const path of changedPaths) {
    const file = snapshot[path];
    if (file) {
      changed[path] = file;
    }
  }
  return changed;
};

export async function updateRAGDocumentsBackground(
  changedEntities: Array<{ id: string; type: string }>,
  state: SaveAwareGameState,
  vfsSession?: VfsSession,
): Promise<void> {
  if (!vfsSession) return;

  try {
    const ragService = getRAGService();
    if (!ragService || !ragService.initialized) return;

    const options = buildIndexOptions(state);
    const cacheKey = buildCacheKey(options.saveId, options.forkId);
    const snapshot = vfsSession.snapshotAllCanonical();
    const previous = snapshotCache.get(cacheKey);

    if (!previous) {
      const documents = extractFileChunksFromSnapshot(snapshot, options);
      await ragService.reindexAll({
        saveId: options.saveId,
        forkId: options.forkId,
        turnNumber: options.turnNumber,
        documents,
      });
      snapshotCache.set(cacheKey, cloneSnapshot(snapshot));
      console.log(
        `[RAG Update] Initialized index with ${documents.length} chunks (changes=${changedEntities.length})`,
      );
      return;
    }

    const diff = diffSnapshotFiles(previous, snapshot);
    const pathsToDelete = Array.from(
      new Set([...diff.changedPaths, ...diff.removedPaths]),
    );

    if (pathsToDelete.length === 0) {
      return;
    }

    // Replace path history in-place to avoid unbounded storage growth from
    // superseded versions on high-frequency updates.
    await ragService.deleteByPaths({
      saveId: options.saveId,
      forkId: options.forkId,
      paths: pathsToDelete,
    });

    const changedSnapshot = getChangedSnapshot(snapshot, diff.changedPaths);
    const changedDocuments = extractFileChunksFromSnapshot(
      changedSnapshot,
      options,
    );

    if (changedDocuments.length > 0) {
      await ragService.upsertFileChunks(changedDocuments);
    }

    snapshotCache.set(cacheKey, cloneSnapshot(snapshot));

    console.log(
      `[RAG Update] Incremental index updated (changed=${diff.changedPaths.length}, removed=${diff.removedPaths.length}, upserted=${changedDocuments.length}, entities=${changedEntities.length})`,
    );
  } catch (error) {
    console.error("[RAG Update] Failed:", error);
  }
}

export async function indexInitialEntities(
  state: GameState,
  saveId: string,
  vfsSession?: VfsSession,
): Promise<void> {
  if (!vfsSession) return;

  try {
    const ragService = getRAGService();
    if (!ragService || !ragService.initialized) return;

    const forkId = state.forkId || 0;

    await ragService.switchSave(saveId, forkId, state.forkTree);

    const options = {
      saveId,
      forkId,
      turnNumber: state.turnNumber || 0,
    };

    const snapshot = vfsSession.snapshotAllCanonical();
    const documents = extractFileChunksFromSnapshot(snapshot, options);

    await ragService.reindexAll({
      saveId,
      forkId,
      turnNumber: options.turnNumber,
      documents,
    });

    snapshotCache.set(buildCacheKey(saveId, forkId), cloneSnapshot(snapshot));

    console.log(
      `[RAG Init] Indexed ${documents.length} VFS chunks for save=${saveId}, fork=${forkId}`,
    );
  } catch (error) {
    console.error("[RAG Init] Failed:", error);
  }
}
