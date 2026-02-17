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
  VFS_SNAPSHOTS_STORE,
} from "../utils/indexedDB";
import { getImagesBySaveId, saveImage } from "../utils/imageStorage";
import { getRAGService } from "./rag";
import type { RAGExportData } from "./rag/types";
import { IndexedDbVfsStore } from "./vfs/store";
import type {
  VfsContentType,
  VfsFileMap,
  VfsSnapshot,
  VfsSnapshotFileRefMap,
} from "./vfs/types";
import { computeBlobId } from "./vfs/blobHash";
import { VfsSession } from "./vfs/vfsSession";
import { hashContent, normalizeVfsPath } from "./vfs/utils";
import {
  applySharedMutableStateToSession,
  extractSharedMutableStateFromSnapshot,
  restoreVfsSessionFromSnapshot,
  saveVfsSessionSnapshot,
} from "./vfs/persistence";
import { deriveGameStateFromVfs } from "./vfs/derivations";
import { seedVfsSessionFromGameState } from "./vfs/seed";
import { writeOutlineFile, writeOutlineProgress } from "./vfs/outline";
import { toCanonicalVfsPath } from "./vfs/core/pathResolver";
import { vfsResourceTemplateRegistry } from "./vfs/core/resourceTemplateRegistry";
import {
  buildTurnId,
  type ConversationIndex,
  type TurnFile,
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

interface VfsExportBundleIndexV3 extends VfsExportBundleIndex {
  encoding: "blob_ref_v1";
  blobs: {
    count: number;
  };
}

interface VfsExportBlobPoolEntry {
  blobId: string;
  contentType: VfsContentType;
  size: number;
}

interface VfsExportBlobPoolIndex {
  version: number;
  encoding: "blob_ref_v1";
  blobs: VfsExportBlobPoolEntry[];
}

interface VfsExportSnapshotV3 {
  version: 2;
  encoding: "blob_ref_v1";
  saveId: string;
  forkId: number;
  turn: number;
  createdAt: number;
  fileRefs: VfsSnapshotFileRefMap;
}

const VFS_BLOB_REF_ENCODING = "blob_ref_v1" as const;

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

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const VFS_CONTENT_TYPES: ReadonlySet<VfsContentType> = new Set([
  "application/json",
  "application/jsonl",
  "text/plain",
  "text/markdown",
]);

const isVfsContentType = (value: unknown): value is VfsContentType =>
  typeof value === "string" && VFS_CONTENT_TYPES.has(value as VfsContentType);

const isVfsFileLike = (value: unknown): value is VfsFileMap[string] => {
  if (!isRecord(value)) return false;
  return (
    typeof value.path === "string" &&
    typeof value.content === "string" &&
    isVfsContentType(value.contentType) &&
    typeof value.hash === "string" &&
    typeof value.size === "number" &&
    Number.isFinite(value.size) &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt)
  );
};

const isVfsFileMap = (value: unknown): value is VfsFileMap =>
  isRecord(value) &&
  Object.values(value).every((entry) => isVfsFileLike(entry));

type SnapshotIndexRow = {
  saveId: string;
  forkId: number;
  turn: number;
  createdAt?: number;
};

const isSnapshotIndexRow = (value: unknown): value is SnapshotIndexRow => {
  if (!isRecord(value)) return false;
  return (
    typeof value.saveId === "string" &&
    typeof value.forkId === "number" &&
    Number.isFinite(value.forkId) &&
    typeof value.turn === "number" &&
    Number.isFinite(value.turn)
  );
};

type ImportedImageMetadata = {
  forkId: number;
  turnIdx: number;
  imagePrompt?: string;
  storyTitle?: string;
  location?: string;
  storyTime?: string;
};

