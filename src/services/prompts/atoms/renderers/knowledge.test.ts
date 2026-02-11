import { describe, expect, it } from "vitest";
import {
  renderKnowledgeFull,
  renderKnowledgeHidden,
  renderKnowledgeVisible,
} from "./knowledge";

describe("knowledge renderer", () => {
  const knowledge = {
    id: "know:rift",
    title: "Rift Pattern",
    category: "arcane",
    discoveredAt: "turn-9",
    relatedTo: ["loc:spire", "npc:iris"],
    visible: {
      description: "Rifts pulse before opening",
      details: "Three pulses then rupture",
    },
    hidden: {
      fullTruth: "Pattern is induced by anchored relic",
      misconceptions: ["moonlight causes rifts"],
      toBeRevealed: ["anchor location", "ritual owner"],
    },
  } as any;

  it("renders visible layer with metadata", () => {
    const output = renderKnowledgeVisible({ knowledge });

    expect(output).toContain('<knowledge id="know:rift" layer="visible">');
    expect(output).toContain("title: Rift Pattern");
    expect(output).toContain("category: arcane");
    expect(output).toContain('relatedTo: ["loc:spire","npc:iris"]');
  });

  it("renders hidden layer and handles missing hidden data", () => {
    const hidden = renderKnowledgeHidden({ knowledge });
    expect(hidden).toContain('<knowledge id="know:rift" layer="hidden">');
    expect(hidden).toContain("fullTruth: Pattern is induced by anchored relic");
    expect(hidden).toContain("misconceptions:");

    const noHidden = renderKnowledgeHidden({
      knowledge: { ...knowledge, hidden: undefined },
    });
    expect(noHidden).toBe("");
  });

  it("renders full layer with both visible and hidden sections", () => {
    const output = renderKnowledgeFull({ knowledge });

    expect(output).toContain('<knowledge id="know:rift" layer="full">');
    expect(output).toContain("<visible>");
    expect(output).toContain("<hidden>");
    expect(output).toContain("toBeRevealed:");
  });

  it("returns visible full output when hidden section is absent", () => {
    const output = renderKnowledgeFull({
      knowledge: { ...knowledge, hidden: undefined },
    });

    expect(output).toContain('layer="visible"');
    expect(output).not.toContain("<hidden>");
  });
});
