import { describe, expect, it } from "vitest";

import {
  validatePhase4LocationsIncludesPlayerCurrentLocation,
  validatePhase6NpcLocationsExist,
} from "../outlineCrossPhaseValidation";

describe("outlineCrossPhaseValidation", () => {
  it("accepts phase4 locations that include the player's currentLocation id", () => {
    const player = { profile: { currentLocation: "loc:chapel" } } as any;
    const locations = [{ id: "loc:chapel" }, { id: "loc:town" }] as any;

    expect(
      validatePhase4LocationsIncludesPlayerCurrentLocation(player, locations),
    ).toEqual({ ok: true });
  });

  it("rejects phase4 when the player's currentLocation id is missing from locations", () => {
    const player = { profile: { currentLocation: "loc:chapel" } } as any;
    const locations = [{ id: "loc:town" }] as any;

    const result = validatePhase4LocationsIncludesPlayerCurrentLocation(
      player,
      locations,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("loc:chapel");
      expect(result.error).toContain("Provided location ids");
    }
  });

  it("rejects phase6 when any NPC currentLocation is not a phase4 location id", () => {
    const locations = [{ id: "loc:chapel" }, { id: "loc:town" }] as any;
    const npcs = [
      { profile: { id: "char:npc-1", currentLocation: "loc:town" } },
      { profile: { id: "char:npc-2", currentLocation: "loc:missing" } },
    ] as any;

    const result = validatePhase6NpcLocationsExist(locations, npcs);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("char:npc-2");
      expect(result.error).toContain("loc:missing");
      expect(result.error).toContain("Valid location ids");
    }
  });

  it("accepts phase6 when all NPC currentLocation ids exist in phase4 locations", () => {
    const locations = [{ id: "loc:chapel" }, { id: "loc:town" }] as any;
    const npcs = [
      { profile: { id: "char:npc-1", currentLocation: "loc:town" } },
      { profile: { id: "char:npc-2", currentLocation: "loc:chapel" } },
    ] as any;

    expect(validatePhase6NpcLocationsExist(locations, npcs)).toEqual({ ok: true });
  });
});

