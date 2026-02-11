import type { VfsFileMap } from "../vfs/types";
import {
  canonicalToLogicalVfsPath,
  toCanonicalVfsPath,
} from "../vfs/core/pathResolver";
import { normalizeVfsPath } from "../vfs/utils";
import type { DocumentType, FileChunkInput } from "./types";

const MAX_CHUNK_CHARS = 1800;
const MIN_CHUNK_CHARS = 320;

const EXCLUDED_CANONICAL_PREFIXES = [
  "shared/system/refs",
  "shared/config/runtime",
];

const isExcludedCanonicalPath = (canonicalPath: string): boolean => {
  if (EXCLUDED_CANONICAL_PREFIXES.some((prefix) => canonicalPath.startsWith(prefix))) {
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

const hardSplit = (text: string, maxChars: number): string[] => {
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const next = Math.min(text.length, cursor + maxChars);
    chunks.push(text.slice(cursor, next));
    cursor = next;
  }
  return chunks;
};

const splitTextIntoChunks = (text: string): string[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= MAX_CHUNK_CHARS) return [trimmed];

  const paragraphs = trimmed
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (paragraphs.length <= 1) {
    return hardSplit(trimmed, MAX_CHUNK_CHARS);
  }

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }

    const candidate = `${current}\n\n${paragraph}`;
    if (candidate.length <= MAX_CHUNK_CHARS) {
      current = candidate;
      continue;
    }

    if (current.length >= MIN_CHUNK_CHARS) {
      chunks.push(current);
      current = paragraph;
      continue;
    }

    const merged = hardSplit(candidate, MAX_CHUNK_CHARS);
    chunks.push(...merged.slice(0, -1));
    current = merged[merged.length - 1] || "";
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
};

const splitMarkdownIntoChunks = (markdown: string): string[] => {
  const trimmed = markdown.trim();
  if (!trimmed) return [];

  const sections: string[] = [];
  const lines = trimmed.split(/\r?\n/);
  let current: string[] = [];

  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line) && current.length > 0) {
      sections.push(current.join("\n").trim());
      current = [line];
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    sections.push(current.join("\n").trim());
  }

  const normalizedSections = sections.filter((section) => section.length > 0);
  if (normalizedSections.length === 0) return [];

  return normalizedSections.flatMap((section) =>
    section.length > MAX_CHUNK_CHARS ? hardSplit(section, MAX_CHUNK_CHARS) : [section],
  );
};

const splitJsonIntoChunks = (jsonContent: string): string[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch {
    return splitTextIntoChunks(jsonContent);
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    Object.keys(parsed as Record<string, unknown>).length > 1
  ) {
    const entries = Object.entries(parsed as Record<string, unknown>);
    const chunks = entries.map(([key, value]) => {
      const block = {
        [key]: value,
      };
      return JSON.stringify(block, null, 2);
    });

    return chunks.flatMap((chunk) =>
      chunk.length > MAX_CHUNK_CHARS ? hardSplit(chunk, MAX_CHUNK_CHARS) : [chunk],
    );
  }

  const pretty = JSON.stringify(parsed, null, 2);
  return pretty
    ? pretty.length > MAX_CHUNK_CHARS
      ? hardSplit(pretty, MAX_CHUNK_CHARS)
      : [pretty]
    : [];
};

const splitFileContent = (type: DocumentType, content: string): string[] => {
  if (!content.trim()) return [];

  switch (type) {
    case "json":
      return splitJsonIntoChunks(content);
    case "markdown":
      return splitMarkdownIntoChunks(content);
    default:
      return splitTextIntoChunks(content);
  }
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

    const canonicalPath = toCanonicalVfsPath(file.path, { activeForkId: forkId });
    if (!canonicalPath || isExcludedCanonicalPath(canonicalPath)) {
      continue;
    }

    const sourcePath =
      canonicalToLogicalVfsPath(canonicalPath, {
        activeForkId: forkId,
        looseFork: true,
      }) || normalizeVfsPath(file.path);

    const type = inferType(file.contentType, sourcePath);
    const chunks = splitFileContent(type, file.content);
    if (chunks.length === 0) {
      continue;
    }

    const tags = buildTags(sourcePath, canonicalPath);

    chunks.forEach((content, index) => {
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
