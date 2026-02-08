/**
 * Save Export/Import Service
 *
 * Handles exporting and importing game saves in ZIP format
 * with optional images and embeddings.
 */

import JSZip from "jszip";
import type {
  GameState,
  SaveSlot,
  VersionedGameState,
  ExportManifest,
  ExportOptions,
  ExportStats,
  ImportResult,
  ImportValidation,
  I18nMessage,
  StorySegment,
  GameStateSnapshot,
} from "../types";
import { CURRENT_EXPORT_VERSION, CURRENT_SAVE_VERSION } from "../types";
import {
  saveMetadata,
  loadMetadata,
  openVfsDB,
  VFS_META_STORE,
} from "../utils/indexedDB";
import {
  getImagesBySaveId,
  saveImage,
} from "../utils/imageStorage";
import { getRAGService } from "./rag";
import type { RAGExportData } from "./rag/types";
import { IndexedDbVfsStore } from "./vfs/store";
import type { VfsSnapshot } from "./vfs/types";
import { VfsSession } from "./vfs/vfsSession";
import { hashContent } from "./vfs/utils";
import {
  applySharedMutableStateToSession,
  extractSharedMutableStateFromSnapshot,
  restoreVfsSessionFromSnapshot,
  saveVfsSessionSnapshot,
} from "./vfs/persistence";
import { deriveGameStateFromVfs } from "./vfs/derivations";
import { seedVfsSessionFromGameState } from "./vfs/seed";
import { writeOutlineFile, writeOutlineProgress } from "./vfs/outline";
import {
  buildTurnId,
  writeConversationIndex,
  writeForkTree,
  writeTurnFile,
} from "./vfs/conversation";

// App version for export metadata
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

// Current export format version
const EXPORT_FORMAT_VERSION = CURRENT_EXPORT_VERSION;

type VfsLatestMeta = { forkId: number; turn: number };

interface VfsExportIndexEntry {
  forkId: number;
  turn: number;
  createdAt: number;
}

interface VfsExportBundleIndex {
  version: number;
  latest: VfsLatestMeta | null;
  snapshots: VfsExportIndexEntry[];
}

type SnapshotImageTransformOptions = {
  remapImageIds?: Map<string, string>;
  stripImageReferences?: boolean;
};

const IMAGE_REFERENCE_KEYS = new Set([
  "imageId",
  "imageUrl",
  "seedImageId",
  "previewImage",
]);

const transformJsonValueForImageReferences = (
  value: unknown,
  options: SnapshotImageTransformOptions,
): unknown => {
  if (typeof value === "string") {
    const mapped = options.remapImageIds?.get(value);
    return mapped ?? value;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      transformJsonValueForImageReferences(item, options),
    );
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const nextObject: Record<string, unknown> = {};
  for (const [key, rawChild] of Object.entries(value as Record<string, unknown>)) {
    if (options.stripImageReferences && IMAGE_REFERENCE_KEYS.has(key)) {
      continue;
    }

    nextObject[key] = transformJsonValueForImageReferences(rawChild, options);
  }

  return nextObject;
};

const rewriteSnapshotImageReferences = (
  snapshot: VfsSnapshot,
  options: SnapshotImageTransformOptions,
): VfsSnapshot => {
  const shouldRemap = (options.remapImageIds?.size ?? 0) > 0;
  const shouldStrip = options.stripImageReferences;

  if (!shouldRemap && !shouldStrip) {
    return snapshot;
  }

  const nextFiles = { ...snapshot.files };
  let changed = false;

  for (const [path, file] of Object.entries(snapshot.files)) {
    if (file.contentType !== "application/json") {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(file.content);
    } catch {
      continue;
    }

    const transformed = transformJsonValueForImageReferences(parsed, options);
    const nextContent = JSON.stringify(transformed);
    if (nextContent === file.content) {
      continue;
    }

    changed = true;
    nextFiles[path] = {
      ...file,
      content: nextContent,
      hash: hashContent(nextContent),
      size: nextContent.length,
      updatedAt: Date.now(),
    };
  }

  if (!changed) {
    return snapshot;
  }

  return {
    ...snapshot,
    files: nextFiles,
  };
};

const isValidExportManifest = (value: unknown): value is ExportManifest => {
  if (!value || typeof value !== "object") return false;
  const manifest = value as any;

  if (typeof manifest.version !== "number") return false;
  if (typeof manifest.exportDate !== "string") return false;
  if (typeof manifest.appVersion !== "string") return false;
  if (typeof manifest.saveVersion !== "number") return false;

  if (!manifest.slot || typeof manifest.slot !== "object") return false;
  if (typeof manifest.slot.name !== "string") return false;
  if (typeof manifest.slot.theme !== "string") return false;

  if (!manifest.includes || typeof manifest.includes !== "object") return false;
  if (typeof manifest.includes.images !== "boolean") return false;
  if (typeof manifest.includes.embeddings !== "boolean") return false;
  if (typeof manifest.includes.logs !== "boolean") return false;

  if (!manifest.stats || typeof manifest.stats !== "object") return false;
  if (typeof manifest.stats.nodeCount !== "number") return false;
  if (typeof manifest.stats.imageCount !== "number") return false;
  if (typeof manifest.stats.embeddingCount !== "number") return false;

  return true;
};

const isValidLatestMeta = (value: unknown): value is VfsLatestMeta => {
  if (!value || typeof value !== "object") return false;
  const forkId = (value as any).forkId;
  const turn = (value as any).turn;
  return typeof forkId === "number" && typeof turn === "number";
};

