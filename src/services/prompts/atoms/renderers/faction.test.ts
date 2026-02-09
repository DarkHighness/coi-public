import { describe, expect, it } from "vitest";
import {
  renderFactionFull,
  renderFactionHidden,
  renderFactionVisible,
} from "./faction";

describe("faction renderer", () => {
  const faction = {
    id: "fac:veil",
    name: "The Veil Accord",
    visible: {
      agenda: "Keep portals sealed",
      influence: "city council",
      members: ["char:a", "char:b"],
      relations: [{ target: "fac:watch", status: "tense" }],
    },
    hidden: {
      agenda: "Control relic traffic",
      influence: "shadow network",
      members: ["char:x"],
      internalConflict: "split over succession",
      relations: [{ target: "fac:watch", status: "proxy war" }],
    },
  } as any;

  it("renders visible layer with members and relations", () => {
    const output = renderFactionVisible({ faction });

    expect(output).toContain('<faction id="fac:veil" layer="visible">');
    expect(output).toContain("agenda: Keep portals sealed");
    expect(output).toContain('members: ["char:a","char:b"]');
    expect(output).toContain("relations:");
  });

  it("renders hidden layer and returns empty when hidden is missing", () => {
    const hidden = renderFactionHidden({ faction });
    expect(hidden).toContain('<faction id="fac:veil" layer="hidden">');
    expect(hidden).toContain("trueAgenda: Control relic traffic");
    expect(hidden).toContain("internalConflict: split over succession");

    const noHidden = renderFactionHidden({
      faction: { ...faction, hidden: undefined },
    });
    expect(noHidden).toBe("");
  });

  it("renders full layer with visible and hidden sections", () => {
    const output = renderFactionFull({ faction });

    expect(output).toContain('<faction id="fac:veil" layer="full">');
    expect(output).toContain("<visible>");
    expect(output).toContain("<hidden>");
    expect(output).toContain("secretMembers");
  });

  it("falls back to visible full output without hidden block", () => {
    const output = renderFactionFull({
      faction: { ...faction, hidden: undefined },
    });

    expect(output).toContain('layer="visible"');
    expect(output).not.toContain("<hidden>");
  });
});
