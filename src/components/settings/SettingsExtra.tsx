import React from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";

export const SettingsExtra: React.FC = () => {
  const { t } = useTranslation();
  const { settings: currentSettings, updateSettings: onUpdateSettings } =
    useSettings();
  const extra = currentSettings.extra || {};
  const customInstructionRaw = extra.customInstruction || "";
  const customInstructionTrimmed =
    typeof customInstructionRaw === "string" ? customInstructionRaw.trim() : "";
  const customInstructionEnabled =
    extra.customInstructionEnabled ?? Boolean(customInstructionTrimmed);

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
        <div className="flex items-start justify-between gap-4 py-4 border-b border-theme-border/25">
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

        {/* NSFW Toggle */}
        <div className="flex items-start justify-between gap-4 py-4 border-b border-theme-border/25">
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

        {/* Tool Call Carousel Toggle */}
        <div className="flex items-start justify-between gap-4 py-4 border-b border-theme-border/25">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.toolCallCarousel") || "Tool Call Carousel"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.toolCallCarouselHelp") ||
                "Show a tool-call style rotating animation (like vfs_read({...})) while AI is generating."}
            </div>
          </div>
          <button
            onClick={() =>
              updateExtra("toolCallCarousel", !(extra.toolCallCarousel ?? true))
            }
            className={`w-10 h-5 rounded-full relative transition-colors ${
              extra.toolCallCarousel ?? true
                ? "bg-green-500"
                : "bg-theme-border"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                extra.toolCallCarousel ?? true ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Player Profiling Toggle */}
        <div className="flex items-start justify-between gap-4 py-4 border-b border-theme-border/25">
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
        <div className="flex items-start justify-between gap-4 py-4 border-b border-theme-border/25">
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
        <div className="flex items-start justify-between gap-4 py-4 border-b border-theme-border/25">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.genderPreference") || "Gender Preference"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.genderPreferenceHelp") ||
                "Force the protagonist's gender when generating stories."}
            </div>
          </div>
          <div className="w-44">
            <select
              value={extra.genderPreference || "none"}
              onChange={(e) =>
                updateExtra("genderPreference", e.target.value)
              }
              className="w-full p-1.5 text-xs bg-theme-surface border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text"
            >
              <option value="none">
                {t("settings.extra.genderPreferences.none") ||
                  "No Preference"}
              </option>
              <option value="male">
                {t("settings.extra.genderPreferences.male") || "Male"}
              </option>
              <option value="female">
                {t("settings.extra.genderPreferences.female") || "Female"}
              </option>
            </select>
          </div>
        </div>

        {/* Force Auto Tool Choice Toggle */}
        <div className="flex items-start justify-between gap-4 py-4 border-b border-theme-border/25">
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
        <div className="flex items-start justify-between gap-4 py-4 border-b border-theme-border/25">
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

        {/* Custom Instruction Toggle */}
        <div className="flex items-start justify-between gap-4 py-4 border-b border-theme-border/25">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.promptInjection") || "Custom Instruction"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.promptInjectionHelp") ||
                "When enabled, this player instruction can guide style, plot direction, setting bias, and world rules."}
            </div>
          </div>
          <button
            onClick={() =>
              updateExtra(
                "customInstructionEnabled",
                !customInstructionEnabled,
              )
            }
            className={`w-10 h-5 rounded-full relative transition-colors ${
              customInstructionEnabled ? "bg-green-500" : "bg-theme-border"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                customInstructionEnabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Model Default Injection Toggle */}
        <div className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.systemDefaultInjectionEnabled") ||
                "Model Default Injection"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.systemDefaultInjectionEnabledHelp") ||
                "When enabled, model-matched default prompt injection runs after runtime floor and before user custom + base system instruction."}
            </div>
          </div>
          <button
            onClick={() =>
              updateExtra(
                "systemDefaultInjectionEnabled",
                !(extra.systemDefaultInjectionEnabled ?? true),
              )
            }
            className={`w-10 h-5 rounded-full relative transition-colors ${
              (extra.systemDefaultInjectionEnabled ?? true)
                ? "bg-green-500"
                : "bg-theme-border"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                (extra.systemDefaultInjectionEnabled ?? true)
                  ? "translate-x-5"
                  : ""
              }`}
            />
          </button>
        </div>

        {/* Custom Instruction */}
        <div className="py-4 border-b border-theme-border/25 space-y-2">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.customPromptInjection") ||
                "Instruction Text"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.customPromptInjectionHelp") ||
                "Write style, plot direction, setting assumptions, or world-rule bias here."}
            </div>
          </div>
          <textarea
            value={typeof customInstructionRaw === "string" ? customInstructionRaw : ""}
            onChange={(e) =>
              updateExtra("customInstruction", e.target.value)
            }
            placeholder={
              t("settings.extra.customPromptInjectionPlaceholder") ||
              "Enter custom instruction..."
            }
            className="w-full h-24 p-2 text-xs bg-theme-surface border border-theme-border rounded resize-none focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text placeholder:text-theme-muted/50"
          />
          {customInstructionEnabled && customInstructionTrimmed && (
            <div className="text-[10px] text-theme-warning">
              {t("settings.extra.customPromptInjectionWarning") ||
                "Custom instruction is active."}
            </div>
          )}
        </div>

        {/* Agentic Loop Settings */}
        <div className="py-4 border-b border-theme-border/25 space-y-4">
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

          {/* Turn Retry Limit */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-theme-text">
                {t("settings.extra.turnRetryLimit") || "Turn Retry Limit"}
              </div>
              <div className="text-[10px] text-theme-muted">
                {t("settings.extra.turnRetryLimitHelp") ||
                  "Retry limit for normal turn loops (default: 3)"}
              </div>
            </div>
            <input
              type="number"
              min={0}
              max={20}
              value={extra.turnRetryLimit ?? 3}
              onChange={(e) =>
                updateExtra(
                  "turnRetryLimit",
                  Math.max(0, Math.min(20, parseInt(e.target.value) || 3)),
                )
              }
              className="w-20 p-1.5 text-xs bg-theme-surface border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text text-center"
            />
          </div>

          {/* Outline Phase Retry Limit */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-theme-text">
                {t("settings.extra.outlinePhaseRetryLimit") ||
                  "Outline Phase Retry Limit"}
              </div>
              <div className="text-[10px] text-theme-muted">
                {t("settings.extra.outlinePhaseRetryLimitHelp") ||
                  "Retry limit for each outline phase (default: 3)"}
              </div>
            </div>
            <input
              type="number"
              min={0}
              max={20}
              value={extra.outlinePhaseRetryLimit ?? 3}
              onChange={(e) =>
                updateExtra(
                  "outlinePhaseRetryLimit",
                  Math.max(0, Math.min(20, parseInt(e.target.value) || 3)),
                )
              }
              className="w-20 p-1.5 text-xs bg-theme-surface border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text text-center"
            />
          </div>

          {/* Cleanup Retry Limit */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-theme-text">
                {t("settings.extra.cleanupRetryLimit") ||
                  "Cleanup Retry Limit"}
              </div>
              <div className="text-[10px] text-theme-muted">
                {t("settings.extra.cleanupRetryLimitHelp") ||
                  "Retry limit for cleanup loops (default: 5)"}
              </div>
            </div>
            <input
              type="number"
              min={0}
              max={20}
              value={extra.cleanupRetryLimit ?? 5}
              onChange={(e) =>
                updateExtra(
                  "cleanupRetryLimit",
                  Math.max(0, Math.min(20, parseInt(e.target.value) || 5)),
                )
              }
              className="w-20 p-1.5 text-xs bg-theme-surface border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text text-center"
            />
          </div>

          {/* Summary Retry Limit */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-theme-text">
                {t("settings.extra.summaryRetryLimit") ||
                  "Summary Retry Limit"}
              </div>
              <div className="text-[10px] text-theme-muted">
                {t("settings.extra.summaryRetryLimitHelp") ||
                  "Retry limit for summary loops (default: 5)"}
              </div>
            </div>
            <input
              type="number"
              min={0}
              max={20}
              value={extra.summaryRetryLimit ?? 5}
              onChange={(e) =>
                updateExtra(
                  "summaryRetryLimit",
                  Math.max(0, Math.min(20, parseInt(e.target.value) || 5)),
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
        <div className="flex items-start justify-between gap-4 py-4 border-b border-theme-border/25">
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
