import { describe, it, expect } from "vitest";
import { stripCurrentPath, toCurrentPath } from "../currentAlias";

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

  it("rejects non-current paths", () => {
    expect(() => stripCurrentPath("world/global.json")).toThrow();
  });
});
