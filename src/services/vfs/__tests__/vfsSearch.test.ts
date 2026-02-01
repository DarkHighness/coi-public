import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";

describe("Vfs search", () => {
  it("finds text matches", () => {
    const session = new VfsSession();
    session.writeFile("world/global.json", "{\"time\":\"Day 1\"}", "application/json");
    const results = session.searchText("Day 1");
    expect(results.length).toBe(1);
  });
});
