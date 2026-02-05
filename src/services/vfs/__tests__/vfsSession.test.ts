import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";

describe("VfsSession", () => {
  it("writes and reads files", () => {
    const session = new VfsSession();
    session.writeFile("world/global.json", "{}", "application/json");
    expect(session.readFile("world/global.json")?.content).toBe("{}");
  });

  it("lists directories", () => {
    const session = new VfsSession();
    session.writeFile("world/npcs/npc:1.json", "{}", "application/json");
    expect(session.list("world/npcs")).toContain("npc:1.json");
  });

  it("lists root entries for empty or slash paths", () => {
    const session = new VfsSession();
    session.writeFile("world/npcs/npc:1.json", "{}", "application/json");
    session.writeFile("world/global.json", "{}", "application/json");
    session.writeFile("local/notes.txt", "hi", "text/plain");
    session.writeFile("root.txt", "root", "text/plain");

    const listEmpty = session.list("");
    const listSlash = session.list("/");

    expect(listEmpty).toEqual(
      expect.arrayContaining(["world", "local", "root.txt", "skills"]),
    );
    expect(listSlash).toEqual(
      expect.arrayContaining(["world", "local", "root.txt", "skills"]),
    );
    expect(new Set(listEmpty).size).toBe(listEmpty.length);
  });

  it("readFile returns a clone and normalizes paths", () => {
    const session = new VfsSession();
    session.writeFile("world/global.json", "{}", "application/json");

    const first = session.readFile("/world//global.json");
    expect(first).not.toBeNull();
    expect(first?.path).toBe("world/global.json");

    if (!first) {
      throw new Error("Expected file to exist");
    }

    first.content = "mutated";
    first.path = "mutated.json";

    const second = session.readFile("world/global.json");
    expect(second).not.toBeNull();
    expect(second?.content).toBe("{}");
    expect(second?.path).toBe("world/global.json");
    expect(second).not.toBe(first);
  });

  it("treats rename to same path as no-op", () => {
    const session = new VfsSession();
    session.writeFile("world/global.json", "{}", "application/json");

    session.renameFile("world/global.json", "world/global.json");

    expect(session.readFile("world/global.json")?.content).toBe("{}");
  });

  it("throws when renaming a missing file even if paths match", () => {
    const session = new VfsSession();
    expect(() =>
      session.renameFile("world/missing.json", "world/missing.json"),
    ).toThrow();
  });

  it("exposes global read-only skills files", () => {
    const session = new VfsSession();
    expect(session.readFile("skills/README.md")?.contentType).toBe("text/plain");
    const indexContent = session.readFile("skills/index.json")?.content ?? "";
    const indexJson = JSON.parse(indexContent) as { skills?: Array<{ id?: string }> };
    const ids = new Set((indexJson.skills ?? []).map((s) => s.id).filter(Boolean));
    expect(ids.has("core-identity")).toBe(true);
    expect(ids.has("gm-knowledge")).toBe(true);
    expect(ids.has("gm-state-management")).toBe(true);
    expect(ids.has("craft-writing")).toBe(true);
    expect(ids.has("npc-logic")).toBe(true);
    expect(ids.has("conditional-nsfw")).toBe(true);
    expect(ids.has("theme-cyberpunk")).toBe(true);
    expect(ids.has("theme-era-modern")).toBe(true);
    expect(ids.has("theme-era-ancient")).toBe(true);
    expect(ids.has("theme-era-feudal")).toBe(true);
    expect(ids.has("theme-era-republican")).toBe(true);
    expect(ids.has("theme-trade-mercantilism")).toBe(true);
    expect(ids.has("theme-element-urban")).toBe(true);
    expect(ids.has("worldbuilding-magic-system")).toBe(true);
    expect(ids.has("worldbuilding-economy")).toBe(true);
    expect(ids.has("worldbuilding-law-jurisdiction")).toBe(true);
    expect(ids.has("worldbuilding-travel")).toBe(true);
    expect(ids.has("worldbuilding-culture-ritual")).toBe(true);
    expect(ids.has("worldbuilding-infrastructure")).toBe(true);
    expect(ids.has("worldbuilding-history-residue")).toBe(true);
    expect(ids.has("worldbuilding-religion")).toBe(true);
    expect(ids.has("worldbuilding-institutions")).toBe(true);
    expect(ids.has("worldbuilding-technology")).toBe(true);
    expect(ids.has("worldbuilding-ecology")).toBe(true);
    expect(ids.has("worldbuilding-war-logistics")).toBe(true);
    expect(ids.has("worldbuilding-governance-politics")).toBe(true);
    expect(ids.has("worldbuilding-class-status")).toBe(true);
    expect(ids.has("worldbuilding-crime-underworld")).toBe(true);
    expect(ids.has("worldbuilding-knowledge-education")).toBe(true);
    expect(ids.has("worldbuilding-disasters-recovery")).toBe(true);
    expect(ids.has("worldbuilding-locations")).toBe(true);
    expect(ids.has("worldbuilding-factions")).toBe(true);
    expect(session.list("skills")).toEqual(
      expect.arrayContaining([
        "README.md",
        "index.json",
        "STYLE.md",
        "TAXONOMY.md",
        "core",
        "gm",
        "worldbuilding",
        "craft",
        "npc",
        "conditional",
        "theme",
      ]),
    );

    expect(session.list("skills/gm/state-management")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/craft/writing")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/theme/cyberpunk")).toEqual(
      expect.arrayContaining(["SKILL.md"]),
    );
    expect(session.list("skills/theme/era-modern")).toEqual(
      expect.arrayContaining(["SKILL.md"]),
    );
    expect(session.list("skills/theme/trade-mercantilism")).toEqual(
      expect.arrayContaining(["SKILL.md"]),
    );
    expect(session.list("skills/theme/element-urban")).toEqual(
      expect.arrayContaining(["SKILL.md"]),
    );

    expect(session.list("skills/worldbuilding/magic-system")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/economy")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/law-jurisdiction")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/travel")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/culture-ritual")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/infrastructure")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/history-residue")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/religion")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/institutions")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/technology")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/ecology")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/war-logistics")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/governance-politics")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/class-status")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/crime-underworld")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/knowledge-education")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/disasters-recovery")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/locations")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/worldbuilding/factions")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
  });

  it("treats skills/** as read-only and does not persist it in snapshots", () => {
    const session = new VfsSession();

    expect(() =>
      session.writeFile("skills/custom.txt", "nope", "text/plain"),
    ).toThrow(/read-only/i);
    expect(() => session.renameFile("skills/README.md", "skills/x.txt")).toThrow(
      /read-only/i,
    );
    expect(() => session.deleteFile("skills/README.md")).toThrow(/read-only/i);

    const snapshot = session.snapshot();
    expect(snapshot["skills/README.md"]).toBeUndefined();
    expect(Object.keys(snapshot).some((p) => p.startsWith("skills/"))).toBe(false);
  });

  it("drops skills/** entries when restoring snapshots", () => {
    const session = new VfsSession();
    session.restore({
      "skills/evil.txt": {
        path: "skills/evil.txt",
        content: "evil",
        contentType: "text/plain",
        hash: "deadbeef",
        size: 4,
        updatedAt: 0,
      },
      "world/global.json": {
        path: "world/global.json",
        content: "{}",
        contentType: "application/json",
        hash: "0",
        size: 2,
        updatedAt: 0,
      },
    });

    expect(session.readFile("skills/evil.txt")).toBeNull();
    expect(session.readFile("world/global.json")).toBeTruthy();
  });
});
