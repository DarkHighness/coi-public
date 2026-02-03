import React from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";

export const SettingsExtra: React.FC = () => {
  const { t } = useTranslation();
  const { settings: currentSettings, updateSettings: onUpdateSettings } =
    useSettings();
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
            {t("settings.extra.description") ||
              "Additional configuration options"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Detailed Description Toggle */}
        <div className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.detailedDescription")}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.detailedDescriptionHelp")}
            </div>
          </div>
          <button
            onClick={() =>
              updateExtra("detailedDescription", !extra.detailedDescription)
            }
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

        {/* Narrative Style Preset */}
        <div className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.narrativeStylePreset") || "Narrative Style"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.narrativeStylePresetHelp") ||
                "Adds a concise narrative style add-on to the theme default. Per-game <narrative_style> in custom context overrides this."}
            </div>
          </div>
          <select
            value={extra.narrativeStylePreset || "theme"}
            onChange={(e) =>
              updateExtra(
                "narrativeStylePreset",
                e.target.value as
                  | "theme"
                  | "cinematic"
                  | "literary"
                  | "noir"
                  | "brutal"
                  | "cozy"
                  | "cdrama"
                  | "minimal",
              )
            }
            className="px-2 py-1 text-xs bg-theme-surface border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text"
          >
            <option value="theme">
              {t("settings.extra.narrativeStylePresetOptions.theme") ||
                "Theme Default"}
            </option>
            <option value="cinematic">
              {t("settings.extra.narrativeStylePresetOptions.cinematic") ||
                "Cinematic"}
            </option>
            <option value="literary">
              {t("settings.extra.narrativeStylePresetOptions.literary") ||
                "Literary"}
            </option>
            <option value="noir">
              {t("settings.extra.narrativeStylePresetOptions.noir") || "Noir"}
            </option>
            <option value="brutal">
              {t("settings.extra.narrativeStylePresetOptions.brutal") ||
                "Brutal"}
            </option>
            <option value="cozy">
              {t("settings.extra.narrativeStylePresetOptions.cozy") || "Cozy"}
            </option>
            <option value="cdrama">
              {t("settings.extra.narrativeStylePresetOptions.cdrama") ||
                "C-Drama"}
            </option>
            <option value="minimal">
              {t("settings.extra.narrativeStylePresetOptions.minimal") ||
                "Minimal"}
            </option>
          </select>
        </div>

        {/* World Disposition Preset */}
        <div className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.worldDispositionPreset") || "World Disposition"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.worldDispositionPresetHelp") ||
                "Adds a small, explicit baseline for human nature and social tone. Per-game <world_disposition> in custom context overrides this."}
            </div>
          </div>
          <select
            value={extra.worldDispositionPreset || "theme"}
            onChange={(e) =>
              updateExtra(
                "worldDispositionPreset",
                e.target.value as
                  | "theme"
                  | "benevolent"
                  | "mixed"
                  | "cynical",
              )
            }
            className="px-2 py-1 text-xs bg-theme-surface border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text"
          >
            <option value="theme">
              {t("settings.extra.worldDispositionPresetOptions.theme") ||
                "Theme Default"}
            </option>
            <option value="benevolent">
              {t("settings.extra.worldDispositionPresetOptions.benevolent") ||
                "Benevolent"}
            </option>
            <option value="mixed">
              {t("settings.extra.worldDispositionPresetOptions.mixed") ||
                "Mixed"}
            </option>
            <option value="cynical">
              {t("settings.extra.worldDispositionPresetOptions.cynical") ||
                "Cynical"}
            </option>
          </select>
        </div>

        {/* NSFW Toggle */}
        <div className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.nsfw")}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.nsfwHelp")}
            </div>
          </div>
          <button
            onClick={() => updateExtra("nsfw", !extra.nsfw)}
            className={`w-10 h-5 rounded-full relative transition-colors ${
              extra.nsfw ? "bg-red-500" : "bg-theme-border"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                extra.nsfw ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Player Profiling Toggle */}
        <div className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.disablePlayerProfiling") ||
                "Disable Player Profiling"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.disablePlayerProfilingHelp") ||
                "When enabled, AI will not record/use cross-save player psychology data."}
            </div>
          </div>
          <button
            onClick={() =>
              updateExtra(
                "disablePlayerProfiling",
                !extra.disablePlayerProfiling,
              )
            }
            className={`w-10 h-5 rounded-full relative transition-colors ${
              extra.disablePlayerProfiling ? "bg-red-500" : "bg-theme-border"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                extra.disablePlayerProfiling ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Reset Player Profile Button */}
        <div className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.resetPlayerProfile") || "Reset Player Profile"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.resetPlayerProfileHelp") ||
                "Clear all recorded cross-save player psychology data."}
            </div>
          </div>
          <button
            onClick={() => {
              onUpdateSettings({
                ...currentSettings,
                playerProfile: undefined,
              });
            }}
            className="px-3 py-1.5 text-xs font-bold bg-theme-surface-highlight hover:bg-theme-primary hover:text-theme-bg border border-theme-border rounded transition-colors"
          >
            {t("settings.extra.resetPlayerProfileButton") || "Reset"}
          </button>
        </div>

        {/* Gender Preference */}
        <div className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.genderPreference") || "Gender Preference"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.genderPreferenceHelp") ||
                "Force the protagonist's gender when generating stories."}
            </div>
          </div>
          <select
            value={extra.genderPreference || "none"}
            onChange={(e) =>
              updateExtra(
                "genderPreference",
                e.target.value as "male" | "female" | "none",
              )
            }
            className="px-2 py-1 text-xs bg-theme-surface border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text"
          >
            <option value="none">
              {t("settings.extra.genderPreferences.none") || "No Preference"}
            </option>
            <option value="male">
              {t("settings.extra.genderPreferences.male") || "Male"}
            </option>
            <option value="female">
              {t("settings.extra.genderPreferences.female") || "Female"}
            </option>
          </select>
        </div>

        {/* Lite Mode Toggle */}
        <div className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.liteMode") || "Lite Mode"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.liteModeHelp") ||
                "Reduce prompt overhead for models with limited context"}
            </div>
          </div>
          <button
            onClick={() => updateExtra("liteMode", !extra.liteMode)}
            className={`w-10 h-5 rounded-full relative transition-colors ${
              extra.liteMode ? "bg-green-500" : "bg-theme-border"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                extra.liteMode ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Force Auto Tool Choice Toggle */}
        <div className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.forceAutoToolChoice") ||
                "Force Auto Tool Choice"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.forceAutoToolChoiceHelp") ||
                "Always use 'auto' for tool choice, overriding 'required' requests."}
            </div>
          </div>
          <button
            onClick={() =>
              updateExtra("forceAutoToolChoice", !extra.forceAutoToolChoice)
            }
            className={`w-10 h-5 rounded-full relative transition-colors ${
              extra.forceAutoToolChoice ? "bg-green-500" : "bg-theme-border"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                extra.forceAutoToolChoice ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Clearer Search Tool Toggle */}
        <div className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.clearerSearchTool") || "Clearer Search Tool"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.clearerSearchToolHelp") ||
                "Return detailed tool metadata (description, schema) in search results to help AI discovery."}
            </div>
          </div>
          <button
            onClick={() =>
              updateExtra("clearerSearchTool", !extra.clearerSearchTool)
            }
            className={`w-10 h-5 rounded-full relative transition-colors ${
              extra.clearerSearchTool ? "bg-green-500" : "bg-theme-border"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                extra.clearerSearchTool ? "translate-x-5" : ""
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
              updateExtra(
                "promptInjectionEnabled",
                !extra.promptInjectionEnabled,
              )
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

        {/* Custom Prompt Injection */}
        <div className="p-3 bg-theme-bg border border-theme-border rounded space-y-2">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.customPromptInjection") ||
                "Custom Prompt Injection"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.customPromptInjectionHelp") ||
                "Custom prompt to inject. When set, overrides model-based prompt injection."}
            </div>
          </div>
          <textarea
            value={extra.customPromptInjection || ""}
            onChange={(e) =>
              updateExtra("customPromptInjection", e.target.value)
            }
            placeholder={
              t("settings.extra.customPromptInjectionPlaceholder") ||
              "Enter custom prompt to inject before system instructions..."
            }
            className="w-full h-24 p-2 text-xs bg-theme-surface border border-theme-border rounded resize-none focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text placeholder:text-theme-muted/50"
          />
          {extra.customPromptInjection && (
            <div className="text-[10px] text-theme-warning">
              {t("settings.extra.customPromptInjectionWarning") ||
                "⚠ Custom injection is active. Model-based injection is disabled."}
            </div>
          )}
        </div>

        {/* Agentic Loop Settings */}
        <div className="p-3 bg-theme-bg border border-theme-border rounded space-y-4">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.agenticLoop") || "Agentic Loop Settings"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.agenticLoopHelp") ||
                "Configure the behavior of AI agentic loop execution."}
            </div>
          </div>

          {/* Max Rounds */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-theme-text">
                {t("settings.extra.maxAgenticRounds") || "Max Rounds"}
              </div>
              <div className="text-[10px] text-theme-muted">
                {t("settings.extra.maxAgenticRoundsHelp") ||
                  "Maximum number of rounds for agentic loop (default: 10)"}
              </div>
            </div>
            <input
              type="number"
              min={1}
              max={100}
              value={extra.maxAgenticRounds ?? 20}
              onChange={(e) =>
                updateExtra(
                  "maxAgenticRounds",
                  Math.max(1, Math.min(100, parseInt(e.target.value) || 20)),
                )
              }
              className="w-20 p-1.5 text-xs bg-theme-surface border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text text-center"
            />
          </div>

          {/* Max Error Retries */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-theme-text">
                {t("settings.extra.maxErrorRetries") || "Max Error Retries"}
              </div>
              <div className="text-[10px] text-theme-muted">
                {t("settings.extra.maxErrorRetriesHelp") ||
                  "Maximum retry attempts on error (default: 3)"}
              </div>
            </div>
            <input
              type="number"
              min={0}
              max={10}
              value={extra.maxErrorRetries ?? 3}
              onChange={(e) =>
                updateExtra(
                  "maxErrorRetries",
                  Math.max(0, Math.min(10, parseInt(e.target.value) || 3)),
                )
              }
              className="w-20 p-1.5 text-xs bg-theme-surface border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text text-center"
            />
          </div>

          {/* Max Tool Calls */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-theme-text">
                {t("settings.extra.maxToolCalls") || "Max Tool Calls"}
              </div>
              <div className="text-[10px] text-theme-muted">
                {t("settings.extra.maxToolCallsHelp") ||
                  "Maximum total tool calls per agentic loop (default: 50)"}
              </div>
            </div>
            <input
              type="number"
              min={5}
              max={200}
              value={extra.maxToolCalls ?? 50}
              onChange={(e) =>
                updateExtra(
                  "maxToolCalls",
                  Math.max(5, Math.min(200, parseInt(e.target.value) || 50)),
                )
              }
              className="w-20 p-1.5 text-xs bg-theme-surface border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text text-center"
            />
          </div>
        </div>

        {/* Reset Tutorials */}
        <div className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.resetTutorials") || "Reset Tutorials"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.resetTutorialsHelp") ||
                "Show onboarding tutorials again on next visit"}
            </div>
          </div>
          <button
            onClick={() => {
              onUpdateSettings({
                ...currentSettings,
                extra: {
                  ...extra,
                  tutorialStartScreenCompleted: false,
                  tutorialGamePageCompleted: false,
                },
              });
              // Reload page to restart tutorial
              window.location.reload();
            }}
            className="px-3 py-1.5 text-xs font-bold bg-theme-surface-highlight hover:bg-theme-primary hover:text-theme-bg border border-theme-border rounded transition-colors"
          >
            {t("settings.extra.resetTutorialsButton") || "Reset"}
          </button>
        </div>
      </div>
    </div>
  );
};
