import { describe, expect, it, vi } from "vitest";

const adaptationMock = vi.hoisted(() =>
  vi.fn((lang: string) => `[culture:${lang}]`),
);

vi.mock("./common", () => ({
  getCulturalAdaptationInstruction: adaptationMock,
}));

vi.mock("./atoms/veo", () => ({
  cinematographerRole: () => "[role]",
  perspectiveInstruction: () => "[perspective]",
  visualContinuityRules: () => "[continuity]",
  veoOutputStructure: () => "[output]",
  veoPromptRequirements: () => "[requirements]",
  veoFinalDirective: () => "[final]",
  shotBreakdownTemplate: () => "[shots]",
  mandatoryKeywords: () => "[keywords]",
  avoidList: () => "[avoid]",
}));

import { getVeoScriptPrompt } from "./veoScript";

describe("getVeoScriptPrompt", () => {
  const baseState = {
    theme: "wuxia",
    currentLocation: "loc:harbor",
    locations: [
      {
        id: "loc:harbor",
        name: "Moon Harbor",
        visible: {
          description: "Fog over black water",
          environment: "coastal",
          sensory: {
            smell: "salt",
            sound: "waves",
            lighting: "dim",
            temperature: "cold",
          },
        },
        notes: "Crowded with smugglers",
      },
    ],
    character: {
      name: "Kael",
      title: "Rift Courier",
      age: "29",
      gender: "Male",
      race: "Human",
      profession: "Navigator",
      background: "Raised on smuggler routes",
      appearance: "Blue captain coat",
      status: "focused",
    },
    inventory: [
      {
        name: "Aether Compass",
        visible: {
          description: "Points to rifts",
          sensory: {
            texture: "metal",
            weight: "light",
            smell: "ozone",
          },
        },
        hidden: {
          truth: "Bound to gate core",
        },
      },
    ],
    npcs: [
      {
        visible: {
          name: "Iris",
          title: "Harbor Marshal",
          age: "34",
          gender: "Female",
          race: "Human",
          description: "Harbor captain",
          appearance: "Scarred jaw",
          status: "alert",
          roleTag: "ally",
          profession: "Captain",
          voice: "Gravelly",
          mannerism: "Taps the map table",
          mood: "Guarded",
        },
        hidden: {
          trueName: "Irisa",
          realPersonality: "guarded",
          realMotives: "protect crew",
          status: "exhausted",
        },
        notes: "Distrusts magistrate",
      },
    ],
    nodes: {
      n1: {
        text: "The fog parts as the gate hums awake.",
      },
    },
    activeNodeId: "n1",
  } as any;

  it("renders detailed context XML without duplicating role directive", () => {
    const prompt = getVeoScriptPrompt(baseState, [], "Chinese");

    expect(prompt).not.toContain("[role]");
    expect(prompt).toContain("[perspective]");
    expect(prompt).toContain("[culture:Chinese]");
    expect(adaptationMock).toHaveBeenCalledWith("Chinese");

    expect(prompt).toContain("<theme>wuxia</theme>");
    expect(prompt).toContain("<name>Moon Harbor</name>");
    expect(prompt).toContain("<name>Aether Compass</name>");
    expect(prompt).toContain("<name>Iris</name>");
    expect(prompt).toContain("<name>Kael</name>");
    expect(prompt).toContain("<age>29</age>");
    expect(prompt).toContain("<gender>Male</gender>");
    expect(prompt).toContain("The fog parts as the gate hums awake.");
    expect(prompt).toContain("CHARACTER FIDELITY CONTRACT");
  });

  it("filters history to user/system roles and keeps only last 20", () => {
    const history = [
      ...Array.from({ length: 22 }, (_, index) => ({
        role: "user",
        text: `user-${index}`,
      })),
      { role: "assistant", text: "assistant-ignored" },
      { role: "system", text: "system-last" },
    ] as any;

    const prompt = getVeoScriptPrompt(baseState, history, "English");

    expect(prompt).not.toContain("user-0");
    expect(prompt).toContain("user-4");
    expect(prompt).toContain("system-last");
    expect(prompt).not.toContain("assistant-ignored");
  });

  it("falls back to defaults for missing location, inventory, npcs, and narrative", () => {
    const state = {
      ...baseState,
      currentLocation: "Unknown Harbor",
      locations: [],
      inventory: [],
      npcs: [],
      nodes: {},
      activeNodeId: "missing",
      character: {},
    } as any;

    const prompt = getVeoScriptPrompt(state, [], "English");

    expect(prompt).toContain("<name>Unknown Harbor</name>");
    expect(prompt).toContain("<description>Unknown location</description>");
    expect(prompt).toContain("<none>No items carried</none>");
    expect(prompt).toContain("<none>No NPCs present</none>");
    expect(prompt).toContain("An epic moment unfolds");
    expect(prompt).toContain("<race>Unknown</race>");
    expect(prompt).toContain("<profession>Wanderer</profession>");
  });

  it("matches location by name case-insensitively", () => {
    const state = {
      ...baseState,
      currentLocation: "moon harbor",
    } as any;

    const prompt = getVeoScriptPrompt(state, [], "English");

    expect(prompt).toContain("<name>Moon Harbor</name>");
    expect(prompt).toContain("Fog over black water");
  });
});
