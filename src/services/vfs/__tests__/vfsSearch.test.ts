import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";

describe("Vfs search", () => {
  it("finds text matches", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      '{"time":"Day 1"}',
      "application/json",
    );
    const results = session.searchText("Day 1");
    expect(results.length).toBe(1);
  });

  it("supports grep with regex", () => {
    const session = new VfsSession();
    session.writeFile("world/global.json", "Day 1\nNight", "text/plain");
    const results = session.grep(/Day\s+1/);
    expect(results[0]?.text).toBe("Day 1");
  });

  it("returns no results when limit is zero", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      '{"time":"Day 1"}',
      "application/json",
    );
    const results = session.searchText("Day 1", { limit: 0 });
    expect(results).toHaveLength(0);
  });

  it("prefers semantic results when available", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      '{"time":"Day 1"}',
      "application/json",
    );
    session.setSemanticIndexer(() => [
      { path: "semantic.json", line: 1, text: "semantic-hit" },
    ]);

    const results = session.searchText("Day 1", { semantic: true });
    expect(results[0]?.path).toBe("semantic.json");
  });

  it("falls back to text when semantic returns nothing", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      '{"time":"Day 1"}',
      "application/json",
    );
    session.setSemanticIndexer(() => []);

    const results = session.searchText("Day 1", { semantic: true });
    expect(results[0]?.path).toBe("world/global.json");
  });
});
