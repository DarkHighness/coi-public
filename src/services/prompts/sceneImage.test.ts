import { describe, expect, it, vi } from "vitest";
import { getSceneImagePrompt } from "./sceneImage";

vi.mock("../themeRegistry", () => ({
  getThemeStyle: (key: string) =>
    key === "fantasy" ? "STYLE_REFERENCE" : null,
  getLoadedThemes: () => ["lord_of_rings", "fantasy"],
}));

vi.mock("./rulesInjector", () => ({
  formatImageStyleRules: () =>
    "**Style Requirements:**\nUse watercolor brushwork",
}));

vi.mock("./atoms/image", () => ({
  imageQualityPrefix: () => "quality-prefix-mock",
  imageTechnicalSpecs: () => "technical-specs-mock",
  compositionDirectives: () => "composition-mock",
  renderingInstructions: () => "rendering-mock",
  ipFidelityRequirements: () => "ip-fidelity-mock",
  lightingContext: ({ time }: { time: string }) =>
    `Time: ${time}. Lighting details.`,
  weatherEffects: ({ weather }: { weather: string }) =>
    `Weather: ${weather} effects.`,
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
          title: "Scout Captain",
          age: "27",
          gender: "Female",
          race: "Human",
          profession: "Scout",
          description: "A wary scout",
          appearance: "Short red cloak and leather armor",
          status: "Watchful",
          voice: "Low and steady",
          mannerism: "Keeps one hand on dagger hilt",
          mood: "Tense",
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
      title: "Pathfinder",
      age: "24",
      gender: "Female",
      race: "Elf",
      profession: "Ranger",
      background: "Former border patrol tracker",
      appearance: "Lean with silver braids",
      status: "Alert",
    },
    time: "dusk",
  }) as any;

describe("getSceneImagePrompt", () => {
  it("returns minimal fallback when game state is missing", () => {
    const result = getSceneImagePrompt("A lone knight in the fog");

    expect(result).toContain("A lone knight in the fog");
    expect(result).toContain("quality-prefix-mock");
  });

  it("injects theme style reference and IP fidelity", () => {
    const gameState = createGameState();

    const result = getSceneImagePrompt(
      "Alice watches the hero from afar",
      gameState,
    );

    expect(result).toContain("Style reference:");
    expect(result).toContain("STYLE_REFERENCE");
    expect(result).toContain("ip-fidelity-mock");
    expect(result).toContain("technical-specs-mock");
  });

  it("enriches prompt with location details and protagonist", () => {
    const gameState = createGameState();

    const result = getSceneImagePrompt(
      "Rin enters the Moonlit Forest",
      gameState,
    );

    expect(result).toContain("Setting: Moonlit Forest");
    expect(result).toContain("Wet pine");
    expect(result).toContain("[PROTAGONIST");
    expect(result).toContain("Rin");
    expect(result).toContain("Elf");
    expect(result).toContain("Female");
    expect(result).toContain("Time: dusk. Lighting details.");
    expect(result).toContain("Weather: rain effects.");
  });

  it("includes only NPCs mentioned in scene prompt", () => {
    const gameState = createGameState();

    const result = getSceneImagePrompt(
      "Alice steps into view while the hero draws a blade",
      gameState,
    );

    expect(result).toContain("[NPCs");
    expect(result).toContain("Alice");
    expect(result).toContain("Human");
    expect(result).toContain("Female");
    expect(result).toContain("Short red cloak and leather armor");
  });

  it("skips weather effects when weather is none", () => {
    const gameState = createGameState();
    gameState.atmosphere.weather = "none";

    const result = getSceneImagePrompt("Silent ruins at night", gameState);

    expect(result).not.toContain("Weather:");
    expect(result).toContain("Use watercolor brushwork");
  });
});
