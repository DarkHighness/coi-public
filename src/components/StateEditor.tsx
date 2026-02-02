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
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  vfsSession: VfsSession | null;
  triggerSave: () => void;
  onShowToast?: (message: string, type: "success" | "error" | "info") => void;
}

export const StateEditor: React.FC<StateEditorProps> = ({
  isOpen,
  onClose,
  gameState,
  setGameState,
  vfsSession,
  triggerSave,
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

  const canEditOutline = gameState.godMode || allowOutlineEdit;

  const snapshot = useMemo<VfsFileMap>(() => {
    if (!vfsSession) {
      return {};
    }
    return vfsSession.snapshot();
  }, [vfsSession, gameState]);

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
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !vfsSession) {
      return;
    }

    if (filePaths.length === 0) {
      setSelectedPath(null);
      return;
    }

    if (!selectedPath || !filteredSnapshot[selectedPath]) {
      setSelectedPath(filePaths[0]);
    }
  }, [isOpen, vfsSession, filePaths, filteredSnapshot, selectedPath]);

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
    if (!isOpen || !vfsSession || !selectedPath) {
      setFileContent("");
      setError(null);
      setHasChanges(false);
      return;
    }

    const file = readVfsFile(vfsSession, selectedPath);
    if (!file) {
      setFileContent("");
      setFileContentType("text/plain");
      setError(null);
      setHasChanges(false);
      return;
    }

    setFileContent(formatVfsContent(file.content, file.contentType));
    setFileContentType(file.contentType);
    setError(null);
    setHasChanges(false);
  }, [isOpen, vfsSession, selectedPath, snapshot]);

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
    if (!vfsSession || !selectedPath) return;
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
    if (!vfsSession || !selectedPath) {
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
      setGameState(nextState);
      triggerSave();
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
      return (
        <div key={node.path || "root"}>
          <button
            type="button"
            onClick={() => toggleFolder(node.path)}
            className={`w-full flex items-center gap-2 px-2 py-1 text-left text-xs rounded transition-colors ${
              isRoot
                ? "text-theme-muted font-semibold"
                : "text-theme-muted hover:text-theme-text hover:bg-theme-surface/50"
            }`}
            style={padding}
          >
            <span className="w-3 text-[10px] font-mono">
              {expanded ? "v" : ">"}
            </span>
            <span className="truncate">{node.name}</span>
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
        className={`w-full flex items-center gap-2 px-2 py-1 text-left text-xs rounded transition-colors ${
          isSelected
            ? "bg-theme-primary/20 text-theme-primary"
            : "text-theme-muted hover:text-theme-text hover:bg-theme-surface/50"
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
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none p-4 border-b border-theme-border flex items-center justify-between bg-theme-bg/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              🛠️
            </span>
            <div>
              <h2 className="text-xl font-bold text-theme-primary">
                {t("stateEditor.title") || "State Editor"}
              </h2>
              <p className="text-xs text-theme-muted">
                {t("stateEditor.subtitle") ||
                  "Direct editing of game state (Developer Tool)"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-theme-muted hover:text-theme-primary hover:bg-theme-surface rounded-lg transition-colors"
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
          <div className="w-full md:w-72 flex-none border-b md:border-b-0 md:border-r border-theme-border bg-theme-bg/30 flex flex-col">
            <div className="p-3 border-b border-theme-border">
              <div className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-2">
                {t("stateEditor.fileTree") || "File Tree"}
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded bg-theme-bg border border-theme-border text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                placeholder={
                  t("stateEditor.searchPlaceholder") || "Search files..."
                }
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {tree.children && tree.children.length > 0 ? (
                renderTreeNode(tree)
              ) : (
                <div className="text-xs text-theme-muted px-2 py-4">
                  {t("stateEditor.emptyState") || "No files available"}
                </div>
              )}
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Toolbar */}
            <div className="flex-none px-4 py-2 border-b border-theme-border bg-theme-bg/20 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="font-mono text-xs text-theme-muted">
                  {selectedPath || t("stateEditor.noSelection") || "No file"}
                </span>
                <span className="text-xs text-theme-muted hidden sm:inline">
                  ({lineCount} {t("stateEditor.lines") || "lines"})
                </span>
                {hasChanges && !isReadOnly && (
                  <span className="px-2 py-0.5 bg-theme-warning/20 text-theme-warning text-xs rounded-full">
                    {t("stateEditor.unsaved") || "Unsaved"}
                  </span>
                )}
                {isReadOnly && (
                  <span className="px-2 py-0.5 bg-theme-info/20 text-theme-info text-xs rounded-full">
                    {t("stateEditor.readOnly") || "Read Only"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap text-xs text-theme-muted">
                {!gameState.godMode && (
                  <label className="flex items-center gap-2">
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
                <label className="flex items-center gap-2">
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
                className={`w-full h-full p-4 bg-theme-bg text-theme-text font-mono text-sm resize-none focus:outline-none ${
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
            <div className="flex-none p-4 border-t border-theme-border bg-theme-bg/50 flex items-center justify-between">
              <div className="text-xs text-theme-muted">
                <span aria-hidden="true">!</span>{" "}
                {t("stateEditor.warning") ||
                  "Changes are applied immediately. Be careful!"}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleFormat}
                  className="px-3 py-2 text-xs text-theme-muted hover:text-theme-text hover:bg-theme-surface rounded transition-colors"
                  disabled={isReadOnly}
                >
                  {t("stateEditor.format") || "Format"}
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-2 text-xs text-theme-muted hover:text-theme-text hover:bg-theme-surface rounded transition-colors"
                >
                  {t("stateEditor.reset") || "Reset"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!!error || !hasChanges || isReadOnly}
                  className={`px-6 py-2 rounded-lg font-bold transition-colors ${
                    error || !hasChanges || isReadOnly
                      ? "bg-theme-muted/20 text-theme-muted cursor-not-allowed"
                      : "bg-theme-primary hover:bg-theme-primary-hover text-theme-bg"
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
