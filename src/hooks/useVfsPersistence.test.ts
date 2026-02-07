import { describe, expect, it } from "vitest";
import {
  deriveSlotNameFromState,
  shouldReplaceGeneratedSlotName,
} from "./useVfsPersistence";

describe("useVfsPersistence slot naming", () => {
  it("replaces generated save names", () => {
    expect(shouldReplaceGeneratedSlotName("Save 1")).toBe(true);
    expect(shouldReplaceGeneratedSlotName("save 22")).toBe(true);
    expect(shouldReplaceGeneratedSlotName("Save")).toBe(true);
  });

  it("keeps custom names", () => {
    expect(shouldReplaceGeneratedSlotName("My custom run")).toBe(false);
    expect(shouldReplaceGeneratedSlotName("Chapter One")).toBe(false);
  });

  it("prefers outline title for slot name", () => {
    const name = deriveSlotNameFromState({
      outline: { title: "Moonlit Harbor" } as any,
      currentLocation: "Dock",
    });
    expect(name).toBe("Moonlit Harbor");
  });

  it("falls back to location when outline title missing", () => {
    const name = deriveSlotNameFromState({
      outline: { title: "" } as any,
      currentLocation: "Crimson Alley",
    });
    expect(name).toBe("Crimson Alley");
  });
});
