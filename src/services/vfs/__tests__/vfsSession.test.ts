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

    // Keep this test resilient to library evolution: assert a few stable,
    // representative skill IDs across domains (core/gm/craft/theme).
    expect(ids.has("core-identity")).toBe(true);
    expect(ids.has("gm-core-rules")).toBe(true);
    expect(ids.has("craft-dialogue")).toBe(true);
    expect(ids.has("theme-fantasy")).toBe(true);
    expect(ids.has("theme-cyberpunk")).toBe(true);

    expect(session.list("skills")).toEqual(
      expect.arrayContaining([
        "README.md",
        "index.json",
        "STYLE.md",
        "TAXONOMY.md",
        "core",
        "gm",
        "craft",
        "npc",
        "conditional",
        "theme",
      ]),
    );

    // Smoke-check a few representative directories/files.
    expect(session.list("skills/core/identity")).toEqual(
      expect.arrayContaining(["SKILL.md"]),
    );
    expect(session.list("skills/gm/core-rules")).toEqual(
      expect.arrayContaining(["SKILL.md"]),
    );
    expect(session.list("skills/craft/dialogue")).toEqual(
      expect.arrayContaining(["SKILL.md"]),
    );
    expect(session.list("skills/theme/cyberpunk")).toEqual(
      expect.arrayContaining(["SKILL.md"]),
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
