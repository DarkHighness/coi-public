import { describe, expect, it, vi } from "vitest";
import { getSceneImagePrompt } from "./sceneImage";

vi.mock("../themeRegistry", () => ({
  getThemeStyle: (key: string) => (key === "fantasy" ? "STYLE_REFERENCE" : null),
  getLoadedThemes: () => ["lord_of_rings", "fantasy"],
}));

vi.mock("./rulesInjector", () => ({
  formatImageStyleRules: () => "**Style Requirements:**\nUse watercolor brushwork",
}));

vi.mock("./atoms/image", () => ({
  imageQualityPrefix: () => "<quality_prefix />",
  imageTechnicalSpecs: () => "<technical_specs />",
  compositionDirectives: () => "<composition_directives />",
  renderingInstructions: () => "<rendering_instructions />",
  ipFidelityRequirements: () => "<ip_fidelity_rules />",
  lightingContext: ({ time }: { time: string }) => `<lighting_context time=\"${time}\" />`,
  weatherEffects: ({ weather }: { weather: string }) => `<weather_effect weather=\"${weather}\" />`,
}));

const createGameState = () =>
  ({
    theme: "fantasy",
    outline: {
      title: "The Hidden Crown",
      worldSetting: {
        visible: {
          description: "Ancient lands",
          rules: "Magic has a price",
        },
        hidden: {
          hiddenRules: "Blood opens gates",
          secrets: "A false king sits the throne",
        },
      },
    },
    atmosphere: {
      weather: "rain",
      ambience: "mystical",
    },
    customRules: [
      {
        id: "rule-1",
        title: "Watercolor",
        content: "Use watercolor brushwork",
        category: "imageStyle",
        priority: 1,
        enabled: true,
      },
    ],
    npcs: [
      {
        id: "char:npc_alice",
        visible: {
          name: "Alice",
          description: "A wary scout",
          appearance: "Short red cloak and leather armor",
          status: "Watchful",
        },
        hidden: {
          realPersonality: "Secretive",
          status: "Injured",
        },
        notes: "Keep scar above right brow consistent.",
      },
    ],
    locations: [
      {
        id: "loc:1",
        name: "Moonlit Forest",
        visible: {
          environment: "Forest",
          description: "Tall black pines and silver mist",
          atmosphere: "Unsettling calm",
          sensory: {
            smell: "Wet pine",
            sound: "Soft wind",
            lighting: "Moon shafts",
            temperature: "Cold",
          },
          knownFeatures: ["Standing stones"],
          interactables: ["Ancient altar"],
          resources: ["Moon herbs"],
        },
        notes: "Fog should stay low to the ground.",
      },
    ],
    currentLocation: "loc:1",
    character: {
      name: "Rin",
      race: "Elf",
      profession: "Ranger",
      appearance: "Lean with silver braids",
      status: "Alert",
    },
    time: "dusk",
  }) as any;

describe("getSceneImagePrompt", () => {
  it("returns minimal fallback XML when game state is missing", () => {
    const result = getSceneImagePrompt("A lone knight in the fog");

    expect(result).toContain("<scene>");
    expect(result).toContain("A lone knight in the fog");
    expect(result).toContain("<quality_prefix />");
  });

  it("injects theme style reference and world context", () => {
    const gameState = createGameState();

    const result = getSceneImagePrompt("Alice watches the hero from afar", gameState);

    expect(result).toContain("<style_reference>");
    expect(result).toContain("STYLE_REFERENCE");
    expect(result).toContain("<story_background>");
    expect(result).toContain("<ip_fidelity_rules />");
    expect(result).toContain("<technical_specs />");
  });

  it("enriches prompt with location sensory details and protagonist block", () => {
    const gameState = createGameState();

    const result = getSceneImagePrompt("Rin enters the Moonlit Forest", gameState);

    expect(result).toContain("<environment>");
    expect(result).toContain("<sensory_details>");
    expect(result).toContain("Wet pine");
    expect(result).toContain("<protagonist>");
    expect(result).toContain("<name>Rin</name>");
    expect(result).toContain("<lighting_context time=\"dusk\" />");
    expect(result).toContain("<weather_effect weather=\"rain\" />");
  });

  it("includes only NPCs mentioned in scene prompt", () => {
    const gameState = createGameState();

    const result = getSceneImagePrompt(
      "Alice steps into view while the hero draws a blade",
      gameState,
    );

    expect(result).toContain("<npcs_in_scene>");
    expect(result).toContain("<name>Alice</name>");
    expect(result).toContain("Short red cloak and leather armor");
  });

  it("skips weather effects when weather is none", () => {
    const gameState = createGameState();
    gameState.atmosphere.weather = "none";

    const result = getSceneImagePrompt("Silent ruins at night", gameState);

    expect(result).not.toContain("<weather_effect");
    expect(result).toContain("<custom_style_requirements>");
    expect(result).toContain("Use watercolor brushwork");
  });
});
