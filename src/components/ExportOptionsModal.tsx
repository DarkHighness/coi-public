/**
 * Export Options Modal
 *
 * Allows users to select what to include in the export:
 * - Images (optional)
 * - Embeddings (optional, for RAG/semantic search data)
 * - Shows estimated size and statistics
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { SaveSlot, ExportOptions, ExportStats } from "../types";
import {
  getExportStats,
  exportSave,
  downloadExport,
} from "../services/saveExportService";

interface ExportOptionsModalProps {
  slot: SaveSlot;
  slotId: string;
  onClose: () => void;
  onExportComplete?: () => void;
}

export const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({
  slot,
  slotId,
  onClose,
  onExportComplete,
}) => {
  const { t } = useTranslation();
  const [options, setOptions] = useState<ExportOptions>({
    includeImages: true,
    includeEmbeddings: true,
    includeLogs: true, // Include logs by default for debugging purposes
  });
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load stats on mount
  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      setIsLoading(true);
      try {
        const exportStats = await getExportStats(slotId, options, slot);
        if (!cancelled) {
          setStats(exportStats);
        }
      } catch (err) {
        console.error("Failed to load export stats:", err);
        if (!cancelled) {
          setError(
            t("export.statsError") || "Failed to load export statistics",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [
    slotId,
    slot,
    options.includeImages,
    options.includeEmbeddings,
    options.includeLogs,
    t,
  ]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const estimatedSize = stats?.estimatedSize || 0;

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const blob = await exportSave(slotId, slot, options);
      if (blob) {
        downloadExport(blob, slot.name);
        onExportComplete?.();
        onClose();
      } else {
        setError(t("export.exportError") || "Failed to create export file");
      }
    } catch (err) {
      console.error("Export failed:", err);
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-lg max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-theme-border flex justify-between items-center bg-gradient-to-r from-theme-surface-highlight/50 to-theme-surface-highlight/30">
          <div>
            <h2 className="text-lg font-bold text-theme-primary">
              {t("export.title") || "Export Save"}
            </h2>
            <p className="text-xs text-theme-muted mt-0.5">{slot.name}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-2 hover:bg-theme-surface-highlight rounded-full transition-colors disabled:opacity-50"
          >
            <svg
              className="w-5 h-5 text-theme-muted hover:text-theme-text"
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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary" />
            </div>
          ) : (
            <>
              {/* Stats Summary */}
              {stats && (
                <div className="bg-theme-bg/50 rounded-lg p-3 space-y-2">
                  <h3 className="text-sm font-medium text-theme-text">
                    {t("export.saveInfo") || "Save Information"}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs text-theme-muted">
                    <div className="flex items-center gap-2">
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
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>
                        {stats.nodeCount} {t("export.nodes") || "story nodes"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
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
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>
                        {stats.imageCount} {t("export.images") || "images"}
                      </span>
                    </div>
                    {stats.embeddingCount > 0 && (
                      <div className="flex items-center gap-2">
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
                            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                          />
                        </svg>
                        <span>
                          {stats.embeddingCount}{" "}
                          {t("export.embeddingDocs") || "embedding documents"}
                        </span>
                      </div>
                    )}
                    {(stats.logCount ?? 0) > 0 && (
                      <div className="flex items-center gap-2">
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
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                          />
                        </svg>
                        <span>
                          {stats.logCount}{" "}
                          {t("export.logEntries") || "log entries"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Export Options */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-theme-text">
                  {t("export.options") || "Export Options"}
                </h3>

                {/* Include Images */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-theme-border hover:border-theme-primary/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={options.includeImages}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        includeImages: e.target.checked,
                      }))
                    }
                    className="mt-0.5 w-4 h-4 text-theme-primary bg-theme-bg border-theme-border rounded focus:ring-theme-primary focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-theme-text">
                      {t("export.includeImages") || "Include Images"}
                    </div>
                    <div className="text-xs text-theme-muted mt-0.5">
                      {t("export.includeImagesDesc") ||
                        "Include all generated scene images in the export"}
                    </div>
                    {stats && stats.imageCount > 0 && (
                      <div className="text-xs text-theme-primary mt-1">
                        {stats.imageCount}{" "}
                        {t("export.imagesAvailable") || "images available"}
                      </div>
                    )}
                  </div>
                </label>

                {/* Include Embeddings */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    stats && stats.embeddingCount > 0
                      ? "border-theme-border hover:border-theme-primary/50 cursor-pointer"
                      : "border-theme-border bg-theme-bg/30 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={
                      options.includeEmbeddings &&
                      (stats?.embeddingCount ?? 0) > 0
                    }
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        includeEmbeddings: e.target.checked,
                      }))
                    }
                    disabled={!stats || stats.embeddingCount === 0}
                    className="mt-0.5 w-4 h-4 text-theme-primary bg-theme-bg border-theme-border rounded focus:ring-theme-primary focus:ring-offset-0 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-theme-text">
                      {t("export.includeEmbeddings") || "Include Embeddings"}
                    </div>
                    <div className="text-xs text-theme-muted mt-0.5">
                      {stats && stats.embeddingCount > 0
                        ? t("export.includeEmbeddingsDesc") ||
                          "Include semantic search data to avoid regeneration on import"
                        : t("export.noEmbeddings") ||
                          "No embedding data available for this save"}
                    </div>
                    {stats && stats.embeddingCount > 0 && (
                      <div className="text-xs text-theme-primary mt-1">
                        {stats.embeddingCount}{" "}
                        {t("export.documentsAvailable") ||
                          "documents available"}
                      </div>
                    )}
                  </div>
                </label>

                {/* Include Logs */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    stats && (stats.logCount ?? 0) > 0
                      ? "border-theme-border hover:border-theme-primary/50 cursor-pointer"
                      : "border-theme-border bg-theme-bg/30 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={options.includeLogs && (stats?.logCount ?? 0) > 0}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        includeLogs: e.target.checked,
                      }))
                    }
                    disabled={!stats || (stats.logCount ?? 0) === 0}
                    className="mt-0.5 w-4 h-4 text-theme-primary bg-theme-bg border-theme-border rounded focus:ring-theme-primary focus:ring-offset-0 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-theme-text">
                      {t("export.includeLogs") || "Include Debug Logs"}
                    </div>
                    <div className="text-xs text-theme-muted mt-0.5">
                      {stats && (stats.logCount ?? 0) > 0
                        ? t("export.includeLogsDesc") ||
                          "Include AI request/response logs for debugging and analysis"
                        : t("export.noLogs") ||
                          "No log data available for this save"}
                    </div>
                    {stats && (stats.logCount ?? 0) > 0 && (
                      <div className="text-xs text-theme-primary mt-1">
                        {stats.logCount}{" "}
                        {t("export.logsAvailable") || "log entries available"}
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Estimated Size */}
              <div className="flex items-center justify-between py-2 px-3 bg-theme-bg/50 rounded-lg">
                <span className="text-sm text-theme-muted">
                  {t("export.estimatedSize") || "Estimated size"}
                </span>
                <span className="text-sm font-medium text-theme-text">
                  ~{formatSize(estimatedSize)}
                </span>
              </div>

              {/* Warning for no images */}
              {!options.includeImages && stats && stats.imageCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <svg
                    className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5"
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
                  <p className="text-xs text-yellow-500/90">
                    {t("export.noImagesWarning") ||
                      "Image references will be removed from the export. Images cannot be recovered after import."}
                  </p>
                </div>
              )}

              {/* Info for no embeddings */}
              {!options.includeEmbeddings &&
                stats &&
                stats.embeddingCount > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <svg
                      className="w-5 h-5 text-blue-500 shrink-0 mt-0.5"
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
                    <p className="text-xs text-blue-500/90">
                      {t("export.noEmbeddingsWarning") ||
                        "Embeddings will be regenerated automatically when the save is loaded (requires API access)."}
                    </p>
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-theme-border flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm text-theme-muted hover:text-theme-text transition-colors disabled:opacity-50"
          >
            {t("common.cancel") || "Cancel"}
          </button>
          <button
            onClick={handleExport}
            disabled={isLoading || isExporting}
            className="px-4 py-2 bg-theme-primary text-theme-bg text-sm font-medium rounded hover:bg-theme-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-theme-bg" />
                {t("export.exporting") || "Exporting..."}
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                {t("export.exportButton") || "Export"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportOptionsModal;
