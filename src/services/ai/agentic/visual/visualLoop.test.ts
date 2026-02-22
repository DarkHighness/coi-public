import { beforeEach, describe, expect, it, vi } from "vitest";
import { runVisualLoop } from "./visualLoop";
import { getProviderConfig, createLogEntry } from "../../utils";
import { sessionManager } from "../../sessionManager";
import { callWithAgenticRetry } from "../retry";
import {
  buildVisualContextMessages,
  getVisualSystemInstruction,
} from "./visualContext";

vi.mock("../../utils", () => ({
  getProviderConfig: vi.fn(),
  createLogEntry: vi.fn(),
}));

vi.mock("../../sessionManager", () => ({
  sessionManager: {
    getOrCreateSession: vi.fn(),
    getProvider: vi.fn(),
  },
}));

vi.mock("../retry", () => ({
  callWithAgenticRetry: vi.fn(),
  createPromptTokenBudgetContext: () => ({
    get: () => null,
    set: () => {},
  }),
}));

vi.mock("./visualContext", () => ({
  getVisualSystemInstruction: vi.fn(),
  buildVisualContextMessages: vi.fn(),
}));

const mockedGetProviderConfig = vi.mocked(getProviderConfig);
const mockedCreateLogEntry = vi.mocked(createLogEntry);
const mockedGetOrCreateSession = vi.mocked(sessionManager.getOrCreateSession);
const mockedGetProvider = vi.mocked(sessionManager.getProvider);
const mockedCallWithAgenticRetry = vi.mocked(callWithAgenticRetry);
const mockedGetVisualSystemInstruction = vi.mocked(getVisualSystemInstruction);
const mockedBuildVisualContextMessages = vi.mocked(buildVisualContextMessages);

describe("runVisualLoop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetVisualSystemInstruction.mockReturnValue("sys");
    mockedBuildVisualContextMessages.mockReturnValue([
      { role: "user", content: [{ type: "text", text: "ctx" }] },
    ] as any);
    mockedCreateLogEntry.mockReturnValue({
      endpoint: "visual-iteration-1",
    } as any);
    mockedGetOrCreateSession.mockResolvedValue({ id: "visual-session" } as any);
    mockedGetProvider.mockReturnValue({ provider: "instance" } as any);
  });

  it("throws when no visual provider config is available", async () => {
    mockedGetProviderConfig.mockReturnValue(null as any);

    await expect(
      runVisualLoop({
        gameState: { forkId: 0 } as any,
        segment: { id: 1, text: "scene" } as any,
        vfsSession: {} as any,
        settings: {} as any,
        target: "image_prompt",
        language: "en",
      }),
    ).rejects.toThrow(
      "No provider config found for visual loop route (story). Please check your model settings.",
    );
  });

  it("submits visual result and stops loop once finish tool is called", async () => {
    mockedGetProviderConfig.mockReturnValue({
      instance: { id: "provider-1", protocol: "openai" },
      modelId: "model-1",
    } as any);

    mockedCallWithAgenticRetry.mockResolvedValue({
      result: {
        functionCalls: [
          {
            id: "call-1",
            name: "submit_image_prompt_result",
            args: {
              imagePrompt: "a cinematic still",
            },
          },
        ],
      },
      usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
      raw: { raw: true },
    } as any);

    const onProgress = vi.fn();

    const result = await runVisualLoop({
      gameState: { forkId: 2 } as any,
      segment: { id: 99, text: "Aria enters" } as any,
      vfsSession: {} as any,
      settings: {} as any,
      target: "image_prompt",
      language: "en",
      onProgress,
    });

    expect(mockedGetProviderConfig).toHaveBeenCalledWith(
      expect.anything(),
      "story",
    );
    expect(mockedGetOrCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        slotId: "visual-99",
        forkId: 2,
        providerId: "provider-1",
        modelId: "model-1",
        protocol: "openai",
      }),
    );

    expect(mockedCallWithAgenticRetry).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      imagePrompt: "a cinematic still",
      logs: [{ endpoint: "visual-iteration-1" }],
      usage: {
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3,
        cacheRead: 0,
        cacheWrite: 0,
      },
    });

    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith({
      status: "visual.analyzingStoryContext",
      iteration: 1,
      totalIterations: 3,
    });
  });
});
