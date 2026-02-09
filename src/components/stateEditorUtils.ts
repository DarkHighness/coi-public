import type { GameState } from "../types";
import type { VfsWriteContext } from "../services/vfs/core/types";
import type { VfsSession } from "../services/vfs/vfsSession";
import type { VfsContentType } from "../services/vfs/types";
import { applySectionEdit } from "../services/vfs/editor";
import { deriveGameStateFromVfs } from "../services/vfs/derivations";
import {
  ensureDirectoryChainReadmes,
  isReadmePath,
  isScaffoldDirectoryPath,
} from "../services/vfs/directoryScaffolds";
import { normalizeVfsPath } from "../services/vfs/utils";
import { mergeDerivedViewState } from "../hooks/vfsViewState";
import { writeVfsFile } from "./vfsExplorer/fileOps";

export type EditableVfsSection =
  | "global"
  | "character"
  | "inventory"
  | "npcs"
  | "locations"
  | "quests"
  | "knowledge"
  | "factions"
  | "timeline"
  | "causalChains"
  | "customRules"
  | "outline";

interface ApplyVfsStateEditParams {
  session: VfsSession;
  section: EditableVfsSection;
  data: unknown;
  baseState: GameState;
  options?: {
    allowOutlineEdit?: boolean;
    writeContext?: VfsWriteContext;
  };
}

interface ApplyVfsFileEditParams {
  session: VfsSession;
  path: string;
  content: string;
  contentType: VfsContentType;
  baseState: GameState;
  writeContext?: VfsWriteContext;
}

interface ApplyVfsPathOperationParams {
  session: VfsSession;
  baseState: GameState;
  writeContext?: VfsWriteContext;
}

interface ApplyVfsCreateFileParams extends ApplyVfsPathOperationParams {
  path: string;
  content: string;
  contentType: VfsContentType;
}

interface ApplyVfsCreateFolderParams extends ApplyVfsPathOperationParams {
  path: string;
  readmeContent?: string;
}

interface ApplyVfsRenamePathParams extends ApplyVfsPathOperationParams {
  fromPath: string;
  toPath: string;
  isFolder: boolean;
}

interface ApplyVfsDeletePathParams extends ApplyVfsPathOperationParams {
  path: string;
  isFolder: boolean;
}

interface ApplyVfsBatchMoveFilesParams extends ApplyVfsPathOperationParams {
  sourcePaths: string[];
  targetDirectory: string;
}

const applyDerived = (session: VfsSession, baseState: GameState): GameState => {
  const derived = deriveGameStateFromVfs(session.snapshot());
  return mergeDerivedViewState(baseState, derived);
};

const normalizePath = (path: string): string => normalizeVfsPath(path);

const getFolderChildPaths = (session: VfsSession, folderPath: string): string[] => {
  const normalizedFolderPath = normalizePath(folderPath);
  const prefix = normalizedFolderPath ? `${normalizedFolderPath}/` : "";
  return Object.keys(session.snapshot())
    .map((path) => normalizePath(path))
    .filter((candidate) => candidate.startsWith(prefix))
    .sort();
};

const ensureNoLockedReadmeMoveDelete = (
  candidatePath: string,
  operation: "move" | "delete",
): void => {
  if (!isReadmePath(candidatePath)) {
    return;
  }

  if (operation === "move") {
    throw new Error("README files are locked and cannot be moved.");
  }

  throw new Error("README files are locked and cannot be deleted.");
};

export const applyVfsStateEdit = ({
  session,
  section,
  data,
  baseState,
  options,
}: ApplyVfsStateEditParams): GameState => {
  applySectionEdit(session, section, data, options);
  const derived = deriveGameStateFromVfs(session.snapshot());
  return mergeDerivedViewState(baseState, derived);
};

export const applyVfsFileEdit = ({
  session,
  path,
  content,
  contentType,
  baseState,
  writeContext,
}: ApplyVfsFileEditParams): GameState => {
  writeVfsFile(session, path, content, contentType, writeContext);
  return applyDerived(session, baseState);
};