const loadLatestVfsMeta = async (saveId: string): Promise<VfsLatestMeta | null> => {
  try {
    const meta = await loadMetadata<unknown>(`vfs_latest:${saveId}`);
    if (isValidLatestMeta(meta)) {
      return meta;
    }
  } catch (error) {
    console.warn("[SaveExport] Failed to load vfs_latest metadata:", error);
  }

  try {
    const entries = await listVfsSnapshotIndexEntries(saveId);
    if (entries.length === 0) return null;
    const latest = entries.reduce((best, entry) => {
      if (!best) return entry;
      if (entry.createdAt > best.createdAt) return entry;
      return best;
    }, null as VfsExportIndexEntry | null);
    return latest ? { forkId: latest.forkId, turn: latest.turn } : null;
  } catch (error) {
    console.warn("[SaveExport] Failed to infer latest VFS snapshot:", error);
    return null;
  }
};

const listVfsSnapshotIndexEntries = async (
  saveId: string,
): Promise<VfsExportIndexEntry[]> => {
  const db = await openVfsDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VFS_META_STORE], "readonly");
    const store = transaction.objectStore(VFS_META_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const rows = (request.result as any[] | undefined) ?? [];
      const filtered = rows
        .filter(
          (row) =>
            row &&
            typeof row.saveId === "string" &&
            row.saveId === saveId &&
            typeof row.forkId === "number" &&
            typeof row.turn === "number",
        )
        .map((row) => ({
          forkId: row.forkId as number,
          turn: row.turn as number,
          createdAt: typeof row.createdAt === "number" ? row.createdAt : 0,
        }))
        .sort((a, b) => a.forkId - b.forkId || a.turn - b.turn);

      resolve(filtered);
    };

    request.onerror = () => reject(request.error);
  });
};

const loadSharedMutableStateForSave = async (
  saveId: string,
  latestSnapshot?: VfsSnapshot | null,
): Promise<Record<string, any> | null> => {
  try {
    const stored = await loadMetadata<{ files?: unknown }>(`vfs_shared:${saveId}`);
    if (stored?.files && typeof stored.files === "object") {
      return stored.files as Record<string, any>;
    }
  } catch (error) {
    console.warn("[SaveExport] Failed to load vfs_shared metadata:", error);
  }

  if (latestSnapshot) {
    const inferred = extractSharedMutableStateFromSnapshot(latestSnapshot as any);
    if (Object.keys(inferred).length > 0) {
      return inferred as Record<string, any>;
    }
  }

  return null;
};

const loadDerivedStateFromLatestVfsSnapshot = async (
  saveId: string,
): Promise<{ state: VersionedGameState; latest: VfsLatestMeta } | null> => {
  const latest = await loadLatestVfsMeta(saveId);
  if (!latest) return null;

  const store = new IndexedDbVfsStore();
  const snapshot = await store.loadSnapshot(saveId, latest.forkId, latest.turn);
  if (!snapshot) {
    return null;
  }

  const session = new VfsSession();
  restoreVfsSessionFromSnapshot(session, snapshot);

  const shared = await loadSharedMutableStateForSave(saveId, snapshot);
  if (shared) {
    applySharedMutableStateToSession(session, shared as any);
  }

  const derived = deriveGameStateFromVfs(session.snapshot()) as VersionedGameState;
  if (!derived._saveVersion) {
    derived._saveVersion = {
      version: CURRENT_SAVE_VERSION,
      createdAt: Date.now(),
    };
  }

  return { state: derived, latest };
};

const writeVfsSnapshotsToZip = async (
  zip: JSZip,
  saveId: string,
  options?: { includeImages: boolean },
): Promise<{
  snapshotCount: number;
  latest: VfsLatestMeta | null;
}> => {
  const indexEntries = await listVfsSnapshotIndexEntries(saveId);
  if (indexEntries.length === 0) {
    return { snapshotCount: 0, latest: null };
  }

  const latest = await loadLatestVfsMeta(saveId);
  const store = new IndexedDbVfsStore();

  const bundle: VfsExportBundleIndex = {
    version: 1,
    latest,
    snapshots: indexEntries,
  };

  zip.file("vfs/index.json", JSON.stringify(bundle, null, 2));

  const snapshotsRoot = zip.folder("vfs")?.folder("snapshots");
  if (!snapshotsRoot) {
    console.warn("[SaveExport] Failed to create vfs/snapshots folder in ZIP");
    return { snapshotCount: 0, latest };
  }

  let written = 0;
  for (const entry of indexEntries) {
    try {
      const snapshot = await store.loadSnapshot(saveId, entry.forkId, entry.turn);
      if (!snapshot) {
        console.warn(
          `[SaveExport] Missing VFS snapshot for fork=${entry.forkId} turn=${entry.turn}`,
        );
        continue;
      }

      const snapshotForExport =
        options?.includeImages === false
          ? rewriteSnapshotImageReferences(snapshot, {
              stripImageReferences: true,
            })
          : snapshot;

      const forkFolder = snapshotsRoot.folder(`fork-${entry.forkId}`);
      forkFolder?.file(
        `turn-${entry.turn}.json`,
        JSON.stringify(snapshotForExport, null, 2),
      );
      written += 1;
    } catch (error) {
      console.warn(
        `[SaveExport] Failed to export VFS snapshot fork=${entry.forkId} turn=${entry.turn}:`,
        error,
      );
    }
  }

  let latestSnapshot: VfsSnapshot | null = null;
  if (latest) {
    latestSnapshot = await store.loadSnapshot(saveId, latest.forkId, latest.turn);
  }

  const shared = await loadSharedMutableStateForSave(saveId, latestSnapshot);
  zip.file(
    "vfs/shared.json",
    JSON.stringify(
      {
        version: 1,
        updatedAt: Date.now(),
        files: shared ?? {},
      },
      null,
      2,
    ),
  );

  return { snapshotCount: written, latest };
};

