import { describe, expect, it } from "vitest";
import { extractDocumentsFromState } from "./documentExtraction";

const createState = () =>
  ({
    nodes: {
      n1: {
        id: "n1",
        role: "user",
        text: "Open the ancient gate",
        stateSnapshot: {
          turnNumber: 4,
          currentLocation: "Clocktower",
          time: { day: 3, hour: 21 },
        },
        atmosphere: { tension: "high" },
      },
    },
    npcs: [
      {
        id: "char:alice",
        icon: "🕵️",
        visible: { name: "Alice", description: "Agent" },
        hidden: { secrets: ["double agent"] },
      },
    ],
    actors: [
      {
        profile: {
          id: "char:bob",
          kind: "npc",
          visible: { name: "Bob", profession: "Guard" },
        },
      },
    ],
    locations: [
      {
        id: "loc:market",
        name: "Market",
        visible: { description: "Busy plaza", knownFeatures: ["stalls"] },
      },
    ],
    inventory: [{ id: "inv:key", name: "Rusty Key", unlocked: true }],
    locationItemsByLocationId: {
      "loc:market": [{ id: "item:gem", name: "Gem", unlocked: false }],
    },
    knowledge: [
      {
        id: "know:law",
        title: "Old Law",
        unlocked: true,
        visible: { description: "No fire in the tower" },
      },
    ],
    quests: [
      {
        id: "quest:1",
        status: "active",
        title: "Seal the Rift",
        visible: { description: "Find the seal" },
      },
    ],
    timeline: [
      {
        id: "evt:storm",
        gameTime: "night",
        visible: { description: "A storm approaches" },
      },
    ],
    factions: [
      {
        id: "fac:guild",
        name: "Guild",
        unlocked: true,
        visible: { agenda: "Control trade" },
      },
    ],
    character: {
      skills: [
        {
          id: "skill:stealth",
          name: "Stealth",
          unlocked: true,
          visible: { description: "Move unseen" },
        },
      ],
      conditions: [
        {
          id: "condition:poison",
          name: "Poisoned",
          type: "debuff",
          unlocked: true,
          visible: { description: "Sick" },
          effects: { visible: ["-1 STR"] },
        },
      ],
      hiddenTraits: [
        {
          id: "trait:destiny",
          name: "Destined",
          unlocked: true,
          effects: ["fate bends"],
        },
      ],
      attributes: [
        { label: "hp", value: 7, maxValue: 10, color: "red" },
      ],
    },
    outline: {
      title: "Chronicles",
      premise: "A city on the brink",
      initialTime: "Dawn",
      player: {
        profile: {
          visible: {
            name: "Hero",
            race: "Human",
            profession: "Warden",
          },
        },
      },
      worldSetting: {
        visible: {
          description: "Shattered city",
          rules: "Magic is taxed",
        },
        hidden: {
          hiddenRules: "Time loops every eclipse",
          secrets: ["Core relic buried below"],
        },
      },
      mainGoal: {
        visible: {
          description: "Seal the breach",
          conditions: "Gather three sigils",
        },
        hidden: {
          trueDescription: "Break the cycle",
          trueConditions: "Sacrifice the crown",
        },
      },
    },
    worldInfo: {
      worldSettingUnlocked: true,
      mainGoalUnlocked: true,
    },
  }) as any;

describe("extractDocumentsFromState", () => {
  it("extracts story segment with contextual tags", () => {
    const docs = extractDocumentsFromState(createState(), ["story:n1"]);

    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      entityId: "story:n1",
      type: "story",
      importance: 0.8,
    });
    expect(docs[0].content).toContain("<player_action>");
    expect(docs[0].content).toContain("<location>Clocktower</location>");
    expect(docs[0].content).toContain("<atmosphere>");
  });

  it("resolves npc by short id fallback", () => {
    const docs = extractDocumentsFromState(createState(), ["npc:alice"]);

    expect(docs).toHaveLength(1);
    expect(docs[0].type).toBe("npc");
    expect(docs[0].content).toContain("<npc id=\"char:alice\">");
  });

  it("extracts actor profile via char id", () => {
    const docs = extractDocumentsFromState(createState(), ["char:bob"]);

    expect(docs).toHaveLength(1);
    expect(docs[0].type).toBe("npc");
    expect(docs[0].content).toContain("<name>Bob</name>");
  });

  it("extracts location item fallback and unlocked status", () => {
    const docs = extractDocumentsFromState(createState(), ["item:gem"]);

    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      type: "item",
      unlocked: false,
      importance: 0.6,
    });
    expect(docs[0].content).toContain("<item id=\"item:gem\">");
  });

  it("extracts outline world and goal including unlocked hidden details", () => {
    const worldDocs = extractDocumentsFromState(createState(), ["outline:world"]);
    const goalDocs = extractDocumentsFromState(createState(), ["outline:goal"]);

    expect(worldDocs[0].content).toContain("Hidden Rules: Time loops every eclipse");
    expect(worldDocs[0].content).toContain("World Secrets: Core relic buried below");
    expect(goalDocs[0].content).toContain("True Goal: Break the cycle");
    expect(goalDocs[0].content).toContain("True Conditions: Sacrifice the crown");
  });

  it("extracts character facets and faction as outline documents", () => {
    const docs = extractDocumentsFromState(createState(), [
      "skill:stealth",
      "condition:poison",
      "trait:destiny",
      "attribute:hp",
      "fac:guild",
    ]);

    expect(docs).toHaveLength(5);
    expect(docs.every((doc) => doc.type === "outline")).toBe(true);
    expect(docs.find((doc) => doc.entityId === "skill:stealth")?.content).toContain(
      "<skill id=\"skill:stealth\">",
    );
    expect(docs.find((doc) => doc.entityId === "condition:poison")?.content).toContain(
      "<condition id=\"condition:poison\"",
    );
    expect(docs.find((doc) => doc.entityId === "trait:destiny")?.content).toContain(
      "<hidden_trait id=\"trait:destiny\"",
    );
  });

  it("returns empty for unknown ids", () => {
    const docs = extractDocumentsFromState(createState(), [
      "unknown:1",
      "npc:not-found",
      "story:missing",
    ]);

    expect(docs).toEqual([]);
  });

  it("extracts knowledge/quest/event with importance and unlock metadata", () => {
    const docs = extractDocumentsFromState(createState(), [
      "know:law",
      "quest:1",
      "evt:storm",
    ]);

    expect(docs).toHaveLength(3);
    expect(docs.find((doc) => doc.entityId === "know:law")).toMatchObject(
      {
        type: "knowledge",
        unlocked: true,
        importance: 0.5,
      },
    );
    expect(docs.find((doc) => doc.entityId === "quest:1")?.importance).toBe(0.9);
    expect(docs.find((doc) => doc.entityId === "evt:storm")?.type).toBe("event");
  });
});