export const applyVfsCreateFile = ({
  session,
  path,
  content,
  contentType,
  baseState,
  writeContext,
}: ApplyVfsCreateFileParams): GameState => {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) {
    throw new Error("Invalid path");
  }
  const parentDirectory = normalizedPath.split("/").slice(0, -1).join("/");
  if (parentDirectory) {
    ensureDirectoryChainReadmes(session, parentDirectory);
  }
  writeVfsFile(session, normalizedPath, content, contentType, writeContext);
  return applyDerived(session, baseState);
};

export const applyVfsCreateFolder = ({
  session,
  path,
  readmeContent,
  baseState,
  writeContext,
}: ApplyVfsCreateFolderParams): GameState => {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) {
    throw new Error("Invalid path");
  }
  const createdReadmes = ensureDirectoryChainReadmes(session, normalizedPath);
  const targetReadme = `${normalizedPath}/README.md`;

  if (!session.readFile(targetReadme)) {
    session.writeFile(
      targetReadme,
      readmeContent ??
        [
          `# ${normalizedPath.split("/").pop() ?? "Folder"}`,
          "",
          `This directory stores files for ${normalizedPath}.`,
          "",
          "This README is a required folder marker for StateEditor.",
          "",
        ].join("\n"),
      "text/markdown",
      { writeContext },
    );
  } else if (readmeContent) {
    session.writeFile(targetReadme, readmeContent, "text/markdown", { writeContext });
  }

  if (createdReadmes.length === 0 && !session.readFile(targetReadme)) {
    throw new Error(`Unable to create folder marker at ${targetReadme}`);
  }

  return applyDerived(session, baseState);
};

export const applyVfsRenamePath = ({
  session,
  fromPath,
  toPath,
  isFolder,
  baseState,
  writeContext,
}: ApplyVfsRenamePathParams): GameState => {
  const normalizedFrom = normalizePath(fromPath);
  const normalizedTo = normalizePath(toPath);

  if (!normalizedFrom || !normalizedTo) {
    throw new Error("Invalid path");
  }

  if (normalizedFrom === normalizedTo) {
    return baseState;
  }

  if (isScaffoldDirectoryPath(normalizedFrom)) {
    throw new Error("Scaffold folders are locked and cannot be renamed.");
  }

  if (isReadmePath(normalizedFrom)) {
    throw new Error("README files are locked and cannot be moved.");
  }

  const toPrefix = `${normalizedTo}/`;
  if (isFolder && (normalizedTo === normalizedFrom || normalizedTo.startsWith(`${normalizedFrom}/`))) {
    throw new Error("Cannot move a folder into itself.");
  }

  const existingTarget = session.readFile(normalizedTo);
  if (existingTarget) {
    throw new Error(`Target already exists: ${normalizedTo}`);
  }

  const parentDirectory = normalizedTo.split("/").slice(0, -1).join("/");
  if (parentDirectory) {
    ensureDirectoryChainReadmes(session, parentDirectory);
  }

  if (!isFolder) {
    session.renameFile(normalizedFrom, normalizedTo, { writeContext });
    return applyDerived(session, baseState);
  }

  const children = getFolderChildPaths(session, normalizedFrom);
  if (children.length === 0) {
    throw new Error(`Folder not found or empty: ${normalizedFrom}`);
  }

  for (const child of children) {
    const suffix = child.slice(`${normalizedFrom}/`.length);
    const targetPath = normalizePath(`${toPrefix}${suffix}`);
    if (session.readFile(targetPath)) {
      throw new Error(`Target already exists: ${targetPath}`);
    }
  }

  const sorted = [...children].sort((a, b) => a.localeCompare(b));
  for (const child of sorted) {
    const suffix = child.slice(`${normalizedFrom}/`.length);
    const targetPath = normalizePath(`${toPrefix}${suffix}`);
    session.renameFile(child, targetPath, { writeContext });
  }

  return applyDerived(session, baseState);
};

