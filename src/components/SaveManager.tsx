import React, { useState } from "react";
import { SaveSlot, ImportResult } from "../types";
import { THEMES, ENV_THEMES } from "../utils/constants";
import { useTranslation } from "react-i18next";
import { MarkdownText } from "./render/MarkdownText";
import { ExportOptionsModal } from "./ExportOptionsModal";
import { ImportSaveModal } from "./ImportSaveModal";
import { getThemeName } from "../utils/themeLabels";
import { useToast } from "./Toast";

interface SaveManagerProps {
  slots: SaveSlot[];
  currentSlotId: string | null;
  onSwitch: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void;
  onRename?: (id: string, name: string) => Promise<boolean>;
  onClose: () => void;
  onImportComplete?: (result: ImportResult) => void;
  /** Pre-selected file to import - opens ImportSaveModal automatically */
  initialImportFile?: File;
}

export const SaveManager: React.FC<SaveManagerProps> = ({
  slots,
  currentSlotId,
  onSwitch,
  onDelete,
  onRename,
  onClose,
  onImportComplete,
  initialImportFile,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [exportingSlot, setExportingSlot] = useState<SaveSlot | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [highlightedSlotId, setHighlightedSlotId] = useState<string | null>(
    null,
  );
  const slotCardRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const renameHighlightTimeoutRef = React.useRef<number | null>(null);
  // Open import modal immediately if initialImportFile is provided
  const [isImportModalOpen, setIsImportModalOpen] =
    useState(!!initialImportFile);
  const [importFile, setImportFile] = useState<File | undefined>(
    initialImportFile,
  );

  React.useEffect(() => {
    return () => {
      if (renameHighlightTimeoutRef.current) {
        window.clearTimeout(renameHighlightTimeoutRef.current);
        renameHighlightTimeoutRef.current = null;
      }
    };
  }, []);

  const handleExportClick = (slot: SaveSlot) => {
    setExportingSlot(slot);
  };

  const handleImportComplete = (result: ImportResult) => {
    setIsImportModalOpen(false);
    if (onImportComplete) {
      onImportComplete(result);
    }
  };

  const startRename = (slot: SaveSlot) => {
    setEditingSlotId(slot.id);
    setEditingName(slot.name);
  };

  const cancelRename = () => {
    if (isRenaming) return;
    setEditingSlotId(null);
    setEditingName("");
  };

  const submitRename = async (slotId: string) => {
    if (!onRename || isRenaming) return;
    const nextName = editingName.trim();
    if (!nextName) {
      showToast(
        t("saveManager.renameEmpty") || "Save name cannot be empty",
        "error",
      );
      return;
    }

    const currentName = slots.find((slot) => slot.id === slotId)?.name?.trim();
    if (currentName && currentName === nextName) {
      setEditingSlotId(null);
      setEditingName("");
      return;
    }

    setIsRenaming(true);
    try {
      const ok = await onRename(slotId, nextName);
      if (ok) {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement) {
          activeElement.blur();
        }

        setEditingSlotId(null);
        setEditingName("");

        if (renameHighlightTimeoutRef.current) {
          window.clearTimeout(renameHighlightTimeoutRef.current);
          renameHighlightTimeoutRef.current = null;
        }
        setHighlightedSlotId(slotId);
        renameHighlightTimeoutRef.current = window.setTimeout(() => {
          setHighlightedSlotId((prev) => (prev === slotId ? null : prev));
          renameHighlightTimeoutRef.current = null;
        }, 300);

        if (window.matchMedia("(max-width: 768px)").matches) {
          requestAnimationFrame(() => {
            slotCardRefs.current[slotId]?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          });
        }

        showToast(t("saveManager.renameSuccess") || "Save renamed", "success");
      } else {
        showToast(
          t("saveManager.renameError") || "Failed to rename save",
          "error",
        );
      }
    } catch (error) {
      console.error("[SaveManager] Failed to rename save:", error);
      showToast(
        t("saveManager.renameError") || "Failed to rename save",
        "error",
      );
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-60 flex items-center justify-center ui-overlay backdrop-blur-md p-4 animate-fade-in">
        <div className="bg-theme-surface border border-theme-divider/60 rounded-xl max-w-3xl w-full max-h-[85dvh] flex flex-col shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-theme-divider/60 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-theme-primary">
                {t("saves.title")}
              </h2>
              <p className="text-xs text-theme-text-secondary mt-1">
                {t("saves.countLabel", { count: slots.length }) ||
                  `${slots.length} ${slots.length === 1 ? "save" : "saves"}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-theme-surface-highlight/60 rounded-xl transition-colors"
              aria-label={t("close")}
            >
              <svg
                className="w-6 h-6 text-theme-text-secondary hover:text-theme-text"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
            {slots.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <svg
                  className="w-16 h-16 text-theme-muted/30 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  ></path>
                </svg>
                <p className="text-theme-text-secondary text-lg">
                  {t("saves.empty")}
                </p>
                <div className="text-center py-8 text-theme-text-secondary italic">
                  {t("saveManager.startPrompt") ||
                    "Start a new game to create your first save"}
                </div>
              </div>
            )}

            {slots.map((slot) => {
              const themeConfig = THEMES[slot.theme];
              const envTheme = themeConfig?.envTheme;
              const themeColor =
                (envTheme && ENV_THEMES[envTheme]?.vars["--theme-primary"]) ||
                "#ccc";
              const isCurrent = currentSlotId === slot.id;

              return (
                <div
                  key={slot.id}
                  ref={(element) => {
                    slotCardRefs.current[slot.id] = element;
                  }}
                  className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                    isCurrent
                      ? "border-theme-primary bg-theme-primary/5 shadow-lg shadow-theme-primary/20"
                      : "border-theme-border hover:border-theme-muted bg-theme-bg"
                  } ${
                    highlightedSlotId === slot.id
                      ? "ring-1 ring-theme-primary/45 shadow shadow-theme-primary/15"
                      : ""
                  }`}
                >
                  {/* Preview Image Background */}
                  {slot.previewImage && (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-10 blur-sm"
                      style={{ backgroundImage: `url(${slot.previewImage})` }}
                    ></div>
                  )}

                  <div className="relative flex gap-4 p-4">
                    {/* Theme Color Bar */}
                    <div
                      className="w-1 rounded-full shrink-0"
                      style={{ backgroundColor: themeColor }}
                    ></div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-theme-text text-base flex items-center gap-2">
                            {editingSlotId === slot.id ? (
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    submitRename(slot.id);
                                  }
                                  if (e.key === "Escape") {
                                    e.preventDefault();
                                    cancelRename();
                                  }
                                }}
                                autoFocus
                                className="min-w-[12rem] bg-theme-bg border border-theme-primary/60 rounded px-2 py-1 text-sm text-theme-text focus:border-theme-primary outline-none"
                                placeholder={
                                  t("saveManager.renamePlaceholder") ||
                                  "Save name"
                                }
                                maxLength={80}
                                disabled={isRenaming}
                              />
                            ) : (
                              slot.name
                            )}
                            {isCurrent && (
                              <span className="text-[10px] bg-theme-primary text-theme-bg px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                {t("saveManager.current") || "Current"}
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-theme-text-secondary mt-0.5">
                            {getThemeName(slot.theme, t)}
                          </p>
                          <div className="text-sm text-theme-text-secondary mt-2 line-clamp-2 [&_p]:mb-0">
                            <MarkdownText
                              content={slot.summary}
                              disableIndent
                            />
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-[11px] text-theme-text-secondary/80">
                            <span className="flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                ></path>
                              </svg>
                              {new Date(slot.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {!isCurrent && (
                            <button
                              onClick={() => {
                                onSwitch(slot.id);
                                onClose();
                              }}
                              className="px-4 py-2 bg-theme-primary text-theme-bg hover:bg-theme-primary-hover text-xs font-bold uppercase tracking-wide rounded transition-all hover:scale-105"
                              title={t("saves.load")}
                            >
                              {t("saves.load")}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportClick(slot);
                            }}
                            className="p-1.5 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-primary/10 rounded transition-colors"
                            title={t("saveManager.export") || "Export"}
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              ></path>
                            </svg>
                          </button>
                          {onRename &&
                            (editingSlotId === slot.id ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    submitRename(slot.id);
                                  }}
                                  disabled={
                                    isRenaming ||
                                    !editingName.trim() ||
                                    editingName.trim() === slot.name.trim()
                                  }
                                  className="p-1.5 text-theme-text-secondary hover:text-green-500 hover:bg-green-500/10 rounded transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                  title={
                                    t("saveManager.renameConfirm") ||
                                    "Save name"
                                  }
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M5 13l4 4L19 7"
                                    ></path>
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelRename();
                                  }}
                                  disabled={isRenaming}
                                  className="p-1.5 text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-highlight/60 rounded transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                  title={t("cancel")}
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M6 18L18 6M6 6l12 12"
                                    ></path>
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startRename(slot);
                                }}
                                className="p-1.5 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-primary/10 rounded transition-colors"
                                title={t("saveManager.rename") || "Rename"}
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  ></path>
                                </svg>
                              </button>
                            ))}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  t("saves.confirmDelete") ||
                                    "Delete this save?",
                                )
                              ) {
                                onDelete(slot.id);
                              }
                            }}
                            className="p-1.5 text-theme-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            title={t("saveManager.delete") || "Delete"}
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              ></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer with Import Button */}
          <div className="p-4 border-t border-theme-divider/60 flex justify-between items-center">
            <button
              onClick={() => {
                setImportFile(undefined);
                setIsImportModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-theme-text-secondary hover:text-theme-primary hover:bg-theme-primary/10 rounded transition-colors"
            >
              <svg
                className="w-5 h-5"
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
              {t("saveManager.import") || "Import Save"}
            </button>
            <div className="text-xs text-theme-text-secondary">
              {t("saveManager.importHint") || "Import saves from .zip files"}
            </div>
          </div>
        </div>
      </div>

      {/* Export Options Modal */}
      {exportingSlot && (
        <ExportOptionsModal
          slot={exportingSlot}
          slotId={exportingSlot.id}
          onClose={() => setExportingSlot(null)}
        />
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <ImportSaveModal
          existingSlots={slots}
          onClose={() => {
            setIsImportModalOpen(false);
            setImportFile(undefined);
          }}
          onImportComplete={handleImportComplete}
          initialFile={importFile}
        />
      )}
    </>
  );
};
