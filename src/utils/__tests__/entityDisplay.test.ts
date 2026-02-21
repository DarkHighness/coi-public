import { describe, it, expect } from "vitest";
import {
  extractBracketDisplayName,
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

  it("humanizes location ref when no mapping exists", () => {
    const state = buildState();
    expect(resolveLocationDisplayName("loc:unknown", state)).toBe("Unknown");
  });

  it("uses bracket alias as direct display name", () => {
    const state = buildState();
    expect(resolveLocationDisplayName("[Shadow Alley]", state)).toBe(
      "Shadow Alley",
    );
    expect(resolveEntityDisplayName("[Unknown Informant]", state)).toBe(
      "Unknown Informant",
    );
    expect(extractBracketDisplayName("[  Hidden Wharf  ]")).toBe(
      "Hidden Wharf",
    );
  });

  it("keeps entity resolver fallback behavior", () => {
    const state = buildState();
    expect(resolveEntityDisplayName("char:npc_marcus", state)).toBe("Marcus");
    expect(resolveEntityDisplayName("char:missing", state)).toBe("Missing");
    expect(resolveEntityDisplayName("raw-non-entity-value", state)).toBe(
      "raw-non-entity-value",
    );
  });

  it("resolves player and faction-style IDs for fallback fields", () => {
    const state = buildState();
    state.factions = [
      {
        id: "faction:surface_alliance",
        name: "Surface Alliance",
      },
    ];

    expect(resolveEntityDisplayName("char:player", state)).toBe("Arin");
    expect(resolveEntityDisplayName("faction_surface_alliance", state)).toBe(
      "Surface Alliance",
    );
    expect(resolveEntityDisplayName("fac:surface_alliance", state)).toBe(
      "Surface Alliance",
    );
    expect(resolveEntityDisplayName("fac_surface_alliance", state)).toBe(
      "Surface Alliance",
    );
  });

  it("humanizes unresolved entity IDs for viewer/sidebar fallback", () => {
    const state = buildState();
    expect(resolveEntityDisplayName("fac:underground_network", state)).toBe(
      "Underground Network",
    );
    expect(resolveEntityDisplayName("faction:inner-circle", state)).toBe(
      "Inner Circle",
    );
    expect(resolveEntityDisplayName("npc:shadow_watcher", state)).toBe(
      "Shadow Watcher",
    );
  });
});