const parseImportedImageMetadata = (value: unknown): ImportedImageMetadata => {
  if (!isRecord(value)) {
    return { forkId: 0, turnIdx: 0 };
  }

  const forkId =
    typeof value.forkId === "number" && Number.isFinite(value.forkId)
      ? value.forkId
      : 0;
  const turnIdx =
    typeof value.turnIdx === "number" && Number.isFinite(value.turnIdx)
      ? value.turnIdx
      : 0;

  return {
    forkId,
    turnIdx,
    imagePrompt:
      typeof value.imagePrompt === "string" ? value.imagePrompt : undefined,
    storyTitle:
      typeof value.storyTitle === "string" ? value.storyTitle : undefined,
    location: typeof value.location === "string" ? value.location : undefined,
    storyTime:
      typeof value.storyTime === "string" ? value.storyTime : undefined,
  };
};

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

  const nextObject: JsonObject = {};
  for (const [key, rawChild] of Object.entries(value as JsonObject)) {
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

const shouldDropRebuildableSessionFile = (
  snapshot: VfsSnapshot,
  filePath: string,
): boolean => {
  const relativePath = getSnapshotRelativePath(snapshot, filePath);
  if (!relativePath) return false;

  const canonicalPath = toCanonicalVfsPath(relativePath, {
    activeForkId: snapshot.forkId,
  });
  const template = vfsResourceTemplateRegistry.match(canonicalPath);

  return (
    template.id === "template.story.conversation.session_jsonl" ||
    template.id === "template.runtime.fork"
  );
};

const pruneRebuildableSessionFilesFromSnapshot = (
  snapshot: VfsSnapshot,
): VfsSnapshot => {
  const nextFiles: VfsFileMap = {};
  let changed = false;

  for (const [path, file] of Object.entries(snapshot.files ?? {})) {
    if (shouldDropRebuildableSessionFile(snapshot, path)) {
      changed = true;
      continue;
    }
    nextFiles[path] = file;
  }

  if (!changed) return snapshot;
  return {
    ...snapshot,
    files: nextFiles,
  };
};

type VfsExportBlobContent = {
  content: string;
  contentType: VfsContentType;
  size: number;
};

const buildBlobPoolPath = (blobId: string): string =>
  `vfs/blob_pool/blobs/${blobId}.json`;

const toExportSnapshotV3 = async (
  snapshot: VfsSnapshot,
  blobPool: Map<string, VfsExportBlobContent>,
): Promise<VfsExportSnapshotV3> => {
  const fileRefs: VfsSnapshotFileRefMap = {};
  for (const file of Object.values(snapshot.files ?? {})) {
    const blobId = await computeBlobId(file.contentType, file.content);
    fileRefs[file.path] = {
      path: file.path,
      blobId,
      contentType: file.contentType,
      size: file.size,
      updatedAt: file.updatedAt,
      legacyHash: file.hash,
    };
    if (!blobPool.has(blobId)) {
      blobPool.set(blobId, {
        content: file.content,
        contentType: file.contentType,
        size: file.size,
      });
    }
  }

  return {
    version: 2,
    encoding: VFS_BLOB_REF_ENCODING,
    saveId: snapshot.saveId,
    forkId: snapshot.forkId,
    turn: snapshot.turn,
    createdAt: snapshot.createdAt,
    fileRefs,
  };
};

const restoreSnapshotFromExportV3 = (
  saveId: string,
  snapshot: VfsExportSnapshotV3,
  blobPool: Map<string, VfsExportBlobContent>,
): VfsSnapshot => {
  const files: VfsFileMap = {};
  const updatedAtFallback = Date.now();

  for (const fileRef of Object.values(snapshot.fileRefs ?? {})) {
    const blob = blobPool.get(fileRef.blobId);
    if (!blob) {
      throw new Error(
        `Missing VFS blob ${fileRef.blobId} for fork=${snapshot.forkId} turn=${snapshot.turn}`,
      );
    }

    files[fileRef.path] = {
      path: fileRef.path,
      content: blob.content,
      contentType: fileRef.contentType || blob.contentType,
      hash: fileRef.legacyHash || hashContent(blob.content),
      size: fileRef.size ?? blob.size ?? blob.content.length,
      updatedAt: fileRef.updatedAt ?? updatedAtFallback,
    };
  }

  return {
    saveId,
    forkId: snapshot.forkId,
    turn: snapshot.turn,
    createdAt: snapshot.createdAt,
    files,
  };
};

const isValidExportManifest = (value: unknown): value is ExportManifest => {
  if (!isRecord(value)) return false;
  const manifest = value;

  if (typeof manifest.version !== "number") return false;
  if (typeof manifest.exportDate !== "string") return false;
  if (typeof manifest.appVersion !== "string") return false;
  if (typeof manifest.saveVersion !== "number") return false;

  if (!isRecord(manifest.slot)) return false;
  if (typeof manifest.slot.name !== "string") return false;
  if (typeof manifest.slot.theme !== "string") return false;

  if (!isRecord(manifest.includes)) return false;
  if (typeof manifest.includes.images !== "boolean") return false;
  if (typeof manifest.includes.embeddings !== "boolean") return false;
  if (typeof manifest.includes.logs !== "boolean") return false;

  if (!isRecord(manifest.stats)) return false;
  if (typeof manifest.stats.nodeCount !== "number") return false;
  if (typeof manifest.stats.imageCount !== "number") return false;
  if (typeof manifest.stats.embeddingCount !== "number") return false;

  return true;
};

const isValidLatestMeta = (value: unknown): value is VfsLatestMeta => {
  if (!isRecord(value)) return false;
  const forkId = value.forkId;
  const turn = value.turn;
  return typeof forkId === "number" && typeof turn === "number";
};

const loadLatestVfsMeta = async (
  saveId: string,
): Promise<VfsLatestMeta | null> => {
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
    const latest = entries.reduce(
      (best, entry) => {
        if (!best) return entry;
        if (entry.createdAt > best.createdAt) return entry;
        return best;
      },
      null as VfsExportIndexEntry | null,
    );
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

  const getAllRows = (storeName: string): Promise<unknown[]> =>
    new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () =>
        resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => reject(request.error);
    });

  const [metaRows, snapshotRows] = await Promise.all([
    getAllRows(VFS_META_STORE),
    getAllRows(VFS_SNAPSHOTS_STORE),
  ]);

  const merged = new Map<string, VfsExportIndexEntry>();

  for (const row of metaRows) {
    if (!isSnapshotIndexRow(row) || row.saveId !== saveId) {
      continue;
    }
    const key = `${row.forkId}:${row.turn}`;
    merged.set(key, {
      forkId: row.forkId,
      turn: row.turn,
      createdAt: typeof row.createdAt === "number" ? row.createdAt : 0,
    });
  }

  for (const row of snapshotRows) {
    if (!isSnapshotIndexRow(row) || row.saveId !== saveId) {
      continue;
    }
    const key = `${row.forkId}:${row.turn}`;
    const existing = merged.get(key);
    const rowCreatedAt = typeof row.createdAt === "number" ? row.createdAt : 0;
    if (!existing) {
      merged.set(key, {
        forkId: row.forkId,
        turn: row.turn,
        createdAt: rowCreatedAt,
      });
      continue;
    }
    if (rowCreatedAt > existing.createdAt) {
      merged.set(key, { ...existing, createdAt: rowCreatedAt });
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => a.forkId - b.forkId || a.turn - b.turn,
  );
};

const SHARED_CONVERSATION_INDEX_PATHS = [
  "conversation/index.json",
  "shared/narrative/conversation/index.json",
  "current/conversation/index.json",
];

const parseConversationTurnId = (
  value: string,
): { forkId: number; turn: number } | null => {
  const match = /^fork-(\d+)\/turn-(\d+)$/.exec(value);
  if (!match) return null;
  return {
    forkId: Number(match[1]),
    turn: Number(match[2]),
  };
};

const parseConversationTurnPath = (
  path: string,
): { forkId: number; turn: number } | null => {
  const normalized = path.replace(/^\/+/, "");

  const logicalMatch =
    /^conversation\/turns\/fork-(\d+)\/turn-(\d+)\.json$/.exec(normalized) ??
    /^current\/conversation\/turns\/fork-(\d+)\/turn-(\d+)\.json$/.exec(
      normalized,
    );
  if (logicalMatch) {
    return {
      forkId: Number(logicalMatch[1]),
      turn: Number(logicalMatch[2]),
    };
  }

  const canonicalMatch =
    /^forks\/(\d+)\/story\/conversation\/turns\/fork-(\d+)\/turn-(\d+)\.json$/.exec(
      normalized,
    );
  if (!canonicalMatch) return null;

  const forkFromPrefix = Number(canonicalMatch[1]);
  const forkFromName = Number(canonicalMatch[2]);
  return {
    forkId: Number.isFinite(forkFromPrefix) ? forkFromPrefix : forkFromName,
    turn: Number(canonicalMatch[3]),
  };
};

