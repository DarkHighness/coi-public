import type { VfsFileMap } from "../vfs/types";
import {
  canonicalToLogicalVfsPath,
  toCanonicalVfsPath,
} from "../vfs/core/pathResolver";
import { normalizeVfsPath } from "../vfs/utils";
import type {
  ChunkMeta,
  ChunkStrategy,
  DocumentType,
  FileChunkInput,
} from "./types";

const MAX_CHUNK_CHARS = 8000;
const MIN_CHUNK_CHARS = 3200;
const MAX_CHUNKS_PER_FILE = 36;

const OVERLAP_RATIO_DEFAULT = 0.2;
const OVERLAP_MIN_CHARS = 700;
const OVERLAP_MAX_CHARS = 1600;

const EXCLUDED_CANONICAL_PREFIXES = [
  "shared/system/refs",
  "shared/config/runtime",
];

const isExcludedCanonicalPath = (canonicalPath: string): boolean => {
  if (
    EXCLUDED_CANONICAL_PREFIXES.some((prefix) =>
      canonicalPath.startsWith(prefix),
    )
  ) {
    return true;
  }

  if (/^forks\/\d+\/runtime(?:\/|$)/.test(canonicalPath)) {
    return true;
  }

  if (/^forks\/\d+\/ops\/history_rewrites(?:\/|$)/.test(canonicalPath)) {
    return true;
  }

  return false;
};

const isIndexableContentType = (contentType: string): boolean => {
  if (!contentType) return false;
  if (contentType === "application/json") return true;
  if (contentType === "application/jsonl") return true;
  if (contentType === "text/markdown") return true;
  if (contentType === "text/plain") return true;
  return contentType.startsWith("text/");
};

const inferType = (contentType: string, path: string): DocumentType => {
  if (contentType === "application/json" || path.endsWith(".json")) {
    return "json";
  }
  if (contentType === "text/markdown" || path.endsWith(".md")) {
    return "markdown";
  }
  return "text";
};

const buildTags = (sourcePath: string, canonicalPath: string): string[] => {
  const tags = new Set<string>();
  const normalizedSource = normalizeVfsPath(sourcePath);

  const firstSegment = normalizedSource.split("/")[0] || "root";
  tags.add(firstSegment);

  if (normalizedSource.startsWith("world/")) tags.add("world");
  if (normalizedSource.startsWith("outline/")) tags.add("outline");
  if (normalizedSource.startsWith("conversation/")) tags.add("conversation");
  if (normalizedSource.startsWith("skills/")) tags.add("skills");
  if (normalizedSource.startsWith("custom_rules/")) tags.add("custom_rules");

  if (canonicalPath.startsWith("shared/")) tags.add("shared");
  if (canonicalPath.startsWith("forks/")) tags.add("fork");

  return Array.from(tags.values());
};

const splitFileIntoLargeBaseChunks = (text: string): string[] => {
  const normalized = text.trim();
  if (!normalized) return [];

  if (normalized.length <= MAX_CHUNK_CHARS) {
    return [normalized];
  }

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    let next = Math.min(normalized.length, cursor + MAX_CHUNK_CHARS);
    const remaining = normalized.length - next;

    // Avoid producing a tiny trailing chunk; fold tail into current chunk.
    if (remaining > 0 && remaining < MIN_CHUNK_CHARS) {
      next = normalized.length;
    }

    const chunk = normalized.slice(cursor, next).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    cursor = next;
  }

  return chunks;
};

const computeAdaptiveOverlapChars = (
  chunkLength: number,
  overlapRatio: number,
): number => {
  if (chunkLength <= 1) return 0;

  const estimated = Math.round(chunkLength * overlapRatio);
  const clamped = Math.max(
    OVERLAP_MIN_CHARS,
    Math.min(OVERLAP_MAX_CHARS, estimated),
  );

  // Ensure forward progress (always leave some non-overlapped content)
  return Math.min(clamped, Math.max(0, chunkLength - 40));
};

interface ChunkSeed {
  content: string;
  strategy: ChunkStrategy;
}

interface ChunkOutput {
  content: string;
  chunkMeta: ChunkMeta;
}

const capChunkOutputs = (
  chunks: ChunkOutput[],
  maxChunks: number,
): ChunkOutput[] => {
  if (chunks.length <= maxChunks) {
    return chunks;
  }

  const groupSize = Math.ceil(chunks.length / Math.max(1, maxChunks));
  const merged: ChunkOutput[] = [];

  for (let start = 0; start < chunks.length; start += groupSize) {
    const group = chunks.slice(start, start + groupSize);
    if (group.length === 0) {
      continue;
    }

    const strategy = group[0].chunkMeta.strategy;
    const combined = group.map((item) => item.content).join("\n\n");
    merged.push({
      content: combined,
      chunkMeta: {
        strategy,
        overlapChars: 0,
      },
    });
  }

  return merged;
};

