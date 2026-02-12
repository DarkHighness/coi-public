import { describe, expect, it } from "vitest";
import { canonicalizeLanguage } from "../languageCanonical";

describe("canonicalizeLanguage", () => {
  it("normalizes English variants to en", () => {
    expect(canonicalizeLanguage("English")).toEqual({
      code: "en",
      family: "en",
    });
    expect(canonicalizeLanguage("en-US")).toEqual({
      code: "en",
      family: "en",
    });
    expect(canonicalizeLanguage("en")).toEqual({
      code: "en",
      family: "en",
    });
  });

  it("normalizes Chinese variants to zh-CN or zh-TW", () => {
    expect(canonicalizeLanguage("Chinese")).toEqual({
      code: "zh-CN",
      family: "zh",
    });
    expect(canonicalizeLanguage("zh")).toEqual({
      code: "zh-CN",
      family: "zh",
    });
    expect(canonicalizeLanguage("zh-CN")).toEqual({
      code: "zh-CN",
      family: "zh",
    });
    expect(canonicalizeLanguage("zh-TW")).toEqual({
      code: "zh-TW",
      family: "zh",
    });
  });

  it("keeps unknown BCP-47-like tags and defaults non-tags to en", () => {
    expect(canonicalizeLanguage("fr-ca")).toEqual({
      code: "fr-CA",
      family: "other",
    });
    expect(canonicalizeLanguage("Klingon")).toEqual({
      code: "en",
      family: "en",
    });
  });
});

