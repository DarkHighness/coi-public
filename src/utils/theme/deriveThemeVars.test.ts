import { describe, expect, it } from "vitest";
import { deriveThemeVars } from "./deriveThemeVars";

const HEX6_RE = /^#[0-9a-f]{6}$/i;

describe("deriveThemeVars", () => {
  it("keeps values unchanged when required colors are invalid", () => {
    const input = {
      "--theme-bg": "#zzz",
      "--theme-text": "#ffffff",
      "--theme-divider": "#123456",
    };

    const result = deriveThemeVars(input);

    expect(result).toEqual(input);
    expect(result).not.toBe(input);
  });

  it("derives text secondary and divider when missing", () => {
    const input = {
      "--theme-bg": "#0b0f18",
      "--theme-text": "#f5f7ff",
    };

    const result = deriveThemeVars(input);

    expect(result["--theme-text-secondary"]).toMatch(HEX6_RE);
    expect(result["--theme-divider"]).toMatch(HEX6_RE);
    expect(result["--theme-text-secondary"]).not.toBe(input["--theme-text"]);
  });

  it("preserves valid existing text secondary", () => {
    const input = {
      "--theme-bg": "#101010",
      "--theme-text": "#fefefe",
      "--theme-text-secondary": "#c0c0c0",
    };

    const result = deriveThemeVars(input);

    expect(result["--theme-text-secondary"]).toBe("#c0c0c0");
  });

  it("replaces muted when contrast is too low", () => {
    const input = {
      "--theme-bg": "#ffffff",
      "--theme-text": "#111111",
      "--theme-muted": "#fefefe",
    };

    const result = deriveThemeVars(input);

    expect(result["--theme-muted"]).toMatch(HEX6_RE);
    expect(result["--theme-muted"]).not.toBe("#fefefe");
  });

  it("adds divider only when missing or invalid", () => {
    const keepInput = {
      "--theme-bg": "#111827",
      "--theme-text": "#e5e7eb",
      "--theme-divider": "#334155",
    };
    const keepResult = deriveThemeVars(keepInput);
    expect(keepResult["--theme-divider"]).toBe("#334155");

    const invalidInput = {
      "--theme-bg": "#111827",
      "--theme-text": "#e5e7eb",
      "--theme-divider": "not-a-color",
    };
    const invalidResult = deriveThemeVars(invalidInput);
    expect(invalidResult["--theme-divider"]).toMatch(HEX6_RE);
  });
});
