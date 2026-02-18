import { describe, expect, it } from "vitest";
import { validateGenderPreferencePhase3 } from "../genderValidation";

const buildPhase3 = ({
  visible = {},
  hidden = {},
}: {
  visible?: Record<string, unknown>;
  hidden?: Record<string, unknown>;
}) => ({
  player: {
    profile: {
      visible,
      hidden,
    },
  },
});

describe("validateGenderPreferencePhase3", () => {
  it("passes when hidden.gender matches preference even if visible.gender is opposite", () => {
    const phase3 = buildPhase3({
      visible: { gender: "女性", race: "人类" },
      hidden: { gender: "男性" },
    });

    expect(validateGenderPreferencePhase3(phase3, "male")).toBeNull();
  });

  it("falls back to visible.gender when hidden.gender has no explicit signal", () => {
    const phase3 = buildPhase3({
      visible: { gender: "male", race: "human" },
      hidden: { gender: "unspecified" },
    });

    expect(validateGenderPreferencePhase3(phase3, "male")).toBeNull();
  });

  it("fails when hidden.gender conflicts even if visible.gender matches", () => {
    const phase3 = buildPhase3({
      visible: { gender: "male", race: "human" },
      hidden: { gender: "female" },
    });

    const result = validateGenderPreferencePhase3(phase3, "male");
    expect(result).toContain("hidden.gender");
    expect(result).toContain("male (男性)");
  });

  it("fails when no usable gender signal exists in hidden/visible gender", () => {
    const phase3 = buildPhase3({
      visible: { gender: "unspecified", race: "human" },
      hidden: { gender: "unknown" },
    });

    const result = validateGenderPreferencePhase3(phase3, "female");
    expect(result).toContain("cannot determine protagonist gender");
    expect(result).toContain("female (女性)");
  });

  it("rejects relationship identity in visible.profession", () => {
    const phase3 = buildPhase3({
      visible: {
        gender: "male",
        profession: "前夫",
        race: "人类",
      },
    });

    const result = validateGenderPreferencePhase3(phase3, "male");
    expect(result).toContain("visible.profession");
    expect(result).toContain("occupation/class");
  });

  it("accepts expanded english keywords (boy)", () => {
    const phase3 = buildPhase3({
      visible: { gender: "boy", race: "human" },
    });

    expect(validateGenderPreferencePhase3(phase3, "male")).toBeNull();
  });

  it("rejects pan_gender when explicit male/female signal appears in visible.gender", () => {
    const phase3 = buildPhase3({
      visible: { gender: "male", race: "human" },
    });

    const result = validateGenderPreferencePhase3(phase3, "pan_gender");
    expect(result).toContain("pan_gender forbids explicit male/female signals");
    expect(result).toContain("visible.gender");
  });

  it("rejects pan_gender when explicit signal appears in visible.description", () => {
    const phase3 = buildPhase3({
      visible: {
        gender: "unspecified",
        race: "human",
        description: "他是王子",
      },
    });

    const result = validateGenderPreferencePhase3(phase3, "pan_gender");
    expect(result).toContain("visible.description");
  });

  it("accepts pan_gender with neutral-only expressions", () => {
    const phase3 = buildPhase3({
      visible: {
        gender: "未指明",
        race: "高维投影体（人类外壳）",
        title: "流浪者",
        profession: "侦查员",
        roleTag: "先行者",
        description: "外形中性，气质克制",
        background: "身份未公开",
        status: "待定",
      },
      hidden: {
        gender: "泛性别",
        race: "高维种族",
      },
    });

    expect(validateGenderPreferencePhase3(phase3, "pan_gender")).toBeNull();
  });
});
