import React from "react";
import { useTranslation } from "react-i18next";
import type { AISettings } from "../../types";
import { useSettings } from "../../hooks/useSettings";

export const SettingsExtra: React.FC = () => {
  const { t } = useTranslation();
  const { settings: currentSettings, updateSettings: onUpdateSettings } =
    useSettings();
  type ExtraSettings = NonNullable<AISettings["extra"]>;
  const extra: ExtraSettings = currentSettings.extra || {};
  const isCulturePreference = (
    value: string,
  ): value is NonNullable<ExtraSettings["culturePreference"]> => {
    switch (value) {
      case "follow_story_setting":
      case "none":
      case "sinosphere":
      case "japanese":
      case "korean":
      case "western_euro_american":
      case "arab_islamic":
      case "south_asian":
      case "latin_american":
      case "sub_saharan_african":
        return true;
      default:
        return false;
    }
  };
  const isGenderPreference = (
    value: string,
  ): value is NonNullable<ExtraSettings["genderPreference"]> =>
    value === "none" ||
    value === "male" ||
    value === "female" ||
    value === "pan_gender";
  const customInstructionRaw = extra.customInstruction || "";
  const customInstructionTrimmed =
    typeof customInstructionRaw === "string" ? customInstructionRaw.trim() : "";
  const customInstructionEnabled =
    extra.customInstructionEnabled ?? Boolean(customInstructionTrimmed);

  const updateExtra = <K extends keyof ExtraSettings>(
    field: K,
    value: ExtraSettings[K],
  ) => {
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
                "Show a tool-call style rotating animation (like vfs_read_chars/vfs_read_lines/vfs_read_json({...})) while AI is generating."}
            </div>
          </div>
          <button
            onClick={() =>
              updateExtra("toolCallCarousel", !(extra.toolCallCarousel ?? true))
            }
            className={`w-10 h-5 rounded-full relative transition-colors ${
              (extra.toolCallCarousel ?? true)
                ? "bg-green-500"
                : "bg-theme-border"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                (extra.toolCallCarousel ?? true) ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Culture Preference */}
        <div className="flex items-start justify-between gap-4 py-4 border-b border-theme-border/25">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.culturePreference") || "Culture Preference"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.culturePreferenceHelp") ||
                "Control cultural-circle defaults used in story generation and naming."}
            </div>
          </div>
          <div className="w-56">
            <select
              value={extra.culturePreference || "follow_story_setting"}
              onChange={(e) => {
                const nextValue = e.target.value;
                if (isCulturePreference(nextValue)) {
                  updateExtra("culturePreference", nextValue);
                }
              }}
              className="w-full p-1.5 text-xs bg-theme-surface border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text"
            >
              <option value="follow_story_setting">
                {t("settings.extra.culturePreferences.follow_story_setting") ||
                  "Follow Story Setting"}
              </option>
              <option value="none">
                {t("settings.extra.culturePreferences.none") ||
                  "Neutral / No Specific Circle"}
              </option>
              <option value="sinosphere">
                {t("settings.extra.culturePreferences.sinosphere") ||
                  "Sinosphere"}
              </option>
              <option value="japanese">
                {t("settings.extra.culturePreferences.japanese") || "Japanese"}
              </option>
              <option value="korean">
                {t("settings.extra.culturePreferences.korean") || "Korean"}
              </option>
              <option value="western_euro_american">
                {t("settings.extra.culturePreferences.western_euro_american") ||
                  "Western Europe / North America"}
              </option>
              <option value="arab_islamic">
                {t("settings.extra.culturePreferences.arab_islamic") ||
                  "Arab-Islamic"}
              </option>
              <option value="south_asian">
                {t("settings.extra.culturePreferences.south_asian") ||
                  "South Asian"}
              </option>
              <option value="latin_american">
                {t("settings.extra.culturePreferences.latin_american") ||
                  "Latin American"}
              </option>
              <option value="sub_saharan_african">
                {t("settings.extra.culturePreferences.sub_saharan_african") ||
                  "Sub-Saharan African"}
              </option>
            </select>
          </div>
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
              onChange={(e) => {
                const nextValue = e.target.value;
                if (isGenderPreference(nextValue)) {
                  updateExtra("genderPreference", nextValue);
                }
              }}
              className="w-full p-1.5 text-xs bg-theme-surface border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text"
            >
              <option value="none">
                {t("settings.extra.genderPreferences.none") || "No Preference"}
              </option>
              <option value="pan_gender">
                {t("settings.extra.genderPreferences.pan_gender") ||
                  "Pan-gender (No explicit gender words)"}
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
              updateExtra("customInstructionEnabled", !customInstructionEnabled)
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
              {t("settings.extra.customPromptInjection") || "Instruction Text"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.customPromptInjectionHelp") ||
                "Write style, plot direction, setting assumptions, or world-rule bias here."}
            </div>
          </div>
          <textarea
            value={
              typeof customInstructionRaw === "string"
                ? customInstructionRaw
                : ""
            }
            onChange={(e) => updateExtra("customInstruction", e.target.value)}
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
