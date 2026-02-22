import { describe, expect, it } from "vitest";
import { localizeAffinityLabel } from "../affinityLabel";

const zhMap: Record<string, string> = {
  "affinityLevels.hostile": "敌对",
  "affinityLevels.neutral": "中立",
  "affinityLevels.friendly": "友好",
  "affinityLevels.wary": "戒备",
  "affinityLevels.guardedTrust": "戒备中的信任",
  "affinityLevels.devoted": "忠诚",
};

const t = (key: string, options?: unknown): string => {
  if (key in zhMap) {
    return zhMap[key];
  }
  if (
    options &&
    typeof options === "object" &&
    "defaultValue" in options &&
    typeof (options as { defaultValue?: unknown }).defaultValue === "string"
  ) {
    return (options as { defaultValue: string }).defaultValue;
  }
  return key;
};

describe("localizeAffinityLabel", () => {
  it("localizes canonical english affinity labels", () => {
    expect(localizeAffinityLabel("friendly", t as any)).toBe("友好");
    expect(localizeAffinityLabel("Guarded trust", t as any)).toBe(
      "戒备中的信任",
    );
    expect(localizeAffinityLabel("loyal", t as any)).toBe("忠诚");
  });

  it("keeps non-canonical prose unchanged", () => {
    expect(localizeAffinityLabel("复杂但真诚", t as any)).toBe("复杂但真诚");
    expect(localizeAffinityLabel("关系复杂，尚待观察", t as any)).toBe(
      "关系复杂，尚待观察",
    );
  });
});