type LegacyParsedNodeId =
  | { kind: "turn"; role: "model" | "user"; forkId: number; turn: number }
  | { kind: "turnId"; forkId: number; turn: number };

const parseLegacyNodeId = (id: string): LegacyParsedNodeId | null => {
  if (typeof id !== "string") return null;
  const match = /^(model|user)-fork-(\d+)\/turn-(\d+)$/.exec(id);
  if (match) {
    return {
      kind: "turn",
      role: match[1] === "model" ? "model" : "user",
      forkId: Number(match[2]),
      turn: Number(match[3]),
    };
  }
  const bare = /^fork-(\d+)\/turn-(\d+)$/.exec(id);
  if (bare) {
    return {
      kind: "turnId",
      forkId: Number(bare[1]),
      turn: Number(bare[2]),
    };
  }
  return null;
};

type LegacyTurnSegments = { user?: StorySegment; model?: StorySegment };

const buildLegacyTurnsIndex = (
  nodes: Record<string, StorySegment> | undefined,
): Map<number, Map<number, LegacyTurnSegments>> => {
  const byFork = new Map<number, Map<number, LegacyTurnSegments>>();
  if (!nodes) return byFork;

  for (const [id, node] of Object.entries(nodes)) {
    const parsed = parseLegacyNodeId(id);
    if (!parsed || parsed.kind !== "turn") continue;
    const { forkId, turn, role } = parsed;
    if (!Number.isFinite(forkId) || !Number.isFinite(turn)) continue;

    const forkMap = byFork.get(forkId) ?? new Map<number, LegacyTurnSegments>();
    const entry = forkMap.get(turn) ?? {};
    if (role === "model") entry.model = node;
    if (role === "user") entry.user = node;
    forkMap.set(turn, entry);
    byFork.set(forkId, forkMap);
  }

  return byFork;
};

const createVfsSnapshotsFromLegacyState = async (
  store: IndexedDbVfsStore,
  newSaveId: string,
  state: VersionedGameState,
): Promise<{ snapshotCount: number; latest: VfsLatestMeta | null }> => {
  const turnsIndex = buildLegacyTurnsIndex(state.nodes as any);
  if (turnsIndex.size === 0) {
    console.warn("[SaveImport] No legacy nodes found to seed VFS");
    return { snapshotCount: 0, latest: null };
  }

  const latestTurnByFork = new Map<number, number>();
  for (const [forkId, turns] of turnsIndex.entries()) {
    const turnNumbers = Array.from(turns.keys()).filter((t) => Number.isFinite(t));
    const maxTurn = turnNumbers.length > 0 ? Math.max(...turnNumbers) : -1;
    if (maxTurn >= 0) latestTurnByFork.set(forkId, maxTurn);
  }

  const forkIds = Array.from(latestTurnByFork.keys()).sort((a, b) => a - b);
  if (forkIds.length === 0) {
    return { snapshotCount: 0, latest: null };
  }

  // Build a stable view of turn files for all forks (final state).
  const turnFiles: Array<{ forkId: number; turn: number; file: any }> = [];
  for (const forkId of forkIds) {
    const maxTurn = latestTurnByFork.get(forkId) ?? -1;
    for (let turn = 0; turn <= maxTurn; turn += 1) {
      const segments = turnsIndex.get(forkId)?.get(turn);
      const model = segments?.model;
      if (!model) continue;
      const userAction = segments?.user?.text ?? "";
      turnFiles.push({
        forkId,
        turn,
        file: {
          turnId: buildTurnId(forkId, turn),
          forkId,
          turnNumber: turn,
          parentTurnId: turn === 0 ? null : buildTurnId(forkId, turn - 1),
          createdAt: typeof model.timestamp === "number" ? model.timestamp : Date.now(),
          userAction,
          assistant: {
            narrative: model.text || "",
            choices: model.choices || [],
            narrativeTone: model.narrativeTone,
            atmosphere: model.atmosphere,
            ending: model.ending,
            forceEnd: model.forceEnd,
          },
        },
      });
    }
  }

  const rootTurnIdByFork: Record<string, string> = {};
  const latestTurnNumberByFork: Record<string, number> = {};
  const turnOrderByFork: Record<string, string[]> = {};

  for (const forkId of forkIds) {
    const maxTurn = latestTurnByFork.get(forkId) ?? 0;
    rootTurnIdByFork[String(forkId)] = buildTurnId(forkId, 0);
    latestTurnNumberByFork[String(forkId)] = maxTurn;
    const order: string[] = [];
    for (let turn = 0; turn <= maxTurn; turn += 1) {
      const segments = turnsIndex.get(forkId)?.get(turn);
      if (!segments?.model) continue;
      order.push(buildTurnId(forkId, turn));
    }
    turnOrderByFork[String(forkId)] = order;
  }

  const activeParsed = parseLegacyNodeId(state.activeNodeId ?? "");
  const activeForkId =
    activeParsed && (activeParsed.kind === "turn" || activeParsed.kind === "turnId")
      ? activeParsed.forkId
      : typeof state.forkId === "number"
        ? state.forkId
        : forkIds[0];
  const activeTurn =
    activeParsed && (activeParsed.kind === "turn" || activeParsed.kind === "turnId")
      ? activeParsed.turn
      : typeof state.turnNumber === "number"
        ? state.turnNumber
        : latestTurnByFork.get(activeForkId) ?? 0;

  const fallbackLatest: VfsLatestMeta = {
    forkId: activeForkId,
    turn: activeTurn,
  };

  let written = 0;

  for (const forkId of forkIds) {
    const maxTurn = latestTurnByFork.get(forkId) ?? -1;
    for (let turn = 0; turn <= maxTurn; turn += 1) {
      const segments = turnsIndex.get(forkId)?.get(turn);
      const model = segments?.model;
      if (!model) continue;

      const session = new VfsSession();

      const snapshotState = (model.stateSnapshot as GameStateSnapshot | undefined) ?? null;
      const worldState: GameState = {
        ...(state as any),
        ...(snapshotState ? (snapshotState as any) : {}),
        theme: state.theme,
        playerProfile: (state as any).playerProfile,
        customContext: (state as any).customContext,
        language: (state as any).language,
        narrativeScale: (state as any).narrativeScale,
        seedImageId: (state as any).seedImageId,
        forkId,
        turnNumber: turn,
      };

      seedVfsSessionFromGameState(session, worldState);

      if ((state as any).outline) {
        writeOutlineFile(session, (state as any).outline);
      }
      if ((state as any).outlineConversation) {
        writeOutlineProgress(session, (state as any).outlineConversation ?? null);
      }

      writeForkTree(session, (state as any).forkTree);

      const latestForSnapshot: Record<string, number> = {};
      const orderForSnapshot: Record<string, string[]> = {};

      for (const id of forkIds) {
        const fullLatest = latestTurnByFork.get(id) ?? 0;
        const latest = id === forkId ? turn : fullLatest;
        latestForSnapshot[String(id)] = latest;
        orderForSnapshot[String(id)] =
          (turnOrderByFork[String(id)] || []).filter((turnId) => {
            const match = /fork-(\d+)\/turn-(\d+)/.exec(turnId);
            if (!match) return false;
            const parsedTurn = Number(match[2]);
            return Number.isFinite(parsedTurn) && parsedTurn <= latest;
          });
      }

      for (const entry of turnFiles) {
        const limit = latestForSnapshot[String(entry.forkId)];
        if (typeof limit === "number" && entry.turn > limit) {
          continue;
        }
        writeTurnFile(session, entry.forkId, entry.turn, entry.file);
      }

      writeConversationIndex(session, {
        activeForkId: forkId,
        activeTurnId: buildTurnId(forkId, turn),
        rootTurnIdByFork,
        latestTurnNumberByFork: latestForSnapshot,
        turnOrderByFork: orderForSnapshot,
      });

      await saveVfsSessionSnapshot(store, session, {
        saveId: newSaveId,
        forkId,
        turn,
        createdAt: typeof model.timestamp === "number" ? model.timestamp : Date.now(),
      });
      written += 1;
    }
  }

  return { snapshotCount: written, latest: fallbackLatest };
};

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Get statistics about what would be exported
 */
