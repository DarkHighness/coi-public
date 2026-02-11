/**
 * StateEditor - A modal component for editing VFS files via /edit command
 * Allows direct JSON/text editing through a file tree interface
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { OnMount } from "@monaco-editor/react";
import { ZodError } from "zod";
import { useTranslation } from "react-i18next";
import type { GameState } from "../types";
import type { VfsWriteContext } from "../services/vfs/core/types";
import type { VfsSession } from "../services/vfs/vfsSession";
import type { VfsContentType, VfsFileMap } from "../services/vfs/types";
import { buildVfsTree, type VfsTreeNode } from "./vfsExplorer/tree";
import { formatVfsContent, readVfsFile } from "./vfsExplorer/fileOps";
import {
  applyVfsBatchMoveFiles,
  applyVfsCreateFile,
  applyVfsCreateFolder,
  applyVfsDeletePath,
  applyVfsFileEdit,
  applyVfsRenamePath,
} from "./stateEditorUtils";
import {
  buildCustomRulePackMarkdownForCategory,
  toCustomRulePackPathForCategory,
} from "../services/vfs/customRules";
import { normalizeVfsPath } from "../services/vfs/utils";
import {
  CUSTOM_RULE_CATEGORY_PRESETS,
  getCustomRuleCategoryPresetFromPath,
} from "../services/vfs/directoryScaffolds";
import {
  getDirectoryPathCapabilities,
  getFilePathCapabilities,
} from "./vfsExplorer/capabilities";
import { MarkdownText } from "./render/MarkdownText";
import { buildNodeActions, type NodeActionItem } from "./vfsExplorer/nodeActions";
import { StateEditorRagPanel } from "./StateEditorRagPanel";

const MonacoEditor = React.lazy(() => import("@monaco-editor/react"));

interface NodeActionContext {
  path: string;
  nodeType: "file" | "folder";
}

interface ContextMenuState extends NodeActionContext {
  x: number;
  y: number;
}

interface StateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  vfsSession: VfsSession;
  editorSessionToken: string | null;
  applyVfsMutation: (nextState: GameState) => void;
  onShowToast?: (message: string, type: "success" | "error" | "info") => void;
}

export const StateEditor: React.FC<StateEditorProps> = ({
  isOpen,
  onClose,
  gameState,
  vfsSession,
  editorSessionToken,
  applyVfsMutation,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [fileContentType, setFileContentType] =
    useState<VfsContentType>("application/json");
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [markdownMode, setMarkdownMode] = useState<"edit" | "preview">("edit");
  const [activePanel, setActivePanel] = useState<
    "files" | "rag_search" | "rag_stats" | "rag_documents"
  >("files");
  const [mobileView, setMobileView] = useState<"files" | "editor">("editor");
  const [expandedPaths, setExpandedPaths] = useState<string[]>([""]);
  const [snapshotVersion, setSnapshotVersion] = useState(0);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchSelectedPaths, setBatchSelectedPaths] = useState<string[]>([]);
  const [batchDestinationMode, setBatchDestinationMode] = useState(false);
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(null);
  const [mobileActionSheetState, setMobileActionSheetState] =
    useState<NodeActionContext | null>(null);
  const contextMenuTriggerRef = useRef<HTMLElement | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.innerWidth >= 768;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setSnapshotVersion((version) => version + 1);
  }, [gameState, isOpen]);

  const snapshot = useMemo<VfsFileMap>(() => {
    return vfsSession.snapshotAll();
  }, [vfsSession, snapshotVersion]);

  const snapshotMutableFiles = (): VfsFileMap => vfsSession.snapshot();

  const toNormalizedFileMap = (files: VfsFileMap): VfsFileMap => {
    const normalized: VfsFileMap = {};
    for (const file of Object.values(files)) {
      const path = normalizeVfsPath(file.path);
      normalized[path] = { ...file, path };
    }
    return normalized;
  };

  const noteOutOfBandPathMutation = (
    path: string,
    changeType: "added" | "deleted" | "modified",
  ) => {
    const normalizedPath = normalizeVfsPath(path);
    if (!normalizedPath) {
      return;
    }
    vfsSession.noteOutOfBandMutation(normalizedPath, changeType);
  };

  const noteOutOfBandMoveMutation = (from: string, to: string) => {
    const normalizedFrom = normalizeVfsPath(from);
    const normalizedTo = normalizeVfsPath(to);
    if (!normalizedFrom || !normalizedTo || normalizedFrom === normalizedTo) {
      return;
    }
    vfsSession.noteOutOfBandMove(normalizedFrom, normalizedTo);
  };

  const noteOutOfBandDiff = (
    beforeRaw: VfsFileMap,
    afterRaw: VfsFileMap,
    options?: {
      ignoreAdded?: Set<string>;
      ignoreDeleted?: Set<string>;
    },
  ) => {
    const before = toNormalizedFileMap(beforeRaw);
    const after = toNormalizedFileMap(afterRaw);
    const ignoreAdded = options?.ignoreAdded ?? new Set<string>();
    const ignoreDeleted = options?.ignoreDeleted ?? new Set<string>();

    for (const [path, nextFile] of Object.entries(after)) {
      const previousFile = before[path];
      if (!previousFile) {
        if (!ignoreAdded.has(path)) {
          noteOutOfBandPathMutation(path, "added");
        }
        continue;
      }
      if (previousFile.hash !== nextFile.hash) {
        noteOutOfBandPathMutation(path, "modified");
      }
    }

    for (const path of Object.keys(before)) {
      if (after[path]) {
        continue;
      }
      if (!ignoreDeleted.has(path)) {
        noteOutOfBandPathMutation(path, "deleted");
      }
    }
  };

  const buildMovePairsForPath = (
    beforeRaw: VfsFileMap,
    fromPath: string,
    toPath: string,
    isFolder: boolean,
  ): Array<{ from: string; to: string }> => {
    const normalizedFrom = normalizeVfsPath(fromPath);
    const normalizedTo = normalizeVfsPath(toPath);
    if (!normalizedFrom || !normalizedTo || normalizedFrom === normalizedTo) {
      return [];
    }
    if (!isFolder) {
      return [{ from: normalizedFrom, to: normalizedTo }];
    }

    const before = toNormalizedFileMap(beforeRaw);
    const prefix = `${normalizedFrom}/`;
    return Object.keys(before)
      .filter((path) => path.startsWith(prefix))
      .sort((a, b) => a.localeCompare(b))
      .map((from) => ({
        from,
        to: normalizeVfsPath(`${normalizedTo}/${from.slice(prefix.length)}`),
      }));
  };

  const isFilesPanel = activePanel === "files";
  const ragPanelMode: "search" | "stats" | "documents" =
    activePanel === "rag_search"
      ? "search"
      : activePanel === "rag_stats"
        ? "stats"
        : "documents";

  useEffect(() => {
    if (!isFilesPanel) {
      setContextMenuState(null);
      setMobileActionSheetState(null);
    }
  }, [isFilesPanel]);

  const editorWriteContext: VfsWriteContext = useMemo(
    () => ({
      actor: "user_editor",
      mode: "normal",
      editorSessionToken,
      allowFinishGuardedWrite: false,
      activeForkId: gameState.forkId,
    }),
    [editorSessionToken, gameState.forkId],
  );

  const filteredSnapshot = useMemo<VfsFileMap>(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return snapshot;
    }
    const next: VfsFileMap = {};
    for (const [path, file] of Object.entries(snapshot)) {
      if (
        path.toLowerCase().includes(query) ||
        file.content.toLowerCase().includes(query)
      ) {
        next[path] = file;
      }
    }
    return next;
  }, [snapshot, searchQuery]);

  const tree = useMemo(
    () => buildVfsTree(filteredSnapshot),
    [filteredSnapshot],
  );

  const filePaths = useMemo(
    () => Object.keys(filteredSnapshot).sort(),
    [filteredSnapshot],
  );

  const hasSearch = searchQuery.trim().length > 0;
  const capabilityContext = useMemo(
    () => ({ editorSessionToken, activeForkId: gameState.forkId }),
    [editorSessionToken, gameState.forkId],
  );

  const selectedPathNormalized = useMemo(
    () => (selectedPath ? normalizeVfsPath(selectedPath) : null),
    [selectedPath],
  );

  const selectedIsDirectory = useMemo(() => {
    if (!selectedPathNormalized) {
      return false;
    }
    if (snapshot[selectedPathNormalized]) {
      return false;
    }
    const prefix = `${selectedPathNormalized}/`;
    return Object.keys(snapshot).some((path) => normalizeVfsPath(path).startsWith(prefix));
  }, [selectedPathNormalized, snapshot]);

  const isDirectoryPath = (path: string): boolean => {
    const normalizedPath = normalizeVfsPath(path);
    if (!normalizedPath || snapshot[normalizedPath]) {
      return false;
    }
    const prefix = `${normalizedPath}/`;
    return Object.keys(snapshot).some((candidatePath) =>
      normalizeVfsPath(candidatePath).startsWith(prefix),
    );
  };

  const pathExistsInSnapshot = (path: string): boolean => {
    const normalizedPath = normalizeVfsPath(path);
    if (!normalizedPath) {
      return false;
    }
    return Boolean(snapshot[normalizedPath]) || isDirectoryPath(normalizedPath);
  };

  const batchSelectedSet = useMemo(
    () => new Set(batchSelectedPaths.map((path) => normalizeVfsPath(path))),
    [batchSelectedPaths],
  );

  const selectedBatchCount = batchSelectedPaths.length;

  const selectedPathCapabilities = useMemo(() => {
    if (!selectedPathNormalized) {
      return null;
    }
    if (selectedIsDirectory) {
      return getDirectoryPathCapabilities(
        selectedPathNormalized,
        snapshot,
        capabilityContext,
      );
    }
    return getFilePathCapabilities(selectedPathNormalized, capabilityContext);
  }, [selectedPathNormalized, selectedIsDirectory, snapshot, capabilityContext]);

  const createTargetDirectory = useMemo(() => {
    if (!selectedPathNormalized) {
      return "";
    }
    if (selectedIsDirectory) {
      return selectedPathNormalized;
    }
    const parts = selectedPathNormalized.split("/");
    parts.pop();
    return parts.join("/");
  }, [selectedPathNormalized, selectedIsDirectory]);

  const createTargetCapabilities = useMemo(
    () =>
      getDirectoryPathCapabilities(
        createTargetDirectory,
        snapshot,
        capabilityContext,
      ),
    [createTargetDirectory, snapshot, capabilityContext],
  );

  const customRulesDirectoryCapabilities = useMemo(
    () => getDirectoryPathCapabilities("custom_rules", snapshot, capabilityContext),
    [snapshot, capabilityContext],
  );

  const canCreateInTargetDirectory = createTargetCapabilities.canCreateChild;
  const createBlockedReason = createTargetCapabilities.createChildReason;
  const hasWritableSession = Boolean(editorSessionToken);
  const sessionConfirmReason =
    t("stateEditor.sessionConfirmRequired") ||
    "Editor confirmation expired. Reopen the editor to continue editing.";
  const canRenameSelected = selectedPathCapabilities?.canRenameMove ?? false;
  const canMoveSelected = selectedPathCapabilities?.canRenameMove ?? false;
  const canDeleteSelected = selectedPathCapabilities?.canDelete ?? false;
  const canCopySelectedPath = Boolean(selectedPathNormalized);
  const canBatchMoveSelected = hasWritableSession && selectedBatchCount > 0;

  const pathReadOnly =
    !selectedPath || selectedIsDirectory || !(selectedPathCapabilities?.canEdit ?? false);
  const isReadOnly = pathReadOnly || !isEditMode;

  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false);
      setMarkdownMode("edit");
      setMobileView("editor");
      setSearchQuery("");
      setSelectedPath(null);
      setExpandedPaths([""]);
      setError(null);
      setHasChanges(false);
      setEditingPath(null);
      setBatchMode(false);
      setBatchSelectedPaths([]);
      setBatchDestinationMode(false);
      setContextMenuState(null);
      setMobileActionSheetState(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (batchMode) {
      return;
    }
    if (batchSelectedPaths.length > 0) {
      setBatchSelectedPaths([]);
    }
    if (batchDestinationMode) {
      setBatchDestinationMode(false);
    }
  }, [batchDestinationMode, batchMode, batchSelectedPaths.length]);

  useEffect(() => {
    if (!isDesktop && contextMenuState) {
      setContextMenuState(null);
    }
  }, [contextMenuState, isDesktop]);

  useEffect(() => {
    if (!contextMenuState) {
      return;
    }

    const close = () => {
      setContextMenuState(null);
      const trigger = contextMenuTriggerRef.current;
      if (trigger) {
        window.requestAnimationFrame(() => {
          trigger.focus();
        });
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-state-editor-context-menu='true']")) {
        return;
      }
      close();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenuState]);

  useEffect(() => {
    if (!mobileActionSheetState) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileActionSheetState(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileActionSheetState]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (filePaths.length === 0) {
      setSelectedPath(null);
      return;
    }

    if (!selectedPath) {
      setSelectedPath(filePaths[0]);
      return;
    }

    if (filteredSnapshot[selectedPath]) {
      return;
    }

    const normalized = normalizeVfsPath(selectedPath);
    const directoryPrefix = `${normalized}/`;
    const selectedIsFolder = Object.keys(snapshot).some((path) =>
      normalizeVfsPath(path).startsWith(directoryPrefix),
    );

    if (!selectedIsFolder) {
      setSelectedPath(filePaths[0]);
    }
  }, [isOpen, filePaths, filteredSnapshot, selectedPath, snapshot]);

  useEffect(() => {
    setBatchSelectedPaths((prev) =>
      prev.filter((path, index, array) => {
        const normalizedPath = normalizeVfsPath(path);
        return (
          normalizedPath.length > 0 &&
          array.findIndex((item) => normalizeVfsPath(item) === normalizedPath) ===
            index &&
          pathExistsInSnapshot(normalizedPath)
        );
      }),
    );
  }, [snapshot]);

  useEffect(() => {
    setMarkdownMode("edit");
  }, [selectedPath]);

  useEffect(() => {
    if (pathReadOnly && isEditMode) {
      setIsEditMode(false);
    }
  }, [isEditMode, pathReadOnly]);

  useEffect(() => {
    if (!selectedPath) {
      return;
    }

    setExpandedPaths((prev) => {
      const next = new Set(prev);
      next.add("");
      const parts = selectedPath.split("/").filter(Boolean);
      let current = "";
      for (let i = 0; i < parts.length - 1; i += 1) {
        current = current ? `${current}/${parts[i]}` : parts[i];
        next.add(current);
      }
      return Array.from(next);
    });
  }, [selectedPath]);

  useEffect(() => {
    if (!isOpen || !selectedPath) {
      setFileContent("");
      setError(null);
      setHasChanges(false);
      setEditingPath(null);
      return;
    }

    if (hasChanges && selectedPath === editingPath) {
      return;
    }

    const file = readVfsFile(vfsSession, selectedPath);
    if (!file) {
      setFileContent("");
      setFileContentType("text/plain");
      setError(null);
      setHasChanges(false);
      setEditingPath(selectedPath);
      return;
    }

    setFileContent(formatVfsContent(file.content, file.contentType));
    setFileContentType(file.contentType);
    setError(null);
    setHasChanges(false);
    setEditingPath(selectedPath);
  }, [
    editingPath,
    hasChanges,
    isOpen,
    selectedPath,
    snapshot,
    vfsSession,
  ]);

  if (!isOpen) return null;

  const invalidJsonMessage =
    t("stateEditor.invalidJson") || "Invalid JSON syntax";
  const invalidSchemaMessage =
    t("stateEditor.invalidSchema") || "Schema validation failed";
  const applyFailedMessage =
    t("stateEditor.applyFailed") || "Failed to apply changes";
  const fixErrorsMessage =
    t("stateEditor.fixErrors") || "Fix JSON errors before saving";

  const handleContentChange = (value: string) => {
    if (isReadOnly) return;

    setFileContent(value);
    setHasChanges(true);
    if (selectedPath) {
      setEditingPath(selectedPath);
    }

    if (fileContentType === "application/json") {
      try {
        JSON.parse(value);
        setError(null);
      } catch {
        setError(invalidJsonMessage);
      }
    } else {
      setError(null);
    }
  };

  const handleReset = () => {
    if (!selectedPath) return;
    const file = readVfsFile(vfsSession, selectedPath);
    if (!file) return;
    setFileContent(formatVfsContent(file.content, file.contentType));
    setFileContentType(file.contentType);
    setError(null);
    setHasChanges(false);
  };

  const handleFormat = () => {
    if (isReadOnly) return;
    const formatted = formatVfsContent(fileContent, fileContentType);
    setFileContent(formatted);
    if (fileContentType === "application/json") {
      try {
        JSON.parse(formatted);
        setError(null);
      } catch {
        setError(invalidJsonMessage);
      }
    }
  };

  const handleSave = () => {
    if (!selectedPath) {
      onShowToast?.(applyFailedMessage, "error");
      return;
    }

    if (isReadOnly) {
      return;
    }

    if (!editorSessionToken) {
      onShowToast?.(
        t("stateEditor.sessionConfirmRequired") ||
          "Editor confirmation expired. Reopen the editor to continue editing.",
        "error",
      );
      return;
    }

    if (error) {
      onShowToast?.(fixErrorsMessage, "error");
      return;
    }

    const before = vfsSession.readFile(selectedPath);

    try {
      const nextState = applyVfsFileEdit({
        session: vfsSession,
        path: selectedPath,
        content: fileContent,
        contentType: fileContentType,
        baseState: gameState,
        writeContext: editorWriteContext,
      });

      const after = vfsSession.readFile(selectedPath);
      let changeType: "added" | "deleted" | "modified" | null = null;
      if (!before && after) {
        changeType = "added";
      } else if (before && !after) {
        changeType = "deleted";
      } else if (before && after && before.hash !== after.hash) {
        changeType = "modified";
      }
      if (changeType) {
        noteOutOfBandPathMutation(selectedPath, changeType);
      }

      applyVfsMutation(nextState);
      setHasChanges(false);
      setError(null);
      onShowToast?.(
        t("stateEditor.applied") || "Changes saved successfully",
        "success",
      );
    } catch (err) {
      const message =
        err instanceof ZodError
          ? invalidSchemaMessage
          : err instanceof Error && err.message.includes("Invalid JSON")
            ? invalidJsonMessage
            : applyFailedMessage;
      setError(message);
      onShowToast?.(message, "error");
    }
  };

  const withPendingEditGuard = (nextAction: () => void): boolean => {
    if (!hasChanges || !selectedPath) {
      return true;
    }

    const shouldDiscard =
      typeof window !== "undefined"
        ? window.confirm(
            t("stateEditor.confirmDiscardUnsaved") ||
              "You have unsaved changes. Discard them and continue?",
          )
        : false;

    if (!shouldDiscard) {
      return false;
    }

    setHasChanges(false);
    setError(null);
    nextAction();
    return true;
  };

  const updateSnapshotAndSelect = (nextPath: string | null) => {
    setSnapshotVersion((version) => version + 1);
    setSelectedPath(nextPath);
    setEditingPath(nextPath);
    setMobileView("editor");
  };

  const ensureWritableSession = (): boolean => {
    if (editorSessionToken) {
      return true;
    }
    onShowToast?.(
      t("stateEditor.sessionConfirmRequired") ||
        "Editor confirmation expired. Reopen the editor to continue editing.",
      "error",
    );
    return false;
  };

  const handleCreateFile = () => {
    handleCreateFileInDirectory(createTargetDirectory);
  };

  const handleCreateFolder = () => {
    handleCreateFolderInDirectory(createTargetDirectory);
  };

  const handleCreateFileInDirectory = (directoryPath: string) => {
    if (!ensureWritableSession()) {
      return;
    }

    withPendingEditGuard(() => {
      const normalizedDirectory = normalizeVfsPath(directoryPath);
      const directoryCaps = getDirectoryPathCapabilities(
        normalizedDirectory,
        snapshot,
        capabilityContext,
      );
      if (!directoryCaps.canCreateChild) {
        onShowToast?.(
          directoryCaps.createChildReason ||
            t("stateEditor.createBlocked") ||
            "Cannot create items in this folder",
          "info",
        );
        return;
      }

      const defaultName = "new-file.md";
      const input =
        window.prompt(
          t("stateEditor.newFilePrompt") ||
            "Enter the file name (can include subfolders):",
          defaultName,
        ) ?? "";
      const trimmed = input.trim();
      if (!trimmed) {
        return;
      }

      const targetPath = normalizeVfsPath(
        normalizedDirectory ? `${normalizedDirectory}/${trimmed}` : trimmed,
      );
      if (!targetPath || targetPath.endsWith("/")) {
        onShowToast?.(t("stateEditor.invalidPath") || "Invalid path", "error");
        return;
      }

      const extension = targetPath.split(".").pop()?.toLowerCase();
      const contentType: VfsContentType =
        extension === "json"
          ? "application/json"
          : extension === "md"
            ? "text/markdown"
            : "text/plain";
      const initialContent = contentType === "application/json" ? "{}" : "";

      try {
        const beforeSnapshot = snapshotMutableFiles();
        const nextState = applyVfsCreateFile({
          session: vfsSession,
          path: targetPath,
          content: initialContent,
          contentType,
          baseState: gameState,
          writeContext: editorWriteContext,
        });
        noteOutOfBandDiff(beforeSnapshot, snapshotMutableFiles());
        applyVfsMutation(nextState);
        updateSnapshotAndSelect(targetPath);
        setIsEditMode(true);
        onShowToast?.(t("stateEditor.newFileCreated") || "File created", "success");
      } catch (err) {
        onShowToast?.(
          err instanceof Error
            ? err.message
            : t("stateEditor.newFileFailed") || "Failed to create file",
          "error",
        );
      }
    });
  };

  const handleCreateFolderInDirectory = (directoryPath: string) => {
    if (!ensureWritableSession()) {
      return;
    }

    withPendingEditGuard(() => {
      const normalizedDirectory = normalizeVfsPath(directoryPath);
      const directoryCaps = getDirectoryPathCapabilities(
        normalizedDirectory,
        snapshot,
        capabilityContext,
      );
      if (!directoryCaps.canCreateChild) {
        onShowToast?.(
          directoryCaps.createChildReason ||
            t("stateEditor.createBlocked") ||
            "Cannot create items in this folder",
          "info",
        );
        return;
      }

      const input =
        window.prompt(
          t("stateEditor.newFolderPrompt") ||
            "Enter the folder name (can include nested paths):",
        ) ?? "";
      const trimmed = input.trim();
      if (!trimmed) {
        return;
      }

      const targetPath = normalizeVfsPath(
        normalizedDirectory ? `${normalizedDirectory}/${trimmed}` : trimmed,
      );
      if (!targetPath) {
        onShowToast?.(t("stateEditor.invalidPath") || "Invalid path", "error");
        return;
      }

      try {
        const beforeSnapshot = snapshotMutableFiles();
        const nextState = applyVfsCreateFolder({
          session: vfsSession,
          path: targetPath,
          baseState: gameState,
          writeContext: editorWriteContext,
        });
        noteOutOfBandDiff(beforeSnapshot, snapshotMutableFiles());
        applyVfsMutation(nextState);
        updateSnapshotAndSelect(`${targetPath}/README.md`);
        setIsEditMode(true);
        onShowToast?.(
          t("stateEditor.newFolderCreated") || "Folder created with README",
          "success",
        );
      } catch (err) {
        onShowToast?.(
          err instanceof Error
            ? err.message
            : t("stateEditor.newFolderFailed") || "Failed to create folder",
          "error",
        );
      }
    });
  };

  const handleRenamePath = (path: string, isFolder: boolean) => {
    const normalizedPath = normalizeVfsPath(path);
    if (!normalizedPath) {
      return;
    }

    const caps = isFolder
      ? getDirectoryPathCapabilities(normalizedPath, snapshot, capabilityContext)
      : getFilePathCapabilities(normalizedPath, capabilityContext);

    if (!ensureWritableSession()) {
      return;
    }

    if (!caps.canRenameMove) {
      onShowToast?.(
        caps.renameMoveReason ||
          t("stateEditor.renameBlocked") ||
          "Renaming is not allowed for this path",
        "info",
      );
      return;
    }

    withPendingEditGuard(() => {
      const currentName = normalizedPath.split("/").pop() ?? normalizedPath;
      const input =
        window.prompt(
          t("stateEditor.renamePrompt") || "Enter a new name:",
          currentName,
        ) ?? "";
      const trimmed = input.trim();
      if (!trimmed || trimmed === currentName) {
        return;
      }

      const baseDir = normalizedPath.split("/").slice(0, -1).join("/");
      const targetPath = normalizeVfsPath(baseDir ? `${baseDir}/${trimmed}` : trimmed);

      try {
        const beforeSnapshot = snapshotMutableFiles();
        const movePairs = buildMovePairsForPath(
          beforeSnapshot,
          normalizedPath,
          targetPath,
          isFolder,
        );
        const nextState = applyVfsRenamePath({
          session: vfsSession,
          fromPath: normalizedPath,
          toPath: targetPath,
          isFolder,
          baseState: gameState,
          writeContext: editorWriteContext,
        });
        for (const pair of movePairs) {
          noteOutOfBandMoveMutation(pair.from, pair.to);
        }
        noteOutOfBandDiff(beforeSnapshot, snapshotMutableFiles(), {
          ignoreAdded: new Set(movePairs.map((pair) => pair.to)),
          ignoreDeleted: new Set(movePairs.map((pair) => pair.from)),
        });
        applyVfsMutation(nextState);

        const selectedAfter = isFolder ? `${targetPath}/README.md` : targetPath;
        updateSnapshotAndSelect(selectedAfter);
        onShowToast?.(t("stateEditor.renameSuccess") || "Renamed", "success");
      } catch (err) {
        onShowToast?.(
          err instanceof Error
            ? err.message
            : t("stateEditor.renameFailed") || "Failed to rename",
          "error",
        );
      }
    });
  };

  const handleMovePath = (path: string, isFolder: boolean) => {
    const normalizedPath = normalizeVfsPath(path);
    if (!normalizedPath) {
      return;
    }

    const caps = isFolder
      ? getDirectoryPathCapabilities(normalizedPath, snapshot, capabilityContext)
      : getFilePathCapabilities(normalizedPath, capabilityContext);

    if (!ensureWritableSession()) {
      return;
    }

    if (!caps.canRenameMove) {
      onShowToast?.(
        caps.renameMoveReason ||
          t("stateEditor.moveBlocked") ||
          "Move is not allowed for this path",
        "info",
      );
      return;
    }

    withPendingEditGuard(() => {
      const input =
        window.prompt(
          t("stateEditor.movePrompt") ||
            "Enter destination path, or a directory path to keep current name:",
          normalizedPath,
        ) ?? "";
      const trimmedInput = input.trim();
      const normalizedInput = normalizeVfsPath(trimmedInput);
      if (!normalizedInput) {
        onShowToast?.(t("stateEditor.invalidPath") || "Invalid path", "error");
        return;
      }

      const currentName = normalizedPath.split("/").pop() ?? normalizedPath;
      const looksLikeDirectory =
        trimmedInput.endsWith("/") ||
        Object.keys(snapshot).some((candidatePath) =>
          normalizeVfsPath(candidatePath).startsWith(`${normalizedInput}/`),
        );

      const targetPath = looksLikeDirectory
        ? normalizeVfsPath(`${normalizedInput}/${currentName}`)
        : normalizedInput;

      if (targetPath === normalizedPath) {
        return;
      }

      try {
        const beforeSnapshot = snapshotMutableFiles();
        const movePairs = buildMovePairsForPath(
          beforeSnapshot,
          normalizedPath,
          targetPath,
          isFolder,
        );
        const nextState = applyVfsRenamePath({
          session: vfsSession,
          fromPath: normalizedPath,
          toPath: targetPath,
          isFolder,
          baseState: gameState,
          writeContext: editorWriteContext,
        });
        for (const pair of movePairs) {
          noteOutOfBandMoveMutation(pair.from, pair.to);
        }
        noteOutOfBandDiff(beforeSnapshot, snapshotMutableFiles(), {
          ignoreAdded: new Set(movePairs.map((pair) => pair.to)),
          ignoreDeleted: new Set(movePairs.map((pair) => pair.from)),
        });
        applyVfsMutation(nextState);

        const selectedAfter = isFolder ? `${targetPath}/README.md` : targetPath;
        updateSnapshotAndSelect(selectedAfter);
        onShowToast?.(t("stateEditor.moveSuccess") || "Moved", "success");
      } catch (err) {
        onShowToast?.(
          err instanceof Error
            ? err.message
            : t("stateEditor.moveFailed") || "Failed to move",
          "error",
        );
      }
    });
  };

  const handleDeletePath = (path: string, isFolder: boolean) => {
    const normalizedPath = normalizeVfsPath(path);
    if (!normalizedPath) {
      return;
    }

    const caps = isFolder
      ? getDirectoryPathCapabilities(normalizedPath, snapshot, capabilityContext)
      : getFilePathCapabilities(normalizedPath, capabilityContext);

    if (!ensureWritableSession()) {
      return;
    }

    if (!caps.canDelete) {
      onShowToast?.(
        caps.deleteReason ||
          t("stateEditor.deleteBlocked") ||
          "Delete is not allowed for this path",
        "info",
      );
      return;
    }

    withPendingEditGuard(() => {
      const confirmed = window.confirm(
        t("stateEditor.deleteConfirm") ||
          "Delete selected path? This cannot be undone.",
      );
      if (!confirmed) {
        return;
      }

      try {
        const beforeSnapshot = snapshotMutableFiles();
        const nextState = applyVfsDeletePath({
          session: vfsSession,
          path: normalizedPath,
          isFolder,
          baseState: gameState,
          writeContext: editorWriteContext,
        });
        noteOutOfBandDiff(beforeSnapshot, snapshotMutableFiles());
        applyVfsMutation(nextState);

        const remaining = Object.keys(vfsSession.snapshotAll()).sort();
        updateSnapshotAndSelect(remaining[0] ?? null);
        setIsEditMode(false);
        onShowToast?.(t("stateEditor.deleteSuccess") || "Deleted", "success");
      } catch (err) {
        onShowToast?.(
          err instanceof Error
            ? err.message
            : t("stateEditor.deleteFailed") || "Failed to delete",
          "error",
        );
      }
    });
  };

  const handleCopySpecificPath = async (path: string) => {
    const normalizedPath = normalizeVfsPath(path);
    if (!normalizedPath) {
      onShowToast?.(t("stateEditor.copyPathFailed") || "Failed to copy path", "error");
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalizedPath);
      }
      onShowToast?.(t("stateEditor.copyPathSuccess") || "Path copied", "success");
    } catch {
      onShowToast?.(t("stateEditor.copyPathFailed") || "Failed to copy path", "error");
    }
  };

  const handleRenameSelected = () => {
    if (!selectedPathNormalized) {
      return;
    }
    handleRenamePath(selectedPathNormalized, selectedIsDirectory);
  };

  const getMoveTargetPathForDirectory = (
    directoryPath: string,
  ): string | null => {
    if (!selectedPathNormalized) {
      return null;
    }
    const currentName =
      selectedPathNormalized.split("/").pop() ?? selectedPathNormalized;
    const normalizedDirectoryPath = normalizeVfsPath(directoryPath);
    return normalizeVfsPath(
      normalizedDirectoryPath
        ? `${normalizedDirectoryPath}/${currentName}`
        : currentName,
    );
  };

  const getMoveHereBlockedReason = (directoryPath: string): string | null => {
    if (!hasWritableSession) {
      return (
        t("stateEditor.sessionConfirmRequired") ||
        "Editor confirmation expired. Reopen the editor to continue editing."
      );
    }

    if (!selectedPathNormalized || !selectedPathCapabilities) {
      return t("stateEditor.noSelection") || "No file selected";
    }

    if (!selectedPathCapabilities.canRenameMove) {
      return (
        selectedPathCapabilities.renameMoveReason ||
        t("stateEditor.moveBlocked") ||
        "Move is not allowed for this path"
      );
    }

    const directoryCaps = getDirectoryPathCapabilities(
      directoryPath,
      snapshot,
      capabilityContext,
    );
    if (!directoryCaps.canCreateChild) {
      return (
        directoryCaps.createChildReason ||
        t("stateEditor.createBlocked") ||
        "Cannot create items in this folder"
      );
    }

    if (
      selectedIsDirectory &&
      (directoryPath === selectedPathNormalized ||
        directoryPath.startsWith(`${selectedPathNormalized}/`))
    ) {
      return (
        t("stateEditor.moveIntoSelfBlocked") ||
        "Cannot move a folder into itself."
      );
    }

    const targetPath = getMoveTargetPathForDirectory(directoryPath);
    if (!targetPath || targetPath === selectedPathNormalized) {
      return (
        t("stateEditor.moveAlreadyInFolder") ||
        "Selected item is already in this folder"
      );
    }

    return null;
  };

  const handleMoveSelectedToDirectory = (directoryPath: string) => {
    const blockedReason = getMoveHereBlockedReason(directoryPath);
    if (blockedReason) {
      onShowToast?.(blockedReason, "info");
      return;
    }

    withPendingEditGuard(() => {
      const fromPath = selectedPathNormalized;
      const targetPath = getMoveTargetPathForDirectory(directoryPath);
      if (!fromPath || !targetPath || targetPath === fromPath) {
        return;
      }

      try {
        const beforeSnapshot = snapshotMutableFiles();
        const movePairs = buildMovePairsForPath(
          beforeSnapshot,
          fromPath,
          targetPath,
          selectedIsDirectory,
        );
        const nextState = applyVfsRenamePath({
          session: vfsSession,
          fromPath,
          toPath: targetPath,
          isFolder: selectedIsDirectory,
          baseState: gameState,
          writeContext: editorWriteContext,
        });
        for (const pair of movePairs) {
          noteOutOfBandMoveMutation(pair.from, pair.to);
        }
        noteOutOfBandDiff(beforeSnapshot, snapshotMutableFiles(), {
          ignoreAdded: new Set(movePairs.map((pair) => pair.to)),
          ignoreDeleted: new Set(movePairs.map((pair) => pair.from)),
        });
        applyVfsMutation(nextState);

        const selectedAfter = selectedIsDirectory
          ? `${targetPath}/README.md`
          : targetPath;
        updateSnapshotAndSelect(selectedAfter);
        onShowToast?.(t("stateEditor.moveSuccess") || "Moved", "success");
      } catch (err) {
        onShowToast?.(
          err instanceof Error
            ? err.message
            : t("stateEditor.moveFailed") || "Failed to move",
          "error",
        );
      }
    });
  };

  const handleMoveSelected = () => {
    if (!selectedPathNormalized) {
      return;
    }
    handleMovePath(selectedPathNormalized, selectedIsDirectory);
  };

  const handleDeleteSelected = () => {
    if (!selectedPathNormalized) {
      return;
    }
    handleDeletePath(selectedPathNormalized, selectedIsDirectory);
  };

  const handleCopyPath = async () => {
    if (!selectedPathNormalized) {
      return;
    }
    await handleCopySpecificPath(selectedPathNormalized);
  };

  const handleRefresh = () => {
    setSnapshotVersion((version) => version + 1);
    onShowToast?.(t("stateEditor.refreshSuccess") || "File tree refreshed", "info");
  };

  const canCreateRuleTemplate = customRulesDirectoryCapabilities.canCreateChild;
  const createRuleTemplateBlockedReason =
    customRulesDirectoryCapabilities.createChildReason;

  const createRuleTemplateForCategory = (
    category: Parameters<typeof toCustomRulePackPathForCategory>[0],
  ) => {
    const templatePath = toCustomRulePackPathForCategory(category);
    const markdown = buildCustomRulePackMarkdownForCategory(category);

    try {
      const beforeSnapshot = snapshotMutableFiles();
      const nextState = applyVfsFileEdit({
        session: vfsSession,
        path: templatePath,
        content: markdown,
        contentType: "text/markdown",
        baseState: gameState,
        writeContext: editorWriteContext,
      });
      noteOutOfBandDiff(beforeSnapshot, snapshotMutableFiles());

      applyVfsMutation(nextState);
      updateSnapshotAndSelect(templatePath);
      setIsEditMode(true);
      setError(null);
      setHasChanges(false);
      onShowToast?.(
        t("stateEditor.createRuleTemplateCreated") ||
          "Custom rule template created",
        "success",
      );
      return true;
    } catch {
      onShowToast?.(
        t("stateEditor.createRuleTemplateFailed") ||
          "Failed to create custom rule template",
        "error",
      );
      return false;
    }
  };

  const handleCreateRuleTemplate = () => {
    if (!editorSessionToken) {
      onShowToast?.(sessionConfirmReason, "error");
      return;
    }

    if (!canCreateRuleTemplate) {
      onShowToast?.(
        createRuleTemplateBlockedReason ||
          t("stateEditor.createRuleTemplateBlocked") ||
          "Cannot create rule templates in the current session",
        "info",
      );
      return;
    }

    const currentPreset = selectedPathNormalized
      ? getCustomRuleCategoryPresetFromPath(selectedPathNormalized)
      : null;

    const choices = CUSTOM_RULE_CATEGORY_PRESETS.map(
      (preset) => `${preset.priority.toString().padStart(2, "0")}: ${preset.title}`,
    ).join("\n");

    const defaultChoice = currentPreset
      ? `${currentPreset.priority.toString().padStart(2, "0")}`
      : "00";
    const categoryPrompt =
      t("stateEditor.createRuleTemplateCategoryPrompt") ||
      "Choose rule category prefix:";
    const categoryPromptBody = [categoryPrompt, choices].join("\n");

    const selectedCode =
      window.prompt(categoryPromptBody, defaultChoice)?.trim() ?? "";

    if (!selectedCode) {
      return;
    }

    const normalizedCode = selectedCode.padStart(2, "0");
    const selectedPreset = CUSTOM_RULE_CATEGORY_PRESETS.find(
      (preset) => String(preset.priority).padStart(2, "0") === normalizedCode,
    );

    if (!selectedPreset) {
      onShowToast?.(
        t("stateEditor.createRuleTemplateInvalidCategory") || "Invalid category",
        "error",
      );
      return;
    }

    createRuleTemplateForCategory(selectedPreset.category);
  };

  const handleCreateRuleTemplateInDirectory = (directoryPath: string) => {
    const normalizedDirectory = normalizeVfsPath(directoryPath);
    const preset = getCustomRuleCategoryPresetFromPath(normalizedDirectory);
    if (!preset) {
      onShowToast?.(
        t("stateEditor.createRuleTemplateInvalidCategory") || "Invalid category",
        "info",
      );
      return;
    }

    if (!ensureWritableSession()) {
      return;
    }

    const directoryCaps = getDirectoryPathCapabilities(
      normalizedDirectory,
      snapshot,
      capabilityContext,
    );
    if (!directoryCaps.canCreateChild) {
      onShowToast?.(
        directoryCaps.createChildReason ||
          t("stateEditor.createRuleTemplateBlocked") ||
          "Cannot create rule templates in the current session",
        "info",
      );
      return;
    }

    createRuleTemplateForCategory(preset.category);
  };

  const toggleBatchPath = (path: string) => {
    const normalizedPath = normalizeVfsPath(path);
    if (!normalizedPath) {
      return;
    }

    if (!snapshot[normalizedPath]) {
      onShowToast?.(t("stateEditor.batchMoveOnlyFiles") || "Batch move only supports files", "info");
      return;
    }

    setBatchSelectedPaths((prev) => {
      const normalizedPrev = prev.map((item) => normalizeVfsPath(item));
      if (normalizedPrev.includes(normalizedPath)) {
        return prev.filter((item) => normalizeVfsPath(item) !== normalizedPath);
      }
      return [...prev, normalizedPath];
    });
  };

  const handleToggleBatchMode = () => {
    if (!batchMode) {
      setBatchMode(true);
      return;
    }
    setBatchMode(false);
    setBatchSelectedPaths([]);
    setBatchDestinationMode(false);
  };

  const handleStartBatchDestinationMode = () => {
    if (!hasWritableSession) {
      onShowToast?.(sessionConfirmReason, "error");
      return;
    }
    if (selectedBatchCount === 0) {
      onShowToast?.(
        t("stateEditor.batchMoveNoSelection") || "Select at least one file",
        "info",
      );
      return;
    }
    setBatchDestinationMode(true);
    onShowToast?.(
      t("stateEditor.batchMoveSelectDestination") ||
        "Select a target folder for batch move",
      "info",
    );
  };

  const handleCancelBatchDestinationMode = () => {
    setBatchDestinationMode(false);
  };

  const handleBatchMoveToDirectory = (targetDirectory: string) => {
    if (!hasWritableSession) {
      onShowToast?.(sessionConfirmReason, "error");
      return;
    }

    const normalizedTargetDirectory = normalizeVfsPath(targetDirectory);
    if (!normalizedTargetDirectory) {
      onShowToast?.(t("stateEditor.invalidPath") || "Invalid path", "error");
      return;
    }

    if (selectedBatchCount === 0) {
      onShowToast?.(
        t("stateEditor.batchMoveNoSelection") || "Select at least one file",
        "info",
      );
      return;
    }

    const directoryCaps = getDirectoryPathCapabilities(
      normalizedTargetDirectory,
      snapshot,
      capabilityContext,
    );

    if (!directoryCaps.canCreateChild) {
      onShowToast?.(
        directoryCaps.createChildReason ||
          t("stateEditor.batchMoveBlocked") ||
          "Batch move is blocked for this destination",
        "info",
      );
      return;
    }

    const normalizedSources = batchSelectedPaths.map((sourcePath) =>
      normalizeVfsPath(sourcePath),
    );

    for (const sourcePath of normalizedSources) {
      const sourceFile = snapshot[sourcePath];
      if (!sourceFile) {
        onShowToast?.(
          t("stateEditor.batchMoveOnlyFiles") || "Batch move only supports files",
          "info",
        );
        return;
      }

      const sourceCaps = getFilePathCapabilities(sourcePath, capabilityContext);
      if (!sourceCaps.canRenameMove) {
        onShowToast?.(
          sourceCaps.renameMoveReason ||
            t("stateEditor.batchMoveBlocked") ||
            "Batch move is blocked",
          "info",
        );
        return;
      }
    }

    const defaultConfirmMessage = `Move ${normalizedSources.length} files to ${normalizedTargetDirectory}?`;
    const confirmMessage =
      t("stateEditor.batchMoveConfirm", {
        count: normalizedSources.length,
        target: normalizedTargetDirectory,
      }) || defaultConfirmMessage;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) {
      return;
    }

    try {
      const beforeSnapshot = snapshotMutableFiles();
      const movePairs = normalizedSources
        .map((sourcePath) => {
          const fileName = sourcePath.split("/").pop();
          if (!fileName) {
            return null;
          }
          return {
            from: sourcePath,
            to: normalizeVfsPath(`${normalizedTargetDirectory}/${fileName}`),
          };
        })
        .filter((pair): pair is { from: string; to: string } => Boolean(pair));
      const nextState = applyVfsBatchMoveFiles({
        session: vfsSession,
        sourcePaths: normalizedSources,
        targetDirectory: normalizedTargetDirectory,
        baseState: gameState,
        writeContext: editorWriteContext,
      });
      for (const pair of movePairs) {
        noteOutOfBandMoveMutation(pair.from, pair.to);
      }
      noteOutOfBandDiff(beforeSnapshot, snapshotMutableFiles(), {
        ignoreAdded: new Set(movePairs.map((pair) => pair.to)),
        ignoreDeleted: new Set(movePairs.map((pair) => pair.from)),
      });
      applyVfsMutation(nextState);

      const firstMovedSource = normalizedSources[0] ?? null;
      const firstName = firstMovedSource?.split("/").pop() ?? null;
      const nextSelected = firstName
        ? normalizeVfsPath(`${normalizedTargetDirectory}/${firstName}`)
        : null;

      updateSnapshotAndSelect(nextSelected);
      setBatchSelectedPaths([]);
      setBatchDestinationMode(false);
      onShowToast?.(
        t("stateEditor.batchMoveSuccess", { count: normalizedSources.length }) ||
          `Moved ${normalizedSources.length} files`,
        "success",
      );
    } catch (err) {
      onShowToast?.(
        err instanceof Error
          ? `${t("stateEditor.batchMoveFailed") || "Batch move failed"}: ${err.message}`
          : t("stateEditor.batchMoveFailed") || "Batch move failed",
        "error",
      );
    }
  };

  const openDesktopContextMenu = (
    event: React.MouseEvent<HTMLElement>,
    path: string,
    nodeType: "file" | "folder",
  ) => {
    if (!isDesktop) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 260;
    const viewportPadding = 8;
    const x = Math.min(
      event.clientX,
      window.innerWidth - menuWidth - viewportPadding,
    );
    const y = Math.max(viewportPadding, event.clientY);

    contextMenuTriggerRef.current = event.currentTarget as HTMLElement;
    setContextMenuState({
      path: normalizeVfsPath(path),
      nodeType,
      x,
      y,
    });
    setMobileActionSheetState(null);
  };

  const openMobileActionSheet = (path: string, nodeType: "file" | "folder") => {
    setMobileActionSheetState({ path: normalizeVfsPath(path), nodeType });
    setContextMenuState(null);
  };

  const closeDesktopContextMenu = () => {
    setContextMenuState(null);
    const trigger = contextMenuTriggerRef.current;
    if (trigger) {
      window.requestAnimationFrame(() => {
        trigger.focus();
      });
    }
  };

  const closeMobileActionSheet = () => {
    setMobileActionSheetState(null);
  };

  const buildActionsForNode = (context: NodeActionContext): NodeActionItem[] => {
    const normalizedPath = normalizeVfsPath(context.path);
    const isFolder = context.nodeType === "folder";
    const isRoot = isFolder && normalizedPath === "";
    const isCustomRulesCategoryFolder = Boolean(
      isFolder && getCustomRuleCategoryPresetFromPath(normalizedPath),
    );

    const directoryCaps = isFolder
      ? getDirectoryPathCapabilities(normalizedPath, snapshot, capabilityContext)
      : null;
    const fileCaps = !isFolder
      ? getFilePathCapabilities(normalizedPath, capabilityContext)
      : null;

    const moveHereBlockedReason =
      isFolder && normalizedPath ? getMoveHereBlockedReason(normalizedPath) : null;

    const canWriteToDirectory = directoryCaps?.canCreateChild ?? false;
    const directoryBlockedReason =
      directoryCaps?.createChildReason ||
      t("stateEditor.createBlocked") ||
      "Cannot create items in this folder";

    const fileInBatch = batchSelectedSet.has(normalizedPath);

    const writableBlockedReason = sessionConfirmReason;

    const folderActions = buildNodeActions({
      nodeType: "folder",
      actions: {
        select: {
          show: !isRoot,
          onSelect: () => {
            setSelectedPath(normalizedPath);
            setMobileView("editor");
          },
        },
        new_file_here: {
          show: !isRoot,
          enabled: hasWritableSession && canWriteToDirectory,
          disabledReason: !hasWritableSession
            ? writableBlockedReason
            : directoryBlockedReason,
          onSelect: () => {
            handleCreateFileInDirectory(normalizedPath);
          },
        },
        new_folder_here: {
          show: !isRoot,
          enabled: hasWritableSession && canWriteToDirectory,
          disabledReason: !hasWritableSession
            ? writableBlockedReason
            : directoryBlockedReason,
          onSelect: () => {
            handleCreateFolderInDirectory(normalizedPath);
          },
        },
        quick_rule_template_here: {
          show: !isRoot && isCustomRulesCategoryFolder,
          enabled: hasWritableSession && canWriteToDirectory,
          disabledReason: !hasWritableSession
            ? writableBlockedReason
            : directoryBlockedReason,
          onSelect: () => {
            handleCreateRuleTemplateInDirectory(normalizedPath);
          },
        },
        move_here: {
          show: !isRoot && Boolean(selectedPathNormalized),
          enabled: !moveHereBlockedReason,
          disabledReason:
            moveHereBlockedReason ||
            t("stateEditor.moveBlocked") ||
            "Move is not allowed for this path",
          onSelect: () => {
            handleMoveSelectedToDirectory(normalizedPath);
          },
        },
        rename: {
          show: !isRoot,
          enabled: hasWritableSession && Boolean(directoryCaps?.canRenameMove),
          disabledReason: !hasWritableSession
            ? writableBlockedReason
            : directoryCaps?.renameMoveReason ||
              t("stateEditor.renameBlocked") ||
              "Renaming is not allowed for this path",
          onSelect: () => {
            handleRenamePath(normalizedPath, true);
          },
        },
        move: {
          show: !isRoot,
          enabled: hasWritableSession && Boolean(directoryCaps?.canRenameMove),
          disabledReason: !hasWritableSession
            ? writableBlockedReason
            : directoryCaps?.renameMoveReason ||
              t("stateEditor.moveBlocked") ||
              "Move is not allowed for this path",
          onSelect: () => {
            handleMovePath(normalizedPath, true);
          },
        },
        delete: {
          show: !isRoot,
          enabled: hasWritableSession && Boolean(directoryCaps?.canDelete),
          disabledReason: !hasWritableSession
            ? writableBlockedReason
            : directoryCaps?.deleteReason ||
              t("stateEditor.deleteBlocked") ||
              "Delete is not allowed for this path",
          onSelect: () => {
            handleDeletePath(normalizedPath, true);
          },
        },
        copy_path: {
          show: !isRoot,
          enabled: Boolean(normalizedPath),
          disabledReason:
            t("stateEditor.noSelection") ||
            "No file selected",
          onSelect: () => {
            void handleCopySpecificPath(normalizedPath);
          },
        },
      },
    });

    const fileActions = buildNodeActions({
      nodeType: "file",
      actions: {
        rename: {
          enabled: hasWritableSession && Boolean(fileCaps?.canRenameMove),
          disabledReason: !hasWritableSession
            ? writableBlockedReason
            : fileCaps?.renameMoveReason ||
              t("stateEditor.renameBlocked") ||
              "Renaming is not allowed for this path",
          onSelect: () => {
            handleRenamePath(normalizedPath, false);
          },
        },
        move: {
          enabled: hasWritableSession && Boolean(fileCaps?.canRenameMove),
          disabledReason: !hasWritableSession
            ? writableBlockedReason
            : fileCaps?.renameMoveReason ||
              t("stateEditor.moveBlocked") ||
              "Move is not allowed for this path",
          onSelect: () => {
            handleMovePath(normalizedPath, false);
          },
        },
        delete: {
          enabled: hasWritableSession && Boolean(fileCaps?.canDelete),
          disabledReason: !hasWritableSession
            ? writableBlockedReason
            : fileCaps?.deleteReason ||
              t("stateEditor.deleteBlocked") ||
              "Delete is not allowed for this path",
          onSelect: () => {
            handleDeletePath(normalizedPath, false);
          },
        },
        copy_path: {
          enabled: Boolean(normalizedPath),
          disabledReason:
            t("stateEditor.noSelection") ||
            "No file selected",
          onSelect: () => {
            void handleCopySpecificPath(normalizedPath);
          },
        },
        add_to_batch: {
          show: !fileInBatch,
          enabled: Boolean(snapshot[normalizedPath]),
          disabledReason:
            t("stateEditor.batchMoveOnlyFiles") ||
            "Batch move only supports files",
          onSelect: () => {
            setBatchMode(true);
            toggleBatchPath(normalizedPath);
          },
        },
        remove_from_batch: {
          show: fileInBatch,
          enabled: true,
          onSelect: () => {
            toggleBatchPath(normalizedPath);
          },
        },
      },
    });

    return context.nodeType === "folder" ? folderActions : fileActions;
  };

  const runNodeAction = (
    action: NodeActionItem,
    source: "desktop" | "mobile",
  ) => {
    action.onSelect();
    if (source === "desktop") {
      closeDesktopContextMenu();
      return;
    }
    closeMobileActionSheet();
  };

  const handleToggleEditMode = () => {
    if (!selectedPath) {
      return;
    }

    if (isEditMode) {
      setIsEditMode(false);
      return;
    }

    if (selectedIsDirectory) {
      onShowToast?.(
        t("stateEditor.directoryNotEditable") ||
          "Folders are not directly editable. Select a file instead.",
        "info",
      );
      return;
    }

    if (!selectedPathCapabilities?.canEdit) {
      onShowToast?.(
        selectedPathCapabilities?.editReason ||
          t("stateEditor.readOnlyByPolicy") ||
          "This path is protected by VFS policy and cannot be edited from State Editor.",
        "info",
      );
      return;
    }

    setIsEditMode(true);
  };

  const lineCount = useMemo(
    () => (fileContent ? fileContent.split("\n").length : 0),
    [fileContent],
  );

  const isMarkdownFile =
    fileContentType === "text/markdown" ||
    (selectedPath?.toLowerCase().endsWith(".md") ?? false);

  const monacoLanguage = useMemo(() => {
    const lowerPath = selectedPath?.toLowerCase() ?? "";

    if (fileContentType === "application/json" || lowerPath.endsWith(".json")) {
      return "json";
    }
    if (isMarkdownFile) {
      return "markdown";
    }
    if (lowerPath.endsWith(".ts") || lowerPath.endsWith(".tsx")) {
      return "typescript";
    }
    if (lowerPath.endsWith(".js") || lowerPath.endsWith(".jsx")) {
      return "javascript";
    }

    return "plaintext";
  }, [fileContentType, isMarkdownFile, selectedPath]);

  const handleMonacoMount: OnMount = (editor) => {
    editor.updateOptions({
      readOnly: isReadOnly,
    });
  };

  const toggleFolder = (path: string) => {
    if (path === "") return;
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      next.add("");
      return Array.from(next);
    });
  };

  const renderTreeNode = (node: VfsTreeNode, depth = 0): React.ReactNode => {
    const isFolder = node.kind === "folder";
    const isRoot = node.path === "";
    const normalizedPath = normalizeVfsPath(node.path);
    const expanded = isRoot || hasSearch || expandedPaths.includes(node.path);
    const padding = { paddingLeft: `${depth * 12}px` };

    if (isFolder) {
      const caps = getDirectoryPathCapabilities(node.path, snapshot, capabilityContext);
      const readonly = !caps.canCreateChild;
      const batchDestinationBlockedReason = !hasWritableSession
        ? sessionConfirmReason
        : !caps.canCreateChild
          ? caps.createChildReason ||
            t("stateEditor.batchMoveBlocked") ||
            "Batch move is blocked for this destination"
          : selectedBatchCount === 0
            ? t("stateEditor.batchMoveNoSelection") || "Select at least one file"
            : null;
      const canChooseBatchDestination = !isRoot && !batchDestinationBlockedReason;

      return (
        <div key={node.path || "root"}>
          <div
            className={`w-full flex items-center gap-2 px-2 py-1.5 ${
              batchDestinationMode && !isRoot
                ? "bg-theme-primary/5"
                : ""
            }`}
            style={padding}
            onContextMenu={(event) => {
              if (isRoot) {
                return;
              }
              openDesktopContextMenu(event, normalizedPath, "folder");
            }}
          >
            <button
              type="button"
              onClick={() => toggleFolder(node.path)}
              className={`flex-1 flex items-center gap-2 text-left text-xs transition-colors border-l-2 ${
                isRoot
                  ? "text-theme-text-secondary font-semibold border-transparent"
                  : "text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/10 border-transparent hover:border-theme-divider/60"
              }`}
            >
              <span className="w-3 text-[10px] font-mono">
                {expanded ? "v" : ">"}
              </span>
              <span className="truncate flex-1">{node.name}</span>
              {readonly && (
                <span className="text-[10px] text-theme-info">
                  {t("stateEditor.readOnly") || "Read Only"}
                </span>
              )}
            </button>
            {!isRoot && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPath(normalizedPath);
                  setMobileView("editor");
                }}
                className="hidden md:inline-flex shrink-0 px-2 py-1 text-[10px] rounded border border-theme-divider/60 text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/20"
                title={t("stateEditor.selectFolder") || "Select folder"}
              >
                {t("stateEditor.select") || "Select"}
              </button>
            )}
            {batchDestinationMode && !isRoot && (
              <button
                type="button"
                onClick={() => handleBatchMoveToDirectory(normalizedPath)}
                disabled={!canChooseBatchDestination}
                className={`shrink-0 px-2 py-1 text-[10px] rounded border transition-colors ${
                  canChooseBatchDestination
                    ? "border-theme-primary/40 text-theme-primary hover:bg-theme-primary/10"
                    : "border-theme-divider/50 text-theme-muted cursor-not-allowed"
                }`}
                title={
                  canChooseBatchDestination
                    ? t("stateEditor.batchMoveSelectDestination") ||
                      "Select destination"
                    : batchDestinationBlockedReason ||
                      t("stateEditor.batchMoveBlocked") ||
                      "Batch move is blocked"
                }
              >
                {t("stateEditor.batchDestinationMode") || "Destination Mode"}
              </button>
            )}
            {!isRoot && (
              <button
                type="button"
                onClick={() => openMobileActionSheet(normalizedPath, "folder")}
                className="md:hidden shrink-0 px-2 py-1 text-xs rounded border border-theme-divider/60 text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/20"
                title={t("stateEditor.moreActions") || "More actions"}
              >
                ⋯
              </button>
            )}
          </div>
          {expanded &&
            node.children?.map((child) => renderTreeNode(child, depth + 1))}
        </div>
      );
    }

    const caps = getFilePathCapabilities(node.path, capabilityContext);
    const readonly = !caps.canEdit;
    const isSelected = node.path === selectedPath;
    const inBatch = batchSelectedSet.has(normalizedPath);

    return (
      <div
        key={node.path}
        className="w-full flex items-center gap-2"
        style={padding}
        onContextMenu={(event) => openDesktopContextMenu(event, normalizedPath, "file")}
      >
        {batchMode && (
          <label className="shrink-0 flex items-center" title={t("stateEditor.batchMode") || "Batch mode"}>
            <input
              type="checkbox"
              checked={inBatch}
              onChange={() => toggleBatchPath(normalizedPath)}
              className="h-3.5 w-3.5 rounded border-theme-divider/60 bg-theme-bg/30 text-theme-primary focus:ring-theme-primary/50"
            />
          </label>
        )}
        <button
          type="button"
          onClick={() => {
            setSelectedPath(normalizedPath);
            setMobileView("editor");
          }}
          className={`flex-1 flex items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors border-l-2 ${
            isSelected
              ? "bg-theme-primary/10 text-theme-primary border-theme-primary"
              : "text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/10 border-transparent hover:border-theme-divider/60"
          }`}
        >
          <span className="w-3 text-[10px] font-mono">-</span>
          <span className="truncate flex-1">{node.name}</span>
          {readonly && (
            <span className="text-[10px] text-theme-info">
              {t("stateEditor.readOnly") || "Read Only"}
            </span>
          )}
          {batchMode && inBatch && (
            <span className="text-[10px] text-theme-primary">
              {t("stateEditor.batchMode") || "Batch"}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => openMobileActionSheet(normalizedPath, "file")}
          className="md:hidden shrink-0 px-2 py-1 text-xs rounded border border-theme-divider/60 text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/20"
          title={t("stateEditor.moreActions") || "More actions"}
        >
          ⋯
        </button>
      </div>
    );
  };

  const contextMenuActions = contextMenuState
    ? buildActionsForNode(contextMenuState)
    : [];

  const mobileActionSheetActions = mobileActionSheetState
    ? buildActionsForNode(mobileActionSheetState)
    : [];

  return (
    <div className="fixed inset-0 z-[80] ui-overlay backdrop-blur-sm flex items-stretch sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="vn-scroll-edge border border-theme-divider/60 rounded-none sm:rounded-lg shadow-none w-full max-w-6xl h-full sm:h-[85vh] flex flex-col overflow-hidden bg-theme-surface">
        {/* Header */}
        <div className="flex-none px-4 py-3 sm:p-4 border-b border-theme-divider/60 flex items-center justify-between bg-theme-surface-highlight/30">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              🛠️
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-[var(--font-fantasy)] tracking-[0.18em] uppercase text-theme-primary">
                {t("stateEditor.title") || "State Editor"}
              </h2>
              <p className="text-[11px] sm:text-xs text-theme-text-secondary">
                {t("stateEditor.subtitle") ||
                  "Direct editing of game state (Developer Tool)"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isFilesPanel && (
              <button
                type="button"
                onClick={handleToggleEditMode}
                disabled={!selectedPath}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  !selectedPath
                    ? "border-theme-divider/60 text-theme-muted cursor-not-allowed"
                    : isEditMode
                      ? "bg-theme-primary/20 text-theme-primary border-theme-primary/40 hover:bg-theme-primary/25"
                      : "bg-theme-bg/30 text-theme-text-secondary border-theme-divider/60 hover:bg-theme-bg/45"
                }`}
                title={
                  !selectedPath
                    ? t("stateEditor.readOnly") || "Read Only"
                    : isEditMode
                      ? t("stateEditor.editMode") || "Edit"
                      : t("stateEditor.readOnly") || "Read Only"
                }
              >
                {isEditMode
                  ? t("stateEditor.editMode") || "Edit"
                  : t("stateEditor.readOnly") || "Read Only"}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-3 -m-1 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-bg/15 rounded-md transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-none px-3 sm:px-4 py-2 border-b border-theme-divider/60 bg-theme-surface/70">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActivePanel("files")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activePanel === "files"
                  ? "bg-theme-primary/20 text-theme-primary border border-theme-primary/40"
                  : "text-theme-text-secondary bg-theme-bg/20 border border-theme-divider/60"
              }`}
            >
              {t("stateEditor.mobileFiles") || "Files"}
            </button>
            <button
              type="button"
              onClick={() => setActivePanel("rag_search")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activePanel === "rag_search"
                  ? "bg-theme-primary/20 text-theme-primary border border-theme-primary/40"
                  : "text-theme-text-secondary bg-theme-bg/20 border border-theme-divider/60"
              }`}
            >
              {t("stateEditor.ragSearch") || "RAG Search"}
            </button>
            <button
              type="button"
              onClick={() => setActivePanel("rag_stats")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activePanel === "rag_stats"
                  ? "bg-theme-primary/20 text-theme-primary border border-theme-primary/40"
                  : "text-theme-text-secondary bg-theme-bg/20 border border-theme-divider/60"
              }`}
            >
              {t("stateEditor.ragStats") || "RAG Stats"}
            </button>
            <button
              type="button"
              onClick={() => setActivePanel("rag_documents")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activePanel === "rag_documents"
                  ? "bg-theme-primary/20 text-theme-primary border border-theme-primary/40"
                  : "text-theme-text-secondary bg-theme-bg/20 border border-theme-divider/60"
              }`}
            >
              {t("stateEditor.ragDocuments") || "RAG Documents"}
            </button>
          </div>
        </div>

        {isFilesPanel && (
          <div className="md:hidden flex-none px-3 py-2 border-b border-theme-divider/60 bg-theme-surface/75">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMobileView("files")}
              className={`rounded-md py-2.5 text-sm font-semibold transition-colors ${
                mobileView === "files"
                  ? "bg-theme-primary/20 text-theme-primary border border-theme-primary/40"
                  : "text-theme-text-secondary bg-theme-bg/20 border border-theme-divider/60"
              }`}
            >
              {t("stateEditor.mobileFiles") || "Files"}
            </button>
            <button
              type="button"
              onClick={() => setMobileView("editor")}
              className={`rounded-md py-2.5 text-sm font-semibold transition-colors ${
                mobileView === "editor"
                  ? "bg-theme-primary/20 text-theme-primary border border-theme-primary/40"
                  : "text-theme-text-secondary bg-theme-bg/20 border border-theme-divider/60"
              }`}
            >
              {t("stateEditor.mobileEditor") || "Editor"}
            </button>
          </div>
        </div>
        )}

        {/* Body */}
        <div
          className={`${isFilesPanel ? "flex" : "hidden"} flex-1 flex-col md:flex-row overflow-hidden min-h-0`}
        >
          {/* File Tree */}
          <div
            className={`${mobileView === "files" ? "flex" : "hidden"} md:flex w-full md:w-80 flex-none border-b md:border-b-0 md:border-r border-theme-divider/60 bg-theme-surface/80 flex-col min-h-0`}
          >
            <div className="p-3 border-b border-theme-divider/60 bg-theme-surface-highlight/20">
              <div className="text-xs font-semibold text-theme-text-secondary uppercase tracking-wide mb-2">
                {t("stateEditor.fileTree") || "File Tree"}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={handleCreateFile}
                  disabled={!hasWritableSession || !canCreateInTargetDirectory}
                  className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                    !hasWritableSession || !canCreateInTargetDirectory
                      ? "border-theme-divider/50 text-theme-muted cursor-not-allowed"
                      : "border-theme-divider/60 text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/20"
                  }`}
                  title={
                    !hasWritableSession
                      ? sessionConfirmReason
                      : !canCreateInTargetDirectory
                        ? createBlockedReason ||
                          t("stateEditor.createBlocked") ||
                          "Cannot create items in this folder"
                        : t("stateEditor.newFile") || "New File"
                  }
                >
                  {t("stateEditor.newFile") || "New File"}
                </button>
                <button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={!hasWritableSession || !canCreateInTargetDirectory}
                  className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                    !hasWritableSession || !canCreateInTargetDirectory
                      ? "border-theme-divider/50 text-theme-muted cursor-not-allowed"
                      : "border-theme-divider/60 text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/20"
                  }`}
                  title={
                    !hasWritableSession
                      ? sessionConfirmReason
                      : !canCreateInTargetDirectory
                        ? createBlockedReason ||
                          t("stateEditor.createBlocked") ||
                          "Cannot create items in this folder"
                        : t("stateEditor.newFolder") || "New Folder"
                  }
                >
                  {t("stateEditor.newFolder") || "New Folder"}
                </button>
                <button
                  type="button"
                  onClick={handleCreateRuleTemplate}
                  disabled={!hasWritableSession || !canCreateRuleTemplate}
                  className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                    !hasWritableSession || !canCreateRuleTemplate
                      ? "border-theme-divider/50 text-theme-muted cursor-not-allowed"
                      : "border-theme-divider/60 text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/20"
                  }`}
                  title={
                    !hasWritableSession
                      ? sessionConfirmReason
                      : !canCreateRuleTemplate
                        ? createRuleTemplateBlockedReason ||
                          t("stateEditor.createRuleTemplateBlocked") ||
                          "Cannot create rule templates in the current session"
                        : t("stateEditor.createRuleTemplate") || "Quick Rule Template"
                  }
                >
                  {t("stateEditor.createRuleTemplate") || "Quick Rule Template"}
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="rounded-md border border-theme-divider/60 px-2 py-1 text-[11px] text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/20 transition-colors"
                  title={t("stateEditor.refresh") || "Refresh"}
                >
                  {t("stateEditor.refresh") || "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={handleToggleBatchMode}
                  className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                    batchMode
                      ? "border-theme-primary/40 text-theme-primary bg-theme-primary/10"
                      : "border-theme-divider/60 text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/20"
                  }`}
                  title={t("stateEditor.batchMode") || "Batch mode"}
                >
                  {t("stateEditor.batchMode") || "Batch"}
                </button>
                {batchMode && (
                  <button
                    type="button"
                    onClick={
                      batchDestinationMode
                        ? handleCancelBatchDestinationMode
                        : handleStartBatchDestinationMode
                    }
                    disabled={!canBatchMoveSelected && !batchDestinationMode}
                    className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                      !canBatchMoveSelected && !batchDestinationMode
                        ? "border-theme-divider/50 text-theme-muted cursor-not-allowed"
                        : batchDestinationMode
                          ? "border-theme-warning/40 text-theme-warning hover:bg-theme-warning/10"
                          : "border-theme-primary/40 text-theme-primary hover:bg-theme-primary/10"
                    }`}
                    title={
                      batchDestinationMode
                        ? t("stateEditor.batchDestinationMode") || "Destination mode"
                        : !canBatchMoveSelected
                          ? t("stateEditor.batchMoveNoSelection") || "Select at least one file"
                          : t("stateEditor.batchMove") || "Move selected"
                    }
                  >
                    {batchDestinationMode
                      ? t("stateEditor.batchDestinationMode") || "Destination Mode"
                      : t("stateEditor.batchMove") || "Move Selected"}
                  </button>
                )}
              </div>
              {batchMode && (
                <div className="mb-2 text-[11px] text-theme-text-secondary">
                  {batchDestinationMode
                    ? t("stateEditor.batchMoveSelectDestination") ||
                      "Select a target folder in the tree"
                    : t("stateEditor.batchSelectHint") ||
                      "Select files, then choose Move Selected"}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mb-2 md:hidden">
                <button
                  type="button"
                  onClick={handleRenameSelected}
                  disabled={!hasWritableSession || !selectedPathNormalized || !canRenameSelected}
                  className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                    !hasWritableSession || !selectedPathNormalized || !canRenameSelected
                      ? "border-theme-divider/50 text-theme-muted cursor-not-allowed"
                      : "border-theme-divider/60 text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/20"
                  }`}
                  title={
                    !hasWritableSession
                      ? sessionConfirmReason
                      : !selectedPathNormalized
                        ? t("stateEditor.noSelection") || "No file selected"
                        : selectedPathCapabilities?.renameMoveReason ||
                          t("stateEditor.rename") ||
                          "Rename"
                  }
                >
                  {t("stateEditor.rename") || "Rename"}
                </button>
                <button
                  type="button"
                  onClick={handleMoveSelected}
                  disabled={!hasWritableSession || !selectedPathNormalized || !canMoveSelected}
                  className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                    !hasWritableSession || !selectedPathNormalized || !canMoveSelected
                      ? "border-theme-divider/50 text-theme-muted cursor-not-allowed"
                      : "border-theme-divider/60 text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/20"
                  }`}
                  title={
                    !hasWritableSession
                      ? sessionConfirmReason
                      : !selectedPathNormalized
                        ? t("stateEditor.noSelection") || "No file selected"
                        : selectedPathCapabilities?.renameMoveReason ||
                          t("stateEditor.move") ||
                          "Move"
                  }
                >
                  {t("stateEditor.move") || "Move"}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={!hasWritableSession || !selectedPathNormalized || !canDeleteSelected}
                  className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                    !hasWritableSession || !selectedPathNormalized || !canDeleteSelected
                      ? "border-theme-divider/50 text-theme-muted cursor-not-allowed"
                      : "border-theme-divider/60 text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/20"
                  }`}
                  title={
                    !hasWritableSession
                      ? sessionConfirmReason
                      : !selectedPathNormalized
                        ? t("stateEditor.noSelection") || "No file selected"
                        : selectedPathCapabilities?.deleteReason ||
                          t("stateEditor.delete") ||
                          "Delete"
                  }
                >
                  {t("stateEditor.delete") || "Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleCopyPath();
                  }}
                  disabled={!canCopySelectedPath}
                  className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                    !canCopySelectedPath
                      ? "border-theme-divider/50 text-theme-muted cursor-not-allowed"
                      : "border-theme-divider/60 text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/20"
                  }`}
                  title={
                    selectedPathNormalized ||
                    t("stateEditor.noSelection") ||
                    "No file selected"
                  }
                >
                  {t("stateEditor.copyPath") || "Copy Path"}
                </button>
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm md:text-xs px-3 py-2.5 md:py-2 rounded-md bg-theme-bg/30 border border-theme-divider/60 text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                placeholder={
                  t("stateEditor.searchPlaceholder") || "Search files..."
                }
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2 state-editor-scroll-y">
              {tree.children && tree.children.length > 0 ? (
                renderTreeNode(tree)
              ) : (
                <div className="text-xs text-theme-text-secondary px-2 py-4">
                  {t("stateEditor.emptyState") || "No files available"}
                </div>
              )}
            </div>
          </div>

          {/* Editor Area */}
          <div
            className={`${mobileView === "editor" ? "flex" : "hidden"} md:flex flex-1 flex-col overflow-hidden min-w-0 min-h-0`}
          >
            {/* Toolbar */}
            <div className="flex-none px-4 py-2.5 border-b border-theme-divider/60 bg-theme-surface/80 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMobileView("files")}
                  className="md:hidden shrink-0 px-2.5 py-1 rounded-md border border-theme-divider/60 text-xs text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/15 transition-colors"
                >
                  {t("stateEditor.mobileBackToFiles") || "Back to files"}
                </button>
                <span className="font-mono text-xs text-theme-text-secondary">
                  {selectedPath || t("stateEditor.noSelection") || "No file"}
                </span>
                <span className="text-xs text-theme-text-secondary hidden sm:inline">
                  ({lineCount} {t("stateEditor.lines") || "lines"})
                </span>
                {hasChanges && !isReadOnly && (
                  <span className="px-2 py-0.5 bg-theme-warning/15 text-theme-warning text-[11px] rounded-full border border-theme-warning/20">
                    {t("stateEditor.unsaved") || "Unsaved"}
                  </span>
                )}
                {!isEditMode && (
                  <span className="px-2 py-0.5 bg-theme-info/15 text-theme-info text-[11px] rounded-full border border-theme-info/20">
                    {t("stateEditor.readOnly") || "Read Only"}
                  </span>
                )}
                {isEditMode && (
                  <span className="px-2 py-0.5 bg-theme-success/15 text-theme-success text-[11px] rounded-full border border-theme-success/20">
                    {t("stateEditor.editMode") || "Edit"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap text-[11px] sm:text-xs text-theme-text-secondary">
                {isMarkdownFile && (
                  <div className="inline-flex items-center rounded-md border border-theme-divider/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setMarkdownMode("edit")}
                      className={`px-2.5 py-1 transition-colors ${
                        markdownMode === "edit"
                          ? "bg-theme-primary/20 text-theme-primary"
                          : "text-theme-text-secondary hover:bg-theme-bg/20"
                      }`}
                    >
                      {t("stateEditor.editMode") || "Edit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarkdownMode("preview")}
                      className={`px-2.5 py-1 transition-colors ${
                        markdownMode === "preview"
                          ? "bg-theme-primary/20 text-theme-primary"
                          : "text-theme-text-secondary hover:bg-theme-bg/20"
                      }`}
                    >
                      {t("stateEditor.previewMode") || "Preview"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden relative bg-theme-bg/80 min-h-0">
              {isMarkdownFile && markdownMode === "preview" ? (
                <div className="h-full overflow-auto p-4 text-sm text-theme-text state-editor-scroll-y">
                  <MarkdownText content={fileContent || ""} />
                </div>
              ) : isDesktop ? (
                <div
                  className={`h-full state-editor-monaco ${
                    error ? "border-2 border-theme-error/50" : ""
                  }`}
                >
                  <React.Suspense
                    fallback={
                      <textarea
                        value={fileContent}
                        readOnly
                        className="w-full h-full p-4 bg-transparent text-theme-text font-mono text-sm leading-relaxed resize-none focus:outline-none overflow-auto state-editor-scroll-y opacity-85"
                        spellCheck={false}
                        placeholder={t("loadingGeneric") || "Loading..."}
                      />
                    }
                  >
                    <MonacoEditor
                      value={fileContent}
                      language={monacoLanguage}
                      theme="vs-dark"
                      onMount={handleMonacoMount}
                      onChange={(value) => handleContentChange(value ?? "")}
                      options={{
                        readOnly: isReadOnly,
                        minimap: { enabled: false },
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        wordWrap: "off",
                        lineNumbers: "on",
                        fontSize: 13,
                        scrollbar: {
                          alwaysConsumeMouseWheel: false,
                        },
                      }}
                      loading={t("loadingGeneric") || "Loading..."}
                    />
                  </React.Suspense>
                </div>
              ) : (
                <textarea
                  value={fileContent}
                  onChange={(event) => handleContentChange(event.target.value)}
                  readOnly={isReadOnly}
                  className={`w-full h-full p-4 bg-transparent text-theme-text font-mono text-sm leading-relaxed resize-none focus:outline-none overflow-auto state-editor-scroll-y ${
                    error ? "border-2 border-theme-error/50" : ""
                  } ${isReadOnly ? "opacity-85" : "opacity-100"}`}
                  spellCheck={false}
                  placeholder={t("loadingGeneric") || "Loading..."}
                />
              )}
              {error && (
                <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-theme-error/20 border-t border-theme-error/50 text-theme-error text-xs">
                  <span aria-hidden="true">!</span> {error}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex-none px-4 py-3 sm:p-4 border-t border-theme-divider/60 bg-theme-surface/80 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pb-[calc(12px+env(safe-area-inset-bottom))]">
              <div className="text-[11px] sm:text-xs text-theme-text-secondary">
                <span aria-hidden="true">!</span>{" "}
                {t("stateEditor.warning") ||
                  "Changes are applied immediately. Be careful!"}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 justify-end flex-wrap">
                <button
                  onClick={handleFormat}
                  className="px-3 py-2.5 text-xs text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/15 rounded-md transition-colors border border-transparent hover:border-theme-divider/60"
                  disabled={isReadOnly}
                >
                  {t("stateEditor.format") || "Format"}
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-2.5 text-xs text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/15 rounded-md transition-colors border border-transparent hover:border-theme-divider/60"
                >
                  {t("stateEditor.reset") || "Reset"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!!error || !hasChanges || isReadOnly}
                  className={`px-6 py-2.5 rounded-md font-bold transition-colors ${
                    error || !hasChanges || isReadOnly
                      ? "bg-theme-muted/20 text-theme-muted cursor-not-allowed"
                      : "bg-theme-primary hover:bg-theme-primary-hover text-theme-bg shadow-[0_0_18px_rgba(var(--theme-primary-rgb),0.18)]"
                  }`}
                >
                  {t("stateEditor.save") || "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {!isFilesPanel && (
          <StateEditorRagPanel
            mode={ragPanelMode}
            gameState={gameState}
            vfsSession={vfsSession}
          />
        )}
      </div>

      {contextMenuState && isDesktop && (
        <div
          data-state-editor-context-menu="true"
          className="hidden md:block fixed z-[95] min-w-[230px] max-w-[320px] rounded-md border border-theme-divider/60 bg-theme-surface/95 shadow-xl backdrop-blur-sm"
          style={{ left: contextMenuState.x, top: contextMenuState.y }}
          role="menu"
        >
          <div className="px-3 py-2 text-[11px] font-semibold text-theme-text-secondary border-b border-theme-divider/60">
            {t("stateEditor.contextMenuTitle") || "Actions"}
          </div>
          <div className="py-1 max-h-[340px] overflow-auto">
            {contextMenuActions.length > 0 ? (
              contextMenuActions.map((action) => {
                const label = t(action.labelKey) || action.fallbackLabel;
                return (
                  <button
                    key={`${contextMenuState.path}-${action.id}`}
                    type="button"
                    role="menuitem"
                    disabled={action.disabled}
                    onClick={() => runNodeAction(action, "desktop")}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      action.disabled
                        ? "text-theme-muted cursor-not-allowed"
                        : action.danger
                          ? "text-theme-error hover:bg-theme-error/10"
                          : "text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/20"
                    }`}
                    title={
                      action.disabled
                        ? action.disabledReason ||
                          t("stateEditor.batchMoveBlocked") ||
                          "Action is currently unavailable"
                        : label
                    }
                  >
                    <div>{label}</div>
                    {action.disabled && action.disabledReason && (
                      <div className="mt-0.5 text-[10px] text-theme-muted">
                        {action.disabledReason}
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-xs text-theme-text-secondary">
                {t("stateEditor.emptyState") || "No files available"}
              </div>
            )}
          </div>
        </div>
      )}

      {mobileActionSheetState && (
        <div className="md:hidden fixed inset-0 z-[95] flex items-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={closeMobileActionSheet}
            aria-label={t("stateEditor.moreActions") || "More actions"}
          />
          <div className="relative w-full rounded-t-xl border-t border-theme-divider/60 bg-theme-surface/95 backdrop-blur-sm pb-[calc(12px+env(safe-area-inset-bottom))]">
            <div className="px-4 py-3 border-b border-theme-divider/60">
              <div className="text-sm font-semibold text-theme-text">
                {t("stateEditor.moreActions") || "More actions"}
              </div>
              <div className="mt-1 text-[11px] text-theme-text-secondary font-mono break-all">
                {mobileActionSheetState.path}
              </div>
            </div>
            <div className="max-h-[58vh] overflow-auto p-2">
              {mobileActionSheetActions.map((action) => {
                const label = t(action.labelKey) || action.fallbackLabel;
                return (
                  <button
                    key={`${mobileActionSheetState.path}-${action.id}`}
                    type="button"
                    disabled={action.disabled}
                    onClick={() => runNodeAction(action, "mobile")}
                    className={`w-full text-left rounded-md px-3 py-2.5 text-sm transition-colors mb-1 last:mb-0 ${
                      action.disabled
                        ? "text-theme-muted bg-theme-bg/15 cursor-not-allowed"
                        : action.danger
                          ? "text-theme-error bg-theme-error/5"
                          : "text-theme-text-secondary bg-theme-bg/10"
                    }`}
                    title={
                      action.disabled
                        ? action.disabledReason ||
                          t("stateEditor.batchMoveBlocked") ||
                          "Action is currently unavailable"
                        : label
                    }
                  >
                    <div>{label}</div>
                    {action.disabled && action.disabledReason && (
                      <div className="mt-0.5 text-[11px] text-theme-muted">
                        {action.disabledReason}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
