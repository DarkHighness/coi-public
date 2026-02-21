import { describe, expect, it, vi, beforeEach } from "vitest";

import { VfsSession } from "../../../vfs/vfsSession";

const mockGetProviderConfig = vi.fn();
vi.mock("../../utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils")>();
  return {
    ...actual,
    getProviderConfig: (...args: any[]) => mockGetProviderConfig(...args),
  };
});

const mockGetCurrentSession = vi.fn();
const mockInvalidate = vi.fn();
const mockGetOrCreateSession = vi.fn();
const mockIsEmpty = vi.fn();
const mockSetHistory = vi.fn();
const mockSetCacheHint = vi.fn();
const mockGetProvider = vi.fn();
const mockGetEffectiveToolChoice = vi.fn();

vi.mock("../../sessionManager", () => ({
  sessionManager: {
    getCurrentSession: (...args: any[]) => mockGetCurrentSession(...args),
    invalidate: (...args: any[]) => mockInvalidate(...args),
    getOrCreateSession: (...args: any[]) => mockGetOrCreateSession(...args),
    isEmpty: (...args: any[]) => mockIsEmpty(...args),
    setHistory: (...args: any[]) => mockSetHistory(...args),
    setCacheHint: (...args: any[]) => mockSetCacheHint(...args),
    getProvider: (...args: any[]) => mockGetProvider(...args),
    getEffectiveToolChoice: (...args: any[]) =>
      mockGetEffectiveToolChoice(...args),
  },
}));

const mockCallWithAgenticRetry = vi.fn();
vi.mock("../retry", () => ({
  callWithAgenticRetry: (...args: any[]) => mockCallWithAgenticRetry(...args),
  createPromptTokenBudgetContext: () => ({
    get: () => null,
    set: () => {},
  }),
}));

const mockDispatchToolCallAsync = vi.fn();
vi.mock("../../../tools/handlers", () => ({
  dispatchToolCallAsync: (...args: any[]) => mockDispatchToolCallAsync(...args),
}));

// Import after mocks are registered
import { generateStoryOutlinePhased } from "./outline";
import { getActiveOutlinePhases } from "./phaseRegistry";

const messageContainsText = (message: any, text: string): boolean => {
  if (!message || message.role !== "user") return false;
  if (typeof message.content === "string") {
    return message.content.includes(text);
  }
  if (!Array.isArray(message.content)) return false;
  return message.content.some(
    (part: any) => part?.type === "text" && String(part?.text).includes(text),
  );
};

