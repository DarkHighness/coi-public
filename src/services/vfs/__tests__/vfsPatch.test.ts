import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";

const npcJson = JSON.stringify({
  id: "npc:1",
  currentLocation: "loc:1",
  visible: {
    name: "A",
    description: "x",
    npcType: "Friend",
    affinity: 50,
  },
  hidden: {
    realPersonality: "y",
    realMotives: "z",
    npcType: "Tool",
    impression: "neutral",
    status: "idle",
  },
});

describe("VfsSession patch", () => {
  it("applies JSON Patch and validates", () => {
    const session = new VfsSession();
    session.writeFile("world/npcs/npc:1.json", npcJson, "application/json");

    session.applyJsonPatch("world/npcs/npc:1.json", [
      { op: "replace", path: "/visible/name", value: "B" },
    ]);

    const updated = JSON.parse(
      session.readFile("world/npcs/npc:1.json")!.content,
    );
    expect(updated.visible.name).toBe("B");
  });

  it("rejects unknown keys under strict validation", () => {
    const session = new VfsSession();
    session.writeFile("world/npcs/npc:1.json", npcJson, "application/json");

    expect(() =>
      session.applyJsonPatch("world/npcs/npc:1.json", [
        { op: "add", path: "/unknownKey", value: "nope" },
      ]),
    ).toThrow();
  });
});
