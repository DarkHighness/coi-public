import { describe, expect, it } from "vitest";
import { renderQuestFull, renderQuestHidden, renderQuestVisible } from "./quest";

describe("quest renderer", () => {
  const quest = {
    id: "quest:harbor",
    title: "Shadows on the Pier",
    type: "main",
    status: "active",
    visible: {
      description: "Track contraband routes",
      objectives: ["Inspect ledgers", "Follow smuggler"],
    },
    hidden: {
      trueDescription: "Uncover council collusion",
      trueObjectives: ["Find patron", "Secure evidence"],
      secretOutcome: "Expose magistrate",
      twist: "Mentor is the courier",
    },
  } as any;

  it("renders visible layer and objective list", () => {
    const output = renderQuestVisible({ quest });

    expect(output).toContain('<quest id="quest:harbor" layer="visible">');
    expect(output).toContain("status: active");
    expect(output).toContain('objectives: ["Inspect ledgers","Follow smuggler"]');
  });

  it("renders hidden layer and empty fallback", () => {
    const hidden = renderQuestHidden({ quest });
    expect(hidden).toContain('<quest id="quest:harbor" layer="hidden">');
    expect(hidden).toContain("secretOutcome: Expose magistrate");

    const noHidden = renderQuestHidden({ quest: { ...quest, hidden: undefined } });
    expect(noHidden).toBe("");
  });

  it("renders full layer with visible + hidden blocks", () => {
    const output = renderQuestFull({ quest });

    expect(output).toContain('<quest id="quest:harbor" layer="full">');
    expect(output).toContain("<visible>");
    expect(output).toContain("<hidden>");
    expect(output).toContain("twist: Mentor is the courier");
  });

  it("falls back to visible when hidden does not exist", () => {
    const output = renderQuestFull({ quest: { ...quest, hidden: undefined } });

    expect(output).toContain('layer="visible"');
    expect(output).not.toContain("<hidden>");
  });
});