export async function getExportStats(
  slotId: string,
): Promise<ExportStats | null> {
  try {
    const derived = await loadDerivedStateFromLatestVfsSnapshot(slotId);
    const gameState = derived?.state ?? null;
    if (!gameState) return null;

    const nodeCount = Object.keys(gameState.nodes || {}).length;

    // Get images for this save
    const images = await getImagesBySaveId(slotId);
    const imageCount = images.length;

    // Get log count
    const logCount = gameState.logs?.length || 0;

    // Get RAG document count for this save
    let embeddingCount = 0;
    try {
      const ragService = getRAGService();
      if (ragService) {
        const saveStats = await ragService.getSaveStats(slotId);
        if (saveStats) {
          embeddingCount = saveStats.totalDocuments;
        }
      }
    } catch (e) {
      // RAG might not be initialized, ignore
      console.warn("[SaveExport] Could not get RAG stats:", e);
    }

    // Calculate estimated size
    let estimatedSize = JSON.stringify(gameState).length;
    for (const img of images) {
      estimatedSize += img.blob.size;
    }
    // Estimate embedding size (rough estimate: 1KB per document)
    estimatedSize += embeddingCount * 1024;

    return {
      nodeCount,
      imageCount,
      embeddingCount,
      logCount,
      estimatedSize,
    };
  } catch (error) {
    console.error("[SaveExport] Failed to get export stats:", error);
    return null;
  }
}

/**
 * Clean up game state for export based on options
 */
function cleanupStateForExport(
  state: VersionedGameState,
  options: ExportOptions,
): VersionedGameState {
  // Deep clone the state to avoid mutating the original
  const cleanState = JSON.parse(JSON.stringify(state)) as VersionedGameState;

  // Remove transient fields
  cleanState.isProcessing = false;
  cleanState.isImageGenerating = false;
  cleanState.generatingNodeId = null;
  cleanState.error = null;

  // Remove embedding index (it's regenerated on import)
  delete cleanState._embeddingIndex;

  // Clean up nodes if images are not included
  if (!options.includeImages) {
    const nodes = cleanState.nodes || {};
    for (const nodeId in nodes) {
      const node = nodes[nodeId] as StorySegment;
      // Remove image references
      delete node.imageUrl;
      delete node.imageId;
    }
  }

  // Clear logs if not included
  if (!options.includeLogs) {
    cleanState.logs = [];
  }

  return cleanState;
}

/**
 * Export a save to a ZIP file
 */
