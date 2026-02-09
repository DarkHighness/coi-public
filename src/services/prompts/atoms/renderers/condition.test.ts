import { describe, expect, it } from "vitest";
import {
  renderConditionFull,
  renderConditionHidden,
  renderConditionVisible,
} from "./condition";

describe("condition renderer", () => {
  const condition = {
    id: "cond:poison",
    name: "Moon Venom",
    type: "status",
    startTime: "night-3",
    severity: "high",
    visible: {
      description: "Skin darkens around veins",
      perceivedSeverity: "moderate",
    },
    effects: {
      visible: ["fatigue", "cold sweat"],
      hidden: ["memory erosion"],
    },
    hidden: {
      trueCause: "Ritual residue",
      actualSeverity: "critical",
      progression: "spreads at dawn",
      cure: "antidote + rest",
    },
  } as any;

  it("renders visible layer with visible effects", () => {
    const output = renderConditionVisible({ condition });

    expect(output).toContain('<condition id="cond:poison" layer="visible">');
    expect(output).toContain("name: Moon Venom");
    expect(output).toContain("startTime: night-3");
    expect(output).toContain("visibleEffects: [\"fatigue\",\"cold sweat\"]");
  });

  it("renders hidden layer and returns empty when hidden is absent", () => {
    const hidden = renderConditionHidden({ condition });
    expect(hidden).toContain('<condition id="cond:poison" layer="hidden">');
    expect(hidden).toContain("trueCause: Ritual residue");
    expect(hidden).toContain("hiddenEffects: [\"memory erosion\"]");

    const noHidden = renderConditionHidden({
      condition: { ...condition, hidden: undefined },
    });
    expect(noHidden).toBe("");
  });

  it("renders full layer with visible and hidden sections", () => {
    const output = renderConditionFull({ condition });

    expect(output).toContain('<condition id="cond:poison" layer="full">');
    expect(output).toContain("<visible>");
    expect(output).toContain("<hidden>");
    expect(output).toContain("actualSeverity: critical");
  });

  it("falls back to visible full layer when hidden block is missing", () => {
    const output = renderConditionFull({
      condition: {
        ...condition,
        hidden: undefined,
        effects: { visible: [], hidden: [] },
      },
    });

    expect(output).toContain('layer="visible"');
    expect(output).not.toContain("<hidden>");
    expect(output).not.toContain("hiddenEffects:");
  });
});