const withOverlap = (seeds: ChunkSeed[]): ChunkOutput[] => {
  const outputs: ChunkOutput[] = [];

  let previousBaseContent = "";

  for (const seed of seeds) {
    const base = seed.content.trim();
    if (!base) continue;

    const strategy = seed.strategy;
    const overlapCharsTarget =
      outputs.length === 0
        ? 0
        : computeAdaptiveOverlapChars(base.length, OVERLAP_RATIO_DEFAULT);

    const overlapText =
      outputs.length === 0 || overlapCharsTarget <= 0
        ? ""
        : previousBaseContent.slice(
            Math.max(0, previousBaseContent.length - overlapCharsTarget),
          );

    const overlapChars = overlapText.length;
    const content = overlapChars > 0 ? `${overlapText}\n${base}` : base;

    outputs.push({
      content,
      chunkMeta: {
        strategy,
        overlapChars,
      },
    });

    previousBaseContent = base;
  }

  return outputs;
};

const splitTextIntoChunkSeeds = (text: string): ChunkSeed[] => {
  return splitFileIntoLargeBaseChunks(text).map((content) => ({
    content,
    strategy: "text_window",
  }));
};
const splitFileContent = (content: string): ChunkOutput[] => {
  if (!content.trim()) return [];
  return withOverlap(splitTextIntoChunkSeeds(content));
};

export interface ExtractVfsChunksOptions {
  saveId: string;
  forkId: number;
  turnNumber: number;
}

export const extractFileChunksFromSnapshot = (
  snapshot: VfsFileMap,
  options: ExtractVfsChunksOptions,
): FileChunkInput[] => {
  const { saveId, forkId, turnNumber } = options;
  const documents: FileChunkInput[] = [];

  for (const file of Object.values(snapshot)) {
    if (!isIndexableContentType(file.contentType)) {
      continue;
    }

    const canonicalPath = toCanonicalVfsPath(file.path, {
      activeForkId: forkId,
    });
    if (!canonicalPath || isExcludedCanonicalPath(canonicalPath)) {
      continue;
    }

    const sourcePath =
      canonicalToLogicalVfsPath(canonicalPath, {
        activeForkId: forkId,
        looseFork: true,
      }) || normalizeVfsPath(file.path);

    const type = inferType(file.contentType, sourcePath);
    const chunks = capChunkOutputs(
      splitFileContent(file.content),
      MAX_CHUNKS_PER_FILE,
    );
    if (chunks.length === 0) {
      continue;
    }

    const tags = buildTags(sourcePath, canonicalPath);

    chunks.forEach(({ content, chunkMeta }, index) => {
      documents.push({
        sourcePath,
        canonicalPath,
        type,
        contentType: file.contentType,
        fileHash: file.hash,
        chunkIndex: index,
        chunkCount: chunks.length,
        content,
        saveId,
        forkId,
        turnNumber,
        importance: type === "markdown" ? 0.75 : type === "json" ? 0.7 : 0.6,
        tags,
        chunkMeta,
      });
    });
  }

  return documents;
};

export const diffSnapshotFiles = (
  previousSnapshot: VfsFileMap,
  nextSnapshot: VfsFileMap,
): {
  changedPaths: string[];
  removedPaths: string[];
} => {
  const previousByCanonical = new Map<string, { hash: string }>();
  const nextByCanonical = new Map<string, { hash: string }>();

  Object.values(previousSnapshot).forEach((file) => {
    previousByCanonical.set(normalizeVfsPath(file.path), { hash: file.hash });
  });

  Object.values(nextSnapshot).forEach((file) => {
    nextByCanonical.set(normalizeVfsPath(file.path), { hash: file.hash });
  });

  const changed = new Set<string>();
  const removed: string[] = [];

  for (const [path, prev] of previousByCanonical.entries()) {
    const next = nextByCanonical.get(path);
    if (!next) {
      removed.push(path);
      continue;
    }

    if (next.hash !== prev.hash) {
      changed.add(path);
    }
  }

  for (const [path] of nextByCanonical.entries()) {
    if (!previousByCanonical.has(path)) {
      changed.add(path);
    }
  }

  return {
    changedPaths: Array.from(changed.values()),
    removedPaths: removed,
  };
};
