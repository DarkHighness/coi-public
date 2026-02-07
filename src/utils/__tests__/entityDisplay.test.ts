import { describe, it, expect } from "vitest";
import {
  resolveEntityDisplayName,
  resolveLocationDisplayName,
} from "../entityDisplay";

const buildState = () =>
  ({
    playerActorId: "char:player",
    character: {
      name: "Arin",
    },
    actors: [
      {
        profile: {
          id: "char:npc_marcus",
          visible: {
            name: "Marcus",
          },
        },
      },
    ],
    npcs: [],
    locations: [
      {
        id: "loc:tavern",
        name: "Silver Inn",
      },
    ],
    quests: [],
    knowledge: [],
    factions: [],
    timeline: [],
    inventory: [],
  }) as any;

describe("entity display resolver", () => {
  it("resolves location IDs to location names", () => {
    const state = buildState();
    expect(resolveLocationDisplayName("loc_tavern", state)).toBe("Silver Inn");
    expect(resolveLocationDisplayName("loc:tavern", state)).toBe("Silver Inn");
  });

  it("returns raw location ref when no mapping exists", () => {
    const state = buildState();
    expect(resolveLocationDisplayName("loc:unknown", state)).toBe("loc:unknown");
  });

  it("keeps entity resolver fallback behavior", () => {
    const state = buildState();
    expect(resolveEntityDisplayName("char:npc_marcus", state)).toBe("Marcus");
    expect(resolveEntityDisplayName("char:missing", state)).toBe("char:missing");
  });
});
