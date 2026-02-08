import React from "react";
import { useTranslation } from "react-i18next";
import type {
  NarrativeStylePreset,
  PlayerMaliceIntensityPreset,
  PlayerMalicePreset,
  SavePresetProfile,
  WorldDispositionPreset,
} from "../types";
import {
  DEFAULT_SAVE_PRESET_PROFILE,
  normalizeSavePresetProfile,
} from "../services/ai/utils";

interface PresetProfileFieldsProps {
  value?: SavePresetProfile;
  onChange: (next: SavePresetProfile) => void;
  className?: string;
  showHelp?: boolean;
}

const NARRATIVE_OPTIONS: NarrativeStylePreset[] = [
  "theme",
  "cinematic",
  "literary",
  "noir",
  "brutal",
  "cozy",
  "cdrama",
  "minimal",
];

const WORLD_OPTIONS: WorldDispositionPreset[] = [
  "theme",
  "benevolent",
  "mixed",
  "cynical",
];

const MALICE_OPTIONS: PlayerMalicePreset[] = [
  "theme",
  "intimidation",
  "bureaucratic",
  "manipulation",
  "sabotage",
];

const INTENSITY_OPTIONS: PlayerMaliceIntensityPreset[] = [
  "light",
  "standard",
  "heavy",
];

const fieldLabelClassName =
  "block text-xs font-bold uppercase tracking-wider text-theme-text-secondary mb-2";
const selectClassName =
  "w-full bg-theme-bg border border-theme-border/70 rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/50 transition-all";

export const PresetProfileFields: React.FC<PresetProfileFieldsProps> = ({
  value,
  onChange,
  className = "space-y-4",
  showHelp = true,
}) => {
  const { t } = useTranslation();
  const profile = normalizeSavePresetProfile(value ?? DEFAULT_SAVE_PRESET_PROFILE);

  const update = <K extends keyof SavePresetProfile>(
    key: K,
    nextValue: SavePresetProfile[K],
  ) => {
    onChange({
      ...profile,
      [key]: nextValue,
      locked: true,
    });
  };

  return (
    <div className={className}>
      <div>
        <label className={fieldLabelClassName}>
          {t("settings.extra.narrativeStylePreset")}
        </label>
        <select
          value={profile.narrativeStylePreset}
          onChange={(e) =>
            update(
              "narrativeStylePreset",
              e.target.value as NarrativeStylePreset,
            )
          }
          className={selectClassName}
        >
          {NARRATIVE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`settings.extra.narrativeStylePresetOptions.${option}`)}
            </option>
          ))}
        </select>
        {showHelp && (
          <p className="mt-2 text-[11px] text-theme-text-secondary leading-relaxed">
            {t("settings.extra.narrativeStylePresetHelp")}
          </p>
        )}
      </div>

      <div>
        <label className={fieldLabelClassName}>
          {t("settings.extra.worldDispositionPreset")}
        </label>
        <select
          value={profile.worldDispositionPreset}
          onChange={(e) =>
            update(
              "worldDispositionPreset",
              e.target.value as WorldDispositionPreset,
            )
          }
          className={selectClassName}
        >
          {WORLD_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`settings.extra.worldDispositionPresetOptions.${option}`)}
            </option>
          ))}
        </select>
        {showHelp && (
          <p className="mt-2 text-[11px] text-theme-text-secondary leading-relaxed">
            {t("settings.extra.worldDispositionPresetHelp")}
          </p>
        )}
      </div>

      <div>
        <label className={fieldLabelClassName}>
          {t("settings.extra.playerMalicePreset")}
        </label>
        <select
          value={profile.playerMalicePreset}
          onChange={(e) =>
            update("playerMalicePreset", e.target.value as PlayerMalicePreset)
          }
          className={selectClassName}
        >
          {MALICE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`settings.extra.playerMalicePresetOptions.${option}`)}
            </option>
          ))}
        </select>
        {showHelp && (
          <p className="mt-2 text-[11px] text-theme-text-secondary leading-relaxed">
            {t("settings.extra.playerMalicePresetHelp")}
          </p>
        )}
      </div>

      <div>
        <label className={fieldLabelClassName}>
          {t("settings.extra.playerMaliceIntensity")}
        </label>
        <select
          value={profile.playerMaliceIntensity}
          onChange={(e) =>
            update(
              "playerMaliceIntensity",
              e.target.value as PlayerMaliceIntensityPreset,
            )
          }
          className={selectClassName}
        >
          {INTENSITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`settings.extra.playerMaliceIntensityOptions.${option}`)}
            </option>
          ))}
        </select>
        {showHelp && (
          <p className="mt-2 text-[11px] text-theme-text-secondary leading-relaxed">
            {t("settings.extra.playerMaliceIntensityHelp")}
          </p>
        )}
      </div>
    </div>
  );
};
