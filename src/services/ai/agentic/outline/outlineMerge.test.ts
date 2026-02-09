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

  it("merges reordered phases with ids/unlocked defaults and relation hydration", () => {
    const partial = {
      phase1: {
        storyPlanMarkdown: "# Plan",
        planningMetadata: {
          structureVersion: "v2",
          branchStrategy: "adaptive",
          endingFlexibility: "high",
          recoveryPolicy: {
            allowNaturalRecovery: true,
            allowOutlineRevision: true,
            forbidDeusExMachina: true,
          },
        },
      },
      phase2: {
        title: "Demo",
        initialTime: "Dawn",
        premise: "Premise",
        narrativeScale: "balanced",
        worldSetting: {
          visible: { description: "World visible" },
          hidden: { truth: "World truth" },
          history: "Ancient history",
        },
        mainGoal: {
          visible: { objective: "goal", stakes: "stakes", urgency: "urgent" },
          hidden: { trueObjective: "true goal" },
        },
      },
      phase3: {
        player: {
          profile: { name: "Hero" },
          skills: [{ name: "Sword" }, { id: "skill:4", name: "Archery" }],
          conditions: [{ name: "Hungry" }],
          traits: [{ name: "Brave" }],
          inventory: [{ name: "Potion" }],
        },
      },
      phase4: {
        locations: [{ id: "loc:5", name: "Gate" }, { name: "Square" }],
      },
      phase5: {
        factions: [{ name: "Guild" }],
      },
      phase6: {
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
      phase7: {
        quests: [{ name: "Find Map" }],
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
        openingNarrative: {
          narrative: "The story begins.",
          choices: [{ text: "Look around" }, { text: "Move forward" }],
        },
      },
    } as any;

    const merged = mergeOutlinePhases(partial);

    expect(merged.title).toBe("Demo");
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
    expect((merged.openingNarrative as any)?.narrative).toBe("The story begins.");
  });
});
