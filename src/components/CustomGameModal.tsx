import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SavePresetProfile } from "../types";
import {
  DEFAULT_SAVE_PRESET_PROFILE,
  normalizeSavePresetProfile,
} from "../services/ai/utils";
import { PresetProfileFields } from "./PresetProfileFields";

interface CustomGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (options: {
    customContext?: string;
    protagonistRole?: string;
    presetProfile?: SavePresetProfile;
  }) => void;
}

const GAMEPLAY_PRESET_KEYS = [
  "exploration",
  "combat",
  "mystery",
  "intrigue",
  "romance",
  "horror",
  "sliceOfLife",
] as const;
type GameplayPresetKey = (typeof GAMEPLAY_PRESET_KEYS)[number];

const DEFAULT_GAMEPLAY_WEIGHTS: Record<GameplayPresetKey, number> = {
  exploration: 0,
  combat: 0,
  mystery: 0,
  intrigue: 0,
  romance: 0,
  horror: 0,
  sliceOfLife: 0,
};

const buildCustomGameContext = (fields: {
  title: string;
  worldSetting: string;
  premise: string;
  protagonistRole: string;
  narrativeStyle: string;
  gameplayFocus: string;
  contentBoundaries: string;
  rules: string;
  openingScene: string;
}): string => {
  const title = fields.title.trim();
  const worldSetting = fields.worldSetting.trim();
  const premise = fields.premise.trim();
  const protagonistRole = fields.protagonistRole.trim();
  const narrativeStyle = fields.narrativeStyle.trim();
  const gameplayFocus = fields.gameplayFocus.trim();
  const contentBoundaries = fields.contentBoundaries.trim();
  const rules = fields.rules.trim();
  const openingScene = fields.openingScene.trim();

  const hasAny =
    title ||
    worldSetting ||
    premise ||
    protagonistRole ||
    narrativeStyle ||
    gameplayFocus ||
    contentBoundaries ||
    rules ||
    openingScene;
  if (!hasAny) return "";

  const lines: string[] = ["<custom_game>"];
  if (title) lines.push(`  <title>${title}</title>`);
  if (worldSetting)
    lines.push(`  <world_setting>${worldSetting}</world_setting>`);
  if (premise) lines.push(`  <premise>${premise}</premise>`);
  if (protagonistRole)
    lines.push(`  <protagonist_role>${protagonistRole}</protagonist_role>`);
  if (narrativeStyle)
    lines.push(`  <narrative_style>${narrativeStyle}</narrative_style>`);
  if (gameplayFocus)
    lines.push(`  <gameplay_focus>${gameplayFocus}</gameplay_focus>`);
  if (contentBoundaries)
    lines.push(
      `  <content_boundaries>${contentBoundaries}</content_boundaries>`,
    );
  if (rules) lines.push(`  <rules>${rules}</rules>`);
  if (openingScene)
    lines.push(`  <opening_scene>${openingScene}</opening_scene>`);
  lines.push("</custom_game>");

  return lines.join("\n");
};

