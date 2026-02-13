import { describe, it, expect } from "vitest";
import { normalizeVfsPath, joinVfsPath, hashContent } from "../utils";

describe("vfs utils", () => {
  it("normalizes paths with leading/trailing slashes", () => {
    expect(normalizeVfsPath("/world/npcs//npc:1.json/")).toBe(
      "world/npcs/npc:1.json",
    );
  });

  it("joins paths safely", () => {
    expect(joinVfsPath("world/npcs", "npc:1.json")).toBe(
      "world/npcs/npc:1.json",
    );
  });

  it("hashes content deterministically", () => {
    expect(hashContent("abc")).toBe(hashContent("abc"));
  });
});
