import { describe, expect, it } from "vitest";
import { getOutlineDefaultReadOnlyAllowPrefixes } from "./readOnlyRoots";

describe("getOutlineDefaultReadOnlyAllowPrefixes", () => {
  it("includes base roots for all outline runs", () => {
    const roots = getOutlineDefaultReadOnlyAllowPrefixes("", false);
    expect(roots).toEqual([
      "skills",
      "refs",
      "outline/phases",
      "shared/narrative/outline/phases",
    ]);
  });

  it("does not derive theme-specific roots from theme key", () => {
    const roots = getOutlineDefaultReadOnlyAllowPrefixes("long_aotian", false);
    expect(roots).not.toContain("skills/theme/long_aotian");
  });
});
