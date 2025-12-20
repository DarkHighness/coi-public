import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../hooks/useSettings";
import { Tab } from "./settings/types";
import { SettingsTabs } from "./settings/SettingsTabs";
import { SettingsAppearance } from "./settings/SettingsAppearance";
import { SettingsData } from "./settings/SettingsData";
import { SettingsModels } from "./settings/SettingsModels";
import { SettingsAudio } from "./settings/SettingsAudio";
import { SettingsEmbedding } from "./settings/SettingsEmbedding";
import { SettingsExtra } from "./settings/SettingsExtra";
import { SettingsProviders } from "./settings/SettingsProviders";
import { useToast } from "./Toast";
import { useTutorialContextOptional } from "../contexts/TutorialContext";
import { useTutorialTarget } from "../hooks/useTutorial";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeFont: string;
  onClearAllSaves?: () => Promise<boolean>;
  saveCount?: number; // Number of saves
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  themeFont,
  onClearAllSaves,
  saveCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("providers");

  const { t } = useTranslation();

  // Use the centralized settings hook
  const { resetSettings } = useSettings();

  // Use Toast Context
  const { showToast } = useToast();

  // Tutorial context
  const tutorial = useTutorialContextOptional();
  const closeButtonRef = useTutorialTarget<HTMLButtonElement>("settings-close-button");

  // Handle close with tutorial advancement
  const handleClose = () => {
    if (tutorial?.isActive && tutorial.currentStep?.id === "close-settings") {
      tutorial.markStepActionComplete();
      tutorial.nextStep();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded w-full max-w-2xl shadow-[0_0_40px_rgba(var(--theme-primary),0.2)] relative overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-theme-border bg-theme-surface-highlight/50 flex justify-between items-center relative z-10">
          <h2 className={`text-2xl font-bold text-theme-primary ${themeFont}`}>
            {t("settings.title")}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={handleClose}
            data-tutorial-id="settings-close-button"
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

        <div className="relative z-10">
          <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1" data-tutorial-id="settings-modal-content">
          {activeTab === "providers" && (
            <SettingsProviders showToast={showToast} />
          )}

          {activeTab === "appearance" && <SettingsAppearance />}

          {activeTab === "data" && (
            <SettingsData
              saveCount={saveCount}
              onResetSettings={resetSettings}
              onClearAllSaves={onClearAllSaves}
              showToast={showToast}
            />
          )}

          {activeTab === "models" && <SettingsModels showToast={showToast} />}

          {activeTab === "audio" && <SettingsAudio />}

          {activeTab === "embedding" && (
            <SettingsEmbedding showToast={showToast} />
          )}

          {activeTab === "extra" && <SettingsExtra />}
        </div>

        <div className="p-4 border-t border-theme-border bg-theme-surface/50 flex justify-end items-center">
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-theme-surface-highlight hover:bg-theme-primary hover:text-theme-bg border border-theme-border rounded transition-colors font-bold text-sm"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
};
