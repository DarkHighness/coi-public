import { describe, expect, it } from "vitest";
import {
  renderCharacterFull,
  renderCharacterHidden,
  renderCharacterVisible,
} from "./character";

describe("character renderer", () => {
  const character = {
    name: "Ari",
    title: "Warden",
    race: "Human",
    profession: "Scout",
    age: 28,
    status: "injured",
    appearance: "Weathered cloak",
    background: "Exiled ranger",
    currentLocation: "loc:harbor",
    attributes: [
      { label: "focus", value: 7, maxValue: 10 },
      { label: "grit", value: 5, maxValue: 10 },
    ],
    psychology: {
      coreTrauma: "lost sibling",
      copingMechanism: "overplanning",
      internalContradiction: "seeks trust but hides truths",
    },
    hiddenTraits: [
      {
        name: "Moon Brand",
        description: "Resonates near relics",
        effects: ["detect anomalies"],
        triggerConditions: ["full moon"],
        unlocked: true,
      },
    ],
    skills: [
      {
        name: "Silent Step",
        hidden: { critBonus: 2 },
      },
      {
        name: "Survey",
      },
    ],
  } as any;

  it("renders visible layer with attributes and psychology", () => {
    const output = renderCharacterVisible({ character });

    expect(output).toContain('<protagonist layer="visible">');
    expect(output).toContain("attributes: focus: 7/10, grit: 5/10");
    expect(output).toContain("coreTrauma: lost sibling");
    expect(output).toContain("currentLocation: loc:harbor");
  });

  it("renders hidden layer with traits and hidden skill effects", () => {
    const output = renderCharacterHidden({ character });

    expect(output).toContain('<protagonist layer="hidden">');
    expect(output).toContain("hiddenTraits:");
    expect(output).toContain("skillsWithHiddenEffects:");
    expect(output).toContain("Silent Step");
  });

  it("returns empty hidden layer when hidden sections are absent", () => {
    const output = renderCharacterHidden({
      character: {
        ...character,
        hiddenTraits: [],
        skills: [{ name: "Survey" }],
      },
    } as any);

    expect(output).toBe("");
  });

  it("renders full layer with hidden block when hidden content exists", () => {
    const output = renderCharacterFull({ character });

    expect(output).toContain('<protagonist layer="full">');
    expect(output).toContain("<visible>");
    expect(output).toContain("<hidden>");
    expect(output).toContain("hiddenTraits:");
  });

  it("falls back to visible-only full output without hidden content", () => {
    const output = renderCharacterFull({
      character: {
        ...character,
        hiddenTraits: [],
        skills: [{ name: "Survey" }],
      },
    } as any);

    expect(output).toContain('<protagonist layer="visible">');
    expect(output).not.toContain("<hidden>");
  });
});