const collectConversationTurnsFromSnapshot = (
  snapshot: VfsSnapshot,
): Map<number, number[]> => {
  const turnsByFork = new Map<number, Set<number>>();
  const snapshotRoot = `turns/fork-${snapshot.forkId}/turn-${snapshot.turn}/`;

  for (const file of Object.values(snapshot.files ?? {})) {
    const rawPath = typeof file?.path === "string" ? file.path : "";
    if (!rawPath) continue;

    const normalizedPath = rawPath.replace(/^\/+/, "");
    const relativePath = normalizedPath.startsWith(snapshotRoot)
      ? normalizedPath.slice(snapshotRoot.length)
      : normalizedPath;

    const parsed =
      parseConversationTurnPath(relativePath) ??
      parseConversationTurnPath(normalizedPath);
    if (!parsed) continue;
    if (!Number.isFinite(parsed.forkId) || !Number.isFinite(parsed.turn)) {
      continue;
    }

    const turns = turnsByFork.get(parsed.forkId) ?? new Set<number>();
    turns.add(parsed.turn);
    turnsByFork.set(parsed.forkId, turns);
  }

  return new Map(
    Array.from(turnsByFork.entries()).map(([forkId, turns]) => [
      forkId,
      Array.from(turns).sort((a, b) => a - b),
    ]),
  );
};

const buildConversationIndexFromSnapshot = (
  snapshot: VfsSnapshot,
  activeForkHint?: number | null,
): ConversationIndex | null => {
  const turnsByFork = collectConversationTurnsFromSnapshot(snapshot);
  if (turnsByFork.size === 0) return null;

  const forkIds = Array.from(turnsByFork.keys()).sort((a, b) => a - b);
  const hintedForkId =
    typeof activeForkHint === "number" && turnsByFork.has(activeForkHint)
      ? activeForkHint
      : null;
  const activeForkId =
    hintedForkId ??
    (turnsByFork.has(snapshot.forkId) ? snapshot.forkId : (forkIds[0] ?? 0));

  const rootTurnIdByFork: Record<string, string> = {};
  const latestTurnNumberByFork: Record<string, number> = {};
  const turnOrderByFork: Record<string, string[]> = {};

  for (const forkId of forkIds) {
    const turns = turnsByFork.get(forkId) ?? [];
    if (turns.length === 0) continue;
    const forkKey = String(forkId);
    rootTurnIdByFork[forkKey] = buildTurnId(forkId, turns[0]);
    latestTurnNumberByFork[forkKey] = turns[turns.length - 1];
    turnOrderByFork[forkKey] = turns.map((turn) => buildTurnId(forkId, turn));
  }

  const activeOrder = turnOrderByFork[String(activeForkId)] ?? [];
  const activeTurnId =
    activeOrder[activeOrder.length - 1] ??
    buildTurnId(
      activeForkId,
      latestTurnNumberByFork[String(activeForkId)] ?? snapshot.turn,
    );

  return {
    activeForkId,
    activeTurnId,
    rootTurnIdByFork,
    latestTurnNumberByFork,
    turnOrderByFork,
  };
};

const isConversationIndexShape = (
  value: unknown,
): value is ConversationIndex => {
  if (!value || typeof value !== "object") return false;
  const maybe = value as JsonObject;
  if (typeof maybe.activeForkId !== "number") return false;
  if (typeof maybe.activeTurnId !== "string") return false;
  if (
    !maybe.rootTurnIdByFork ||
    typeof maybe.rootTurnIdByFork !== "object" ||
    !maybe.latestTurnNumberByFork ||
    typeof maybe.latestTurnNumberByFork !== "object" ||
    !maybe.turnOrderByFork ||
    typeof maybe.turnOrderByFork !== "object"
  ) {
    return false;
  }
  return true;
};

const readConversationIndexFromSharedFiles = (
  sharedFiles: VfsFileMap | null,
): { path: string; index: ConversationIndex } | null => {
  if (!sharedFiles || typeof sharedFiles !== "object") return null;

  for (const path of SHARED_CONVERSATION_INDEX_PATHS) {
    const file = sharedFiles[path];
    if (!file || typeof file !== "object" || typeof file.content !== "string") {
      continue;
    }
    try {
      const parsed = JSON.parse(file.content);
      if (!isConversationIndexShape(parsed)) continue;
      return { path, index: parsed };
    } catch {
      continue;
    }
  }

  return null;
};

const conversationIndexNeedsRepair = (
  existing: ConversationIndex | null,
  rebuilt: ConversationIndex,
): boolean => {
  if (!existing) return true;

  for (const [forkKey, rebuiltLatest] of Object.entries(
    rebuilt.latestTurnNumberByFork,
  )) {
    const existingLatest = existing.latestTurnNumberByFork?.[forkKey];
    if (typeof existingLatest !== "number" || existingLatest < rebuiltLatest) {
      return true;
    }

    const rebuiltOrder = rebuilt.turnOrderByFork?.[forkKey] ?? [];
    const existingOrder = existing.turnOrderByFork?.[forkKey] ?? [];
    if (rebuiltOrder.length > existingOrder.length) {
      return true;
    }

    const existingSet = new Set(existingOrder);
    if (rebuiltOrder.some((turnId) => !existingSet.has(turnId))) {
      return true;
    }
  }

  const existingActive = parseConversationTurnId(existing.activeTurnId);
  const rebuiltActive = parseConversationTurnId(rebuilt.activeTurnId);
  if (existingActive && rebuiltActive) {
    return (
      rebuiltActive.forkId === existingActive.forkId &&
      rebuiltActive.turn > existingActive.turn
    );
  }

  return false;
};

const repairSharedConversationIndex = (
  sharedFiles: VfsFileMap | null,
  latestSnapshot: VfsSnapshot | null,
  activeForkHint?: number | null,
): VfsFileMap | null => {
  if (!latestSnapshot) {
    return sharedFiles;
  }

  const rebuilt = buildConversationIndexFromSnapshot(
    latestSnapshot,
    activeForkHint,
  );
  if (!rebuilt) {
    return sharedFiles;
  }

  const existingEntry = readConversationIndexFromSharedFiles(sharedFiles);
  const existingIndex = existingEntry?.index ?? null;
  if (!conversationIndexNeedsRepair(existingIndex, rebuilt)) {
    return sharedFiles;
  }

  const targetPath = existingEntry?.path ?? SHARED_CONVERSATION_INDEX_PATHS[0];
  const content = JSON.stringify(rebuilt);
  const updatedAt = Date.now();
  const nextShared = { ...(sharedFiles ?? {}) };
  nextShared[targetPath] = {
    path: targetPath,
    content,
    contentType: "application/json",
    hash: hashContent(content),
    size: content.length,
    updatedAt,
  };
  return nextShared;
};

