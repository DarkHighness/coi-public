/**
 * StateEditor - A modal component for editing GameState via /edit command
 * Allows direct JSON editing of various game state sections
 */

import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GameState } from "../types";
import { getValidIcon } from "../utils/emojiValidator";
import { deriveHistory } from "../utils/storyUtils";
import { StorySegment } from "../types";

interface StateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  onShowToast?: (message: string, type: "success" | "error" | "info") => void;
}

// Sections available for editing
type EditableSection =
  | "character"
  | "inventory"
  | "npcs"
  | "locations"
  | "quests"
  | "knowledge"
  | "factions"
  | "timeline"
  | "causalChains"
  | "global"
  | "segments"
  | "notes";

const SECTION_CONFIGS: Record<
  EditableSection,
  {
    icon: string;
    labelKey: string;
    stateKey: keyof GameState | "global" | "segments";
  }
> = {
  character: {
    icon: "👤",
    labelKey: "stateEditor.character",
    stateKey: "character",
  },
  inventory: {
    icon: "🎒",
    labelKey: "stateEditor.inventory",
    stateKey: "inventory",
  },
  npcs: {
    icon: "👥",
    labelKey: "stateEditor.npcs",
    stateKey: "npcs",
  },
  locations: {
    icon: "📍",
    labelKey: "stateEditor.locations",
    stateKey: "locations",
  },
  quests: { icon: "📜", labelKey: "stateEditor.quests", stateKey: "quests" },
  knowledge: {
    icon: "📚",
    labelKey: "stateEditor.knowledge",
    stateKey: "knowledge",
  },
  factions: {
    icon: "⚔️",
    labelKey: "stateEditor.factions",
    stateKey: "factions",
  },
  timeline: {
    icon: "⏳",
    labelKey: "stateEditor.timeline",
    stateKey: "timeline",
  },
  causalChains: {
    icon: "🔗",
    labelKey: "stateEditor.causalChains",
    stateKey: "causalChains",
  },
  global: { icon: "🌍", labelKey: "stateEditor.global", stateKey: "global" },
  segments: {
    icon: "📄",
    labelKey: "stateEditor.segmentsList",
    stateKey: "segments",
  },
  notes: {
    icon: "📝",
    labelKey: "stateEditor.notes",
    stateKey: "notes",
  },
};

