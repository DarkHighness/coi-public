import { describe, expect, it } from "vitest";
import { initializeVisualLoop } from "./visualInitializer";

describe("visualInitializer", () => {
  it("is currently a no-op initializer", () => {
    expect(
      initializeVisualLoop(
        { theme: "fantasy", atmosphere: {}, npcs: [] } as any,
        { id: 1, text: "scene" } as any,
      ),
    ).toBeUndefined();
  });
});
