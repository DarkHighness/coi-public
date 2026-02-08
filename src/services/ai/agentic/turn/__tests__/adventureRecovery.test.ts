import { beforeEach, describe, expect, it, vi } from "vitest";

const setupSessionMock = vi.hoisted(() => vi.fn());
const handleRetryDetectionMock = vi.hoisted(() => vi.fn());
const rollbackToTurnAnchorMock = vi.hoisted(() => vi.fn());
const createCheckpointMock = vi.hoisted(() => vi.fn());
const appendToHistoryMock = vi.hoisted(() => vi.fn());

const runAgenticLoopRefactoredMock = vi.hoisted(() => vi.fn());

const executeTurnWithRecoveryMock = vi.hoisted(() => vi.fn());
const getRecoveryKindMock = vi.hoisted(() => vi.fn());
const getRecoveryTraceMock = vi.hoisted(() => vi.fn());

const sessionManagerMock = vi.hoisted(() => ({
  invalidate: vi.fn(),
  onContextOverflow: vi.fn(),
}));

vi.mock("../context", () => ({
  setupSession: setupSessionMock,
  handleRetryDetection: handleRetryDetectionMock,
  rollbackToTurnAnchor: rollbackToTurnAnchorMock,
  createCheckpoint: createCheckpointMock,
  appendToHistory: appendToHistoryMock,
  buildTurnMessages: vi.fn(() => ({
    contextMessages: [],
    userMessage: {
      role: "user",
      content: [{ type: "text", text: "[PLAYER_ACTION] attack" }],
    },
    godModeContext: "",
  })),
}));

vi.mock("../agenticLoop", () => ({
  runAgenticLoopRefactored: runAgenticLoopRefactoredMock,
}));

vi.mock("../turnRecoveryRunner", () => ({
  executeTurnWithRecovery: executeTurnWithRecoveryMock,
  getRecoveryKind: getRecoveryKindMock,
  getRecoveryTrace: getRecoveryTraceMock,
}));

vi.mock("@/services/ai/sessionManager", () => ({
  sessionManager: sessionManagerMock,
}));

vi.mock("@/services/prompts/skills", () => ({
  buildCoreSystemInstructionWithSkills: vi.fn(() => "SYSTEM"),
}));

vi.mock("@/services/ai/utils", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  return {
    ...actual,
    getProviderConfig: vi.fn(() => ({
      instance: { id: "provider-1", protocol: "openai" },
      modelId: "model-1",
    })),
    resolveThemeConfig: vi.fn(() => ({
      narrativeStyle: "style",
      backgroundTemplate: "bg",
      example: "example",
      worldSetting: "world",
      isRestricted: false,
    })),
    resolveNarrativeStyle: vi.fn(() => "style"),
    resolveWorldDisposition: vi.fn(() => "disposition"),
    resolvePlayerMaliceProfile: vi.fn(() => "malice"),
    resolveEffectivePresetProfile: vi.fn(() => ({
      narrativeStylePreset: { value: "theme", source: "theme_default" },
      worldDispositionPreset: { value: "theme", source: "theme_default" },
      playerMalicePreset: { value: "theme", source: "theme_default" },
      playerMaliceIntensity: { value: "standard", source: "theme_default" },
    })),
    pickModelMatchedPrompt: vi.fn(() => undefined),
  };
});

vi.mock("@/services/prompts/runtimeFloor", () => ({
  composeSystemInstruction: vi.fn(() => "SYSTEM"),
  getTurnRuntimeFloor: vi.fn(() => "RUNTIME_FLOOR"),
}));

vi.mock("@/services/customRulesAckState", () => ({
  syncCustomRulesAckState: vi.fn(() => ({})),
}));

vi.mock("@/prompt/prompt.toml", () => ({
  default: {},
}));

import { generateAdventureTurn } from "../adventure";

const baseGameState = {
  character: {
    name: "Hero",
    title: "Warrior",
    currentLocation: "loc_town",
  },
  outline: {},
  themeConfig: {
    narrativeStyle: "style",
    backgroundTemplate: "bg",
    example: "example",
    worldSetting: "world",
    isRestricted: false,
  },
  customRules: [],
  godMode: false,
  playerProfile: null,
  customContext: null,
  forkId: 0,
} as any;

