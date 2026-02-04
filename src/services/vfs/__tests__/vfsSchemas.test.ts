import { describe, it, expect } from "vitest";
import {
  npcSchema,
  knowledgeEntrySchema,
  characterProfileSchema,
  skillSchema,
  conditionSchema,
  hiddenTraitSchema,
} from "../../zodSchemas";
import { getSchemaForPath } from "../schemas";

describe("vfs schemas", () => {
  it("matches npc paths to npc schema", () => {
    const schema = getSchemaForPath("world/npcs/npc:1.json");
    expect(schema).toBe(npcSchema);
  });

  it("normalizes npc paths before matching", () => {
    const schema = getSchemaForPath("/world/npcs//npc:1.json");
    expect(schema).toBe(npcSchema);
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

  it("matches character profile paths to character profile schema", () => {
    const schema = getSchemaForPath("world/character/profile.json");
    expect(schema).toBe(characterProfileSchema);
  });

  it("matches character skill paths to skill schema", () => {
    const schema = getSchemaForPath("world/character/skills/skill:1.json");
    expect(schema).toBe(skillSchema);
  });

  it("matches character condition paths to condition schema", () => {
    const schema = getSchemaForPath("world/character/conditions/condition:1.json");
    expect(schema).toBe(conditionSchema);
  });

  it("matches character trait paths to hidden trait schema", () => {
    const schema = getSchemaForPath("world/character/traits/trait:1.json");
    expect(schema).toBe(hiddenTraitSchema);
  });

  it("rejects legacy world/character.json paths", () => {
    expect(() => getSchemaForPath("world/character.json")).toThrow();
  });
});
