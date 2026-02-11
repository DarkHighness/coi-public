import { describe, expect, it } from "vitest";
import { VfsSession } from "@/services/vfs/vfsSession";
import {
  buildWorldFoundation,
  buildProtagonist,
  buildGodModeContext,
} from "../worldContext";

describe("worldContext", () => {
  it("builds world foundation from outline file", () => {
    const session = new VfsSession();
    session.writeFile(
      "outline/outline.json",
      JSON.stringify({ title: "Demo", premise: "test" }),
      "application/json",
    );

    const value = buildWorldFoundation(session);

    expect(value).toContain("<world_foundation");
    expect(value).toContain("outline/outline.json");
    expect(value).toContain('"title":"Demo"');
  });

  it("builds protagonist block only when profile exists", () => {
    const withProfile = new VfsSession();
    withProfile.writeFile(
      "world/characters/char:player/profile.json",
      JSON.stringify({ name: "Hero" }),
      "application/json",
    );

    const withValue = buildProtagonist(withProfile);
    expect(withValue).toContain("<protagonist_profile");
    expect(withValue).toContain('"name":"Hero"');

    const withoutProfile = new VfsSession();
    const emptyValue = buildProtagonist(withoutProfile);
    expect(emptyValue).toBe("");
  });

  it("builds god mode context from global file", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      JSON.stringify({ turnNumber: 3, forkId: 1 }),
      "application/json",
    );

    const value = buildGodModeContext(session);

    expect(value).toContain("GOD MODE ACTIVE");
    expect(value).toContain("<global_state");
    expect(value).toContain('"turnNumber":3');
  });
});
