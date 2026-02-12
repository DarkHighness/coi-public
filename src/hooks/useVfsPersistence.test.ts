import { describe, expect, it } from "vitest";
import {
  deriveSlotNameFromState,
  isPlaceholderSlotName,
  normalizeSlotName,
  shouldReplaceGeneratedSlotName,
} from "./useVfsPersistence";

describe("useVfsPersistence slot naming", () => {
  it("normalizes slot name input", () => {
    expect(normalizeSlotName("  Moon Harbor  ")).toBe("Moon Harbor");
    expect(normalizeSlotName("    ")).toBeNull();
    expect(normalizeSlotName(undefined)).toBeNull();
    expect(normalizeSlotName(123)).toBeNull();
  });

  it("replaces generated save names", () => {
    expect(shouldReplaceGeneratedSlotName("Save 1")).toBe(true);
    expect(shouldReplaceGeneratedSlotName("save 22")).toBe(true);
    expect(shouldReplaceGeneratedSlotName("Save")).toBe(true);
    expect(shouldReplaceGeneratedSlotName("unknown")).toBe(true);
    expect(shouldReplaceGeneratedSlotName("Unknown")).toBe(true);
    expect(shouldReplaceGeneratedSlotName("未知")).toBe(true);
    expect(shouldReplaceGeneratedSlotName("")).toBe(true);
    expect(shouldReplaceGeneratedSlotName(undefined)).toBe(true);
  });

  it("keeps custom names", () => {
    expect(shouldReplaceGeneratedSlotName("My custom run")).toBe(false);
    expect(shouldReplaceGeneratedSlotName("Chapter One")).toBe(false);
    expect(shouldReplaceGeneratedSlotName("SAVEPOINT")).toBe(false);
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

  it("skips placeholder outline title and uses location", () => {
    const name = deriveSlotNameFromState({
      outline: { title: "unknown" } as any,
      currentLocation: "Moon Harbor",
    });
    expect(name).toBe("Moon Harbor");
  });

  it("returns null when neither outline title nor location is available", () => {
    expect(
      deriveSlotNameFromState({
        outline: { title: "   " } as any,
        currentLocation: "",
      }),
    ).toBeNull();
    expect(
      deriveSlotNameFromState({
        outline: { title: "Unknown" } as any,
        currentLocation: "未知",
      }),
    ).toBeNull();

    expect(deriveSlotNameFromState(null)).toBeNull();
    expect(deriveSlotNameFromState(undefined)).toBeNull();
  });

  it("detects placeholder slot names", () => {
    expect(isPlaceholderSlotName("unknown")).toBe(true);
    expect(isPlaceholderSlotName("未知")).toBe(true);
    expect(isPlaceholderSlotName("untitled")).toBe(true);
    expect(isPlaceholderSlotName("Moon Harbor")).toBe(false);
  });
});
