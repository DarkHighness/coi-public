import { describe, it, expect } from "vitest";
import { npcSchema, knowledgeEntrySchema } from "../../zodSchemas";
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
});