export const applyVfsDeletePath = ({
  session,
  path,
  isFolder,
  baseState,
  writeContext,
}: ApplyVfsDeletePathParams): GameState => {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) {
    throw new Error("Invalid path");
  }

  if (isScaffoldDirectoryPath(normalizedPath)) {
    throw new Error("Scaffold folders are locked and cannot be deleted.");
  }

  if (!isFolder) {
    ensureNoLockedReadmeMoveDelete(normalizedPath, "delete");
    session.deleteFile(normalizedPath, { writeContext });
    return applyDerived(session, baseState);
  }

  const children = getFolderChildPaths(session, normalizedPath);
  if (children.length === 0) {
    throw new Error(`Folder not found or empty: ${normalizedPath}`);
  }

  const sorted = [...children].sort((a, b) => b.localeCompare(a));
  for (const child of sorted) {
    session.deleteFile(child, { writeContext });
  }

  return applyDerived(session, baseState);
};


export const applyVfsBatchMoveFiles = ({
  session,
  sourcePaths,
  targetDirectory,
  baseState,
  writeContext,
}: ApplyVfsBatchMoveFilesParams): GameState => {
  const normalizedTargetDirectory = normalizePath(targetDirectory);
  if (!normalizedTargetDirectory) {
    throw new Error("Invalid target directory");
  }

  if (session.readFile(normalizedTargetDirectory)) {
    throw new Error("Target must be a directory path.");
  }

  const normalizedSources = Array.from(
    new Set(sourcePaths.map((path) => normalizePath(path)).filter(Boolean)),
  );
  if (normalizedSources.length === 0) {
    throw new Error("No source files selected for batch move.");
  }

  const snapshotPaths = Object.keys(session.snapshot()).map((path) =>
    normalizePath(path),
  );

  const renamePairs: Array<{ fromPath: string; toPath: string }> = [];
  const targetPathSet = new Set<string>();
  const targetNameSet = new Set<string>();

  for (const sourcePath of normalizedSources) {
    if (isReadmePath(sourcePath)) {
      throw new Error("README files are locked and cannot be moved.");
    }

    const sourceFile = session.readFile(sourcePath);
    if (!sourceFile) {
      const directoryPrefix = `${sourcePath}/`;
      const sourceIsDirectory = snapshotPaths.some((candidatePath) =>
        candidatePath.startsWith(directoryPrefix),
      );
      if (sourceIsDirectory) {
        throw new Error(`Batch move only supports files: ${sourcePath}`);
      }
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    const fileName = sourcePath.split("/").pop();
    if (!fileName) {
      throw new Error(`Invalid source file path: ${sourcePath}`);
    }

    if (targetNameSet.has(fileName)) {
      throw new Error(`Target filename conflict within batch: ${fileName}`);
    }
    targetNameSet.add(fileName);

    const targetPath = normalizePath(`${normalizedTargetDirectory}/${fileName}`);
    if (!targetPath) {
      throw new Error(`Invalid target path for file: ${sourcePath}`);
    }

    if (targetPath === sourcePath) {
      throw new Error(`File is already in target directory: ${sourcePath}`);
    }

    if (targetPathSet.has(targetPath)) {
      throw new Error(`Duplicate target path in batch: ${targetPath}`);
    }
    targetPathSet.add(targetPath);

    if (session.readFile(targetPath)) {
      throw new Error(`Target already exists: ${targetPath}`);
    }

    renamePairs.push({ fromPath: sourcePath, toPath: targetPath });
  }

  ensureDirectoryChainReadmes(session, normalizedTargetDirectory);

  for (const pair of renamePairs) {
    session.renameFile(pair.fromPath, pair.toPath, { writeContext });
  }

  return applyDerived(session, baseState);
};
