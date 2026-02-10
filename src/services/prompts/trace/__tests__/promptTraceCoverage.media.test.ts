import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSceneImagePrompt } from "../../sceneImage";
import { getVeoScriptPrompt } from "../../veoScript";
import {
  clearPromptTraceRegistry,
  getLatestPromptTrace,
  setPromptTraceEnabled,
} from "../runtime";
import { validatePromptTrace } from "../policy";

const createMediaState = () =>
  ({
    theme: "fantasy",
    currentLocation: "loc:ruins",
    time: "Night",
    atmosphere: {
      weather: "Rain",
      ambience: "quiet",
      envTheme: "dark-fantasy",
    },
    character: {
      name: "Luna",
      race: "Human",
      profession: "Scout",
      appearance: "Silver hair, dark coat",
      status: "Wary",
    },
    outline: {
      title: "Echoes of Stone",
      worldSetting: {
        visible: {
          description: "Ruined frontier with old wards",
          rules: "Magic is costly",
        },
        hidden: {
          hiddenRules: "Old wards draw attention",
          secrets: "Relics respond to bloodline",
        },
      },
    },
    locations: [
      {
        id: "loc:ruins",
        name: "Old Ruins",
        visible: {
          description: "Broken arches and wet stone",
          environment: "Ruins",
          atmosphere: "Cold and silent",
          sensory: {
            smell: "Wet moss",
            sound: "Distant water",
            lighting: "Moonlight",
            temperature: "Cold",
          },
          knownFeatures: ["Collapsed tower"],
          interactables: ["Ancient gate"],
          resources: ["Old rope"],
        },
      },
    ],
    npcs: [
      {
        id: "char:npc_1",
        visible: {
          name: "Aria",
          description: "Local guide",
          appearance: "Red cloak",
          status: "Tense",
        },
        hidden: {
          trueName: "Aria",
          realPersonality: "Pragmatic",
          realMotives: "Protect her brother",
          status: "Watching",
        },
        notes: "Keeps distance from ruins",
      },
    ],
    inventory: [
      {
        name: "Rusty Key",
        visible: {
          description: "Old iron key",
          sensory: {
            texture: "rough",
            weight: "light",
            smell: "iron",
          },
        },
        hidden: {
          truth: "Opens sealed archive",
        },
      },
    ],
    nodes: {
      n1: {
        text: "Rain hammers the ruins as you step forward.",
      },
    },
    activeNodeId: "n1",
    customRules: [],
  }) as any;
const loadGraph = () =>
  JSON.parse(
    fs.readFileSync(
      path.resolve(process.cwd(), "src/services/prompts/trace/generated/prompt-atom-graph.json"),
      "utf8",
    ),
  );


describe("prompt trace coverage - media", () => {
  afterEach(() => {
    clearPromptTraceRegistry();
    setPromptTraceEnabled(false);
  });

  it("covers required atoms in media.sceneImage", () => {
    setPromptTraceEnabled(true);

    const prompt = getSceneImagePrompt(
      "Aria stands beside Luna under rain.",
      createMediaState(),
    );
    expect(prompt.length).toBeGreaterThan(0);

    const trace = getLatestPromptTrace("media.sceneImage");
    expect(trace).toBeDefined();

    const result = validatePromptTrace(
      "media.sceneImage",
      trace!,
      loadGraph() as any,
    );
    expect(result.ok).toBe(true);
  });

  it("covers required atoms in media.veoScript", () => {
    setPromptTraceEnabled(true);

    const prompt = getVeoScriptPrompt(
      createMediaState(),
      [
        { role: "user", text: "Move toward the gate." },
        { role: "system", text: "Rain falls harder." },
      ] as any,
      "English",
    );

    expect(prompt.length).toBeGreaterThan(0);

    const trace = getLatestPromptTrace("media.veoScript");
    expect(trace).toBeDefined();

    const result = validatePromptTrace(
      "media.veoScript",
      trace!,
      loadGraph() as any,
    );
    expect(result.ok).toBe(true);
  });
});
