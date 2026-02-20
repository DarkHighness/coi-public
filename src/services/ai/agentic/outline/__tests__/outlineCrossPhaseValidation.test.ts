import { describe, expect, it } from "vitest";

import {
  validateNpcLocationsExist,
  validatePlayerCurrentLocationInLocations,
} from "../outlineCrossPhaseValidation";

describe("outlineCrossPhaseValidation", () => {
  it("accepts locations that include the player's currentLocation id", () => {
    const player = { profile: { currentLocation: "loc:chapel" } } as any;
    const locations = [{ id: "loc:chapel" }, { id: "loc:town" }] as any;

    expect(validatePlayerCurrentLocationInLocations(player, locations)).toEqual(
      { ok: true },
    );
  });

  it("rejects locations when the player's currentLocation id is missing", () => {
    const player = { profile: { currentLocation: "loc:chapel" } } as any;
    const locations = [{ id: "loc:town" }] as any;

    const result = validatePlayerCurrentLocationInLocations(player, locations);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("loc:chapel");
      expect(result.error).toContain("Provided location ids");
    }
  });

  it("rejects NPCs when any currentLocation is not an existing location id", () => {
    const locations = [{ id: "loc:chapel" }, { id: "loc:town" }] as any;
    const npcs = [
      { profile: { id: "char:npc-1", currentLocation: "loc:town" } },
      { profile: { id: "char:npc-2", currentLocation: "loc:missing" } },
    ] as any;

    const result = validateNpcLocationsExist(locations, npcs);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("char:npc-2");
      expect(result.error).toContain("loc:missing");
      expect(result.error).toContain("Valid location ids");
    }
  });

  it("accepts NPCs when all currentLocation ids exist in locations", () => {
    const locations = [{ id: "loc:chapel" }, { id: "loc:town" }] as any;
    const npcs = [
      { profile: { id: "char:npc-1", currentLocation: "loc:town" } },
      { profile: { id: "char:npc-2", currentLocation: "loc:chapel" } },
    ] as any;

    expect(validateNpcLocationsExist(locations, npcs)).toEqual({
      ok: true,
    });
  });
});
