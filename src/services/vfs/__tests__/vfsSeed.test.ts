import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";
import { seedVfsSessionFromDefaults } from "../seed";

describe("seedVfsSessionFromDefaults", () => {
  it("seeds world + conversation index/turn 0", () => {
    const session = new VfsSession();
    seedVfsSessionFromDefaults(session);

    expect(session.readFile("world/global.json")).toBeTruthy();
    expect(session.readFile("world/notes.md")).toBeTruthy();
    expect(session.readFile("world/soul.md")).toBeTruthy();
    expect(session.readFile("world/global/soul.md")).toBeTruthy();
    expect(session.readFile("conversation/index.json")).toBeTruthy();
    expect(
      session.readFile("conversation/turns/fork-0/turn-0.json"),
    ).toBeTruthy();

    const notes = session.readFile("world/notes.md")?.content ?? "";
    const currentSoul = session.readFile("world/soul.md")?.content ?? "";
    const globalSoul = session.readFile("world/global/soul.md")?.content ?? "";
    const playerProfile = JSON.parse(
      session.readFile("world/characters/char:player/profile.json")?.content ??
        "{}",
    ) as {
      visible?: {
        age?: string;
        profession?: string;
        background?: string;
        race?: string;
      };
    };
    expect(notes).toContain("Story Teller AI");
    expect(currentSoul).toContain("Story Teller AI");
    expect(globalSoul).toContain("Story Teller AI");
    expect(playerProfile.visible?.age).toBe("Unspecified");
    expect(playerProfile.visible?.profession).toBe("Unspecified");
    expect(playerProfile.visible?.background).toBe("Unspecified");
    expect(playerProfile.visible?.race).toBe("Unspecified");
  });

  it("keeps scaffold folders and README markers on repeated seed", () => {
    const session = new VfsSession();

    seedVfsSessionFromDefaults(session);
    const firstCount = Object.keys(session.snapshot()).length;
    seedVfsSessionFromDefaults(session);
    const secondCount = Object.keys(session.snapshot()).length;

    expect(session.readFile("world/characters/README.md")).toBeTruthy();
    expect(session.readFile("world/locations/README.md")).toBeTruthy();
    expect(session.readFile("world/causal_chains/README.md")).toBeTruthy();
    expect(session.readFile("custom_rules/README.md")).toBeTruthy();
    expect(
      session.readFile("custom_rules/00-system-core/README.md"),
    ).toBeTruthy();
    expect(session.readFile("custom_rules/12-custom/README.md")).toBeTruthy();
    expect(session.readFile("custom_rules/00-system-core/RULES.md")).toBeNull();
    expect(secondCount).toBe(firstCount);
  });
});
