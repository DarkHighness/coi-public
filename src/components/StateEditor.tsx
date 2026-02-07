/**
 * StateEditor - A modal component for editing VFS files via /edit command
 * Allows direct JSON/text editing through a file tree interface
 */

import React, { useEffect, useMemo, useState } from "react";
import { ZodError } from "zod";
import { useTranslation } from "react-i18next";
import type { GameState } from "../types";
import type { VfsSession } from "../services/vfs/vfsSession";
import type { VfsContentType, VfsFileMap } from "../services/vfs/types";
import {
  buildVfsTree,
  isReadonlyPath,
  type VfsTreeNode,
} from "./vfsExplorer/tree";
import { formatVfsContent, readVfsFile } from "./vfsExplorer/fileOps";
import { applyVfsFileEdit } from "./stateEditorUtils";

interface StateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  vfsSession: VfsSession;
  applyVfsMutation: (nextState: GameState) => void;
  onShowToast?: (message: string, type: "success" | "error" | "info") => void;
}

export const StateEditor: React.FC<StateEditorProps> = ({
  isOpen,
  onClose,
  gameState,
  vfsSession,
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
  const [allowOutlineEdit, setAllowOutlineEdit] = useState(false);
  const [allowConversationEdit, setAllowConversationEdit] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<string[]>([""]);
  const [snapshotVersion, setSnapshotVersion] = useState(0);
  const [editingPath, setEditingPath] = useState<string | null>(null);

  const canEditOutline = gameState.godMode || allowOutlineEdit;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setSnapshotVersion((version) => version + 1);
  }, [gameState, isOpen]);

  const snapshot = useMemo<VfsFileMap>(() => {
    return vfsSession.snapshotAll();
  }, [vfsSession, snapshotVersion]);

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
  const isReadOnly =
    !selectedPath ||
    isReadonlyPath(selectedPath, canEditOutline, allowConversationEdit);

  useEffect(() => {
    if (!isOpen) {
      setAllowOutlineEdit(false);
      setAllowConversationEdit(false);
      setSearchQuery("");
      setSelectedPath(null);
      setExpandedPaths([""]);
      setError(null);
      setHasChanges(false);
      setEditingPath(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (filePaths.length === 0) {
      setSelectedPath(null);
      return;
    }

    if (!selectedPath || !filteredSnapshot[selectedPath]) {
      setSelectedPath(filePaths[0]);
    }
  }, [isOpen, filePaths, filteredSnapshot, selectedPath]);

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

    if (error) {
      onShowToast?.(fixErrorsMessage, "error");
      return;
    }

    try {
      const nextState = applyVfsFileEdit({
        session: vfsSession,
        path: selectedPath,
        content: fileContent,
        contentType: fileContentType,
        baseState: gameState,
      });
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

  const lineCount = useMemo(
    () => (fileContent ? fileContent.split("\n").length : 0),
    [fileContent],
  );

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
    const expanded = isRoot || hasSearch || expandedPaths.includes(node.path);
    const padding = { paddingLeft: `${depth * 12}px` };

    if (isFolder) {
      const readonly = isReadonlyPath(
        node.path,
        canEditOutline,
        allowConversationEdit,
      );
      return (
        <div key={node.path || "root"}>
          <button
            type="button"
            onClick={() => toggleFolder(node.path)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors border-l-2 ${
              isRoot
                ? "text-theme-text-secondary font-semibold border-transparent"
                : "text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/10 border-transparent hover:border-theme-divider/60"
            }`}
            style={padding}
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
          {expanded &&
            node.children?.map((child) => renderTreeNode(child, depth + 1))}
        </div>
      );
    }

    const readonly = isReadonlyPath(
      node.path,
      canEditOutline,
      allowConversationEdit,
    );
    const isSelected = node.path === selectedPath;

    return (
      <button
        key={node.path}
        type="button"
        onClick={() => setSelectedPath(node.path)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors border-l-2 ${
          isSelected
            ? "bg-theme-primary/10 text-theme-primary border-theme-primary"
            : "text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/10 border-transparent hover:border-theme-divider/60"
        }`}
        style={padding}
      >
        <span className="w-3 text-[10px] font-mono">-</span>
        <span className="truncate flex-1">{node.name}</span>
        {readonly && (
          <span className="text-[10px] text-theme-info">
            {t("stateEditor.readOnly") || "Read Only"}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[80] ui-overlay backdrop-blur-sm flex items-stretch sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="vn-scroll-surface vn-scroll-edge border border-theme-divider/60 rounded-none sm:rounded-lg shadow-none w-full max-w-6xl h-full sm:h-[85vh] flex flex-col overflow-hidden bg-theme-bg">
        {/* Header */}
        <div className="flex-none px-4 py-3 sm:p-4 border-b border-theme-divider/60 flex items-center justify-between bg-transparent">
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

        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* File Tree */}
          <div className="w-full md:w-80 flex-none border-b md:border-b-0 md:border-r border-theme-divider/60 bg-transparent flex flex-col">
            <div className="p-3 border-b border-theme-divider/60">
              <div className="text-xs font-semibold text-theme-text-secondary uppercase tracking-wide mb-2">
                {t("stateEditor.fileTree") || "File Tree"}
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-md bg-theme-bg/30 border border-theme-divider/60 text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                placeholder={
                  t("stateEditor.searchPlaceholder") || "Search files..."
                }
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
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
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Toolbar */}
            <div className="flex-none px-4 py-2.5 border-b border-theme-divider/60 bg-transparent flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
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
                {isReadOnly && (
                  <span className="px-2 py-0.5 bg-theme-info/15 text-theme-info text-[11px] rounded-full border border-theme-info/20">
                    {t("stateEditor.readOnly") || "Read Only"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap text-[11px] sm:text-xs text-theme-text-secondary">
                {!gameState.godMode && (
                  <label className="flex items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      checked={allowOutlineEdit}
                      onChange={(e) => setAllowOutlineEdit(e.target.checked)}
                      className="accent-theme-primary"
                    />
                    <span>
                      {t("stateEditor.allowOutlineEdit") ||
                        "Allow /sudo outline edit"}
                    </span>
                  </label>
                )}
                <label className="flex items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    checked={allowConversationEdit}
                    onChange={(e) => setAllowConversationEdit(e.target.checked)}
                    className="accent-theme-primary"
                  />
                  <span>
                    {t("stateEditor.unlockConversationEdit") ||
                      "Unlock conversation editing"}
                  </span>
                </label>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden relative">
              <textarea
                value={fileContent}
                onChange={(e) => handleContentChange(e.target.value)}
                readOnly={isReadOnly}
                className={`w-full h-full p-4 bg-transparent text-theme-text font-mono text-sm leading-relaxed resize-none focus:outline-none ${
                  error ? "border-2 border-theme-error/50" : ""
                } ${isReadOnly ? "cursor-default opacity-80" : ""}`}
                spellCheck={false}
                placeholder={t("loadingGeneric") || "Loading..."}
              />
              {error && (
                <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-theme-error/20 border-t border-theme-error/50 text-theme-error text-xs">
                  <span aria-hidden="true">!</span> {error}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex-none px-4 py-3 sm:p-4 border-t border-theme-divider/60 bg-transparent flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pb-[calc(12px+env(safe-area-inset-bottom))]">
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
      </div>
    </div>
  );
};
