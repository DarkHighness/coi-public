import type {
  NarrativeStylePreset,
  PlayerMaliceIntensityPreset,
  PlayerMalicePreset,
  SavePresetProfile,
  WorldDispositionPreset,
} from "../types";

export const DEFAULT_SAVE_PRESET_PROFILE: SavePresetProfile = {
  narrativeStylePreset: "theme",
  worldDispositionPreset: "theme",
  playerMalicePreset: "theme",
  playerMaliceIntensity: "standard",
  locked: true,
};

function sanitizeNarrativeStylePreset(
  value: unknown,
): NarrativeStylePreset | undefined {
  switch (value) {
    case "theme":
    case "cinematic":
    case "literary":
    case "noir":
    case "brutal":
    case "cozy":
    case "cdrama":
    case "minimal":
      return value;
    default:
      return undefined;
  }
}

function sanitizeWorldDispositionPreset(
  value: unknown,
): WorldDispositionPreset | undefined {
  switch (value) {
    case "theme":
    case "benevolent":
    case "mixed":
    case "cynical":
      return value;
    default:
      return undefined;
  }
}

function sanitizePlayerMalicePreset(
  value: unknown,
): PlayerMalicePreset | undefined {
  switch (value) {
    case "theme":
    case "intimidation":
    case "bureaucratic":
    case "manipulation":
    case "sabotage":
      return value;
    default:
      return undefined;
  }
}

function sanitizePlayerMaliceIntensityPreset(
  value: unknown,
): PlayerMaliceIntensityPreset | undefined {
  switch (value) {
    case "light":
    case "standard":
    case "heavy":
      return value;
    default:
      return undefined;
  }
}

export function normalizeSavePresetProfile(
  profile: Partial<SavePresetProfile> | undefined | null,
): SavePresetProfile {
  return {
    narrativeStylePreset:
      sanitizeNarrativeStylePreset(profile?.narrativeStylePreset) ??
      DEFAULT_SAVE_PRESET_PROFILE.narrativeStylePreset,
    worldDispositionPreset:
      sanitizeWorldDispositionPreset(profile?.worldDispositionPreset) ??
      DEFAULT_SAVE_PRESET_PROFILE.worldDispositionPreset,
    playerMalicePreset:
      sanitizePlayerMalicePreset(profile?.playerMalicePreset) ??
      DEFAULT_SAVE_PRESET_PROFILE.playerMalicePreset,
    playerMaliceIntensity:
      sanitizePlayerMaliceIntensityPreset(profile?.playerMaliceIntensity) ??
      DEFAULT_SAVE_PRESET_PROFILE.playerMaliceIntensity,
    locked: true,
  };
}
