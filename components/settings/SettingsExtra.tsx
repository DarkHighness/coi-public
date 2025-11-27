import React from "react";
import { useTranslation } from "react-i18next";
import { AISettings } from "../../types";

interface SettingsExtraProps {
  currentSettings: AISettings;
  onUpdateSettings: (settings: AISettings) => void;
}

export const SettingsExtra: React.FC<SettingsExtraProps> = ({
  currentSettings,
  onUpdateSettings,
}) => {
  const { t } = useTranslation();
  const extra = currentSettings.extra || {};

  const updateExtra = (field: string, value: any) => {
    onUpdateSettings({
      ...currentSettings,
      extra: {
        ...extra,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between pb-4 border-b border-theme-border">
        <div>
          <label className="text-sm font-bold text-theme-primary uppercase tracking-widest">
            {t("settings.extra.title") || "Extra Settings"}
          </label>
          <p className="text-xs text-theme-muted mt-1 italic">
            {t("settings.extra.description") || "Additional configuration options"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Detailed Description Toggle */}
        <div className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.detailedDescription") || "Detailed Descriptions"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.detailedDescriptionHelp") ||
                "Force AI to generate more detailed, sensory-rich descriptions for characters and environments."}
            </div>
          </div>
          <button
            onClick={() => updateExtra("detailedDescription", !extra.detailedDescription)}
            className={`w-10 h-5 rounded-full relative transition-colors ${
              extra.detailedDescription ? "bg-green-500" : "bg-theme-border"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                extra.detailedDescription ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>


        {/* Prompt Injection Toggle */}
        <div className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.promptInjection") || "Prompt Injection"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.promptInjectionHelp") ||
                "Inject custom prompts based on model keywords from prompt.toml."}
            </div>
          </div>
          <button
            onClick={() =>
              updateExtra("promptInjectionEnabled", !extra.promptInjectionEnabled)
            }
            className={`w-10 h-5 rounded-full relative transition-colors ${
              extra.promptInjectionEnabled ? "bg-green-500" : "bg-theme-border"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                extra.promptInjectionEnabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
