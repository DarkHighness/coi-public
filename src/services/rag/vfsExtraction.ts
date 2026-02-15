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

const MAX_CHUNK_CHARS = 1800;
const MIN_CHUNK_CHARS = 320;
const MAX_CHUNKS_PER_FILE = 180;
const MAX_JSON_UNITS = 240;

const OVERLAP_RATIO_DEFAULT = 0.15;
const OVERLAP_MIN_CHARS = 80;
const OVERLAP_MAX_CHARS = 320;

const STRATEGY_OVERLAP_RATIO: Record<ChunkStrategy, number> = {
  json_path_object: 0.1,
  markdown_heading: 0.17,
  text_window: OVERLAP_RATIO_DEFAULT,
};

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

const safeStringify = (value: unknown, space = 0): string => {
  try {
    return JSON.stringify(value, null, space) || "";
  } catch {
    return "";
  }
};

const splitByMaxChars = (text: string, maxChars: number): string[] => {
  const normalized = text.trim();
  if (!normalized) return [];
  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    let next = Math.min(normalized.length, cursor + maxChars);

    if (next < normalized.length) {
      const window = normalized.slice(cursor, next);
      const paragraphBreak = window.lastIndexOf("\n\n");
      const lineBreak = window.lastIndexOf("\n");
      const sentenceBreak = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("! "),
        window.lastIndexOf("? "),
        window.lastIndexOf("。"),
        window.lastIndexOf("！"),
        window.lastIndexOf("？"),
      );
      const wordBreak = window.lastIndexOf(" ");

      const preferredBreak = [
        paragraphBreak,
        lineBreak,
        sentenceBreak,
        wordBreak,
      ].find((idx) => idx > Math.max(MIN_CHUNK_CHARS / 2, 40));

      if (typeof preferredBreak === "number") {
        next = cursor + preferredBreak + 1;
      }
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
  let previousStrategy: ChunkStrategy | null = null;

  for (const seed of seeds) {
    const base = seed.content.trim();
    if (!base) continue;

    const strategy = seed.strategy;
    const ratio = STRATEGY_OVERLAP_RATIO[strategy] ?? OVERLAP_RATIO_DEFAULT;
    const overlapCharsTarget =
      previousStrategy === strategy
        ? computeAdaptiveOverlapChars(base.length, ratio)
        : 0;

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
    previousStrategy = strategy;
  }

  return outputs;
};

const splitTextIntoChunkSeeds = (text: string): ChunkSeed[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const paragraphs = trimmed
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const baseChunks: string[] = [];

  if (paragraphs.length <= 1) {
    baseChunks.push(...splitByMaxChars(trimmed, MAX_CHUNK_CHARS));
  } else {
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
        baseChunks.push(current);
        current = paragraph;
        continue;
      }

      baseChunks.push(...splitByMaxChars(candidate, MAX_CHUNK_CHARS));
      current = "";
    }

    if (current.trim()) {
      baseChunks.push(current.trim());
    }
  }

  return baseChunks
    .flatMap((chunk) => splitByMaxChars(chunk, MAX_CHUNK_CHARS))
    .map((content) => ({ content, strategy: "text_window" }));
};

interface MarkdownSection {
  headingPath: string;
  content: string;
}

