import { describe, it, expect } from "vitest";
import * as worldbuilding from "../index";

describe("worldbuilding index export contract", () => {
  it("exports canonical names from each atom module", () => {
    expect(typeof worldbuilding.magicSystem).toBe("function");
    expect(typeof worldbuilding.magicSystemPrimer).toBe("function");
    expect(typeof worldbuilding.magicSystemSkill).toBe("function");

    expect(typeof worldbuilding.economy).toBe("function");
    expect(typeof worldbuilding.economyPrimer).toBe("function");
    expect(typeof worldbuilding.economySkill).toBe("function");

    expect(typeof worldbuilding.travel).toBe("function");
    expect(typeof worldbuilding.travelPrimer).toBe("function");
    expect(typeof worldbuilding.travelSkill).toBe("function");

    expect(typeof worldbuilding.infrastructure).toBe("function");
    expect(typeof worldbuilding.infrastructurePrimer).toBe("function");
    expect(typeof worldbuilding.infrastructureSkill).toBe("function");
  });

  it("does not expose removed legacy aliases", () => {
    expect("magicSystemLite" in worldbuilding).toBe(false);

    expect("economySystem" in worldbuilding).toBe(false);
    expect("economySystemLite" in worldbuilding).toBe(false);
    expect("economySystemSkill" in worldbuilding).toBe(false);

    expect("travelSystem" in worldbuilding).toBe(false);
    expect("travelSystemLite" in worldbuilding).toBe(false);
    expect("travelSystemSkill" in worldbuilding).toBe(false);

    expect("infrastructureSystem" in worldbuilding).toBe(false);
    expect("infrastructureSystemLite" in worldbuilding).toBe(false);
    expect("infrastructureSystemSkill" in worldbuilding).toBe(false);
  });
});
