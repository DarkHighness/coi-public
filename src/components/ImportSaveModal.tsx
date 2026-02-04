/**
 * Import Save Modal
 *
 * Handles importing saves from ZIP files
 * with validation and preview
 */

import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { SaveSlot, ImportValidation, ImportResult } from "../types";
import { validateImport, importSave } from "../services/saveExportService";

interface ImportSaveModalProps {
  existingSlots: SaveSlot[];
  onClose: () => void;
  onImportComplete: (result: ImportResult) => void;
  /** Pre-selected file to validate and import */
  initialFile?: File;
}

export const ImportSaveModal: React.FC<ImportSaveModalProps> = ({
  existingSlots,
  onClose,
  onImportComplete,
  initialFile,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ImportValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Auto-select initial file if provided
  useEffect(() => {
    if (initialFile) {
      handleFileSelect(initialFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setValidation(null);
    setIsValidating(true);

    try {
      const result = await validateImport(file);
      setValidation(result);
      if (!result.valid && result.errors.length > 0) {
        setError(result.errors[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !validation?.valid) return;

    setIsImporting(true);
    setError(null);

    try {
      const result = await importSave(selectedFile, existingSlots);
      onImportComplete(result);
      if (result.success) {
        onClose();
      } else {
        setError(result.error || "Import failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center ui-overlay backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-divider/60 rounded-xl max-w-md w-full shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-theme-divider/60 flex justify-between items-center">
          <h2 className="text-lg font-bold text-theme-primary">
            {t("import.title") || "Import Save"}
          </h2>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-2 hover:bg-theme-surface-highlight rounded-full transition-colors disabled:opacity-50"
          >
            <svg
              className="w-5 h-5 text-theme-text-secondary hover:text-theme-text"
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

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              dragActive
                ? "border-theme-primary bg-theme-primary/10"
                : selectedFile
                  ? "border-theme-border bg-theme-bg/30"
                  : "border-theme-border hover:border-theme-primary/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleInputChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <svg
                  className="w-10 h-10 mx-auto text-theme-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div className="text-sm font-medium text-theme-text truncate px-4">
                  {selectedFile.name}
                </div>
                <div className="text-xs text-theme-text-secondary">
                  {formatSize(selectedFile.size)}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <svg
                  className="w-10 h-10 mx-auto text-theme-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <div className="text-sm text-theme-text-secondary">
                  {t("import.dropzone") ||
                    "Drop a save file here or click to browse"}
                </div>
                <div className="text-xs text-theme-text-secondary/80">
                  {t("import.supportedFormats") ||
                    "Supports .zip files"}
                </div>
              </div>
            )}
          </div>

          {/* Validation Status */}
          {isValidating && (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-theme-primary" />
              <span className="text-sm text-theme-text-secondary">
                {t("import.validating") || "Validating..."}
              </span>
            </div>
          )}

          {/* Validation Results */}
          {validation && !isValidating && (
            <div className="space-y-3">
              {/* Preview Info */}
              {validation.manifest && (
                <div className="bg-theme-bg/50 rounded-lg p-3 space-y-2">
                  <h3 className="text-sm font-medium text-theme-text">
                    {t("import.preview") || "Import Preview"}
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-theme-text-secondary">
                        {t("import.saveName") || "Save Name"}
                      </span>
                      <span className="text-theme-text font-medium">
                        {validation.manifest.slot.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-text-secondary">
                        {t("import.theme") || "Theme"}
                      </span>
                      <span className="text-theme-text">
                        {t(`${validation.manifest.slot.theme}.name`, {
                          ns: "themes",
                        }) || validation.manifest.slot.theme}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-text-secondary">
                        {t("import.nodes") || "Story Nodes"}
                      </span>
                      <span className="text-theme-text">
                        {validation.manifest.stats.nodeCount}
                      </span>
                    </div>
                    {validation.manifest.includes.images && (
                      <div className="flex justify-between">
                        <span className="text-theme-text-secondary">
                          {t("import.images") || "Images"}
                        </span>
                        <span className="text-theme-text">
                          {validation.manifest.stats.imageCount}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-theme-text-secondary">
                        {t("import.exportDate") || "Export Date"}
                      </span>
                      <span className="text-theme-text">
                        {new Date(
                          validation.manifest.exportDate,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="space-y-2">
                  {validation.warnings.map((warning, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                    >
                      <svg
                        className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <p className="text-xs text-yellow-500/90">{warning}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Success indicator */}
              {validation.valid && (
                <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <svg
                    className="w-4 h-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-xs text-green-500">
                    {t("import.validFile") ||
                      "File is valid and ready to import"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <svg
                className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-xs text-red-500/90">{error}</p>
            </div>
          )}

          {/* Embeddings Info */}
          {validation?.valid && (
            <div className="flex items-start gap-2 p-2 bg-theme-bg/50 border border-theme-divider/60 rounded-lg">
              <svg
                className="w-4 h-4 text-theme-text-secondary shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-xs text-theme-text-secondary">
                {t("import.embeddingsNote") ||
                  "RAG embeddings will be regenerated automatically when you continue playing."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-theme-divider/60 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 text-sm text-theme-text-secondary hover:text-theme-text transition-colors disabled:opacity-50"
          >
            {t("common.cancel") || "Cancel"}
          </button>
          <button
            onClick={handleImport}
            disabled={!validation?.valid || isValidating || isImporting}
            className="px-4 py-2 bg-theme-primary text-theme-bg text-sm font-medium rounded hover:bg-theme-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-theme-bg" />
                {t("import.importing") || "Importing..."}
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                {t("import.importButton") || "Import"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportSaveModal;
