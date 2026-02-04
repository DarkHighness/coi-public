import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";
import { applySectionEdit } from "../editor";

const json = (value: unknown) => JSON.stringify(value);

describe("vfs editor helper", () => {
  it("merges global edits without losing extra fields", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      json({
        time: "Day 1",
        theme: "fantasy",
        currentLocation: "Town",
        atmosphere: { envTheme: "fantasy", ambience: "quiet" },
        turnNumber: 1,
        forkId: 0,
        language: "fr",
      }),
      "application/json",
    );

    applySectionEdit(session, "global", {
      time: "Night 1",
      currentLocation: "Forest",
    });

    const updated = JSON.parse(
      session.readFile("world/global.json")!.content,
    );
    expect(updated.language).toBe("fr");
    expect(updated.time).toBe("Night 1");
    expect(updated.currentLocation).toBe("Forest");
  });

  it("replaces inventory files from list", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/characters/char:player/inventory/old.json",
      json({ id: "old" }),
      "application/json",
    );
    applySectionEdit(session, "inventory", [{ id: "inv_1", name: "Item" }]);
    expect(session.readFile("world/characters/char:player/inventory/old.json")).toBeNull();
    expect(session.readFile("world/characters/char:player/inventory/inv_1.json")).toBeTruthy();
  });

  it("blocks outline edits unless allowed", () => {
    const session = new VfsSession();
    expect(() =>
      applySectionEdit(session, "outline", { title: "New" }),
    ).toThrow();
    applySectionEdit(session, "outline", { title: "New" }, { allowOutlineEdit: true });
    expect(session.readFile("outline/outline.json")).toBeTruthy();
  });
});
