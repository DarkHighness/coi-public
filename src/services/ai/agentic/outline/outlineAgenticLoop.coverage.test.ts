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
    getEffectiveToolChoice: (...args: any[]) => mockGetEffectiveToolChoice(...args),
  },
}));

const mockCallWithAgenticRetry = vi.fn();
vi.mock("../retry", () => ({
  callWithAgenticRetry: (...args: any[]) => mockCallWithAgenticRetry(...args),
}));

const mockDispatchToolCallAsync = vi.fn();
vi.mock("../../../tools/handlers", () => ({
  dispatchToolCallAsync: (...args: any[]) => mockDispatchToolCallAsync(...args),
}));

// Import after mocks are registered
import { generateStoryOutlinePhased } from "./outline";

describe("generateStoryOutlinePhased (coverage)", () => {
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

    const phase1 = {
      storyPlanMarkdown: "# Plan\n\n- Setup\n- Complications\n- Resolution",
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
    };

    const phase2 = {
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
          trueDescription: "A sealed pact is weakening and something is waking.",
          trueConditions: "Restore the seal or pay the price.",
        },
      },
    };

    const phase3 = {
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
            profession: "Scout",
            background: "Raised on the frontier.",
            race: "Human Female",
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

    const phase4 = {
      locations: [
        {
          id: "loc:start",
          knownBy: ["char:player"],
          name: "Abandoned Chapel",
          visible: {
            description: "A chapel with cracked stone and a bell that won't ring.",
            knownFeatures: ["cracked altar", "hanging bell"],
          },
        },
      ],
    };

    const phase5 = {
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

    const phase6 = {
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
      placeholders: [],
      playerPerceptions: [],
    };

    const phase7 = {
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
      knowledge: [
        {
          id: "know:1",
          knownBy: ["char:player"],
          title: "Chapel Rumors",
          category: "legend",
          visible: {
            description: "Locals whisper about a bell that wards off nightmares.",
          },
        },
      ],
    };

    const phase8 = {
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
      initialAtmosphere: {
        envTheme: "fantasy",
        ambience: "quiet",
      },
    };

    const phase9 = {
      openingNarrative: {
        narrative:
          "The bell tower looms above you. The rope is still, yet the air feels heavy.",
        choices: [{ text: "Enter the chapel" }, { text: "Inspect the bell rope" }],
      },
    };

    const dataByToolName: Record<string, unknown> = {
      vfs_commit_outline_phase_1: phase1,
      vfs_commit_outline_phase_2: phase2,
      vfs_commit_outline_phase_3: phase3,
      vfs_commit_outline_phase_4: phase4,
      vfs_commit_outline_phase_5: phase5,
      vfs_commit_outline_phase_6: phase6,
      vfs_commit_outline_phase_7: phase7,
      vfs_commit_outline_phase_8: phase8,
      vfs_commit_outline_phase_9: phase9,
    };

    mockCallWithAgenticRetry.mockImplementation(
      async (
        _provider: any,
        _request: any,
        _history: any,
        opts: any,
      ) => {
        const toolName = String(opts?.finishToolName ?? "");
        const data = dataByToolName[toolName];
        if (!toolName || !data) {
          throw new Error(`Unexpected finishToolName in test: "${toolName}"`);
        }
        return {
          result: {
            functionCalls: [
              {
                id: `call_${toolName}`,
                name: toolName,
                args: { data },
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

  it("runs phases 1-9 with single-shot submits", async () => {
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
    expect(result.outline.locations.some((l) => l.id === "loc:start")).toBe(true);
    expect(mockDispatchToolCallAsync).toHaveBeenCalledTimes(9);
  });
});

