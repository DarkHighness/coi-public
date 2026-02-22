import { describe, expect, it } from "vitest";
import {
  DEFAULT_FONT_SCALE_LEVEL,
  FONT_SCALE_BY_LEVEL,
  normalizeFontScaleLevel,
  resolveFontScale,
} from "./fontScale";

describe("fontScale", () => {
  it("maps levels 1-5 to expected scale ratios", () => {
    expect(FONT_SCALE_BY_LEVEL[1]).toBe(0.6);
    expect(FONT_SCALE_BY_LEVEL[2]).toBe(0.8);
    expect(FONT_SCALE_BY_LEVEL[3]).toBe(1);
    expect(FONT_SCALE_BY_LEVEL[4]).toBe(1.2);
    expect(FONT_SCALE_BY_LEVEL[5]).toBe(1.4);
  });

  it("falls back to default level for invalid values", () => {
    expect(normalizeFontScaleLevel(undefined)).toBe(DEFAULT_FONT_SCALE_LEVEL);
    expect(normalizeFontScaleLevel(0)).toBe(DEFAULT_FONT_SCALE_LEVEL);
    expect(normalizeFontScaleLevel(6)).toBe(DEFAULT_FONT_SCALE_LEVEL);
    expect(normalizeFontScaleLevel("3")).toBe(DEFAULT_FONT_SCALE_LEVEL);
  });

  it("resolves scale from valid level and fallback for invalid input", () => {
    expect(resolveFontScale(1)).toBe(0.6);
    expect(resolveFontScale(5)).toBe(1.4);
    expect(resolveFontScale(null)).toBe(1);
  });
});
