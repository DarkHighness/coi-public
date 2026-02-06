import { describe, expect, it } from "vitest";
import { mergeOutlinePhases } from "./outlineMerge";

describe("outlineMerge", () => {
  it("throws when required phases are incomplete", () => {
    expect(() =>
      mergeOutlinePhases({
        phase1: {},
      } as any),
    ).toThrow("Cannot merge incomplete outline phases");
  });

  it("merges phases with ids/unlocked defaults and relation hydration", () => {
    const partial = {
      phase1: {
        title: "Demo",
        initialTime: "Dawn",
        premise: "Premise",
        narrativeScale: "local",
        worldSetting: {
          era: "era",
          geography: "geo",
          socialFabric: "social",
          extraordinaryRules: "rules",
        },
        mainGoal: {
          objective: "goal",
          stakes: "stakes",
          urgency: "urgent",
        },
      },
      phase2: {
        player: {
          profile: { name: "Hero" },
          skills: [{ name: "Sword" }, { id: "skill:4", name: "Archery" }],
          conditions: [{ name: "Hungry" }],
          traits: [{ name: "Brave" }],
          inventory: [{ name: "Potion" }],
        },
      },
      phase3: {
        locations: [{ id: "loc:5", name: "Gate" }, { name: "Square" }],
      },
      phase4: {
        factions: [{ name: "Guild" }],
      },
      phase5: {
        playerPerceptions: [{ targetId: "npc:1", attitude: "neutral" }],
        npcs: [
          {
            profile: { name: "Guide" },
            skills: [{ name: "Talk" }],
            conditions: [],
            traits: [],
            inventory: [],
          },
        ],
        placeholders: [{ name: "Mysterious Stranger" }],
      },
      phase6: {
        quests: [{ name: "Find Map" }],
      },
      phase7: {
        knowledge: [{ title: "Secret Passage" }],
      },
      phase8: {
        timeline: [{ title: "Bell rings" }],
        initialAtmosphere: {
          envTheme: "dark",
          ambience: "quiet",
          weather: "fog",
        },
      },
      phase9: {
        openingNarrative: "The story begins.",
      },
    } as any;

    const merged = mergeOutlinePhases(partial);

    expect(merged.player.profile.id).toBe("char:player");
    expect(merged.player.profile.kind).toBe("player");
    expect(Array.isArray(merged.player.profile.relations)).toBe(true);
    expect(merged.player.profile.relations).toContainEqual({
      targetId: "npc:1",
      attitude: "neutral",
    });

    expect(merged.player.skills?.[0]?.id).toBe("skill:1");
    expect(merged.player.skills?.[0]?.unlocked).toBe(false);
    expect(merged.player.skills?.[1]?.id).toBe("skill:4");
    expect(merged.player.skills?.[1]?.unlocked).toBe(false);

    expect(merged.locations[0]?.id).toBe("loc:5");
    expect(merged.locations[1]?.id).toBe("loc:6");
    expect((merged.locations[1] as any)?.unlocked).toBe(false);

    expect(merged.factions[0]?.id).toBe("fac:1");
    expect(merged.quests[0]?.id).toBe("quest:1");
    expect(merged.knowledge[0]?.id).toBe("know:1");
    expect(merged.timeline[0]?.id).toBe("evt:1");

    expect(merged.npcs[0]?.profile?.id).toBe("npc:1");
    expect(merged.npcs[0]?.profile?.kind).toBe("npc");
    expect(merged.npcs[0]?.skills?.[0]?.id).toBe("skill:1");
    expect(merged.npcs[0]?.skills?.[0]?.unlocked).toBe(false);

    expect(merged.placeholders[0]?.id).toBe("ph:1");
    expect(merged.placeholders[0]?.unlocked).toBe(false);
    expect(merged.openingNarrative).toBe("The story begins.");
  });
});
