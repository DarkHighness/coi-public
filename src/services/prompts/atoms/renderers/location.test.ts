import { describe, expect, it } from "vitest";
import {
  renderLocationFull,
  renderLocationHidden,
  renderLocationVisible,
} from "./location";

describe("location renderer", () => {
  const location = {
    id: "loc:harbor",
    name: "Moon Harbor",
    lore: "Ancient docks",
    visible: {
      description: "Cold wind and lanterns",
      environment: "coastal",
      ambience: "fog horns",
      weather: "mist",
      sensory: {
        smell: "salt",
        sound: "waves",
        lighting: "dim",
        temperature: "chilly",
      },
      knownFeatures: ["pier", "warehouse"],
      resources: ["fish", "tar"],
    },
    hidden: {
      fullDescription: "Smuggler routes beneath the docks",
      hiddenFeatures: ["secret tunnel"],
      dangers: ["collapsing beams"],
      secrets: ["black market ledger"],
    },
  } as any;

  it("renders visible layer with optional details", () => {
    const output = renderLocationVisible({ location });

    expect(output).toContain('<location id="loc:harbor" layer="visible">');
    expect(output).toContain("lore: Ancient docks");
    expect(output).toContain("sensory: { smell: salt, sound: waves, lighting: dim, temperature: chilly }");
    expect(output).toContain('knownFeatures: ["pier","warehouse"]');
  });

  it("renders hidden layer and returns empty when hidden is missing", () => {
    const hidden = renderLocationHidden({ location });
    expect(hidden).toContain('<location id="loc:harbor" layer="hidden">');
    expect(hidden).toContain("fullDescription: Smuggler routes beneath the docks");

    const noHidden = renderLocationHidden({
      location: { ...location, hidden: undefined },
    });
    expect(noHidden).toBe("");
  });

  it("renders full layer with visible and hidden blocks", () => {
    const output = renderLocationFull({ location });

    expect(output).toContain('<location id="loc:harbor" layer="full">');
    expect(output).toContain("<visible>");
    expect(output).toContain("<hidden>");
    expect(output).toContain("hiddenFeatures: [\"secret tunnel\"]");
  });

  it("falls back to visible-only full rendering when hidden is absent", () => {
    const output = renderLocationFull({
      location: { ...location, hidden: undefined },
    });

    expect(output).toContain('layer="visible"');
    expect(output).not.toContain("<hidden>");
  });
});
