import { describe, it, expect } from "vitest";
import { getSchemaForPath } from "../schemas";

describe("vfs schemas", () => {
  it("matches npc paths to npc schema", () => {
    const schema = getSchemaForPath("world/npcs/npc:1.json");
    expect(schema).toBeDefined();
  });

  it("rejects unknown paths", () => {
    expect(() => getSchemaForPath("world/unknown/foo.json")).toThrow();
  });
});
