import { describe, expect, it } from "vitest";
import type { SavePresetProfile } from "../../../types";
import {
  DEFAULT_SAVE_PRESET_PROFILE,
  resolveActivePresetSkillRequirements,
} from "../utils";

const createPresetProfile = (
  overrides?: Partial<SavePresetProfile>,
): SavePresetProfile => ({
  ...DEFAULT_SAVE_PRESET_PROFILE,
  ...(overrides || {}),
  locked: true,
});

describe("resolveActivePresetSkillRequirements", () => {
  it("returns no preset skills for pure theme defaults", () => {
    const requirements = resolveActivePresetSkillRequirements({
      presetProfile: createPresetProfile(),
      customContext: "",
    });

    expect(requirements).toEqual([
      {
        path: "skills/presets/runtime/culture/SKILL.md",
        tag: "culture_preference",
        profile: "follow_story_setting",
        source: "story_setting",
      },
    ]);
  });

  it("activates all preset skill paths for configured non-theme save presets", () => {
    const requirements = resolveActivePresetSkillRequirements({
      presetProfile: createPresetProfile({
        narrativeStylePreset: "cinematic",
        worldDispositionPreset: "mixed",
        playerMalicePreset: "manipulation",
        playerMaliceIntensity: "heavy",
      }),
      customContext: "",
    });

    expect(requirements).toEqual([
      {
        path: "skills/presets/runtime/narrative-style/SKILL.md",
        tag: "narrative_style",
        profile: "cinematic",
        source: "save_profile",
      },
      {
        path: "skills/presets/runtime/world-disposition/SKILL.md",
        tag: "world_disposition",
        profile: "mixed",
        source: "save_profile",
      },
      {
        path: "skills/presets/runtime/player-malice-profile/SKILL.md",
        tag: "player_malice_profile",
        profile: "manipulation",
        source: "save_profile",
      },
      {
        path: "skills/presets/runtime/player-malice-intensity/SKILL.md",
        tag: "player_malice_intensity",
        profile: "heavy",
        source: "save_profile",
      },
      {
        path: "skills/presets/runtime/culture/SKILL.md",
        tag: "culture_preference",
        profile: "follow_story_setting",
        source: "story_setting",
      },
    ]);
  });

  it("lets custom context tags override save preset source per-dimension", () => {
    const requirements = resolveActivePresetSkillRequirements({
      presetProfile: createPresetProfile({
        narrativeStylePreset: "cinematic",
        worldDispositionPreset: "cynical",
        playerMalicePreset: "sabotage",
        playerMaliceIntensity: "heavy",
      }),
      customContext: [
        "<world_disposition>benevolent</world_disposition>",
        "<player_malice_intensity>light</player_malice_intensity>",
      ].join("\n"),
    });

    expect(requirements).toEqual([
      {
        path: "skills/presets/runtime/narrative-style/SKILL.md",
        tag: "narrative_style",
        profile: "cinematic",
        source: "save_profile",
      },
      {
        path: "skills/presets/runtime/world-disposition/SKILL.md",
        tag: "world_disposition",
        profile: "benevolent",
        source: "custom_context",
      },
      {
        path: "skills/presets/runtime/player-malice-profile/SKILL.md",
        tag: "player_malice_profile",
        profile: "sabotage",
        source: "save_profile",
      },
      {
        path: "skills/presets/runtime/player-malice-intensity/SKILL.md",
        tag: "player_malice_intensity",
        profile: "light",
        source: "custom_context",
      },
      {
        path: "skills/presets/runtime/culture/SKILL.md",
        tag: "culture_preference",
        profile: "follow_story_setting",
        source: "story_setting",
      },
    ]);
  });

  it("activates intensity skill when malice profile is active even at standard", () => {
    const requirements = resolveActivePresetSkillRequirements({
      presetProfile: createPresetProfile({
        playerMalicePreset: "sabotage",
        playerMaliceIntensity: "standard",
      }),
      customContext: "",
    });

    expect(requirements.map((entry) => entry.path)).toContain(
      "skills/presets/runtime/player-malice-intensity/SKILL.md",
    );
  });

  it("returns culture hub + explicit circle when culture preference is explicitly set", () => {
    const requirements = resolveActivePresetSkillRequirements({
      presetProfile: createPresetProfile(),
      customContext: "",
      culturePreference: "japanese",
    });

    expect(requirements).toEqual(
      expect.arrayContaining([
        {
          path: "skills/presets/runtime/culture/SKILL.md",
          tag: "culture_preference",
          profile: "japanese",
          source: "save_profile",
        },
        {
          path: "skills/presets/runtime/culture-japanese/SKILL.md",
          tag: "culture_preference",
          profile: "japanese",
          source: "save_profile",
        },
      ]),
    );
  });

  it("returns culture hub + inferred circle for follow_story_setting", () => {
    const requirements = resolveActivePresetSkillRequirements({
      presetProfile: createPresetProfile(),
      customContext: "",
      culturePreference: "follow_story_setting",
      themeKey: "xianxia",
    });

    expect(requirements).toEqual(
      expect.arrayContaining([
        {
          path: "skills/presets/runtime/culture/SKILL.md",
          tag: "culture_preference",
          profile: "follow_story_setting",
          source: "story_setting",
        },
        {
          path: "skills/presets/runtime/culture-sinosphere/SKILL.md",
          tag: "culture_preference",
          profile: "sinosphere",
          source: "story_setting",
        },
      ]),
    );
  });

  it("returns hub-only neutral requirement for explicit none", () => {
    const requirements = resolveActivePresetSkillRequirements({
      presetProfile: createPresetProfile(),
      customContext: "",
      culturePreference: "none",
    });

    expect(requirements).toEqual(
      expect.arrayContaining([
        {
          path: "skills/presets/runtime/culture/SKILL.md",
          tag: "culture_preference",
          profile: "none",
          source: "save_profile",
        },
      ]),
    );
    expect(
      requirements.some((entry) => entry.path.includes("culture-")),
    ).toBe(false);
  });
});