const loadSharedMutableStateForSave = async (
  saveId: string,
  latestSnapshot?: VfsSnapshot | null,
): Promise<VfsFileMap | null> => {
  let shared: VfsFileMap | null = null;

  try {
    const stored = await loadMetadata<{ files?: unknown }>(
      `vfs_shared:${saveId}`,
    );
    if (isVfsFileMap(stored?.files)) {
      shared = stored.files;
    }
  } catch (error) {
    console.warn("[SaveExport] Failed to load vfs_shared metadata:", error);
  }

  if (!shared && latestSnapshot) {
    const inferred = extractSharedMutableStateFromSnapshot(latestSnapshot);
    if (Object.keys(inferred).length > 0) {
      shared = inferred;
    }
  }

  const repaired = repairSharedConversationIndex(
    shared,
    latestSnapshot ?? null,
  );
  if (repaired && Object.keys(repaired).length > 0) {
    return repaired;
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
    applySharedMutableStateToSession(session, shared);
  }

  const derived = deriveGameStateFromVfs(
    session.snapshot(),
  ) as VersionedGameState;
  if (!derived._saveVersion) {
    derived._saveVersion = {
      version: CURRENT_SAVE_VERSION,
      createdAt: Date.now(),
    };
  }

  return { state: derived, latest };
};

const getSnapshotRelativePath = (
  snapshot: VfsSnapshot,
  rawPath: string,
): string | null => {
  if (typeof rawPath !== "string" || rawPath.length === 0) {
    return null;
  }

  const normalizedPath = normalizeVfsPath(rawPath);
  if (!normalizedPath) return null;

  const snapshotRoot = normalizeVfsPath(
    `turns/fork-${snapshot.forkId}/turn-${snapshot.turn}`,
  );

  if (normalizedPath === snapshotRoot) {
    return null;
  }

  if (normalizedPath.startsWith(`${snapshotRoot}/`)) {
    return normalizedPath.slice(snapshotRoot.length + 1);
  }

  return normalizedPath;
};

const collectStateEditorFilesFromSnapshot = (
  snapshot: VfsSnapshot,
): Record<string, string> => {
  const files: Record<string, string> = {};

  for (const file of Object.values(snapshot.files ?? {})) {
    if (!file || typeof file !== "object") continue;
    if (typeof file.content !== "string") continue;

    const relativePath = getSnapshotRelativePath(snapshot, file.path);
    if (!relativePath) continue;

    files[relativePath] = file.content;
  }

  return files;
};

const collectStateEditorSharedFiles = (
  sharedFiles: VfsFileMap | null,
): Record<string, string> => {
  const files: Record<string, string> = {};
  if (!sharedFiles || typeof sharedFiles !== "object") return files;

  for (const entry of Object.values(sharedFiles)) {
    if (!isVfsFileLike(entry)) continue;

    const normalizedPath = normalizeVfsPath(entry.path);
    if (!normalizedPath) continue;

    files[normalizedPath] = entry.content;
  }

  return files;
};

