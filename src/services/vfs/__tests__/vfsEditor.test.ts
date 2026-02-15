import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";
import { applySectionEdit } from "../editor";

const json = (value: unknown) => JSON.stringify(value);

describe("vfs editor helper", () => {
  it("merges global edits without losing extra fields", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      json({
        time: "Day 1",
        theme: "fantasy",
        currentLocation: "Town",
        atmosphere: { envTheme: "fantasy", ambience: "quiet" },
        turnNumber: 1,
        forkId: 0,
        language: "fr",
      }),
      "application/json",
    );

    applySectionEdit(session, "global", {
      time: "Night 1",
      currentLocation: "Forest",
    });

    const updated = JSON.parse(session.readFile("world/global.json")!.content);
    expect(updated.language).toBe("fr");
    expect(updated.time).toBe("Night 1");
    expect(updated.currentLocation).toBe("Forest");
  });

  it("replaces inventory files from list", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/characters/char:player/inventory/old.json",
      json({ id: "old" }),
      "application/json",
    );
    applySectionEdit(session, "inventory", [{ id: "inv_1", name: "Item" }]);
    expect(
      session.readFile("world/characters/char:player/inventory/old.json"),
    ).toBeNull();
    expect(
      session.readFile("world/characters/char:player/inventory/inv_1.json"),
    ).toBeTruthy();
  });

  it("blocks outline edits unless allowed", () => {
    const session = new VfsSession();
    expect(() =>
      applySectionEdit(session, "outline", { title: "New" }),
    ).toThrow();
    applySectionEdit(
      session,
      "outline",
      { title: "New" },
      { allowOutlineEdit: true },
    );
    expect(session.readFile("outline/outline.json")).toBeTruthy();
  });

  it("rebuilds custom_rules with scaffold folders after section replace", () => {
    const session = new VfsSession();
    session.writeFile(
      "custom_rules/legacy-pack/RULES.md",
      "# Legacy",
      "text/markdown",
    );

    applySectionEdit(session, "customRules", []);

    expect(session.readFile("custom_rules/legacy-pack/RULES.md")).toBeNull();
    expect(session.readFile("custom_rules/README.md")).toBeTruthy();
    expect(
      session.readFile("custom_rules/00-system-core/README.md"),
    ).toBeTruthy();
    expect(session.readFile("custom_rules/12-custom/README.md")).toBeTruthy();
    expect(session.readFile("custom_rules/00-system-core/RULES.md")).toBeNull();
  });

  it("writes character section from actor bundle payload", () => {
    const session = new VfsSession();

    applySectionEdit(session, "character", {
      profile: {
        id: "char:player",
        kind: "player",
        currentLocation: "Town",
        visible: {
          name: "Ari",
          title: "Warden",
          status: "Ready",
          attributes: ["Calm"],
        },
        relations: [],
      },
      skills: [{ id: "skill-1", name: "Observe" }],
      conditions: [{ id: "cond-1", name: "Focused" }],
      traits: [{ id: "trait-1", name: "Secretive" }],
    });

    const profile = JSON.parse(
      session.readFile("world/characters/char:player/profile.json")!.content,
    );
    expect(profile.kind).toBe("player");
    expect(profile.currentLocation).toBe("Town");
    expect(profile.visible.name).toBe("Ari");

    expect(
      session.readFile("world/characters/char:player/skills/skill-1.json"),
    ).toBeTruthy();
    expect(
      session.readFile("world/characters/char:player/conditions/cond-1.json"),
    ).toBeTruthy();
    expect(
      session.readFile("world/characters/char:player/traits/trait-1.json"),
    ).toBeTruthy();
  });

  it("rejects legacy character payload shape", () => {
    const session = new VfsSession();

    expect(() =>
      applySectionEdit(session, "character", {
        name: "Legacy Player",
        currentLocation: "Town",
        hiddenTraits: [{ id: "trait-1", name: "Secretive" }],
      }),
    ).toThrow("Character edits must use actor bundle shape");
  });

  it("replaces npc bundles while preserving player actor and validates npc ids", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/characters/char:player/profile.json",
      json({ id: "char:player", kind: "player" }),
      "application/json",
    );
    session.writeFile(
      "world/characters/npc:old/profile.json",
      json({ id: "npc:old", kind: "npc" }),
      "application/json",
    );

    applySectionEdit(session, "npcs", [
      { id: "npc:new", name: "New NPC", knownBy: ["char:player"] },
    ]);

    expect(
      session.readFile("world/characters/npc:old/profile.json"),
    ).toBeNull();
    expect(
      session.readFile("world/characters/npc:new/profile.json"),
    ).toBeTruthy();
    expect(
      session.readFile("world/characters/char:player/profile.json"),
    ).toBeTruthy();

    expect(() =>
      applySectionEdit(session, "npcs", [{ name: "Missing ID" }] as any),
    ).toThrow("Missing id for npc entry.");
  });

  it("validates section payload shape and required ids", () => {
    const session = new VfsSession();

    expect(() => applySectionEdit(session, "locations", {} as any)).toThrow(
      'Section "locations" expects an array.',
    );
    expect(() =>
      applySectionEdit(session, "causalChains", [{ id: "wrong" }] as any),
    ).toThrow("Missing chainId for causalChains entry.");
    expect(() =>
      applySectionEdit(session, "customRules", [
        { title: "Missing ID" },
      ] as any),
    ).toThrow("Missing id for custom rule entry.");
  });
});
