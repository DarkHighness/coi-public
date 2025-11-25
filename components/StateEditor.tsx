/**
 * StateEditor - A modal component for editing GameState via /edit command
 * Allows direct JSON editing of various game state sections
 */

import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GameState } from "../types";

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
  | "relationships"
  | "locations"
  | "quests"
  | "knowledge"
  | "factions"
  | "timeline"
  | "causalChains"
  | "global";

const SECTION_CONFIGS: Record<
  EditableSection,
  { icon: string; labelKey: string; stateKey: keyof GameState | "global" }
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
  relationships: {
    icon: "👥",
    labelKey: "stateEditor.relationships",
    stateKey: "relationships",
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
  }, [isOpen, activeSection, gameState]);

  // Validate JSON on change
  const handleJsonChange = (value: string) => {
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

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none p-4 border-b border-theme-border flex items-center justify-between bg-theme-bg/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛠️</span>
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
        <div className="flex-1 flex overflow-hidden">
          {/* Section Tabs (Left) */}
          <div className="w-48 flex-none border-r border-theme-border bg-theme-bg/30 overflow-y-auto py-2">
            {(Object.keys(SECTION_CONFIGS) as EditableSection[]).map(
              (section) => {
                const config = SECTION_CONFIGS[section];
                const isActive = section === activeSection;
                return (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                      isActive
                        ? "bg-theme-primary/20 text-theme-primary border-r-2 border-theme-primary"
                        : "text-theme-muted hover:text-theme-text hover:bg-theme-surface/50"
                    }`}
                  >
                    <span className="text-lg">{config.icon}</span>
                    <span className="text-sm font-medium truncate">
                      {t(config.labelKey) || section}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex-none px-4 py-2 border-b border-theme-border bg-theme-bg/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {SECTION_CONFIGS[activeSection].icon}
                </span>
                <span className="font-medium text-theme-text">
                  {t(SECTION_CONFIGS[activeSection].labelKey) || activeSection}
                </span>
                <span className="text-xs text-theme-muted">
                  ({lineCount} {t("stateEditor.lines") || "lines"})
                </span>
                {hasChanges && (
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                    {t("stateEditor.unsaved") || "Unsaved"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFormat}
                  className="px-3 py-1.5 text-xs text-theme-muted hover:text-theme-text hover:bg-theme-surface rounded transition-colors"
                  title={t("stateEditor.format") || "Format JSON"}
                >
                  {t("stateEditor.format") || "Format"}
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs text-theme-muted hover:text-theme-text hover:bg-theme-surface rounded transition-colors"
                  title={t("stateEditor.reset") || "Reset to current state"}
                >
                  {t("stateEditor.reset") || "Reset"}
                </button>
              </div>
            </div>

            {/* JSON Editor */}
            <div className="flex-1 overflow-hidden relative">
              <textarea
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                className={`w-full h-full p-4 bg-theme-bg text-theme-text font-mono text-sm resize-none focus:outline-none ${
                  error ? "border-2 border-red-500/50" : ""
                }`}
                spellCheck={false}
                placeholder="Loading..."
              />
              {/* Error indicator */}
              {error && (
                <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-red-500/20 border-t border-red-500/50 text-red-400 text-xs">
                  ⚠️ {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-none p-4 border-t border-theme-border bg-theme-bg/50 flex items-center justify-between">
          <div className="text-xs text-theme-muted">
            ⚠️{" "}
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
          </div>
        </div>
      </div>
    </div>
  );
};
