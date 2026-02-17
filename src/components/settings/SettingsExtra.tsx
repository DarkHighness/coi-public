import React from "react";
import { useTranslation } from "react-i18next";
import type { AISettings } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import { useOptionalRuntimeContext } from "../../runtime/context";
import { deriveGameStateFromVfs } from "../../services/vfs/derivations";
import type { VfsSession } from "../../services/vfs/vfsSession";
import {
  buildSoulMarkdown,
  CURRENT_SOUL_LOGICAL_PATH,
  GLOBAL_SOUL_CANONICAL_PATH,
  GLOBAL_SOUL_LOGICAL_PATH,
  normalizeSoulMarkdown,
} from "../../services/vfs/soulTemplates";
import { MIN_RECOMMENDED_OUTPUT_FALLBACK_TOKENS } from "../../services/modelOutputTokens";

const readGlobalSoulMirror = (
  snapshot: ReturnType<VfsSession["snapshot"]>,
): string | null => {
  const candidates = [
    GLOBAL_SOUL_CANONICAL_PATH,
    GLOBAL_SOUL_LOGICAL_PATH,
    `current/${GLOBAL_SOUL_LOGICAL_PATH}`,
  ];

  for (const path of candidates) {
    const file = snapshot[path];
    if (!file) continue;
    if (
      file.contentType === "text/markdown" ||
      file.contentType === "text/plain"
    ) {
      return normalizeSoulMarkdown("global", file.content);
    }
  }

  return null;
};

