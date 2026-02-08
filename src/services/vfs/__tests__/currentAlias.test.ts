import { describe, it, expect } from "vitest";
import { stripCurrentPath, toCanonicalPath, toCurrentPath } from "../currentAlias";

describe("current alias", () => {
  it("prefixes and strips current paths", () => {
    expect(toCurrentPath("world/global.json")).toBe(
      "current/world/global.json",
    );
    expect(stripCurrentPath("current/world/global.json")).toBe(
      "world/global.json",
    );
  });

  it("handles current root", () => {
    expect(toCurrentPath("")).toBe("current");
    expect(stripCurrentPath("current")).toBe("");
  });

  it("accepts canonical paths and projects back to current display", () => {
    expect(stripCurrentPath("shared/system/skills/README.md")).toBe(
      "skills/README.md",
    );
    expect(toCurrentPath("shared/narrative/outline/outline.json")).toBe(
      "current/outline/outline.json",
    );
    expect(toCanonicalPath("current/world/global.json", { activeForkId: 3 })).toBe(
      "forks/3/story/world/global.json",
    );
  });
});