export const CustomGameModal: React.FC<CustomGameModalProps> = ({
  isOpen,
  onClose,
  onStart,
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"structured" | "text">("structured");
  const [title, setTitle] = useState("");
  const [worldSetting, setWorldSetting] = useState("");
  const [premise, setPremise] = useState("");
  const [protagonistRole, setProtagonistRole] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [narrativeStyle, setNarrativeStyle] = useState("");
  const [gameplayWeights, setGameplayWeights] = useState<
    Record<GameplayPresetKey, number>
  >(() => ({ ...DEFAULT_GAMEPLAY_WEIGHTS }));
  const [gameplayFocusNotes, setGameplayFocusNotes] = useState("");
  const [contentBoundaries, setContentBoundaries] = useState("");
  const [rules, setRules] = useState("");
  const [openingScene, setOpeningScene] = useState("");
  const [legacyText, setLegacyText] = useState("");
  const [presetProfile, setPresetProfile] = useState<SavePresetProfile>(
    DEFAULT_SAVE_PRESET_PROFILE,
  );

  const fieldLabelClassName =
    "block text-xs font-bold uppercase tracking-wider text-theme-text-secondary mb-2";
  const inputClassName =
    "w-full bg-theme-bg border border-theme-border/70 rounded-lg px-4 py-3 text-theme-text placeholder-theme-muted/50 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/50 transition-all";
  const textareaClassName =
    "w-full bg-theme-bg border border-theme-border/70 rounded-lg px-4 py-3 text-theme-text placeholder-theme-muted/50 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/50 transition-all resize-none";

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const gameplayFocus = useMemo(() => {
    const weighted = GAMEPLAY_PRESET_KEYS.map((key) => ({
      key,
      label: t(`customGame.gameplay.presets.${key}`),
      weight: gameplayWeights[key] ?? 0,
    }))
      .filter((e) => e.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .map((e) => `${e.label}=${e.weight}`)
      .join(", ");
    const notes = gameplayFocusNotes.trim();
    const parts = [
      weighted ? weighted : "",
      notes ? `${t("notes")}: ${notes}` : "",
    ].filter(Boolean);
    return parts.join("\n");
  }, [gameplayWeights, gameplayFocusNotes, t]);

  const totalGameplayWeight = useMemo(() => {
    return Object.values(gameplayWeights).reduce((sum, v) => sum + v, 0);
  }, [gameplayWeights]);

  const customContext = useMemo(() => {
    return buildCustomGameContext({
      title,
      worldSetting,
      premise,
      protagonistRole,
      narrativeStyle,
      gameplayFocus,
      contentBoundaries,
      rules,
      openingScene,
    });
  }, [
    title,
    worldSetting,
    premise,
    protagonistRole,
    narrativeStyle,
    gameplayFocus,
    contentBoundaries,
    rules,
    openingScene,
  ]);

  if (!isOpen) return null;

  const handleStart = () => {
    const selectedContext = mode === "text" ? legacyText.trim() : customContext;
    onStart({
      customContext: selectedContext ? selectedContext : undefined,
      protagonistRole: protagonistRole.trim() || undefined,
      presetProfile: normalizeSavePresetProfile(presetProfile),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center ui-overlay backdrop-blur-sm animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="bg-theme-surface border border-theme-divider/60 rounded-xl shadow-lg w-full max-w-2xl overflow-hidden flex flex-col animate-slide-in-up max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-theme-divider/60 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-theme-primary uppercase tracking-wider">
              {t("customGame.title")}
            </h2>
            <p className="text-sm text-theme-text-secondary mt-1">
              {t("customGame.subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-theme-text-secondary hover:text-theme-text transition-colors rounded-xl hover:bg-theme-surface-highlight/60 shrink-0"
            aria-label={t("close")}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {/* Mode Switch */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl border border-theme-divider/60 bg-theme-bg/30">
              <button
                type="button"
                onClick={() => setMode("structured")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                  mode === "structured"
                    ? "bg-theme-primary text-theme-bg"
                    : "text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-highlight/40"
                }`}
              >
                {t("customGame.modes.structured")}
              </button>
              <button
                type="button"
                onClick={() => setMode("text")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                  mode === "text"
                    ? "bg-theme-primary text-theme-bg"
                    : "text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-highlight/40"
                }`}
              >
                {t("customGame.modes.text")}
              </button>
            </div>
          </div>

          {mode === "structured" ? (
            <div className="space-y-4">
              <div>
                <label className={fieldLabelClassName}>
                  {t("customGame.fields.title")}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("customGame.placeholders.title")}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={fieldLabelClassName}>
                  {t("customGame.fields.worldSetting")}
                </label>
                <textarea
                  value={worldSetting}
                  onChange={(e) => setWorldSetting(e.target.value)}
                  placeholder={t("customGame.placeholders.worldSetting")}
                  className={`${textareaClassName} h-28`}
                />
              </div>

              <div>
                <label className={fieldLabelClassName}>
                  {t("customGame.fields.protagonistRole")}
                </label>
                <input
                  value={protagonistRole}
                  onChange={(e) => setProtagonistRole(e.target.value)}
                  placeholder={t("customGame.placeholders.protagonistRole")}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={fieldLabelClassName}>
                  {t("customGame.fields.premise")}
                </label>
                <textarea
                  value={premise}
                  onChange={(e) => setPremise(e.target.value)}
                  placeholder={t("customGame.placeholders.premise")}
                  className={`${textareaClassName} h-24`}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className={fieldLabelClassName}>
                  {t("customGame.fields.protagonistRole")}
                </label>
                <input
                  value={protagonistRole}
                  onChange={(e) => setProtagonistRole(e.target.value)}
                  placeholder={t("customGame.placeholders.protagonistRole")}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={fieldLabelClassName}>
                  {t("customContext")}
                </label>
                <textarea
                  value={legacyText}
                  onChange={(e) => setLegacyText(e.target.value)}
                  placeholder={t("customContextPlaceholder")}
                  className={`${textareaClassName} h-56`}
                  autoFocus
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between py-3 border-y border-theme-divider/60 hover:bg-theme-surface-highlight/25 transition-colors"
            aria-expanded={showAdvanced}
          >
            <span className="text-sm font-bold uppercase tracking-wider text-theme-text-secondary">
              {t("customGame.advanced")}
            </span>
            <svg
              className={`w-5 h-5 text-theme-text-secondary transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showAdvanced && (
            <div className="space-y-4 animate-fade-in pt-1">
              {mode === "structured" && (
                <>
                  <div>
                    <label className={fieldLabelClassName}>
                      {t("customGame.fields.narrativeStyle")}
                    </label>
                    <textarea
                      value={narrativeStyle}
                      onChange={(e) => setNarrativeStyle(e.target.value)}
                      placeholder={t("customGame.placeholders.narrativeStyle")}
                      className={`${textareaClassName} h-24`}
                    />
                    <p className="mt-2 text-[11px] text-theme-text-secondary leading-relaxed">
                      {t("customGame.narrativeStyleOverrideHint")}
                    </p>
                  </div>

                  <div>
                    <label className={fieldLabelClassName}>
                      {t("customGame.fields.gameplayFocus")}
                    </label>
                    <div className="text-xs text-theme-text-secondary mb-3">
                      {t("customGame.gameplay.hint")}
                    </div>
                    <div className="border-y border-theme-divider/60 divide-y divide-theme-divider/60">
                      {GAMEPLAY_PRESET_KEYS.map((key) => (
                        <div
                          key={key}
                          className="flex items-center gap-3 px-2 py-2"
                        >
                          <div className="w-28 shrink-0 text-xs font-bold uppercase tracking-wider text-theme-text-secondary">
                            {t(`customGame.gameplay.presets.${key}`)}
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={gameplayWeights[key] ?? 0}
                            onChange={(e) => {
                              const value = Math.max(
                                0,
                                Math.min(100, Number(e.target.value) || 0),
                              );
                              setGameplayWeights((prev) => ({
                                ...prev,
                                [key]: value,
                              }));
                            }}
                            className="flex-1 accent-theme-primary"
                          />
                          <div className="w-12 shrink-0 text-right text-xs font-bold text-theme-text">
                            {(gameplayWeights[key] ?? 0).toString()}%
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-theme-text-secondary">
                      <span>
                        {t("customGame.gameplay.total")}: {totalGameplayWeight}%
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setGameplayWeights({ ...DEFAULT_GAMEPLAY_WEIGHTS })
                        }
                        className="px-3 py-1.5 rounded-lg border border-theme-divider/60 hover:border-theme-muted hover:bg-theme-surface-highlight/40 transition-colors"
                      >
                        {t("customGame.gameplay.reset")}
                      </button>
                    </div>
                    <input
                      value={gameplayFocusNotes}
                      onChange={(e) => setGameplayFocusNotes(e.target.value)}
                      placeholder={t("customGame.placeholders.gameplayFocus")}
                      className={`mt-3 ${inputClassName}`}
                    />
                  </div>

                  <div>
                    <label className={fieldLabelClassName}>
                      {t("customGame.fields.contentBoundaries")}
                    </label>
                    <textarea
                      value={contentBoundaries}
                      onChange={(e) => setContentBoundaries(e.target.value)}
                      placeholder={t(
                        "customGame.placeholders.contentBoundaries",
                      )}
                      className={`${textareaClassName} h-24`}
                    />
                  </div>

                  <div>
                    <label className={fieldLabelClassName}>
                      {t("customGame.fields.rules")}
                    </label>
                    <textarea
                      value={rules}
                      onChange={(e) => setRules(e.target.value)}
                      placeholder={t("customGame.placeholders.rules")}
                      className={`${textareaClassName} h-24`}
                    />
                  </div>

                  <div>
                    <label className={fieldLabelClassName}>
                      {t("customGame.fields.openingScene")}
                    </label>
                    <textarea
                      value={openingScene}
                      onChange={(e) => setOpeningScene(e.target.value)}
                      placeholder={t("customGame.placeholders.openingScene")}
                      className={`${textareaClassName} h-24`}
                    />
                  </div>
                </>
              )}

              <div
                className={
                  mode === "structured"
                    ? "pt-4 border-t border-theme-divider/60"
                    : ""
                }
              >
                <div className="text-xs font-bold uppercase tracking-wider text-theme-text-secondary mb-2">
                  {t("presetProfile.sectionTitle")}
                </div>
                <p className="text-[11px] text-theme-text-secondary mb-3 leading-relaxed">
                  {t("presetProfile.priorityHint")}
                </p>
                <PresetProfileFields
                  value={presetProfile}
                  onChange={setPresetProfile}
                  showHelp={false}
                />
              </div>
            </div>
          )}

          <div className="border-l-2 border-theme-divider/60 pl-4 py-1">
            <p className="text-xs text-theme-text-secondary leading-relaxed">
              <strong className="text-theme-primary">{t("tip")}:</strong>{" "}
              {mode === "text" ? t("customWritingTips") : t("customGame.tip")}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-theme-divider/60 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-theme-divider/60 text-theme-text hover:bg-theme-surface-highlight transition-all rounded-lg"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleStart}
            className="flex-1 px-4 py-3 bg-theme-primary text-theme-bg font-bold hover:bg-theme-primary-hover transition-all rounded-lg"
          >
            {t("customGame.start")}
          </button>
        </div>
      </div>
    </div>
  );
};
