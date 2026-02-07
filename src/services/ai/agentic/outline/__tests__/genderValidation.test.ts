import { describe, expect, it } from "vitest";
import { validateGenderPreferencePhase2 } from "../genderValidation";

const buildPhase2 = (visible: Record<string, unknown>) => ({
  player: {
    profile: {
      visible,
    },
  },
});

describe("validateGenderPreferencePhase2", () => {
  it("rejects relationship identity in title", () => {
    const phase2 = buildPhase2({
      race: "汉族男性",
      title: "心死前妻",
      profession: "绣坊继承人",
    });

    const result = validateGenderPreferencePhase2(phase2, "male");
    expect(result).toContain("relationship identity terms");
    expect(result).toContain("visible.title");
  });

  it("rejects relationship identity in profession", () => {
    const phase2 = buildPhase2({
      race: "汉族男性",
      title: "少爷",
      profession: "心死的前妻",
    });

    const result = validateGenderPreferencePhase2(phase2, "male");
    expect(result).toContain("visible.profession");
    expect(result).toContain("occupation/class");
  });

  it("rejects relationship identity in roleTag", () => {
    const phase2 = buildPhase2({
      race: "汉族男性",
      title: "沈家少爷",
      profession: "绣坊继承人",
      roleTag: "前夫",
    });

    const result = validateGenderPreferencePhase2(phase2, "male");
    expect(result).toContain("visible.roleTag");
    expect(result).toContain("relationship identity terms");
  });

  it("rejects non-relationship gender mismatch", () => {
    const phase2 = buildPhase2({
      race: "汉族男性",
      title: "年轻小姐",
      profession: "绣坊继承人",
    });

    const result = validateGenderPreferencePhase2(phase2, "male");
    expect(result).toContain("Gender mismatch");
    expect(result).toContain("visible.title");
  });

  it("accepts coherent male protagonist labels", () => {
    const phase2 = buildPhase2({
      race: "汉族男性",
      title: "沈家少爷",
      profession: "沈绣坊继承人",
      description: "他常年伏案刺绣，指节有细小针痕。",
    });

    expect(validateGenderPreferencePhase2(phase2, "male")).toBeNull();
  });
});