export const SettingsExtra: React.FC = () => {
  const { t } = useTranslation();
  const { settings: currentSettings, updateSettings: onUpdateSettings } =
    useSettings();
  const runtimeContext = useOptionalRuntimeContext();
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
    value === "none" || value === "male" || value === "female";
  const customInstructionRaw = extra.customInstruction || "";
  const customInstructionTrimmed =
    typeof customInstructionRaw === "string" ? customInstructionRaw.trim() : "";
  const customInstructionEnabled =
    extra.customInstructionEnabled ?? Boolean(customInstructionTrimmed);
  const outputFallbackValue =
    typeof extra.maxOutputTokensFallback === "number" &&
    Number.isFinite(extra.maxOutputTokensFallback) &&
    extra.maxOutputTokensFallback > 0
      ? Math.floor(extra.maxOutputTokensFallback)
      : null;
  const showLowOutputFallbackWarning =
    outputFallbackValue !== null &&
    outputFallbackValue < MIN_RECOMMENDED_OUTPUT_FALLBACK_TOKENS;
  const runtimeRevision = runtimeContext?.state.runtimeRevision;
  const vfsSession = runtimeContext?.state.vfsSession;
  const runtimeGameState = runtimeContext?.state.gameState;
  const currentSlotId = runtimeContext?.state.currentSlotId ?? null;
  const hasActiveSave = Boolean(currentSlotId);
  const applyVfsDerivedState = runtimeContext?.actions.applyVfsDerivedState;
  const triggerRuntimeSave = runtimeContext?.actions.triggerSave;

  const globalSoulSource = React.useMemo(
    () => normalizeSoulMarkdown("global", currentSettings.playerProfile),
    [currentSettings.playerProfile],
  );

  const globalSoulMirror = React.useMemo(() => {
    if (!vfsSession) {
      return null;
    }
    return readGlobalSoulMirror(vfsSession.snapshot());
  }, [vfsSession, runtimeRevision]);

  const globalSoulDisplay = globalSoulMirror ?? globalSoulSource;

  const currentSoulDisplay = React.useMemo(() => {
    if (!hasActiveSave) {
      return "";
    }
    return normalizeSoulMarkdown("current", runtimeGameState?.playerProfile);
  }, [hasActiveSave, runtimeGameState?.playerProfile]);

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

  const handleResetGlobalSoul = () => {
    const resetSoul = buildSoulMarkdown("global");
    onUpdateSettings({
      ...currentSettings,
      playerProfile: resetSoul,
    });

    if (!vfsSession) {
      return;
    }

    vfsSession.writeFile(GLOBAL_SOUL_LOGICAL_PATH, resetSoul, "text/markdown");
    triggerRuntimeSave?.();
  };

  const handleResetCurrentSoul = () => {
    if (!vfsSession || !hasActiveSave) {
      return;
    }

    const resetSoul = buildSoulMarkdown("current");
    vfsSession.writeFile(CURRENT_SOUL_LOGICAL_PATH, resetSoul, "text/markdown");

    const derived = deriveGameStateFromVfs(vfsSession.snapshot());
    applyVfsDerivedState?.(derived, "settings.extra.resetCurrentSoul");
    triggerRuntimeSave?.();
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

        {/* Soul Documents */}
        <div className="py-4 border-b border-theme-border/25 space-y-4">
          <div>
            <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
              {t("settings.extra.soul.title") || "Player Soul (VFS)"}
            </div>
            <div className="text-[10px] text-theme-muted mt-1">
              {t("settings.extra.soul.description") ||
                "Review AI-maintained soul markdown for global and current save scopes."}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
                  {t("settings.extra.soul.globalTitle") || "Global Soul"}
                </div>
                <div className="text-[10px] text-theme-muted mt-1">
                  {t("settings.extra.soul.globalHelp") ||
                    "Cross-save source from settings and VFS mirror."}
                </div>
              </div>
              <button
                onClick={handleResetGlobalSoul}
                className="px-3 py-1.5 text-xs font-bold bg-theme-surface-highlight hover:bg-theme-primary hover:text-theme-bg border border-theme-border rounded transition-colors"
              >
                {t("settings.extra.soul.resetGlobal") || "Reset Global Soul"}
              </button>
            </div>
            <textarea
              readOnly
              value={globalSoulDisplay}
              className="w-full h-32 p-2 text-xs bg-theme-surface border border-theme-border rounded resize-none text-theme-text"
            />
            {globalSoulMirror && globalSoulMirror !== globalSoulSource && (
              <div className="text-[10px] text-theme-warning">
                {t("settings.extra.soul.globalMirrorMismatch") ||
                  "Settings source and VFS mirror differ. Latest mirror content is shown here."}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-theme-text uppercase tracking-widest">
                  {t("settings.extra.soul.currentTitle") || "Current Save Soul"}
                </div>
                <div className="text-[10px] text-theme-muted mt-1">
                  {t("settings.extra.soul.currentHelp") ||
                    "Per-save soul markdown in current/world/soul.md."}
                </div>
              </div>
              <button
                onClick={handleResetCurrentSoul}
                disabled={!hasActiveSave}
                className={`px-3 py-1.5 text-xs font-bold border rounded transition-colors ${
                  hasActiveSave
                    ? "bg-theme-surface-highlight hover:bg-theme-primary hover:text-theme-bg border-theme-border"
                    : "bg-theme-surface border-theme-border/40 text-theme-muted cursor-not-allowed"
                }`}
              >
                {t("settings.extra.soul.resetCurrent") ||
                  "Reset Current Save Soul"}
              </button>
            </div>
            {hasActiveSave ? (
              <textarea
                readOnly
                value={currentSoulDisplay}
                className="w-full h-32 p-2 text-xs bg-theme-surface border border-theme-border rounded resize-none text-theme-text"
              />
            ) : (
              <div className="text-[10px] text-theme-muted italic">
                {t("settings.extra.soul.currentUnavailable") ||
                  "Current save soul unavailable."}
              </div>
            )}
          </div>
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
                {t("settings.extra.cleanupRetryLimit") || "Cleanup Retry Limit"}
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
                {t("settings.extra.summaryRetryLimit") || "Summary Retry Limit"}
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

          {/* Max Output Fallback Tokens */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-theme-text">
                {t("settings.extra.maxOutputTokensFallback") ||
                  "Max Output Fallback Tokens"}
              </div>
              <div className="text-[10px] text-theme-muted">
                {t("settings.extra.maxOutputTokensFallbackHelp") ||
                  "Used only when model-specific output cap is unknown. Leave empty to use provider defaults."}
              </div>
            </div>
            <input
              type="number"
              min={1024}
              max={1048576}
              value={outputFallbackValue ?? ""}
              placeholder="auto"
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (!raw) {
                  updateExtra("maxOutputTokensFallback", undefined);
                  return;
                }
                const parsed = Number.parseInt(raw, 10);
                if (!Number.isFinite(parsed)) {
                  return;
                }
                updateExtra(
                  "maxOutputTokensFallback",
                  Math.max(1024, Math.min(1048576, parsed)),
                );
              }}
              className="w-28 p-1.5 text-xs bg-theme-surface border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text text-center placeholder:text-theme-muted/60"
            />
          </div>
          {showLowOutputFallbackWarning && (
            <div className="text-[10px] text-theme-warning">
              {t("settings.extra.maxOutputTokensFallbackWarning") ||
                `Warning: values below ${MIN_RECOMMENDED_OUTPUT_FALLBACK_TOKENS} may truncate output and break gameplay.`}
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
