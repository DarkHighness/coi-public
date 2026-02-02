import { describe, it, expect } from "vitest";
import { isCriticalAppError } from "../appErrorClassifier";

describe("isCriticalAppError", () => {
  it("treats chunk/module load failures as critical", () => {
    expect(isCriticalAppError("ChunkLoadError: Loading chunk 123 failed.")).toBe(
      true,
    );
    expect(
      isCriticalAppError("Importing a module script failed."),
    ).toBe(true);
  });

  it("does not treat network fetch failures as critical", () => {
    expect(isCriticalAppError("Failed to fetch")).toBe(false);
  });

  it("treats quota exceeded errors as critical", () => {
    expect(isCriticalAppError("QuotaExceededError")).toBe(true);
  });
});
