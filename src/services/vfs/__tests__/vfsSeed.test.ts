import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";
import { seedVfsSessionFromDefaults } from "../seed";

describe("seedVfsSessionFromDefaults", () => {
  it("seeds world + conversation index/turn 0", () => {
    const session = new VfsSession();
    seedVfsSessionFromDefaults(session);

    expect(session.readFile("world/global.json")).toBeTruthy();
    expect(session.readFile("world/notes.md")).toBeTruthy();
    expect(session.readFile("conversation/index.json")).toBeTruthy();
    expect(
      session.readFile("conversation/turns/fork-0/turn-0.json"),
    ).toBeTruthy();
  });
});
