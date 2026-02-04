import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";

const npcJson = JSON.stringify({
  id: "char:npc_1",
  kind: "npc",
  currentLocation: "loc:1",
  knownBy: ["char:player"],
  visible: {
    name: "A",
    description: "x",
  },
  relations: [],
});

describe("VfsSession patch", () => {
  it("applies JSON Patch and validates", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/characters/char:npc_1/profile.json",
      npcJson,
      "application/json",
    );

    session.applyJsonPatch("world/characters/char:npc_1/profile.json", [
      { op: "replace", path: "/visible/name", value: "B" },
    ]);

    const updated = JSON.parse(
      session.readFile("world/characters/char:npc_1/profile.json")!.content,
    );
    expect(updated.visible.name).toBe("B");
  });

  it("rejects unknown keys under strict validation", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/characters/char:npc_1/profile.json",
      npcJson,
      "application/json",
    );

    expect(() =>
      session.applyJsonPatch("world/characters/char:npc_1/profile.json", [
        { op: "add", path: "/unknownKey", value: "nope" },
      ]),
    ).toThrow();
  });

  it("rejects unknown nested keys under strict validation", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/characters/char:npc_1/profile.json",
      npcJson,
      "application/json",
    );

    expect(() =>
      session.applyJsonPatch("world/characters/char:npc_1/profile.json", [
        { op: "add", path: "/visible/extra", value: "nope" },
      ]),
    ).toThrow();
  });

  it("rejects prototype-pollution keys under strict validation", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/characters/char:npc_1/profile.json",
      npcJson,
      "application/json",
    );

    expect(() =>
      session.applyJsonPatch("world/characters/char:npc_1/profile.json", [
        { op: "add", path: "/__proto__", value: { polluted: true } },
      ]),
    ).toThrow();
  });
});
