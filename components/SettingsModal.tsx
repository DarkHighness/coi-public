import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AISettings, ModelInfo } from "../types";
import { getModels } from "../services/aiService";
import { Tab } from "./settings/types";
import { SettingsTabs } from "./settings/SettingsTabs";
import { SettingsAppearance } from "./settings/SettingsAppearance";
import { SettingsData } from "./settings/SettingsData";
import { SettingsCredentials } from "./settings/SettingsCredentials";
import { SettingsModels } from "./settings/SettingsModels";
import { SettingsAudio } from "./settings/SettingsAudio";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AISettings;
  onSave: (settings: AISettings) => void; // Now acts as onUpdate
  themeFont: string;
  showToast: (msg: string, type?: "info" | "error") => void;
  themeMode?: "day" | "night" | "system";
  onSetThemeMode?: (mode: "day" | "night" | "system") => void;
  onResetSettings?: () => void;
  onClearAllSaves?: () => Promise<boolean>;
  saveCount?: number; // Number of saves
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
  themeFont,
  showToast,
  themeMode,
  onSetThemeMode,
  onResetSettings,
  onClearAllSaves,
  saveCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("credentials");
  const [geminiModels, setGeminiModels] = useState<ModelInfo[]>([]);
  const [openaiModels, setOpenaiModels] = useState<ModelInfo[]>([]);
  const [openrouterModels, setOpenrouterModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);

  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setActiveTab("credentials");
      loadModels();
    }
  }, [isOpen]);

  const loadModels = async (force: boolean = false) => {
    setLoadingModels(true);
    try {
      const [g, o, or] = await Promise.all([
        getModels("gemini", force),
        getModels("openai", force),
        getModels("openrouter", force),
      ]);
      setGeminiModels(g);
      setOpenaiModels(o);
      setOpenrouterModels(or);
    } catch (e) {
      console.error("Failed to load models", e);
      showToast("Failed to load some models", "error");
    } finally {
      setLoadingModels(false);
    }
  };

  // Instant Update Handler
  const updateSettings = (newSettings: AISettings) => {
    onSave(newSettings);
    // Trigger visual feedback
    setShowSaveIndicator(true);
    setTimeout(() => setShowSaveIndicator(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded w-full max-w-2xl shadow-[0_0_40px_rgba(var(--theme-primary),0.2)] relative overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-theme-border bg-theme-surface-highlight/50 flex justify-between items-center">
          <h2 className={`text-2xl text-theme-primary ${themeFont}`}>
            {t("settings")}
          </h2>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-text"
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
              ></path>
            </svg>
          </button>
        </div>

        <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {activeTab === "appearance" && (
            <SettingsAppearance
              themeMode={themeMode}
              onSetThemeMode={onSetThemeMode}
            />
          )}

          {activeTab === "data" && (
            <SettingsData
              saveCount={saveCount}
              onResetSettings={onResetSettings}
              onClearAllSaves={onClearAllSaves}
              showToast={showToast}
            />
          )}

          {activeTab === "credentials" && (
            <SettingsCredentials
              currentSettings={currentSettings}
              onUpdateSettings={updateSettings}
              showToast={showToast}
              onLoadModels={loadModels}
            />
          )}

          {activeTab === "models" && (
            <SettingsModels
              currentSettings={currentSettings}
              onUpdateSettings={updateSettings}
              loadingModels={loadingModels}
              onLoadModels={loadModels}
              geminiModels={geminiModels}
              openaiModels={openaiModels}
              openrouterModels={openrouterModels}
              showToast={showToast}
            />
          )}

          {activeTab === "audio" && (
            <SettingsAudio
              currentSettings={currentSettings}
              onUpdateSettings={updateSettings}
            />
          )}
        </div>

        <div className="p-4 border-t border-theme-border bg-theme-surface/50 flex justify-between items-center">
          <div
            className={`text-xs text-theme-primary font-bold uppercase tracking-widest transition-opacity duration-500 ${
              showSaveIndicator ? "opacity-100" : "opacity-0"
            }`}
          >
            {t("toast.autoSavedSettings")}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-theme-surface-highlight hover:bg-theme-primary hover:text-theme-bg border border-theme-border rounded transition-colors font-bold text-sm"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
};
