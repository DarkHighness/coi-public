import type { VfsFile, VfsFileMap } from "./types";
import { normalizeVfsPath } from "./utils";
import { vfsPathRegistry } from "./core/pathRegistry";

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

export const isSharedMutablePath = (path: string): boolean => {
  const normalized = stripCurrentPrefix(path);
  if (!normalized) return false;

  const classification = vfsPathRegistry.classify(normalized);
  return (
    classification.scope === "shared" &&
    classification.permissionClass !== "immutable_readonly"
  );
};

export const isSharedReadOnlyPath = (path: string): boolean => {
  const normalized = stripCurrentPrefix(path);
  if (!normalized) return false;

  return vfsPathRegistry.classify(normalized).permissionClass === "immutable_readonly";
};

export const isForkedSnapshotPath = (path: string): boolean => {
  const normalized = stripCurrentPrefix(path);
  if (!normalized) return false;

  const classification = vfsPathRegistry.classify(normalized);
  return classification.scope === "fork";
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
    const classification = vfsPathRegistry.classify(normalized);

    if (classification.permissionClass === "immutable_readonly") {
      sharedReadonly[normalized] = normalizedFile;
      continue;
    }

    if (classification.scope === "shared") {
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
