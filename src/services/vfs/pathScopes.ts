import type { VfsFile, VfsFileMap } from "./types";
import { normalizeVfsPath } from "./utils";

const cloneFile = (file: VfsFile): VfsFile => ({ ...file });

const cloneWithPath = (file: VfsFile, path: string): VfsFile => ({
  ...file,
  path,
});

export const stripCurrentPrefix = (path: string): string => {
  const normalized = normalizeVfsPath(path);
  if (normalized === "current") {
    return "";
  }
  if (normalized.startsWith("current/")) {
    return normalized.slice("current/".length);
  }
  return normalized;
};

const SHARED_MUTABLE_EXACT_PATHS = new Set([
  "world/theme_config.json",
  "outline/outline.json",
  "outline/progress.json",
  "world/runtime/custom_rules_ack_state.json",
]);

const SHARED_MUTABLE_PREFIXES = [
  "custom_rules/",
  // Legacy location for back-compat migrations.
  "world/custom_rules/",
];

const SHARED_READONLY_PREFIXES = ["skills/", "refs/"];

const SHARED_READONLY_EXACT_PATHS = new Set(["skills", "refs"]);

export const isSharedMutablePath = (path: string): boolean => {
  const normalized = stripCurrentPrefix(path);
  if (!normalized) return false;
  if (SHARED_MUTABLE_EXACT_PATHS.has(normalized)) {
    return true;
  }
  return SHARED_MUTABLE_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix),
  );
};

export const isSharedReadOnlyPath = (path: string): boolean => {
  const normalized = stripCurrentPrefix(path);
  if (!normalized) return false;
  if (SHARED_READONLY_EXACT_PATHS.has(normalized)) {
    return true;
  }
  return SHARED_READONLY_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix),
  );
};

export const isForkedSnapshotPath = (path: string): boolean => {
  const normalized = stripCurrentPrefix(path);
  if (!normalized) return false;
  if (isSharedReadOnlyPath(normalized)) {
    return false;
  }
  if (isSharedMutablePath(normalized)) {
    return false;
  }
  return true;
};

export interface PartitionedVfsFileMap {
  forked: VfsFileMap;
  sharedMutable: VfsFileMap;
  sharedReadonly: VfsFileMap;
}

export const partitionVfsFileMapByScope = (
  files: VfsFileMap,
): PartitionedVfsFileMap => {
  const forked: VfsFileMap = {};
  const sharedMutable: VfsFileMap = {};
  const sharedReadonly: VfsFileMap = {};

  for (const file of Object.values(files)) {
    const normalized = normalizeVfsPath(file.path);
    const normalizedFile = cloneWithPath(file, normalized);

    if (isSharedReadOnlyPath(normalized)) {
      sharedReadonly[normalized] = normalizedFile;
      continue;
    }

    if (isSharedMutablePath(normalized)) {
      sharedMutable[normalized] = normalizedFile;
      continue;
    }

    forked[normalized] = normalizedFile;
  }

  return { forked, sharedMutable, sharedReadonly };
};

export const filterVfsFileMap = (
  files: VfsFileMap,
  predicate: (path: string) => boolean,
): VfsFileMap => {
  const filtered: VfsFileMap = {};
  for (const file of Object.values(files)) {
    const normalized = normalizeVfsPath(file.path);
    if (!predicate(normalized)) {
      continue;
    }
    filtered[normalized] = cloneFile(cloneWithPath(file, normalized));
  }
  return filtered;
};