export async function exportSave(
  slotId: string,
  slot: SaveSlot,
  options: ExportOptions,
): Promise<Blob | null> {
  try {
    console.log(`[SaveExport] Starting export for slot ${slotId}`);

    // Load the full game state
    const derived = await loadDerivedStateFromLatestVfsSnapshot(slotId);
    const gameState = derived?.state ?? null;
    if (!gameState) {
      console.error(
        "[SaveExport] Export blocked: save has no VFS snapshots (unsupported legacy save)",
      );
      return null;
    }

    // Clean up state based on options
    const cleanedState = cleanupStateForExport(gameState, options);

    // Create ZIP
    const zip = new JSZip();

    // Add save.json
    const saveJson = JSON.stringify(cleanedState, null, 2);
    zip.file("save.json", saveJson);

    // Calculate checksum (simple hash for integrity check)
    const checksum = await computeChecksum(saveJson);

    // Gather stats
    const nodeCount = Object.keys(cleanedState.nodes || {}).length;
    let imageCount = 0;
    let embeddingCount = 0;

    // Add images if requested
    if (options.includeImages) {
      const images = await getImagesBySaveId(slotId);
      if (images.length > 0) {
        const imagesFolder = zip.folder("images");
        if (imagesFolder) {
          for (const image of images) {
            // Determine file extension from blob type
            const ext =
              image.blob.type === "image/png"
                ? "png"
                : image.blob.type === "image/jpeg"
                  ? "jpg"
                  : "webp";
            imagesFolder.file(`${image.id}.${ext}`, image.blob);

            // Also store metadata
            const metadata = {
              id: image.id,
              saveId: image.saveId,
              forkId: image.forkId,
              turnIdx: image.turnIdx,
              imagePrompt: image.imagePrompt,
              timestamp: image.timestamp,
              storyTitle: image.storyTitle,
              location: image.location,
              storyTime: image.storyTime,
            };
            imagesFolder.file(
              `${image.id}.meta.json`,
              JSON.stringify(metadata, null, 2),
            );
          }
          imageCount = images.length;
        }
      }
    }

    // Add embeddings if requested
    let ragExportData: RAGExportData | null = null;
    if (options.includeEmbeddings) {
      try {
        ragExportData = await getRAGService().exportSaveData(slotId);
        if (ragExportData && ragExportData.documents.length > 0) {
          zip.file("embeddings.json", JSON.stringify(ragExportData, null, 2));
          embeddingCount = ragExportData.documents.length;
          console.log(`[SaveExport] Exported ${embeddingCount} RAG documents`);
        }
      } catch (error) {
        console.warn(
          "[SaveExport] Failed to export embeddings (RAG may not be initialized):",
          error,
        );
      }
    }

    // Clean slot for export (remove previewImage if images not included)
    const exportSlot: SaveSlot = { ...slot };
    if (!options.includeImages) {
      delete exportSlot.previewImage;
    }

    // Get log count for manifest
    const logCount = options.includeLogs ? cleanedState.logs?.length || 0 : 0;

    // Create manifest
    const manifest: ExportManifest = {
      version: EXPORT_FORMAT_VERSION,
      exportDate: new Date().toISOString(),
      appVersion: APP_VERSION,
      saveVersion: cleanedState._saveVersion?.version || CURRENT_SAVE_VERSION,
      slot: exportSlot,
      includes: {
        images: options.includeImages,
        embeddings: options.includeEmbeddings && embeddingCount > 0,
        logs: options.includeLogs && logCount > 0,
      },
      stats: {
        nodeCount,
        imageCount,
        embeddingCount,
        logCount,
      },
      checksum,
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // Add VFS snapshots if present (required for VFS-based restores/forking).
    try {
      const { snapshotCount } = await writeVfsSnapshotsToZip(zip, slotId, {
        includeImages: options.includeImages,
      });
      console.log(`[SaveExport] Exported ${snapshotCount} VFS snapshots`);
    } catch (error) {
      console.warn("[SaveExport] Failed to export VFS snapshots:", error);
    }

    // Generate ZIP blob
    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    console.log(
      `[SaveExport] Export complete: ${(blob.size / 1024).toFixed(2)} KB`,
    );
    return blob;
  } catch (error) {
    console.error("[SaveExport] Export failed:", error);
    return null;
  }
}

/**
 * Download export as file
 */
export function downloadExport(blob: Blob, slotName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  // Sanitize filename
  const safeName = slotName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const date = new Date().toISOString().split("T")[0];
  link.download = `chronicles-${safeName}-${date}.zip`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Import Functions
// ============================================================================

/**
 * Validate an import file
 */
export async function validateImport(file: File): Promise<ImportValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const errorsI18n: I18nMessage[] = [];
  const warningsI18n: I18nMessage[] = [];

  const pushError = (
    key: string,
    params?: Record<string, unknown>,
    debugMessage?: string,
  ) => {
    errors.push(debugMessage ?? key);
    errorsI18n.push({ key, params });
  };

  const pushWarning = (
    key: string,
    params?: Record<string, unknown>,
    debugMessage?: string,
  ) => {
    warnings.push(debugMessage ?? key);
    warningsI18n.push({ key, params });
  };

  try {
    // Check file type
    if (!file.name.endsWith(".zip")) {
      pushError(
        "import.errors.unsupportedFormat",
        undefined,
        "Unsupported file format. Please import a .zip save export.",
      );
      return { valid: false, errors, warnings, errorsI18n, warningsI18n };
    }

    // Parse ZIP
    const zip = await JSZip.loadAsync(file);

    // Check for manifest
    const manifestFile = zip.file("manifest.json");
    if (!manifestFile) {
      pushError(
        "import.errors.missingManifest",
        undefined,
        "Missing manifest.json in export file.",
      );
      return { valid: false, errors, warnings, errorsI18n, warningsI18n };
    }

    const manifestJson = await manifestFile.async("text");
    let manifest: ExportManifest;
    try {
      manifest = JSON.parse(manifestJson);
    } catch {
      pushError(
        "import.errors.invalidManifest",
        undefined,
        "Invalid manifest.json format.",
      );
      return { valid: false, errors, warnings, errorsI18n, warningsI18n };
    }

    if (!isValidExportManifest(manifest)) {
      pushError(
        "import.errors.invalidManifest",
        undefined,
        "Invalid manifest.json format.",
      );
      return { valid: false, errors, warnings, errorsI18n, warningsI18n };
    }

    // Validate manifest version
    if (!manifest.version || manifest.version > EXPORT_FORMAT_VERSION) {
      pushWarning(
        "import.warnings.newerVersion",
        {
          exportVersion: manifest.version,
          supportedVersion: EXPORT_FORMAT_VERSION,
        },
        `Export version ${manifest.version} is newer than supported ${EXPORT_FORMAT_VERSION}. Some features may not work.`,
      );
    }

    // Check if images folder exists if images were included
    if (manifest.includes.images) {
      const imagesFolder = zip.folder("images");
      if (!imagesFolder) {
        pushWarning(
          "import.warnings.missingImagesFolder",
          undefined,
          "Images were marked as included but images folder is missing.",
        );
      }
    }

    // VFS snapshots are required for correct restore/fork behavior in newer builds.
    // If missing, we reject the import as "version too old".
    const vfsIndexFile = zip.file("vfs/index.json");
    if (!vfsIndexFile) {
      pushError(
        "import.errors.missingVfsIndex",
        undefined,
        "Missing VFS snapshot index (vfs/index.json).",
      );
      return { valid: false, errors, warnings, errorsI18n, warningsI18n };
    }

    try {
      const indexJson = await vfsIndexFile.async("text");
      const bundle = JSON.parse(indexJson) as VfsExportBundleIndex;
      const snapshots = Array.isArray(bundle?.snapshots) ? bundle.snapshots : [];
      if (snapshots.length === 0) {
        pushError(
          "import.errors.emptyVfsIndex",
          undefined,
          "VFS snapshot index is empty (vfs/index.json).",
        );
        return { valid: false, errors, warnings, errorsI18n, warningsI18n };
      }

      // Validate that at least the latest snapshot file exists.
      const latest = bundle?.latest ?? null;
      const latestEntry = isValidLatestMeta(latest)
        ? latest
        : snapshots[snapshots.length - 1];
      if (
        latestEntry &&
        typeof (latestEntry as any).forkId === "number" &&
        typeof (latestEntry as any).turn === "number"
      ) {
        const snapshotPath = `vfs/snapshots/fork-${(latestEntry as any).forkId}/turn-${(latestEntry as any).turn}.json`;
        if (!zip.file(snapshotPath)) {
          pushError(
            "import.errors.missingSnapshotFile",
            { path: snapshotPath },
            `Missing VFS snapshot file (${snapshotPath}).`,
          );
          return { valid: false, errors, warnings, errorsI18n, warningsI18n };
        }
      }
    } catch (error) {
      console.warn("[SaveImport] Failed to parse VFS index:", error);
      pushError(
        "import.errors.unreadableVfsIndex",
        undefined,
        "Failed to parse VFS index (vfs/index.json).",
      );
      return { valid: false, errors, warnings, errorsI18n, warningsI18n };
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      errorsI18n,
      warningsI18n,
      manifest,
      requiresMigration: false,
    };
  } catch (error) {
    console.warn("[SaveImport] Failed to parse import file:", error);
    pushError(
      "import.errors.parseFailed",
      undefined,
      "Failed to parse import file.",
    );
    return { valid: false, errors, warnings, errorsI18n, warningsI18n };
  }
}

/**
 * Generate a unique slot ID that doesn't conflict with existing slots
 */
function generateUniqueSlotId(existingSlots: SaveSlot[]): string {
  const existingIds = new Set(existingSlots.map((s) => s.id));
  let newId = Date.now().toString();

  // Ensure uniqueness by appending random suffix if needed
  while (existingIds.has(newId)) {
    newId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  return newId;
}

/**
 * Import a save from file
 */
export async function importSave(
  file: File,
  existingSlots: SaveSlot[],
): Promise<ImportResult> {
  try {
    // First validate
    const validation = await validateImport(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join("; "),
        errorI18n: validation.errorsI18n?.[0],
        warnings: validation.warnings,
        warningsI18n: validation.warningsI18n,
      };
    }

    const manifest = validation.manifest!;
    const warnings = [...validation.warnings];
    const warningsI18n = [...(validation.warningsI18n ?? [])];

    // Generate new slot ID with uniqueness guarantee
    const newSlotId = generateUniqueSlotId(existingSlots);
    console.log(`[SaveImport] Generated unique slot ID: ${newSlotId}`);

    // Handle ZIP format
    const zip = await JSZip.loadAsync(file);

    // Import images if present
    let imageIdMapping = new Map<string, string>();
    if (manifest.includes.images) {
      const imagesFolder = zip.folder("images");
      if (imagesFolder) {
        imageIdMapping = await importImages(imagesFolder, newSlotId);
      }
    }

    // Import embeddings if present
    if (manifest.includes.embeddings) {
      const embeddingsFile = zip.file("embeddings.json");
      if (embeddingsFile) {
        try {
          const embeddingsJson = await embeddingsFile.async("text");
          const embeddingsData: RAGExportData = JSON.parse(embeddingsJson);

          // Import to RAG service with new save ID
          const ragService = getRAGService();
          if (ragService) {
            const importResult = await ragService.importSaveData(
              embeddingsData,
              newSlotId,
            );
            console.log(
              `[SaveImport] Imported ${importResult.imported} RAG documents`,
            );
          } else {
            warnings.push(
              "RAG service is not initialized. Embeddings import skipped.",
            );
            warningsI18n.push({ key: "import.warnings.embeddingsSkipped" });
          }
        } catch (error) {
          console.warn("[SaveImport] Failed to import embeddings:", error);
          warnings.push(
            "Failed to import embeddings. They will be regenerated.",
          );
          warningsI18n.push({ key: "import.warnings.embeddingsRegen" });
        }
      }
    }

    // Import VFS snapshot history (required).
    let derivedTheme: string | undefined;
    let derivedSummary: string | undefined;
    let derivedName: string | undefined;
    let derivedPreviewImage: string | undefined;
    try {
      const store = new IndexedDbVfsStore();
      const vfsIndexFile = zip.file("vfs/index.json");
      if (!vfsIndexFile) {
        return {
          success: false,
          error: "Missing VFS snapshot index (vfs/index.json).",
          errorI18n: { key: "import.errors.missingVfsIndex" },
          warnings,
          warningsI18n,
        };
      }
      const indexJson = await vfsIndexFile.async("text");
      const bundle = JSON.parse(indexJson) as VfsExportBundleIndex;
      const latestMeta = bundle?.latest ?? null;
      const snapshots = Array.isArray(bundle?.snapshots) ? bundle.snapshots : [];

      let importedSharedFiles: Record<string, any> | null = null;
      const sharedFile = zip.file("vfs/shared.json");
      if (sharedFile) {
        try {
          const sharedJson = await sharedFile.async("text");
          const sharedPayload = JSON.parse(sharedJson) as {
            files?: unknown;
          };
          if (sharedPayload?.files && typeof sharedPayload.files === "object") {
            importedSharedFiles = sharedPayload.files as Record<string, any>;
          }
        } catch (error) {
          console.warn("[SaveImport] Failed to parse vfs/shared.json:", error);
          warnings.push("Failed to parse vfs/shared.json. Shared VFS layer will be rebuilt.");
        }
      }
      if (snapshots.length === 0) {
        return {
          success: false,
          error: "VFS snapshot index is empty (vfs/index.json).",
          errorI18n: { key: "import.errors.emptyVfsIndex" },
          warnings,
          warningsI18n,
        };
      }

      let imported = 0;
      for (const entry of snapshots) {
        if (
          !entry ||
          typeof entry.forkId !== "number" ||
          typeof entry.turn !== "number"
        ) {
          continue;
        }
        const snapshotFile = zip.file(
          `vfs/snapshots/fork-${entry.forkId}/turn-${entry.turn}.json`,
        );
        if (!snapshotFile) continue;
        const snapshotJson = await snapshotFile.async("text");
        const snapshot = JSON.parse(snapshotJson) as VfsSnapshot;
        if (!snapshot || typeof snapshot !== "object") continue;

        const snapshotWithMappedImages = rewriteSnapshotImageReferences(snapshot, {
          remapImageIds: imageIdMapping,
        });

        snapshotWithMappedImages.saveId = newSlotId;
        await store.saveSnapshot(snapshotWithMappedImages);
        imported += 1;
      }

      if (imported === 0) {
        return {
          success: false,
          error: "No VFS snapshots were imported.",
          errorI18n: { key: "import.errors.noSnapshotsImported" },
          warnings,
          warningsI18n,
        };
      }

      let latestForkId: number | null = null;
      let latestTurn: number | null = null;
      if (latestMeta && isValidLatestMeta(latestMeta)) {
        latestForkId = latestMeta.forkId;
        latestTurn = latestMeta.turn;
      } else {
        const indexes = await listVfsSnapshotIndexEntries(newSlotId);
        const best = indexes.reduce((acc, item) => {
          if (!acc) return item;
          return item.createdAt > acc.createdAt ? item : acc;
        }, null as VfsExportIndexEntry | null);
        if (best) {
          latestForkId = best.forkId;
          latestTurn = best.turn;
        }
      }

      let sharedForSave: Record<string, any> | null = importedSharedFiles;

      if (latestForkId !== null && latestTurn !== null) {
        await saveMetadata(`vfs_latest:${newSlotId}`, {
          forkId: latestForkId,
          turn: latestTurn,
          updatedAt: Date.now(),
        });

        // Derive lightweight slot info from latest snapshot for nicer UI.
        try {
          const latestSnapshot = await store.loadSnapshot(
            newSlotId,
            latestForkId,
            latestTurn,
          );
          if (latestSnapshot) {
            if (!sharedForSave) {
              const inferred = extractSharedMutableStateFromSnapshot(latestSnapshot as any);
              sharedForSave =
                Object.keys(inferred).length > 0
                  ? (inferred as Record<string, any>)
                  : null;
            }

            const session = new VfsSession();
            restoreVfsSessionFromSnapshot(session, latestSnapshot);
            if (sharedForSave) {
              applySharedMutableStateToSession(session, sharedForSave as any);
            }

            const derived = deriveGameStateFromVfs(session.snapshot()) as any;
            derivedTheme = typeof derived?.theme === "string" ? derived.theme : undefined;
            derivedName =
              typeof derived?.outline?.title === "string"
                ? derived.outline.title
                : undefined;
            derivedSummary =
              typeof derived?.outline?.premise === "string"
                ? derived.outline.premise
                : typeof derived?.outline?.openingNarrative?.narrative === "string"
                  ? derived.outline.openingNarrative.narrative.slice(0, 160)
                  : undefined;
            derivedPreviewImage =
              typeof derived?.seedImageId === "string" ? derived.seedImageId : undefined;
          }
        } catch (err) {
          console.warn("[SaveImport] Failed to derive slot info from VFS snapshot:", err);
        }
      }

      await saveMetadata(`vfs_shared:${newSlotId}`, {
        files: sharedForSave ?? {},
        updatedAt: Date.now(),
        importedFromArchive: true,
      });

      console.log(`[SaveImport] Imported ${imported} VFS snapshots`);
    } catch (error) {
      console.warn("[SaveImport] Failed to import/reconstruct VFS snapshots:", error);
      return {
        success: false,
        error: "Failed to import VFS snapshots.",
        errorI18n: { key: "import.errors.vfsImportFailed" },
        warnings,
        warningsI18n,
      };
    }

    // Create new slot metadata
    const newSlot: SaveSlot = {
      id: newSlotId,
      name: generateUniqueName(derivedName || manifest.slot.name, existingSlots),
      timestamp: Date.now(),
      theme: derivedTheme || manifest.slot.theme,
      summary: derivedSummary || manifest.slot.summary || "",
      previewImage:
        derivedPreviewImage ||
        (manifest.slot.previewImage
          ? imageIdMapping.get(manifest.slot.previewImage) || manifest.slot.previewImage
          : undefined),
    };

    // Update slots metadata
    const updatedSlots = [...existingSlots, newSlot];
    await saveMetadata("slots", updatedSlots);

    console.log(`[SaveImport] Import complete: slot ${newSlotId}`);

    return {
      success: true,
      slotId: newSlotId,
      warnings,
      warningsI18n,
      migrated: false,
    };
  } catch (error) {
    console.error("[SaveImport] Import failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown import error",
      errorI18n: { key: "import.errors.importFailed" },
    };
  }
}

/**
 * Import images from ZIP folder
 * Returns mapping of old ID -> new ID
 */
async function importImages(
  imagesFolder: JSZip,
  newSaveId: string,
): Promise<Map<string, string>> {
  const mapping = new Map<string, string>();

  const files = Object.keys(imagesFolder.files);
  const folderPrefix = imagesFolder.root || "";
  const imageFiles = files.filter(
    (f) =>
      f.startsWith(folderPrefix) && !f.endsWith(".meta.json") && !f.endsWith("/"),
  );

  for (const filename of imageFiles) {
    try {
      const relativePath = filename.startsWith(folderPrefix)
        ? filename.slice(folderPrefix.length)
        : filename;
      const file = imagesFolder.file(relativePath);
      if (!file) continue;

      // Extract old ID from filename
      const oldId = filename
        .replace(/\.(png|jpg|jpeg|webp)$/i, "")
        .split("/")
        .pop()!;

      // Load metadata if present
      const metaFile = imagesFolder.file(`${oldId}.meta.json`);
      let metadata: any = {};
      if (metaFile) {
        try {
          metadata = JSON.parse(await metaFile.async("text"));
        } catch {
          // Ignore metadata parse errors
        }
      }

      // Load image blob
      const blob = await file.async("blob");

      // Save with new saveId
      const newId = await saveImage(blob, {
        saveId: newSaveId,
        forkId: metadata.forkId || 0,
        turnIdx: metadata.turnIdx || 0,
        imagePrompt: metadata.imagePrompt,
        storyTitle: metadata.storyTitle,
        location: metadata.location,
        storyTime: metadata.storyTime,
      });

      mapping.set(oldId, newId);
    } catch (error) {
      console.warn(`[SaveImport] Failed to import image ${filename}:`, error);
    }
  }

  console.log(`[SaveImport] Imported ${mapping.size} images`);
  return mapping;
}

/**
 * Update image references in nodes with new IDs
 */
function updateImageReferences(
  state: VersionedGameState,
  mapping: Map<string, string>,
): void {
  const nodes = state.nodes || {};

  for (const nodeId in nodes) {
    const node = nodes[nodeId] as StorySegment;
    if (node.imageId && mapping.has(node.imageId)) {
      node.imageId = mapping.get(node.imageId)!;
      // Clear imageUrl as it will be regenerated from imageId
      delete node.imageUrl;
    }
  }
}

/**
 * Clear all image references in nodes
 */
function clearImageReferences(state: VersionedGameState): void {
  const nodes = state.nodes || {};

  for (const nodeId in nodes) {
    const node = nodes[nodeId] as StorySegment;
    delete node.imageId;
    delete node.imageUrl;
  }
}

/**
 * Generate a unique name for imported save
 */
function generateUniqueName(
  baseName: string,
  existingSlots: SaveSlot[],
): string {
  const existingNames = new Set(existingSlots.map((s) => s.name));

  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let counter = 1;
  let newName = `${baseName} (${counter})`;
  while (existingNames.has(newName)) {
    counter++;
    newName = `${baseName} (${counter})`;
  }

  return newName;
}

/**
 * Compute a simple checksum for data integrity
 */
async function computeChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