describe("generateStoryOutlinePhased (coverage)", () => {
  let phasePlayerActor: any;
  let phasePayloads: any[];

  beforeEach(() => {
    vi.clearAllMocks();

    const providerInstance = {
      id: "p1",
      enabled: true,
      protocol: "openai",
      apiKey: "test-key",
      baseUrl: "http://localhost",
    } as any;

    mockGetProviderConfig.mockReturnValue({
      instance: providerInstance,
      modelId: "m1",
    });

    mockGetCurrentSession.mockReturnValue({ id: "outline-new-slot-1" });
    mockInvalidate.mockResolvedValue(undefined);
    mockGetOrCreateSession.mockResolvedValue({ id: "outline-new-slot-1" });
    mockIsEmpty.mockReturnValue(false);
    mockGetProvider.mockReturnValue({} as any);
    mockGetEffectiveToolChoice.mockReturnValue("required");

    mockDispatchToolCallAsync.mockResolvedValue({ success: true });

    const phaseMasterPlan = {
      storyPlanMarkdown: "# Plan\n\n- Setup\n- Complications\n- Resolution",
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
    };

    const phasePlaceholderRegistry = {
      placeholders: [],
    };

    const phaseWorldFoundation = {
      title: "Demo Adventure",
      initialTime: "Day 1",
      premise: "A quiet place is no longer quiet.",
      narrativeScale: "balanced",
      worldSetting: {
        visible: { description: "A grounded world with hints of the uncanny." },
        hidden: {},
        history: "Old promises were broken.",
      },
      mainGoal: {
        visible: {
          description: "Find out what silenced the chapel bell.",
          conditions: "Follow the traces and survive the night.",
        },
        hidden: {
          trueDescription:
            "A sealed pact is weakening and something is waking.",
          trueConditions: "Restore the seal or pay the price.",
        },
      },
    };

    phasePlayerActor = {
      player: {
        profile: {
          id: "char:player",
          kind: "player",
          currentLocation: "loc:start",
          knownBy: ["char:player"],
          visible: {
            name: "Aerin",
            title: "Wanderer",
            age: "25",
            gender: "Female",
            profession: "Scout",
            background: "Raised on the frontier.",
            race: "Human",
            appearance: "Lean, weathered, sharp-eyed.",
            status: "Searching for answers.",
            attributes: [],
          },
        },
        skills: [],
        conditions: [],
        traits: [],
        inventory: [],
      },
    };

    const phaseLocations = {
      locations: [
        {
          id: "loc:start",
          knownBy: ["char:player"],
          name: "Abandoned Chapel",
          visible: {
            description:
              "A chapel with cracked stone and a bell that won't ring.",
            knownFeatures: ["cracked altar", "hanging bell"],
          },
        },
      ],
    };

    const phaseFactions = {
      factions: [
        {
          id: "fac:order",
          knownBy: ["char:player"],
          name: "Order of Ash",
          visible: { agenda: "Keep the old roads safe." },
          hidden: { agenda: "Recover forbidden relics at any cost." },
        },
      ],
    };

    const phaseNpcsRelationships = {
      npcs: [
        {
          profile: {
            id: "npc:1",
            kind: "npc",
            currentLocation: "loc:start",
            knownBy: ["char:player"],
            visible: { name: "Harlen" },
          },
          skills: [],
          conditions: [],
          traits: [],
          inventory: [],
        },
      ],
      playerPerceptions: [],
    };

    const phaseQuests = {
      quests: [
        {
          id: "quest:1",
          knownBy: ["char:player"],
          title: "Silenced Bell",
          type: "main",
          visible: {
            description: "Investigate why the bell stopped ringing.",
            objectives: ["Search the chapel", "Find the source of the silence"],
          },
        },
      ],
    };

    const phaseKnowledge = {
      knowledge: [
        {
          id: "know:1",
          knownBy: ["char:player"],
          title: "Chapel Rumors",
          category: "legend",
          visible: {
            description:
              "Locals whisper about a bell that wards off nightmares.",
          },
        },
      ],
    };

    const phaseTimeline = {
      timeline: [
        {
          id: "evt:1",
          knownBy: ["char:player"],
          name: "The Bell Falls Silent",
          gameTime: "Day 0",
          category: "world_event",
          visible: { description: "The chapel bell stopped without warning." },
        },
      ],
    };

    const phaseAtmosphere = {
      initialAtmosphere: {
        envTheme: "fantasy",
        ambience: "quiet",
      },
    };

    const phaseOpeningNarrative = {
      openingNarrative: {
        narrative:
          "The bell tower looms above you. The rope is still, yet the air feels heavy.",
        choices: [
          { text: "Enter the chapel" },
          { text: "Inspect the bell rope" },
        ],
      },
    };

    phasePayloads = [
      phaseMasterPlan,
      phasePlaceholderRegistry,
      phaseWorldFoundation,
      phasePlayerActor,
      phaseLocations,
      phaseFactions,
      phaseNpcsRelationships,
      phaseQuests,
      phaseKnowledge,
      phaseTimeline,
      phaseAtmosphere,
      phaseOpeningNarrative,
    ];
    const phaseDefs = getActiveOutlinePhases({ hasImageContext: false });
    const payloadByToolName = new Map<string, unknown>();
    for (let i = 0; i < phaseDefs.length; i += 1) {
      payloadByToolName.set(phaseDefs[i].submitToolName, phasePayloads[i]);
    }
    let submitCount = 0;

    mockCallWithAgenticRetry.mockImplementation(
      async (_provider: any, _request: any, _history: any, opts: any) => {
        const toolName = String(opts?.finishToolName ?? "");
        const data = payloadByToolName.get(toolName);
        submitCount += 1;
        if (!toolName || !data) {
          throw new Error(
            `Unexpected finishToolName in test: "${toolName}" (${submitCount})`,
          );
        }
        return {
          result: {
            functionCalls: [
              {
                id: `call_${toolName}`,
                name: toolName,
                args: data,
              },
            ],
          },
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          raw: {},
          retries: 0,
        };
      },
    );
  });

  it("runs phases 1-12 with single-shot submits", async () => {
    const vfsSession = new VfsSession();

    const result = await generateStoryOutlinePhased(
      "fantasy",
      "English",
      undefined,
      undefined,
      {
        slotId: "slot-1",
        settings: { extra: {} } as any,
        vfsSession,
        enableReadOnlyVfsTools: false,
      },
    );

    expect(result.outline.title).toBe("Demo Adventure");
    expect(result.outline.player.profile.currentLocation).toBe("loc:start");
    expect(result.outline.locations.some((l) => l.id === "loc:start")).toBe(
      true,
    );
    expect(mockDispatchToolCallAsync).toHaveBeenCalledTimes(12);
  });

  it("does not inject resume anchor when resume history already has messages", async () => {
    const vfsSession = new VfsSession();

    const result = await generateStoryOutlinePhased(
      "fantasy",
      "English",
      undefined,
      undefined,
      {
        slotId: "slot-1",
        settings: { extra: {} } as any,
        vfsSession,
        enableReadOnlyVfsTools: false,
        resumeFrom: {
          theme: "fantasy",
          language: "English",
          customContext: undefined,
          conversationHistory: [
            {
              role: "user",
              content:
                "Continuing an interrupted outline run with existing history.",
            },
          ] as any[],
          partial: {},
          currentPhaseId: "master_plan",
        },
      },
    );

    const firstCallHistory = mockCallWithAgenticRetry.mock.calls[0]?.[2] as
      | any[]
      | undefined;
    expect(firstCallHistory).toBeDefined();
    expect(
      firstCallHistory?.some((message) =>
        messageContainsText(message, "[OUTLINE RESUME ANCHOR]"),
      ),
    ).toBe(false);
    expect(result.outline.title).toBe("Demo Adventure");
  });

  it('rejects player_actor submit when player profile id is not "char:player"', async () => {
    phasePlayerActor.player.profile.id = "char:npc_bad";
    const phaseDefs = getActiveOutlinePhases({ hasImageContext: false });
    const payloadByToolName = new Map<string, unknown>();
    for (let i = 0; i < phaseDefs.length; i += 1) {
      payloadByToolName.set(phaseDefs[i].submitToolName, phasePayloads[i]);
    }
    let playerActorAttempts = 0;
    let sawValidationError = false;

    mockCallWithAgenticRetry.mockImplementation(
      async (_provider: any, _request: any, history: any, opts: any) => {
        const toolName = String(opts?.finishToolName ?? "");

        if (toolName === "vfs_finish_outline_player_actor") {
          playerActorAttempts += 1;
          if (playerActorAttempts === 1) {
            return {
              result: {
                functionCalls: [
                  {
                    id: `call_${toolName}`,
                    name: toolName,
                    args: phasePlayerActor,
                  },
                ],
              },
              usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
              raw: {},
              retries: 0,
            };
          }

          const historyText = JSON.stringify(history);
          sawValidationError =
            historyText.includes("player.profile.id") &&
            historyText.includes("char:player");
          throw new Error("STOP_AFTER_VALIDATION");
        }

        const data = payloadByToolName.get(toolName);
        if (!toolName || !data) {
          throw new Error(`Unexpected finishToolName in test: "${toolName}"`);
        }

        return {
          result: {
            functionCalls: [
              {
                id: `call_${toolName}`,
                name: toolName,
                args: data,
              },
            ],
          },
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          raw: {},
          retries: 0,
        };
      },
    );

    const vfsSession = new VfsSession();

    await expect(
      generateStoryOutlinePhased("fantasy", "English", undefined, undefined, {
        slotId: "slot-1",
        settings: { extra: {} } as any,
        vfsSession,
        enableReadOnlyVfsTools: false,
      }),
    ).rejects.toThrow("STOP_AFTER_VALIDATION");
    expect(sawValidationError).toBe(true);
  });
});