const writeStructuredVfsLayoutToZip = (
  zip: JSZip,
  snapshots: VfsSnapshot[],
  latestSnapshot: VfsSnapshot | null,
  sharedFiles: VfsFileMap | null,
): void => {
  if (snapshots.length === 0 && !latestSnapshot && !sharedFiles) {
    return;
  }

  zip.file(
    "vfs/README.md",
    [
      "# VFS Layout",
      "",
      "- `current/`: Latest view aligned with StateEditor file tree.",
      "- `history/`: Per-snapshot expanded files by `fork/turn`.",
      "- `shared/`: Expanded shared mutable layer files.",
    ].join("\n"),
  );

  for (const snapshot of snapshots) {
    const files = collectStateEditorFilesFromSnapshot(snapshot);
    const historyRoot = `vfs/history/fork-${snapshot.forkId}/turn-${snapshot.turn}`;
    for (const [relativePath, content] of Object.entries(files)) {
      zip.file(`${historyRoot}/${relativePath}`, content);
    }
  }

  const sharedStateEditorFiles = collectStateEditorSharedFiles(sharedFiles);
  for (const [relativePath, content] of Object.entries(
    sharedStateEditorFiles,
  )) {
    zip.file(`vfs/shared/${relativePath}`, content);
  }

  if (latestSnapshot) {
    const currentFiles = {
      ...collectStateEditorFilesFromSnapshot(latestSnapshot),
      ...sharedStateEditorFiles,
    };
    for (const [relativePath, content] of Object.entries(currentFiles)) {
      zip.file(`vfs/current/${relativePath}`, content);
    }
  }
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

  const snapshotsRoot = zip.folder("vfs")?.folder("snapshots");
  if (!snapshotsRoot) {
    console.warn("[SaveExport] Failed to create vfs/snapshots folder in ZIP");
    return { snapshotCount: 0, latest };
  }

  const blobPool = new Map<string, VfsExportBlobContent>();
  let written = 0;
  for (const entry of indexEntries) {
    try {
      const snapshot = await store.loadSnapshot(
        saveId,
        entry.forkId,
        entry.turn,
      );
      if (!snapshot) {
        console.warn(
          `[SaveExport] Missing VFS snapshot for fork=${entry.forkId} turn=${entry.turn}`,
        );
        continue;
      }

      const snapshotForExport =
        options?.includeImages === false
          ? rewriteSnapshotImageReferences(
              pruneRebuildableSessionFilesFromSnapshot(snapshot),
              {
                stripImageReferences: true,
              },
            )
          : pruneRebuildableSessionFilesFromSnapshot(snapshot);

      const snapshotV3 = await toExportSnapshotV3(snapshotForExport, blobPool);

      const forkFolder = snapshotsRoot.folder(`fork-${entry.forkId}`);
      forkFolder?.file(
        `turn-${entry.turn}.json`,
        JSON.stringify(snapshotV3, null, 2),
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
    latestSnapshot = await store.loadSnapshot(
      saveId,
      latest.forkId,
      latest.turn,
    );
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

  const blobPoolEntries: VfsExportBlobPoolEntry[] = Array.from(
    blobPool.entries(),
  )
    .map(([blobId, blob]) => ({
      blobId,
      contentType: blob.contentType,
      size: blob.size,
    }))
    .sort((a, b) => a.blobId.localeCompare(b.blobId));

  const blobPoolIndex: VfsExportBlobPoolIndex = {
    version: 1,
    encoding: VFS_BLOB_REF_ENCODING,
    blobs: blobPoolEntries,
  };
  zip.file("vfs/blob_pool/index.json", JSON.stringify(blobPoolIndex, null, 2));

  for (const [blobId, blob] of blobPool.entries()) {
    zip.file(
      buildBlobPoolPath(blobId),
      JSON.stringify(
        {
          version: 1,
          encoding: VFS_BLOB_REF_ENCODING,
          blobId,
          contentType: blob.contentType,
          size: blob.size,
          content: blob.content,
        },
        null,
        2,
      ),
    );
  }

  const bundle: VfsExportBundleIndexV3 = {
    version: 1,
    encoding: VFS_BLOB_REF_ENCODING,
    latest,
    snapshots: indexEntries,
    blobs: {
      count: blobPoolEntries.length,
    },
  };
  zip.file("vfs/index.json", JSON.stringify(bundle, null, 2));

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
  const turnsIndex = buildLegacyTurnsIndex(state.nodes);
  if (turnsIndex.size === 0) {
    console.warn("[SaveImport] No legacy nodes found to seed VFS");
    return { snapshotCount: 0, latest: null };
  }

  const latestTurnByFork = new Map<number, number>();
  for (const [forkId, turns] of turnsIndex.entries()) {
    const turnNumbers = Array.from(turns.keys()).filter((t) =>
      Number.isFinite(t),
    );
    const maxTurn = turnNumbers.length > 0 ? Math.max(...turnNumbers) : -1;
    if (maxTurn >= 0) latestTurnByFork.set(forkId, maxTurn);
  }

  const forkIds = Array.from(latestTurnByFork.keys()).sort((a, b) => a - b);
  if (forkIds.length === 0) {
    return { snapshotCount: 0, latest: null };
  }

  // Build a stable view of turn files for all forks (final state).
  const turnFiles: Array<{ forkId: number; turn: number; file: TurnFile }> = [];
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
          createdAt:
            typeof model.timestamp === "number" ? model.timestamp : Date.now(),
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
    activeParsed &&
    (activeParsed.kind === "turn" || activeParsed.kind === "turnId")
      ? activeParsed.forkId
      : typeof state.forkId === "number"
        ? state.forkId
        : forkIds[0];
  const activeTurn =
    activeParsed &&
    (activeParsed.kind === "turn" || activeParsed.kind === "turnId")
      ? activeParsed.turn
      : typeof state.turnNumber === "number"
        ? state.turnNumber
        : (latestTurnByFork.get(activeForkId) ?? 0);

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

      const snapshotState =
        (model.stateSnapshot as GameStateSnapshot | undefined) ?? null;
      const worldState: GameState = {
        ...state,
        ...(snapshotState ?? {}),
        theme: state.theme,
        playerProfile: state.playerProfile,
        customContext: state.customContext,
        language: state.language,
        narrativeScale: state.narrativeScale,
        seedImageId: state.seedImageId,
        forkId,
        turnNumber: turn,
      };

      seedVfsSessionFromGameState(session, worldState);

      if (state.outline) {
        writeOutlineFile(session, state.outline);
      }
      if (state.outlineConversation) {
        writeOutlineProgress(session, state.outlineConversation ?? null);
      }

      writeForkTree(session, state.forkTree);

      const latestForSnapshot: Record<string, number> = {};
      const orderForSnapshot: Record<string, string[]> = {};

      for (const id of forkIds) {
        const fullLatest = latestTurnByFork.get(id) ?? 0;
        const latest = id === forkId ? turn : fullLatest;
        latestForSnapshot[String(id)] = latest;
        orderForSnapshot[String(id)] = (
          turnOrderByFork[String(id)] || []
        ).filter((turnId) => {
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
        createdAt:
          typeof model.timestamp === "number" ? model.timestamp : Date.now(),
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
  options?: ExportOptions,
  slot?: SaveSlot,
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

    const effectiveOptions: ExportOptions = options ?? {
      includeImages: true,
      includeEmbeddings: true,
      includeLogs: true,
    };

    const fallbackSlot: SaveSlot = {
      id: slotId,
      name: slot?.name || gameState.outline?.title || "Save",
      timestamp: Date.now(),
      theme: slot?.theme || gameState.theme || "fantasy",
      summary:
        slot?.summary ||
        gameState.outline?.premise ||
        gameState.outline?.openingNarrative?.narrative?.slice(0, 160) ||
        "",
      previewImage: slot?.previewImage || gameState.seedImageId,
    };

    let estimatedSize: number | undefined;
    try {
      const estimateBlob = await exportSave(
        slotId,
        slot ?? fallbackSlot,
        effectiveOptions,
      );
      estimatedSize = estimateBlob?.size;
    } catch (error) {
      console.warn(
        "[SaveExport] Failed to generate accurate size estimate:",
        error,
      );
    }

    if (typeof estimatedSize !== "number") {
      // Conservative fallback (uncompressed-ish) when live estimation fails.
      estimatedSize = JSON.stringify(gameState).length;
      if (effectiveOptions.includeImages) {
        for (const img of images) {
          estimatedSize += img.blob.size;
        }
      }
      if (effectiveOptions.includeEmbeddings) {
        estimatedSize += embeddingCount * 1024;
      }
      if (!effectiveOptions.includeLogs) {
        estimatedSize = Math.max(estimatedSize - logCount * 5 * 1024, 0);
      }
    }

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

const writeOptionalJsonFile = (
  zip: JSZip,
  path: string,
  payload: unknown,
): void => {
  if (payload === undefined || payload === null) return;
  zip.file(path, JSON.stringify(payload, null, 2));
};

const writeSaveRuntimeMetadataToZip = async (
  zip: JSZip,
  slotId: string,
): Promise<void> => {
  try {
    const [uiState, runtimeStats] = await Promise.all([
      loadMetadata(`ui_state:${slotId}`),
      loadMetadata(`runtime_stats:${slotId}`),
    ]);

    writeOptionalJsonFile(zip, "meta/ui_state.json", uiState);
    writeOptionalJsonFile(zip, "meta/runtime_stats.json", runtimeStats);
  } catch (error) {
    console.warn("[SaveExport] Failed to export runtime metadata:", error);
  }
};

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

    // Export per-save runtime metadata (UI layout, runtime counters/log cache).
    await writeSaveRuntimeMetadataToZip(zip, slotId);

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
    params?: JsonObject,
    debugMessage?: string,
  ) => {
    errors.push(debugMessage ?? key);
    errorsI18n.push({ key, params });
  };

  const pushWarning = (
    key: string,
    params?: JsonObject,
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
      const bundle = JSON.parse(indexJson) as Partial<VfsExportBundleIndexV3>;
      if (bundle.encoding !== VFS_BLOB_REF_ENCODING) {
        pushError(
          "import.errors.unreadableVfsIndex",
          undefined,
          "Unsupported VFS index encoding. This build only supports blob_ref_v1.",
        );
        return { valid: false, errors, warnings, errorsI18n, warningsI18n };
      }

      const snapshots = Array.isArray(bundle?.snapshots)
        ? bundle.snapshots
        : [];
      if (snapshots.length === 0) {
        pushError(
          "import.errors.emptyVfsIndex",
          undefined,
          "VFS snapshot index is empty (vfs/index.json).",
        );
        return { valid: false, errors, warnings, errorsI18n, warningsI18n };
      }

      const blobIndexFile = zip.file("vfs/blob_pool/index.json");
      if (!blobIndexFile) {
        pushError(
          "import.errors.unreadableVfsIndex",
          undefined,
          "Missing VFS blob pool index (vfs/blob_pool/index.json).",
        );
        return { valid: false, errors, warnings, errorsI18n, warningsI18n };
      }

      let blobIndex: VfsExportBlobPoolIndex | null = null;
      try {
        blobIndex = JSON.parse(
          await blobIndexFile.async("text"),
        ) as VfsExportBlobPoolIndex;
      } catch (error) {
        console.warn(
          "[SaveImport] Failed to parse VFS blob pool index:",
          error,
        );
      }
      if (
        !blobIndex ||
        blobIndex.encoding !== VFS_BLOB_REF_ENCODING ||
        !Array.isArray(blobIndex.blobs)
      ) {
        pushError(
          "import.errors.unreadableVfsIndex",
          undefined,
          "Failed to parse VFS blob pool index (vfs/blob_pool/index.json).",
        );
        return { valid: false, errors, warnings, errorsI18n, warningsI18n };
      }

      const missingBlobPaths: string[] = [];
      for (const blob of blobIndex.blobs) {
        if (!blob || typeof blob.blobId !== "string") continue;
        const path = buildBlobPoolPath(blob.blobId);
        if (!zip.file(path)) {
          missingBlobPaths.push(path);
        }
      }

      if (missingBlobPaths.length > 0) {
        pushError(
          "import.errors.missingSnapshotFile",
          { path: missingBlobPaths[0] },
          `Missing VFS blob file (${missingBlobPaths[0]}).`,
        );
        return { valid: false, errors, warnings, errorsI18n, warningsI18n };
      }

      const availableBlobIds = new Set(
        blobIndex.blobs
          .map((blob) =>
            blob && typeof blob.blobId === "string" ? blob.blobId : null,
          )
          .filter((value): value is string => Boolean(value)),
      );

      for (const entry of snapshots) {
        if (
          !entry ||
          typeof entry.forkId !== "number" ||
          typeof entry.turn !== "number"
        ) {
          continue;
        }
        const snapshotPath = `vfs/snapshots/fork-${entry.forkId}/turn-${entry.turn}.json`;
        const snapshotFile = zip.file(snapshotPath);
        if (!snapshotFile) continue;
        const snapshotV3 = JSON.parse(
          await snapshotFile.async("text"),
        ) as VfsExportSnapshotV3;
        if (
          !snapshotV3 ||
          snapshotV3.encoding !== VFS_BLOB_REF_ENCODING ||
          !snapshotV3.fileRefs ||
          typeof snapshotV3.fileRefs !== "object"
        ) {
          pushError(
            "import.errors.unreadableVfsIndex",
            undefined,
            `Failed to parse VFS v3 snapshot (${snapshotPath}).`,
          );
          return {
            valid: false,
            errors,
            warnings,
            errorsI18n,
            warningsI18n,
          };
        }

        for (const fileRef of Object.values(snapshotV3.fileRefs)) {
          if (!fileRef || typeof fileRef.blobId !== "string") continue;
          if (!availableBlobIds.has(fileRef.blobId)) {
            const blobPath = buildBlobPoolPath(fileRef.blobId);
            pushError(
              "import.errors.missingSnapshotFile",
              { path: blobPath },
              `Missing VFS blob reference target (${blobPath}).`,
            );
            return {
              valid: false,
              errors,
              warnings,
              errorsI18n,
              warningsI18n,
            };
          }
        }
      }

      // Validate that at least the latest snapshot file exists.
      const latest = bundle?.latest ?? null;
      const latestEntry = isValidLatestMeta(latest)
        ? latest
        : snapshots[snapshots.length - 1];
      if (
        latestEntry &&
        typeof latestEntry.forkId === "number" &&
        typeof latestEntry.turn === "number"
      ) {
        const snapshotPath = `vfs/snapshots/fork-${latestEntry.forkId}/turn-${latestEntry.turn}.json`;
        if (!zip.file(snapshotPath)) {
          pushError(
            "import.errors.missingSnapshotFile",
            { path: snapshotPath },
            `Missing VFS snapshot file (${snapshotPath}).`,
          );
          return { valid: false, errors, warnings, errorsI18n, warningsI18n };
        }

        const snapshotContent = await zip.file(snapshotPath)!.async("text");
        const snapshotV3 = JSON.parse(snapshotContent) as VfsExportSnapshotV3;
        if (
          !snapshotV3 ||
          snapshotV3.encoding !== VFS_BLOB_REF_ENCODING ||
          !snapshotV3.fileRefs ||
          typeof snapshotV3.fileRefs !== "object"
        ) {
          pushError(
            "import.errors.unreadableVfsIndex",
            undefined,
            `Failed to parse VFS v3 snapshot (${snapshotPath}).`,
          );
          return {
            valid: false,
            errors,
            warnings,
            errorsI18n,
            warningsI18n,
          };
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

    let importedUiState: unknown = null;
    let importedRuntimeStats: unknown = null;

    const uiStateFile = zip.file("meta/ui_state.json");
    if (uiStateFile) {
      try {
        importedUiState = JSON.parse(await uiStateFile.async("text"));
      } catch (error) {
        console.warn("[SaveImport] Failed to parse meta/ui_state.json:", error);
        warnings.push("Failed to parse saved UI state metadata.");
      }
    }

    const runtimeStatsFile = zip.file("meta/runtime_stats.json");
    if (runtimeStatsFile) {
      try {
        importedRuntimeStats = JSON.parse(await runtimeStatsFile.async("text"));
      } catch (error) {
        console.warn(
          "[SaveImport] Failed to parse meta/runtime_stats.json:",
          error,
        );
        warnings.push("Failed to parse saved runtime stats metadata.");
      }
    }

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
      const bundle = JSON.parse(indexJson) as Partial<VfsExportBundleIndexV3>;
      const latestMeta = bundle?.latest ?? null;
      const declaredLatest = isValidLatestMeta(latestMeta) ? latestMeta : null;
      const snapshots = Array.isArray(bundle?.snapshots)
        ? bundle.snapshots
        : [];
      if (
        (bundle as Partial<VfsExportBundleIndexV3>)?.encoding !==
        VFS_BLOB_REF_ENCODING
      ) {
        return {
          success: false,
          error:
            "Unsupported VFS index encoding. This build only supports blob_ref_v1.",
          errorI18n: { key: "import.errors.unreadableVfsIndex" },
          warnings,
          warningsI18n,
        };
      }

      let blobPool = new Map<string, VfsExportBlobContent>();
      const blobPoolIndexFile = zip.file("vfs/blob_pool/index.json");
      if (!blobPoolIndexFile) {
        return {
          success: false,
          error: "Missing VFS blob pool index (vfs/blob_pool/index.json).",
          errorI18n: { key: "import.errors.unreadableVfsIndex" },
          warnings,
          warningsI18n,
        };
      }

      const blobPoolIndex = JSON.parse(
        await blobPoolIndexFile.async("text"),
      ) as VfsExportBlobPoolIndex;
      if (
        !blobPoolIndex ||
        blobPoolIndex.encoding !== VFS_BLOB_REF_ENCODING ||
        !Array.isArray(blobPoolIndex.blobs)
      ) {
        return {
          success: false,
          error: "Failed to parse VFS blob pool index.",
          errorI18n: { key: "import.errors.unreadableVfsIndex" },
          warnings,
          warningsI18n,
        };
      }

      for (const blobMeta of blobPoolIndex.blobs) {
        if (!blobMeta || typeof blobMeta.blobId !== "string") continue;
        const blobFile = zip.file(buildBlobPoolPath(blobMeta.blobId));
        if (!blobFile) {
          continue;
        }
        const payload = JSON.parse(await blobFile.async("text")) as {
          content?: unknown;
          contentType?: unknown;
          size?: unknown;
        };
        if (typeof payload.content !== "string") continue;
        const contentType =
          typeof payload.contentType === "string"
            ? (payload.contentType as VfsContentType)
            : (blobMeta.contentType as VfsContentType);
        blobPool.set(blobMeta.blobId, {
          content: payload.content,
          contentType,
          size:
            typeof payload.size === "number"
              ? payload.size
              : payload.content.length,
        });
      }

      let importedSharedFiles: VfsFileMap | null = null;
      const sharedFile = zip.file("vfs/shared.json");
      if (sharedFile) {
        try {
          const sharedJson = await sharedFile.async("text");
          const sharedPayload = JSON.parse(sharedJson) as {
            files?: unknown;
          };
          if (isVfsFileMap(sharedPayload?.files)) {
            importedSharedFiles = sharedPayload.files;
          }
        } catch (error) {
          console.warn("[SaveImport] Failed to parse vfs/shared.json:", error);
          warnings.push(
            "Failed to parse vfs/shared.json. Shared VFS layer will be rebuilt.",
          );
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
      let latestImportedSnapshot: VfsSnapshot | null = null;
      let latestImportedEntry: VfsExportIndexEntry | null = null;
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
        const snapshotV3 = JSON.parse(snapshotJson) as VfsExportSnapshotV3;
        if (
          !snapshotV3 ||
          snapshotV3.encoding !== VFS_BLOB_REF_ENCODING ||
          !snapshotV3.fileRefs ||
          typeof snapshotV3.fileRefs !== "object"
        ) {
          continue;
        }

        const snapshot = restoreSnapshotFromExportV3(
          newSlotId,
          snapshotV3,
          blobPool,
        );

        if (!snapshot) continue;

        const snapshotWithMappedImages = rewriteSnapshotImageReferences(
          snapshot,
          {
            remapImageIds: imageIdMapping,
          },
        );

        snapshotWithMappedImages.saveId = newSlotId;
        await store.saveSnapshot(snapshotWithMappedImages);
        imported += 1;

        const matchesDeclaredLatest =
          declaredLatest?.forkId === entry.forkId &&
          declaredLatest?.turn === entry.turn;
        if (matchesDeclaredLatest) {
          latestImportedSnapshot = snapshotWithMappedImages;
          latestImportedEntry = {
            forkId: entry.forkId,
            turn: entry.turn,
            createdAt:
              typeof entry.createdAt === "number"
                ? entry.createdAt
                : Date.now(),
          };
        } else if (!declaredLatest) {
          const candidateCreatedAt =
            typeof entry.createdAt === "number" ? entry.createdAt : Date.now();
          const existingCreatedAt = latestImportedEntry?.createdAt ?? -1;
          const shouldReplace =
            !latestImportedEntry ||
            candidateCreatedAt > existingCreatedAt ||
            (candidateCreatedAt === existingCreatedAt &&
              (entry.forkId > latestImportedEntry.forkId ||
                (entry.forkId === latestImportedEntry.forkId &&
                  entry.turn > latestImportedEntry.turn)));
          if (shouldReplace) {
            latestImportedSnapshot = snapshotWithMappedImages;
            latestImportedEntry = {
              forkId: entry.forkId,
              turn: entry.turn,
              createdAt: candidateCreatedAt,
            };
          }
        }
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
      if (declaredLatest) {
        latestForkId = declaredLatest.forkId;
        latestTurn = declaredLatest.turn;
      } else if (latestImportedEntry) {
        latestForkId = latestImportedEntry.forkId;
        latestTurn = latestImportedEntry.turn;
      } else {
        const indexes = await listVfsSnapshotIndexEntries(newSlotId);
        const best = indexes.reduce(
          (acc, item) => {
            if (!acc) return item;
            return item.createdAt > acc.createdAt ? item : acc;
          },
          null as VfsExportIndexEntry | null,
        );
        if (best) {
          latestForkId = best.forkId;
          latestTurn = best.turn;
        }
      }

      let sharedForSave: VfsFileMap | null = importedSharedFiles;

      if (latestForkId !== null && latestTurn !== null) {
        await saveMetadata(`vfs_latest:${newSlotId}`, {
          forkId: latestForkId,
          turn: latestTurn,
          updatedAt: Date.now(),
        });

        // Derive lightweight slot info from latest snapshot for nicer UI.
        try {
          const latestSnapshot =
            latestImportedSnapshot &&
            latestImportedSnapshot.forkId === latestForkId &&
            latestImportedSnapshot.turn === latestTurn
              ? latestImportedSnapshot
              : await store.loadSnapshot(newSlotId, latestForkId, latestTurn);
          if (latestSnapshot) {
            sharedForSave = repairSharedConversationIndex(
              sharedForSave,
              latestSnapshot,
              latestForkId,
            );

            if (!sharedForSave) {
              const inferred =
                extractSharedMutableStateFromSnapshot(latestSnapshot);
              sharedForSave =
                Object.keys(inferred).length > 0 ? inferred : null;
              sharedForSave = repairSharedConversationIndex(
                sharedForSave,
                latestSnapshot,
                latestForkId,
              );
            }

            const session = new VfsSession();
            restoreVfsSessionFromSnapshot(session, latestSnapshot);
            if (sharedForSave) {
              applySharedMutableStateToSession(session, sharedForSave);
            }

            const derived = deriveGameStateFromVfs(session.snapshot());
            derivedTheme =
              typeof derived?.theme === "string" ? derived.theme : undefined;
            derivedName =
              typeof derived?.outline?.title === "string"
                ? derived.outline.title
                : undefined;
            derivedSummary =
              typeof derived?.outline?.premise === "string"
                ? derived.outline.premise
                : typeof derived?.outline?.openingNarrative?.narrative ===
                    "string"
                  ? derived.outline.openingNarrative.narrative.slice(0, 160)
                  : undefined;
            derivedPreviewImage =
              typeof derived?.seedImageId === "string"
                ? derived.seedImageId
                : undefined;
          }
        } catch (err) {
          console.warn(
            "[SaveImport] Failed to derive slot info from VFS snapshot:",
            err,
          );
        }
      }

      await saveMetadata(`vfs_shared:${newSlotId}`, {
        files: sharedForSave ?? {},
        updatedAt: Date.now(),
        importedFromArchive: true,
      });

      console.log(`[SaveImport] Imported ${imported} VFS snapshots`);
    } catch (error) {
      console.warn(
        "[SaveImport] Failed to import/reconstruct VFS snapshots:",
        error,
      );
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
      name: generateUniqueName(
        derivedName || manifest.slot.name,
        existingSlots,
      ),
      timestamp: Date.now(),
      theme: derivedTheme || manifest.slot.theme,
      summary: derivedSummary || manifest.slot.summary || "",
      previewImage:
        derivedPreviewImage ||
        (manifest.slot.previewImage
          ? imageIdMapping.get(manifest.slot.previewImage) ||
            manifest.slot.previewImage
          : undefined),
    };

    // Update slots metadata
    const updatedSlots = [...existingSlots, newSlot];
    await saveMetadata("slots", updatedSlots);

    if (importedUiState !== null && importedUiState !== undefined) {
      await saveMetadata(`ui_state:${newSlotId}`, importedUiState);
    }
    if (importedRuntimeStats !== null && importedRuntimeStats !== undefined) {
      await saveMetadata(`runtime_stats:${newSlotId}`, importedRuntimeStats);
    }

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

  const rootPrefix =
    typeof (imagesFolder as { root?: unknown }).root === "string"
      ? ((imagesFolder as { root?: string }).root ?? "")
      : "";

  const allFiles = Object.values(imagesFolder.files);
  const isUnderRoot = (name: string) =>
    !rootPrefix || name.startsWith(rootPrefix);
  const toRelative = (name: string) =>
    rootPrefix && name.startsWith(rootPrefix)
      ? name.slice(rootPrefix.length)
      : name;

  const imageFiles = allFiles.filter(
    (file) =>
      !file.dir && isUnderRoot(file.name) && !file.name.endsWith(".meta.json"),
  );

  const findMetaFile = (filename: string, oldId: string) => {
    const relativeName = toRelative(filename);
    const sameFolderMetaAbsolute = filename.replace(
      /\.(png|jpg|jpeg|webp)$/i,
      ".meta.json",
    );
    const sameFolderMetaRelative = relativeName.replace(
      /\.(png|jpg|jpeg|webp)$/i,
      ".meta.json",
    );

    const candidateNames = new Set<string>([
      sameFolderMetaAbsolute,
      sameFolderMetaRelative,
      `${oldId}.meta.json`,
      rootPrefix ? `${rootPrefix}${oldId}.meta.json` : `${oldId}.meta.json`,
      `images/${oldId}.meta.json`,
    ]);

    const exact = allFiles.find(
      (file) => !file.dir && candidateNames.has(file.name),
    );
    if (exact) {
      return exact;
    }

    return allFiles.find(
      (file) =>
        !file.dir &&
        isUnderRoot(file.name) &&
        (file.name.endsWith(`/${oldId}.meta.json`) ||
          toRelative(file.name) === `${oldId}.meta.json`),
    );
  };

  for (const imageFile of imageFiles) {
    const filename = imageFile.name;

    try {
      const oldId = filename
        .replace(/\.(png|jpg|jpeg|webp)$/i, "")
        .split("/")
        .pop()!;

      const metaFile = findMetaFile(filename, oldId);
      let metadata: ImportedImageMetadata = { forkId: 0, turnIdx: 0 };
      if (metaFile) {
        try {
          metadata = parseImportedImageMetadata(
            JSON.parse(await metaFile.async("text")) as unknown,
          );
        } catch {
          // Ignore metadata parse errors
        }
      }

      const blob = await imageFile.async("blob");

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
