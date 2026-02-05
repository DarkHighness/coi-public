import { describe, it, expect } from "vitest";
import { buildEntityNotesPath, buildGlobalNotesPath } from "../notes";

describe("vfs notes paths", () => {
  it("builds global notes path", () => {
    expect(buildGlobalNotesPath()).toBe("world/notes.md");
  });

  it("maps canonical entity json to <id>/notes.md", () => {
    expect(buildEntityNotesPath("world/quests/quest:1.json")).toBe(
      "world/quests/quest:1/notes.md",
    );
    expect(
      buildEntityNotesPath("world/characters/char:player/skills/skill:1.json"),
    ).toBe("world/characters/char:player/skills/skill:1/notes.md");
  });

  it("special-cases actor profile.json to character notes.md", () => {
    expect(buildEntityNotesPath("world/characters/char:player/profile.json")).toBe(
      "world/characters/char:player/notes.md",
    );
  });

  it("accepts current/ prefixed paths", () => {
    expect(buildEntityNotesPath("current/world/quests/quest:1.json")).toBe(
      "world/quests/quest:1/notes.md",
    );
  });
});

