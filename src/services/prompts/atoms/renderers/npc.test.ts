import { describe, expect, it } from "vitest";
import { renderNpcFull, renderNpcHidden, renderNpcVisible } from "./npc";

describe("npc renderer", () => {
  const npc = {
    id: "char:iris",
    visible: {
      name: "Iris",
      title: "Captain",
      age: 34,
      race: "Human",
      profession: "Navigator",
      background: "Former privateer",
      description: "Scarred and focused",
      appearance: "Blue coat",
      status: "alert",
      roleTag: "ally",
      voice: "steady",
      mannerism: "taps compass",
      mood: "guarded",
    },
    currentLocation: "loc:harbor",
    relations: [{ target: "char:hero", status: "trusting" }],
    hidden: {
      trueName: "Irisa",
      realPersonality: "calculating",
      realMotives: "protect crew",
      routine: "night patrol",
      currentThought: "Storm incoming",
      secrets: ["maps hidden cove"],
      status: "injured",
    },
  } as any;

  it("renders visible layer with relation/location details", () => {
    const output = renderNpcVisible({ npc });

    expect(output).toContain('<npc id="char:iris" layer="visible">');
    expect(output).toContain("name: Iris");
    expect(output).toContain("currentLocation: loc:harbor");
    expect(output).toContain("relations:");
  });

  it("renders hidden layer and empty output for missing hidden info", () => {
    const hidden = renderNpcHidden({ npc });
    expect(hidden).toContain('<npc id="char:iris" layer="hidden">');
    expect(hidden).toContain("trueName: Irisa");

    const noHidden = renderNpcHidden({ npc: { ...npc, hidden: undefined } });
    expect(noHidden).toBe("");
  });

  it("renders full layer with visible+hidden sections", () => {
    const output = renderNpcFull({ npc });

    expect(output).toContain('<npc id="char:iris" layer="full">');
    expect(output).toContain("<visible>");
    expect(output).toContain("<hidden>");
    expect(output).toContain("realMotives: protect crew");
  });

  it("returns visible rendering when hidden section is absent", () => {
    const output = renderNpcFull({ npc: { ...npc, hidden: undefined } });

    expect(output).toContain('layer="visible"');
    expect(output).not.toContain("<hidden>");
  });
});