const makeContext = () => ({
  settings: {
    story: {
      providerId: "provider-1",
      modelId: "model-1",
    },
    extra: {},
  },
  themeKey: "default",
  language: "en",
  tFunc: vi.fn((key: string) => key),
  userAction: "attack",
  slotId: "slot-1",
  isInit: false,
  vfsSession: {
    bindConversationSession: vi.fn(),
    beginReadEpoch: vi.fn(),
  },
  onToolCallsUpdate: vi.fn(),
}) as any;

describe("generateAdventureTurn recovery wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    setupSessionMock.mockResolvedValue({
      sessionId: "slot-1:0:provider-1:model-1",
      activeHistory: [],
    });
    handleRetryDetectionMock.mockImplementation((_: unknown, history: unknown) => history);

    runAgenticLoopRefactoredMock.mockResolvedValue({
      response: { narrative: "ok", choices: [] },
      logs: [],
      usage: {
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
        cacheRead: 0,
        cacheWrite: 0,
      },
      changedEntities: [],
      _conversationHistory: [
        {
          role: "assistant",
          content: [{ type: "text", text: "done" }],
        },
      ],
    });

    executeTurnWithRecoveryMock.mockImplementation(
      async ({ execute }: { execute: () => Promise<unknown> }) => {
        const result = await execute();
        return {
          result,
          recovery: {
            attempts: [],
            finalLevel: 0,
            kind: "unknown",
            recovered: false,
            durationMs: 1,
          },
        };
      },
    );

    sessionManagerMock.invalidate.mockResolvedValue(undefined);
    sessionManagerMock.onContextOverflow.mockResolvedValue({ needsSummary: true });
    getRecoveryKindMock.mockReturnValue(undefined);
    getRecoveryTraceMock.mockReturnValue(undefined);
  });

  it("passes recovery metadata through on successful execution", async () => {
    executeTurnWithRecoveryMock.mockImplementationOnce(
      async ({ execute }: { execute: () => Promise<unknown> }) => {
        const result = await execute();
        return {
          result,
          recovery: {
            attempts: [{ level: 1, kind: "history", attempt: 2, timestamp: Date.now() }],
            finalLevel: 1,
            kind: "history",
            recovered: true,
            durationMs: 100,
          },
        };
      },
    );

    const result = await generateAdventureTurn(baseGameState, makeContext());

    expect(result.recovery).toEqual(
      expect.objectContaining({
        kind: "history",
        recovered: true,
        finalLevel: 1,
      }),
    );
    expect(createCheckpointMock).toHaveBeenCalledTimes(1);
    expect(appendToHistoryMock).toHaveBeenCalledTimes(1);
  });

  it("maps context recovery failure to CONTEXT_LENGTH_EXCEEDED and keeps trace", async () => {
    const originalError = new Error("context overflow after retries");
    getRecoveryKindMock.mockReturnValue("context");
    getRecoveryTraceMock.mockReturnValue({
      attempts: [{ level: 2, kind: "context", attempt: 3, timestamp: Date.now() }],
      finalLevel: 3,
      kind: "context",
      recovered: false,
      durationMs: 222,
    });
    executeTurnWithRecoveryMock.mockRejectedValueOnce(originalError);

    await expect(generateAdventureTurn(baseGameState, makeContext())).rejects.toSatisfy(
      (error: unknown) => {
        if (!(error instanceof Error)) return false;
        const typed = error as Error & {
          recovery?: { kind?: string };
          recoveryKind?: string;
        };
        return (
          typed.message.includes("CONTEXT_LENGTH_EXCEEDED") &&
          typed.recovery?.kind === "context" &&
          typed.recoveryKind === "context"
        );
      },
    );

    expect(sessionManagerMock.onContextOverflow).toHaveBeenCalledTimes(1);
  });

  it("reset callback invalidates session for non-context errors", async () => {
    executeTurnWithRecoveryMock.mockImplementationOnce(
      async ({ execute, resetSession }: { execute: () => Promise<unknown>; resetSession: (kind: string) => Promise<void> }) => {
        await resetSession("history");
        const result = await execute();
        return {
          result,
          recovery: {
            attempts: [{ level: 2, kind: "history", attempt: 3, timestamp: Date.now() }],
            finalLevel: 2,
            kind: "history",
            recovered: true,
            durationMs: 77,
          },
        };
      },
    );

    const context = makeContext();
    await generateAdventureTurn(baseGameState, context);

    expect(sessionManagerMock.invalidate).toHaveBeenCalledTimes(1);
    expect(sessionManagerMock.onContextOverflow).not.toHaveBeenCalled();
    expect(context.vfsSession.beginReadEpoch).toHaveBeenCalledWith("manual_invalidate");
  });
});
