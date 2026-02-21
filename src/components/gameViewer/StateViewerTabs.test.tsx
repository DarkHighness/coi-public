// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoreTab } from "./LoreTab";
import { NPCsTab } from "./NPCsTab";
import { QuestsTab } from "./QuestsTab";
import { WorldTab } from "./WorldTab";

vi.mock("../render/MarkdownText", () => ({
  MarkdownText: ({ content }: { content: string }) =>
    React.createElement("span", null, content),
}));

const t = ((key: string, options?: unknown) => {
  if (
    options &&
    typeof options === "object" &&
    "defaultValue" in options &&
    typeof (options as { defaultValue?: unknown }).defaultValue === "string"
  ) {
    return (options as { defaultValue: string }).defaultValue;
  }
  return key;
}) as any;

const baseState = {
  unlockMode: false,
  playerActorId: "char:player",
  currentLocation: "loc:market",
  worldInfo: null,
  locations: [],
  factions: [],
  quests: [],
  npcs: [],
  actors: [],
  knowledge: [],
  timeline: [],
  inventory: [],
} as any;

describe("GameViewer non-player field coverage", () => {
  it("renders expanded world/location/faction fields", () => {
    const gameState = {
      ...baseState,
      worldInfo: {
        worldSetting: {
          visible: { description: "Known world", rules: "No magic" },
          hidden: { hiddenRules: "Secret law", secrets: ["Hidden sun"] },
          history: "Ancient war",
        },
        worldSettingUnlocked: true,
        worldSettingUnlockReason: "Decoded archive",
      },
      locations: [
        {
          id: "loc:market",
          name: "Sky Market",
          icon: "📍",
          isVisited: true,
          unlocked: true,
          unlockReason: "Found hidden hatch",
          discoveredAt: 1700000000000,
          visible: {
            description: "A floating market",
            knownFeatures: ["Shops"],
            resources: ["Ore"],
            atmosphere: {
              envTheme: "cyberpunk",
              ambience: "city",
              weather: "rain",
            },
          },
          hidden: {
            fullDescription: "Built on an old warship",
            hiddenFeatures: ["Engine room"],
            secrets: ["Ancient AI core"],
          },
        },
      ],
      factions: [
        {
          id: "fac:iron",
          name: "Iron Circle",
          icon: "⚔️",
          unlocked: true,
          unlockReason: "Interrogated captain",
          visible: {
            agenda: "Protect trade",
            members: [{ name: "Vera", title: "Captain" }],
            relations: [
              { target: "fac:veil", status: "Hostile" },
              { target: "fac:unknown_militant", status: "Uneasy" },
            ],
          },
          hidden: {
            agenda: "Control smuggling routes",
            members: [{ name: "Nox", title: "Mole" }],
            relations: [{ target: "fac:veil", status: "Secret pact" }],
          },
        },
        {
          id: "fac:veil",
          name: "Veil Syndicate",
          icon: "⚔️",
          visible: {
            agenda: "Stay hidden",
          },
        },
      ],
    } as any;

    render(
      React.createElement(WorldTab, {
        gameState,
        expandedSections: new Set(["worldSetting", "locations", "factions"]),
        toggleSection: () => undefined,
        t,
      }),
    );

    expect(screen.getByText("Decoded archive")).toBeTruthy();
    expect(screen.getByText("cyberpunk")).toBeTruthy();
    expect(screen.getAllByText(/Members/i).length).toBeGreaterThan(1);
    expect(screen.getByText("Veil Syndicate: Hostile")).toBeTruthy();
    expect(screen.getByText("Unknown Militant: Uneasy")).toBeTruthy();
    expect(screen.getByText("Veil Syndicate: Secret pact")).toBeTruthy();
  });

  it("renders quest type badge and hidden unlock reason", () => {
    const gameState = {
      ...baseState,
      worldInfo: {
        mainGoal: {
          visible: { description: "Survive", conditions: "Find shelter" },
          hidden: {
            trueDescription: "Break the loop",
            trueConditions: "Wake up",
          },
        },
        mainGoalUnlocked: true,
        mainGoalUnlockReason: "Memory trigger",
      },
      quests: [
        {
          id: "quest:1",
          title: "Side Hunt",
          type: "side",
          status: "active",
          icon: "📜",
          unlocked: true,
          unlockReason: "Witness confession",
          visible: { description: "Track clues", objectives: ["Visit dock"] },
          hidden: {
            trueDescription: "Expose a spy",
            trueObjectives: ["Record proof"],
          },
        },
      ],
    } as any;

    render(
      React.createElement(QuestsTab, {
        gameState,
        expandedSections: new Set(["mainGoal", "activeQuests2"]),
        toggleSection: () => undefined,
        t,
      }),
    );

    expect(screen.getByText("side")).toBeTruthy();
    expect(screen.getByText("Memory trigger")).toBeTruthy();
    expect(screen.getByText("Witness confession")).toBeTruthy();
  });

  it("renders knowledge/timeline/inventory extended fields", () => {
    const gameState = {
      ...baseState,
      locations: [
        {
          id: "loc:market",
          name: "Sky Market",
          visible: { description: "Stub" },
        },
      ],
      factions: [
        {
          id: "fac:iron",
          name: "Iron Circle",
          visible: { agenda: "Stub" },
        },
      ],
      knowledge: [
        {
          id: "know:1",
          title: "Old Archive",
          category: "history",
          icon: "📚",
          unlocked: true,
          unlockReason: "Compared two manuscripts",
          discoveredAt: "Day 2",
          relatedTo: ["loc:market"],
          visible: {
            description: "Partially burned",
            details: "Mentions a sky war",
          },
          hidden: {
            fullTruth: "It records a pact.",
            toBeRevealed: ["Signer identity"],
          },
        },
      ],
      timeline: [
        {
          id: "evt:1",
          name: "Silent Siren",
          gameTime: "D2 19:00",
          category: "world_event",
          icon: "⏳",
          unlocked: true,
          unlockReason: "Signal analysis",
          visible: {
            description: "Sirens stopped",
            causedBy: "Unknown jammer",
          },
          hidden: {
            trueDescription: "The jammer was internal.",
            trueCausedBy: "fac:iron",
            consequences: ["Checkpoint lockdown"],
          },
          involvedEntities: ["fac:iron", "loc:market"],
          chainId: "chain:7",
          knownBy: ["char:player"],
        },
      ],
      inventory: [
        {
          id: "item:1",
          name: "Rust Key",
          icon: "🗝️",
          unlocked: true,
          unlockReason: "Chemical test",
          emotionalWeight: "Last gift from mentor",
          visible: {
            description: "Cold to touch",
            observation: "Pattern resembles gate sigil",
          },
          hidden: {
            truth: "Opens the archive vault",
            secrets: ["Needs blood seal"],
          },
        },
      ],
    } as any;

    render(
      React.createElement(LoreTab, {
        gameState,
        expandedSections: new Set(["knowledge", "timeline", "inventory"]),
        toggleSection: () => undefined,
        t,
      }),
    );

    expect(screen.getByText("Mentions a sky war")).toBeTruthy();
    expect(screen.getAllByText("Sky Market").length).toBeGreaterThan(0);
    expect(screen.getByText("Signer identity")).toBeTruthy();
    expect(screen.getByText(/Caused By/i)).toBeTruthy();
    expect(screen.getByText("Unknown jammer")).toBeTruthy();
    expect(screen.getByText(/True Cause/i)).toBeTruthy();
    expect(screen.getAllByText("Iron Circle").length).toBeGreaterThan(0);
    expect(screen.getByText("chain:7")).toBeTruthy();
    expect(screen.getByText(/Observation/i)).toBeTruthy();
    expect(screen.getByText("Pattern resembles gate sigil")).toBeTruthy();
    expect(screen.getByText(/Emotional Weight/i)).toBeTruthy();
  });

  it("renders NPC visible details and relation hidden details", () => {
    const gameState = {
      ...baseState,
      actors: [
        {
          profile: {
            id: "char:player",
            kind: "player",
            currentLocation: "loc:market",
            knownBy: ["char:player"],
            visible: { name: "Player" },
            relations: [
              {
                id: "rel:perception-1",
                kind: "perception",
                to: { kind: "character", id: "char:npc_1" },
                knownBy: ["char:player"],
                visible: {
                  description: "Seems guarded.",
                  evidence: ["Avoids eye contact"],
                },
              },
            ],
          },
        },
      ],
      npcs: [
        {
          id: "char:npc_1",
          kind: "npc",
          knownBy: ["char:player"],
          currentLocation: "loc:market",
          visible: {
            name: "Watcher",
            race: "Human",
            gender: "Female",
          },
          relations: [
            {
              id: "rel:attitude-1",
              kind: "attitude",
              to: { kind: "character", id: "char:player" },
              knownBy: ["char:npc_1", "char:player"],
              unlocked: true,
              unlockReason: "Mind link opened",
              visible: { signals: ["Cold smile"] },
              hidden: {
                affinity: "Guarded trust",
                observation: "Testing every response",
                ambivalence: "Needs the player but fears betrayal",
                transactionalBenefit: "Access to vault routes",
                motives: "Protects own secret",
              },
            },
          ],
          hidden: {},
        },
      ],
    } as any;

    render(
      React.createElement(NPCsTab, {
        gameState,
        expandedSections: new Set(["npcs"]),
        toggleSection: () => undefined,
        t,
      }),
    );

    expect(screen.getByText("Avoids eye contact")).toBeTruthy();
    expect(screen.getByText("Mind link opened")).toBeTruthy();
    expect(screen.getByText("Protects own secret")).toBeTruthy();
  });

  it("does not render NPC hidden unlock content when only NPC knows it", () => {
    const gameState = {
      ...baseState,
      actors: [
        {
          profile: {
            id: "char:player",
            kind: "player",
            currentLocation: "loc:market",
            knownBy: ["char:player"],
            visible: { name: "Player" },
            relations: [],
          },
        },
      ],
      npcs: [
        {
          id: "char:npc_1",
          kind: "npc",
          knownBy: ["char:player"],
          currentLocation: "loc:market",
          visible: { name: "Watcher" },
          relations: [
            {
              id: "rel:attitude-1",
              kind: "attitude",
              to: { kind: "character", id: "char:player" },
              knownBy: ["char:npc_1"],
              unlocked: true,
              unlockReason: "Mind link opened",
              visible: { signals: ["Cold smile"] },
              hidden: {
                affinity: "Guarded trust",
                motives: "Protects own secret",
              },
            },
          ],
          hidden: {
            realMotives:
              "Hidden from player unless unlocked by player evidence",
          },
          unlocked: false,
        },
      ],
    } as any;

    render(
      React.createElement(NPCsTab, {
        gameState,
        expandedSections: new Set(["npcs"]),
        toggleSection: () => undefined,
        t,
      }),
    );

    expect(screen.queryByText("Mind link opened")).toBeNull();
    expect(screen.queryByText("Protects own secret")).toBeNull();
    expect(
      screen.queryByText(
        "Hidden from player unless unlocked by player evidence",
      ),
    ).toBeNull();
  });
});
