import { describe, it, expect } from "vitest";
import {
  actorProfileSchema,
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
    const schema = getSchemaForPath("/world/characters//char:npc_1//profile.json");
    expect(schema).toBe(actorProfileSchema);
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

  it("matches character skill paths to skill schema", () => {
    const schema = getSchemaForPath("world/characters/char:player/skills/skill:1.json");
    expect(schema).toBe(skillSchema);
  });

  it("matches character condition paths to condition schema", () => {
    const schema = getSchemaForPath(
      "world/characters/char:player/conditions/condition:1.json",
    );
    expect(schema).toBe(conditionSchema);
  });

  it("matches character trait paths to hidden trait schema", () => {
    const schema = getSchemaForPath("world/characters/char:player/traits/trait:1.json");
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
