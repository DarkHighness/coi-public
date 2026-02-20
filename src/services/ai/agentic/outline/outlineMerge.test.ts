import { describe, expect, it } from "vitest";
import { mergeOutlinePhases } from "./outlineMerge";

describe("outlineMerge", () => {
  it("throws when required phases are incomplete", () => {
    expect(() =>
      mergeOutlinePhases({
        master_plan: {},
      } as any),
    ).toThrow("Cannot merge incomplete outline phases");
  });

  it("merges reordered phases with ids and relation hydration", () => {
    const partial = {
      master_plan: {
        storyPlanMarkdown: "# Plan",
        planningMetadata: {
          structureVersion: "v3",
          branchStrategy: "adaptive",
          endingFlexibility: "high",
          recoveryPolicy: {
            allowNaturalRecovery: true,
            allowOutlineRevision: true,
            forbidDeusExMachina: true,
          },
        },
      },
      placeholder_registry: {
        placeholders: [
          {
            path: "world/placeholders/ph:mysterious_stranger.md",
            markdown: [
              "# Placeholder Draft",
              "",
              "- id: ph:mysterious_stranger",
              "- label: [Mysterious Stranger]",
              "",
              "## Notes",
              "Seen near the abandoned gate.",
            ].join("\n"),
          },
        ],
      },
      world_foundation: {
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
      player_actor: {
        player: {
          profile: { name: "Hero" },
          skills: [{ name: "Sword" }, { id: "skill:4", name: "Archery" }],
          conditions: [{ name: "Hungry" }],
          traits: [{ name: "Brave" }],
          inventory: [{ name: "Potion" }],
        },
      },
      locations: {
        locations: [{ id: "loc:5", name: "Gate" }, { name: "Square" }],
      },
      factions: {
        factions: [{ name: "Guild" }],
      },
      npcs_relationships: {
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
      },
      quests: {
        quests: [{ name: "Find Map" }],
      },
      knowledge: {
        knowledge: [{ title: "Secret Passage" }],
      },
      timeline: {
        timeline: [{ title: "Bell rings" }],
      },
      atmosphere: {
        initialAtmosphere: {
          envTheme: "dark",
          ambience: "quiet",
          weather: "fog",
        },
      },
      opening_narrative: {
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
    expect((merged.locations[1] as any)?.unlocked).toBeUndefined();

    expect(merged.factions[0]?.id).toBe("fac:1");
    expect(merged.quests[0]?.id).toBe("quest:1");
    expect(merged.knowledge[0]?.id).toBe("know:1");
    expect(merged.timeline[0]?.id).toBe("evt:1");

    expect(merged.npcs[0]?.profile?.id).toBe("npc:1");
    expect(merged.npcs[0]?.profile?.kind).toBe("npc");
    expect(merged.npcs[0]?.skills?.[0]?.id).toBe("skill:1");
    expect(merged.npcs[0]?.skills?.[0]?.unlocked).toBe(false);

    expect((merged.placeholders[0] as any)?.path).toBe(
      "world/placeholders/misc/ph:mysterious_stranger.md",
    );
    expect((merged.placeholders[0] as any)?.markdown).toContain(
      "- id: ph:mysterious_stranger",
    );
    expect((merged.openingNarrative as any)?.narrative).toBe(
      "The story begins.",
    );
  });
});