export const StateEditor: React.FC<StateEditorProps> = ({
  isOpen,
  onClose,
  gameState,
  setGameState,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] =
    useState<EditableSection>("character");
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Segment Viewer State
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    null,
  );

  // Derive full history for the list view
  const history = useMemo(() => {
    if (activeSection !== "segments") return [];
    return deriveHistory(gameState.nodes, gameState.activeNodeId);
  }, [gameState.nodes, gameState.activeNodeId, activeSection]);

  // Set default selection when opening segments tab
  useEffect(() => {
    if (
      activeSection === "segments" &&
      !selectedSegmentId &&
      gameState.activeNodeId
    ) {
      setSelectedSegmentId(gameState.activeNodeId);
    }
  }, [activeSection, gameState.activeNodeId, selectedSegmentId]);

  // Extract the current section's data
  const getSectionData = (section: EditableSection): any => {
    if (section === "global") {
      return {
        time: gameState.time,
        atmosphere: gameState.atmosphere,
        theme: gameState.theme,
        currentLocation: gameState.currentLocation,
        godMode: gameState.godMode,
        unlockMode: gameState.unlockMode,
        turnNumber: gameState.turnNumber,
      };
    }
    if (section === "segments") {
      // Return the selected segment's data
      if (!selectedSegmentId) return null;
      return gameState.nodes[selectedSegmentId] || null;
    }
    return gameState[SECTION_CONFIGS[section].stateKey as keyof GameState];
  };

  // Initialize JSON text when section changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const data = getSectionData(activeSection);
      setJsonText(JSON.stringify(data, null, 2));
      setError(null);
      setHasChanges(false);
    }
  }, [isOpen, activeSection, gameState, selectedSegmentId]); // Add selectedSegmentId dependency

  // Validate JSON on change
  const handleJsonChange = (value: string) => {
    // Read-only check
    if (activeSection === "segments") return;

    setJsonText(value);
    setHasChanges(true);
    try {
      JSON.parse(value);
      setError(null);
    } catch (e) {
      setError(t("stateEditor.invalidJson") || "Invalid JSON syntax");
    }
  };

  // Apply changes to GameState
  const handleApply = () => {
    if (activeSection === "segments") return; // Read-only

    if (error) {
      onShowToast?.(
        t("stateEditor.fixErrors") || "Fix JSON errors before applying",
        "error",
      );
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);

      setGameState((prev) => {
        if (activeSection === "global") {
          return {
            ...prev,
            time: parsed.time ?? prev.time,
            atmosphere: parsed.atmosphere ?? prev.atmosphere,
            theme: parsed.theme ?? prev.theme,
            currentLocation: parsed.currentLocation ?? prev.currentLocation,
            godMode: parsed.godMode ?? prev.godMode,
            unlockMode: parsed.unlockMode ?? prev.unlockMode,
            turnNumber: parsed.turnNumber ?? prev.turnNumber,
          };
        }

        const stateKey = SECTION_CONFIGS[activeSection]
          .stateKey as keyof GameState;
        return {
          ...prev,
          [stateKey]: parsed,
        };
      });

      setHasChanges(false);
      onShowToast?.(
        t("stateEditor.applied") || `${activeSection} updated successfully`,
        "success",
      );
    } catch (e) {
      onShowToast?.(
        t("stateEditor.applyFailed") || "Failed to apply changes",
        "error",
      );
    }
  };

  // Reset to current state
  const handleReset = () => {
    const data = getSectionData(activeSection);
    setJsonText(JSON.stringify(data, null, 2));
    setError(null);
    setHasChanges(false);
  };

  // Format/prettify JSON
  const handleFormat = () => {
    if (activeSection === "segments") return; // Read-only (already formatted on load)
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (e) {
      // Keep as-is if invalid
    }
  };

  // Line count for editor
  const lineCount = useMemo(() => jsonText.split("\n").length, [jsonText]);

  if (!isOpen) return null;

  const isReadOnly = activeSection === "segments";

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
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
          {/* Section Tabs (Left on Desktop, Top on Mobile) */}
          <div className="w-full md:w-48 flex-none border-b md:border-b-0 md:border-r border-theme-border bg-theme-bg/30 overflow-x-auto md:overflow-y-auto flex md:flex-col scrollbar-hide">
            {(Object.keys(SECTION_CONFIGS) as EditableSection[]).map(
              (section) => {
                const config = SECTION_CONFIGS[section];
                const isActive = section === activeSection;
                return (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={`flex-none md:w-full px-4 py-3 text-left flex items-center gap-3 transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-theme-primary/20 text-theme-primary border-b-2 md:border-b-0 md:border-r-2 border-theme-primary"
                        : "text-theme-muted hover:text-theme-text hover:bg-theme-surface/50"
                    }`}
                  >
                    <span className="text-lg">
                      {getValidIcon(config.icon, "📖")}
                    </span>
                    <span className="text-sm font-medium md:truncate">
                      {t(config.labelKey) || section}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Toolbar */}
            <div className="flex-none px-4 py-2 border-b border-theme-border bg-theme-bg/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-lg flex-none">
                  {getValidIcon(SECTION_CONFIGS[activeSection].icon, "📖")}
                </span>
                <span className="font-medium text-theme-text truncate">
                  {t(SECTION_CONFIGS[activeSection].labelKey) || activeSection}
                </span>
                <span className="text-xs text-theme-muted flex-none hidden sm:inline">
                  ({lineCount} {t("stateEditor.lines") || "lines"})
                </span>
                {hasChanges && !isReadOnly && (
                  <span className="px-2 py-0.5 bg-theme-warning/20 text-theme-warning text-xs rounded-full flex-none">
                    {t("stateEditor.unsaved") || "Unsaved"}
                  </span>
                )}
                {isReadOnly && (
                  <span className="px-2 py-0.5 bg-theme-info/20 text-theme-info text-xs rounded-full flex-none">
                    {t("stateEditor.readOnly") || "Read Only"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-none">
                {!isReadOnly && (
                  <button
                    onClick={handleFormat}
                    className="px-3 py-1.5 text-xs text-theme-muted hover:text-theme-text hover:bg-theme-surface rounded transition-colors"
                    title={t("stateEditor.format") || "Format JSON"}
                  >
                    {t("stateEditor.format") || "Format"}
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs text-theme-muted hover:text-theme-text hover:bg-theme-surface rounded transition-colors"
                  title={t("stateEditor.reset") || "Reset to current state"}
                >
                  {t("stateEditor.reset") || "Reset"}
                </button>
              </div>
            </div>

            {/* Content Area: Split View for Segments, Single View for others */}
            <div className="flex-1 flex overflow-hidden relative">
              {activeSection === "segments" && (
                <div className="w-1/3 border-r border-theme-border flex flex-col overflow-hidden bg-theme-bg/10">
                  <div className="p-2 border-b border-theme-border bg-theme-bg/20 text-xs font-bold text-theme-muted uppercase tracking-wider">
                    {t("stateEditor.segmentsList") || "History Segments"}
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {history.map((segment) => {
                      const isSelected = segment.id === selectedSegmentId;
                      const isCurrent = segment.id === gameState.activeNodeId;
                      return (
                        <button
                          key={segment.id}
                          onClick={() => setSelectedSegmentId(segment.id)}
                          className={`w-full text-left p-2 rounded text-xs transition-colors border ${
                            isSelected
                              ? "bg-theme-primary/20 border-theme-primary text-theme-text"
                              : "bg-theme-surface border-transparent hover:bg-theme-surface/80 text-theme-muted hover:text-theme-text"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold uppercase opacity-70">
                              {segment.role}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 bg-theme-success/20 text-theme-success rounded-full text-[10px]">
                                CURRENT
                              </span>
                            )}
                          </div>
                          <div className="truncate opacity-80">
                            {segment.text || "(No text)"}
                          </div>
                          <div className="text-[10px] opacity-50 mt-1 font-mono">
                            {segment.id}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* JSON Editor (Right side in split view, full width otherwise) */}
              <div
                className={`flex-1 overflow-hidden relative ${activeSection === "segments" ? "w-2/3" : "w-full"}`}
              >
                <textarea
                  value={jsonText}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  readOnly={isReadOnly}
                  className={`w-full h-full p-4 bg-theme-bg text-theme-text font-mono text-sm resize-none focus:outline-none ${
                    error ? "border-2 border-theme-error/50" : ""
                  } ${isReadOnly ? "cursor-default opacity-80" : ""}`}
                  spellCheck={false}
                  placeholder={t("loadingGeneric") || "Loading..."}
                />
                {/* Error indicator */}
                {error && (
                  <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-theme-error/20 border-t border-theme-error/50 text-theme-error text-xs">
                    <span aria-hidden="true">⚠️</span> {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-none p-4 border-t border-theme-border bg-theme-bg/50 flex items-center justify-between">
          <div className="text-xs text-theme-muted">
            <span aria-hidden="true">⚠️</span>{" "}
            {t("stateEditor.warning") ||
              "Changes are applied immediately. Be careful!"}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-theme-muted hover:text-theme-text hover:bg-theme-surface rounded-lg transition-colors"
            >
              {t("close") || "Close"}
            </button>
            {!isReadOnly && (
              <button
                onClick={handleApply}
                disabled={!!error || !hasChanges}
                className={`px-6 py-2 rounded-lg font-bold transition-colors ${
                  error || !hasChanges
                    ? "bg-theme-muted/20 text-theme-muted cursor-not-allowed"
                    : "bg-theme-primary hover:bg-theme-primary-hover text-theme-bg"
                }`}
              >
                {t("stateEditor.apply") || "Apply Changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
