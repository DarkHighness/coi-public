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
      {
        profile: {
          id: "npc:new",
          kind: "npc",
          knownBy: ["char:player"],
          currentLocation: "loc:test",
          visible: { name: "New NPC" },
          relations: [],
        },
        skills: [],
        conditions: [],
        traits: [],
        inventory: [],
      },
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
      applySectionEdit(session, "npcs", [{ name: "Legacy NPC" }] as any),
    ).toThrow("NPC entries must use actor bundle shape");

    expect(() =>
      applySectionEdit(
        session,
        "npcs",
        [
          {
            profile: {
              kind: "npc",
              knownBy: ["char:player"],
              currentLocation: "loc:test",
              visible: { name: "Missing ID" },
              relations: [],
            },
          },
        ] as any,
      ),
    ).toThrow("Missing profile.id for npc entry.");
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

  it("sanitizes world section payloads before canonical writes", () => {
    const session = new VfsSession();

    applySectionEdit(session, "locations", [
      {
        id: "loc:1",
        name: "Gate",
        visible: { description: "Gate", knownFeatures: [] },
        hidden: { fullDescription: "Hidden gate" },
        unlocked: true,
        unlockReason: "view-only",
        isVisited: true,
        visitedCount: 2,
        highlight: true,
        lastAccess: { forkId: 0, turnNumber: 1, timestamp: 1 },
      },
    ] as any);

    const canonical = JSON.parse(
      session.readFile("world/locations/loc:1.json")?.content ?? "{}",
    ) as Record<string, unknown>;
    expect(canonical.unlocked).toBeUndefined();
    expect(canonical.unlockReason).toBeUndefined();
    expect(canonical.isVisited).toBeUndefined();
    expect(canonical.visitedCount).toBeUndefined();
    expect(canonical.highlight).toBeUndefined();
    expect(canonical.lastAccess).toBeUndefined();
  });

  it("sanitizes outline world collections on outline section edits", () => {
    const session = new VfsSession();

    applySectionEdit(
      session,
      "outline",
      {
        title: "Outline",
        worldSettingUnlocked: true,
        worldSettingUnlockReason: "view-only",
        locations: [
          {
            id: "loc:1",
            name: "Gate",
            visible: { description: "Gate", knownFeatures: [] },
            hidden: { fullDescription: "Hidden gate" },
            unlocked: true,
            unlockReason: "view-only",
            isVisited: true,
            visitedCount: 3,
            highlight: true,
            lastAccess: { forkId: 0, turnNumber: 1, timestamp: 1 },
          },
        ],
      },
      { allowOutlineEdit: true },
    );

    const outline = JSON.parse(
      session.readFile("outline/outline.json")?.content ?? "{}",
    ) as Record<string, unknown>;
    expect(outline.worldSettingUnlocked).toBeUndefined();
    expect(outline.worldSettingUnlockReason).toBeUndefined();

    const locations = Array.isArray(outline.locations)
      ? (outline.locations as Array<Record<string, unknown>>)
      : [];
    expect(locations).toHaveLength(1);
    expect(locations[0]?.unlocked).toBeUndefined();
    expect(locations[0]?.unlockReason).toBeUndefined();
    expect(locations[0]?.isVisited).toBeUndefined();
    expect(locations[0]?.visitedCount).toBeUndefined();
    expect(locations[0]?.highlight).toBeUndefined();
    expect(locations[0]?.lastAccess).toBeUndefined();
  });
});
