import { describe, it, expect } from "vitest";
import {
  actorProfileSchema,
  strictPlayerProfileSchema,
  inventoryItemSchema,
  knowledgeEntrySchema,
  skillSchema,
  conditionSchema,
  hiddenTraitSchema,
} from "../../zodSchemas";
import { getSchemaForPath } from "../schemas";

describe("vfs schemas", () => {
  it("matches actor profile paths to actor profile schema", () => {
    const schema = getSchemaForPath("world/characters/char:npc_1/profile.json");
    expect(schema).toBe(actorProfileSchema);
  });

  it("normalizes actor profile paths before matching", () => {
    const schema = getSchemaForPath(
      "/world/characters//char:npc_1//profile.json",
    );
    expect(schema).toBe(actorProfileSchema);
  });

  it("matches player profile path to strict player schema", () => {
    const schema = getSchemaForPath(
      "world/characters/char:player/profile.json",
    );
    expect(schema).toBe(strictPlayerProfileSchema);
  });

  it("rejects player profile when required visible fields are missing", () => {
    const schema = getSchemaForPath(
      "world/characters/char:player/profile.json",
    );
    expect(() =>
      schema.parse({
        id: "char:player",
        kind: "player",
        currentLocation: "loc:start",
        knownBy: ["char:player"],
        visible: {
          name: "Arin",
          age: "21",
          profession: "Scout",
          background: "Raised in borderlands.",
          race: "Human",
          appearance: "Lean and weathered.",
          status: "Alert",
          attributes: [],
        },
        relations: [],
      }),
    ).toThrow();
  });

  it("rejects player profile placeholders for required fields", () => {
    const schema = getSchemaForPath(
      "world/characters/char:player/profile.json",
    );
    expect(() =>
      schema.parse({
        id: "char:player",
        kind: "player",
        currentLocation: "Unknown",
        knownBy: ["char:player"],
        visible: {
          name: "Arin",
          title: "Wanderer",
          age: "Unknown",
          profession: "Scout",
          background: "Raised in borderlands.",
          race: "未知",
          appearance: "Lean and weathered.",
          status: "Pending",
          attributes: [],
        },
        relations: [],
      }),
    ).toThrow();
  });

  it("matches knowledge paths to knowledge entry schema", () => {
    const schema = getSchemaForPath("world/knowledge/knowledge:1.json");
    expect(schema).toBe(knowledgeEntrySchema);
  });

  it("rejects unknown paths", () => {
    expect(() => getSchemaForPath("world/unknown/foo.json")).toThrow();
  });

  it("matches summary state paths to summary schema", () => {
    const schema = getSchemaForPath("summary/state.json");
    expect(() =>
      schema.parse({ summaries: [], lastSummarizedIndex: 0 }),
    ).not.toThrow();
  });

  it("accepts optional initialPrompt in global schema", () => {
    const schema = getSchemaForPath("world/global.json");
    expect(() =>
      schema.parse({
        time: "t",
        theme: "fantasy",
        currentLocation: "loc:1",
        atmosphere: { envTheme: "fantasy", ambience: "quiet" },
        turnNumber: 0,
        forkId: 0,
        initialPrompt: "Begin.",
      }),
    ).not.toThrow();
  });

  it("accepts save-level presetProfile in global schema", () => {
    const schema = getSchemaForPath("world/global.json");
    expect(() =>
      schema.parse({
        time: "t",
        theme: "fantasy",
        currentLocation: "loc:1",
        atmosphere: { envTheme: "fantasy", ambience: "quiet" },
        turnNumber: 0,
        forkId: 0,
        presetProfile: {
          narrativeStylePreset: "cinematic",
          worldDispositionPreset: "mixed",
          playerMalicePreset: "manipulation",
          playerMaliceIntensity: "heavy",
          locked: true,
        },
      }),
    ).not.toThrow();
  });

  it("matches custom rule pack markdown paths", () => {
    const schema = getSchemaForPath("custom_rules/00-core/RULES.md");
    expect(() =>
      schema.parse(
        [
          "## What This Category Is",
          "Core continuity constraints.",
          "",
          "## When This Category Applies",
          "Whenever continuity conflicts appear.",
          "",
          "## Specific Rules",
          "- Keep timeline causality intact.",
        ].join("\n"),
      ),
    ).not.toThrow();
  });

  it("matches theme_config path to theme config schema", () => {
    const schema = getSchemaForPath("world/theme_config.json");
    expect(() =>
      schema.parse({
        name: "Fantasy",
        narrativeStyle: "",
        worldSetting: "",
        backgroundTemplate: "",
        example: "",
        isRestricted: false,
      }),
    ).not.toThrow();
  });

  it("matches character skill paths to skill schema", () => {
    const schema = getSchemaForPath(
      "world/characters/char:player/skills/skill:1.json",
    );
    expect(schema).toBe(skillSchema);
  });

  it("matches character condition paths to condition schema", () => {
    const schema = getSchemaForPath(
      "world/characters/char:player/conditions/condition:1.json",
    );
    expect(schema).toBe(conditionSchema);
  });

  it("matches character trait paths to hidden trait schema", () => {
    const schema = getSchemaForPath(
      "world/characters/char:player/traits/trait:1.json",
    );
    expect(schema).toBe(hiddenTraitSchema);
  });

  it("matches character inventory item paths to inventory item schema", () => {
    const schema = getSchemaForPath(
      "world/characters/char:player/inventory/inv:1.json",
    );
    expect(schema).toBe(inventoryItemSchema);
  });

  it("matches location dropped item paths to inventory item schema", () => {
    const schema = getSchemaForPath("world/locations/loc:1/items/inv:1.json");
    expect(schema).toBe(inventoryItemSchema);
  });

  it("rejects legacy world/character.json paths", () => {
    expect(() => getSchemaForPath("world/character.json")).toThrow();
  });

  it("rejects legacy world/npcs paths", () => {
    expect(() => getSchemaForPath("world/npcs/npc:1.json")).toThrow();
  });

  it("rejects legacy world/inventory paths", () => {
    expect(() => getSchemaForPath("world/inventory/inv:1.json")).toThrow();
  });

  it("rejects legacy world/character/* paths", () => {
    expect(() => getSchemaForPath("world/character/profile.json")).toThrow();
  });
});