const splitMarkdownSections = (markdown: string): MarkdownSection[] => {
  const trimmed = markdown.trim();
  if (!trimmed) return [];

  const lines = trimmed.split(/\r?\n/);
  const sections: MarkdownSection[] = [];

  let currentLines: string[] = [];
  let headingStack: string[] = [];
  let currentHeadingPath = "(root)";

  const flush = () => {
    const content = currentLines.join("\n").trim();
    if (content) {
      sections.push({
        headingPath: currentHeadingPath,
        content,
      });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (headingMatch) {
      flush();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      headingStack = headingStack.slice(0, level - 1);
      headingStack[level - 1] = headingText;
      currentHeadingPath = headingStack.filter(Boolean).join(" > ") || "(root)";
      currentLines.push(line);
      continue;
    }

    currentLines.push(line);
  }

  flush();

  if (sections.length === 0 && trimmed.length > 0) {
    return [{ headingPath: "(root)", content: trimmed }];
  }

  return sections;
};

const splitMarkdownIntoChunkSeeds = (markdown: string): ChunkSeed[] => {
  const sections = splitMarkdownSections(markdown);
  if (sections.length === 0) return [];

  const seeds: ChunkSeed[] = [];

  for (const section of sections) {
    const headingPrefix = `heading_path: ${section.headingPath}`;
    const maxBodyChars = Math.max(
      MIN_CHUNK_CHARS,
      MAX_CHUNK_CHARS - headingPrefix.length - 4,
    );
    const bodyParts = splitByMaxChars(section.content, maxBodyChars);

    for (const part of bodyParts) {
      seeds.push({
        strategy: "markdown_heading",
        content: `${headingPrefix}\n\n${part}`,
      });
    }
  }

  return seeds;
};

interface JsonUnit {
  path: string;
  value: unknown;
}

const collectJsonUnits = (
  value: unknown,
  path: string,
  units: JsonUnit[],
): void => {
  const normalizedPath = path || "$";
  const rendered = safeStringify(value, 2);

  if (!value || typeof value !== "object") {
    units.push({ path: normalizedPath, value });
    return;
  }

  if (rendered.length <= MAX_CHUNK_CHARS * 0.9) {
    units.push({ path: normalizedPath, value });
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      units.push({ path: normalizedPath, value });
      return;
    }

    value.forEach((item, index) => {
      collectJsonUnits(item, `${normalizedPath}[${index}]`, units);
    });
    return;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    units.push({ path: normalizedPath, value });
    return;
  }

  for (const [key, child] of entries) {
    const childPath = path ? `${path}.${key}` : key;
    collectJsonUnits(child, childPath, units);
  }
};

const splitJsonIntoChunkSeeds = (jsonContent: string): ChunkSeed[] => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonContent);
  } catch {
    return splitTextIntoChunkSeeds(jsonContent);
  }

  const units: JsonUnit[] = [];
  collectJsonUnits(parsed, "", units);

  if (units.length === 0) {
    return [];
  }

  if (units.length > MAX_JSON_UNITS) {
    const pretty = safeStringify(parsed, 2) || jsonContent;
    return splitByMaxChars(pretty, MAX_CHUNK_CHARS).map((content) => ({
      strategy: "json_path_object",
      content: `path: $\ncontent:\n${content}`,
    }));
  }

  const seeds: ChunkSeed[] = [];

  for (const unit of units) {
    const pathLabel = unit.path || "$";
    const rendered = safeStringify(unit.value, 2) || "null";

    const prefix = `path: ${pathLabel}`;
    const maxBodyChars = Math.max(
      MIN_CHUNK_CHARS,
      MAX_CHUNK_CHARS - prefix.length - 20,
    );
    const bodyParts = splitByMaxChars(rendered, maxBodyChars);

    bodyParts.forEach((part, index) => {
      const partInfo =
        bodyParts.length > 1 ? `\npart: ${index + 1}/${bodyParts.length}` : "";
      seeds.push({
        strategy: "json_path_object",
        content: `${prefix}${partInfo}\ncontent:\n${part}`,
      });
    });
  }

  return seeds;
};

const splitFileContent = (
  type: DocumentType,
  content: string,
): ChunkOutput[] => {
  if (!content.trim()) return [];

  switch (type) {
    case "json":
      return withOverlap(splitJsonIntoChunkSeeds(content));
    case "markdown":
      return withOverlap(splitMarkdownIntoChunkSeeds(content));
    default:
      return withOverlap(splitTextIntoChunkSeeds(content));
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
      splitFileContent(type, file.content),
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
