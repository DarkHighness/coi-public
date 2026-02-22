// @vitest-environment jsdom

import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readTurnFile, writeTurnFile } from "../../services/vfs/conversation";
import { VfsSession } from "../../services/vfs/vfsSession";

const generateSceneImageMock = vi.hoisted(() => vi.fn());
const saveImageMock = vi.hoisted(() => vi.fn());

vi.mock("../../services/aiService", () => ({
  generateSceneImage: generateSceneImageMock,
}));

vi.mock("../../utils/imageStorage", () => ({
  saveImage: saveImageMock,
}));

import { useImageGenerationQueue } from "./imageGeneration";

const createHarness = (
  node: any,
  aiSettings: any = {},
  onGenerationIssue = vi.fn(),
  vfsSession: VfsSession = new VfsSession(),
) => {
  const nodeId = typeof node?.id === "string" ? node.id : "n1";
  let state = {
    nodes: { [nodeId]: node },
    forkId: 2,
    turnNumber: 9,
    logs: [],
    tokenUsage: {
      promptTokens: 1,
      completionTokens: 2,
      totalTokens: 3,
      cacheRead: 0,
      cacheWrite: 0,
    },
    outline: { title: "Chronicles" },
    currentLocation: "Harbor",
    time: "Night",
    isImageGenerating: false,
    generatingNodeId: null,
  } as any;

  const gameStateRef = { current: state } as any;

  const setGameState = vi.fn((updater: any) => {
    state = typeof updater === "function" ? updater(state) : updater;
    gameStateRef.current = state;
  });

  const triggerSave = vi.fn();

  let api: ReturnType<typeof useImageGenerationQueue> | null = null;

  const Probe = () => {
    api = useImageGenerationQueue({
      aiSettings,
      currentSlotId: "slot-1",
      vfsSession,
      gameStateRef,
      setGameState,
      triggerSave,
      onGenerationIssue,
    });
    return React.createElement("div");
  };

  render(React.createElement(Probe));

  return {
    get api() {
      if (!api) {
        throw new Error("hook unavailable");
      }
      return api;
    },
    getState: () => state,
    setGameState,
    triggerSave,
    onGenerationIssue,
    vfsSession,
  };
};

describe("useImageGenerationQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips queueing when node is missing image prompt", async () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    const harness = createHarness({ id: "n1", imagePrompt: "" });

    await act(async () => {
      await harness.api.generateImageForNode("n1");
    });

    expect(generateSceneImageMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(harness.onGenerationIssue).toHaveBeenCalledWith({
      code: "missing_prompt",
      nodeId: "n1",
    });
  });

  it("generates image blob, stores image id, and triggers save", async () => {
    generateSceneImageMock.mockResolvedValue({
      url: "",
      blob: new Blob(["img"]),
      log: {
        usage: {
          promptTokens: 4,
          completionTokens: 5,
          totalTokens: 9,
          cacheRead: 1,
          cacheWrite: 2,
        },
      },
    });
    saveImageMock.mockResolvedValue("img-123");

    const harness = createHarness({
      id: "n1",
      imagePrompt: "moon harbor",
      segmentIdx: 7,
      stateSnapshot: { turnNumber: 7 },
    });

    await act(async () => {
      await harness.api.generateImageForNode("n1");
    });

    await waitFor(() => {
      expect(saveImageMock).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.objectContaining({
          saveId: "slot-1",
          forkId: 2,
          turnIdx: 7,
          imagePrompt: "moon harbor",
          storyTitle: "Chronicles",
          location: "Harbor",
          storyTime: "Night",
        }),
      );
      expect(harness.getState().nodes.n1.imageId).toBe("img-123");
      expect(harness.getState().nodes.n1.imageUrl).toBeUndefined();
      expect(harness.getState().tokenUsage.totalTokens).toBe(12);
      expect(harness.triggerSave).toHaveBeenCalled();
    });
  });

  it("persists generated image metadata to conversation turn media", async () => {
    generateSceneImageMock.mockResolvedValue({
      url: "",
      blob: new Blob(["img"]),
      log: {
        usage: {
          promptTokens: 1,
          completionTokens: 1,
          totalTokens: 2,
          cacheRead: 0,
          cacheWrite: 0,
        },
      },
    });
    saveImageMock.mockResolvedValue("img-123");

    const vfsSession = new VfsSession();
    writeTurnFile(vfsSession, 2, 7, {
      turnId: "fork-2/turn-7",
      forkId: 2,
      turnNumber: 7,
      parentTurnId: "fork-2/turn-6",
      createdAt: 7,
      userAction: "Inspect the harbor",
      assistant: {
        narrative: "Fog drifts over silent docks.",
        choices: [],
      },
    });

    const nodeId = "model-fork-2/turn-7";
    const harness = createHarness(
      {
        id: nodeId,
        imagePrompt: "moon harbor",
        segmentIdx: 7,
        stateSnapshot: { turnNumber: 7 },
      },
      {},
      vi.fn(),
      vfsSession,
    );

    await act(async () => {
      await harness.api.generateImageForNode(nodeId);
    });

    await waitFor(() => {
      expect(harness.getState().nodes[nodeId].imageId).toBe("img-123");
    });

    const storedTurn = readTurnFile(vfsSession.snapshot(), 2, 7);
    const media = (storedTurn?.media || {}) as Record<string, unknown>;
    expect(media.imagePrompt).toBe("moon harbor");
    expect(media.imageId).toBe("img-123");
    expect(media.imageUrl).toBeUndefined();
  });

  it("stores direct image URL when no blob is returned", async () => {
    generateSceneImageMock.mockResolvedValue({
      url: "https://cdn/image.png",
      blob: null,
      log: {
        usage: {
          promptTokens: 1,
          completionTokens: 1,
          totalTokens: 2,
          cacheRead: 0,
          cacheWrite: 0,
        },
      },
    });

    const harness = createHarness({
      id: "n1",
      imagePrompt: "city skyline",
      segmentIdx: 1,
      stateSnapshot: null,
    });

    await act(async () => {
      await harness.api.generateImageForNode("n1");
    });

    await waitFor(() => {
      expect(harness.getState().nodes.n1.imageUrl).toBe(
        "https://cdn/image.png",
      );
      expect(harness.triggerSave).toHaveBeenCalledTimes(1);
    });

    expect(saveImageMock).not.toHaveBeenCalled();
  });

  it("uses node override prompt when queueing image generation", async () => {
    generateSceneImageMock.mockResolvedValue({
      url: "https://cdn/override.png",
      blob: null,
      log: {
        usage: {
          promptTokens: 1,
          completionTokens: 1,
          totalTokens: 2,
          cacheRead: 0,
          cacheWrite: 0,
        },
      },
    });

    const harness = createHarness({
      id: "n1",
      imagePrompt: "",
      segmentIdx: 3,
      stateSnapshot: null,
    });

    await act(async () => {
      await harness.api.generateImageForNode("n1", {
        id: "n1",
        imagePrompt: "override prompt",
      } as any);
    });

    await waitFor(() => {
      expect(generateSceneImageMock).toHaveBeenCalledWith(
        "override prompt",
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
      expect(harness.getState().nodes.n1.imageUrl).toBe(
        "https://cdn/override.png",
      );
    });
  });

  it("marks node as failed when URL is empty", async () => {
    generateSceneImageMock.mockResolvedValue({
      url: "   ",
      blob: null,
      log: {
        usage: {
          promptTokens: 1,
          completionTokens: 0,
          totalTokens: 1,
          cacheRead: 0,
          cacheWrite: 0,
        },
      },
    });

    const harness = createHarness({
      id: "n1",
      imagePrompt: "empty",
      segmentIdx: 1,
      stateSnapshot: null,
    });

    await act(async () => {
      await harness.api.generateImageForNode("n1");
    });

    await waitFor(() => {
      expect(harness.api.failedImageNodes.has("n1")).toBe(true);
    });
    expect(harness.triggerSave).not.toHaveBeenCalled();
    expect(harness.onGenerationIssue).toHaveBeenCalledWith({
      code: "empty_result",
      nodeId: "n1",
    });
  });

  it("marks node as failed on generation exception", async () => {
    generateSceneImageMock.mockRejectedValue(new Error("generation failed"));

    const harness = createHarness({
      id: "n1",
      imagePrompt: "explode",
      segmentIdx: 4,
      stateSnapshot: null,
    });

    await act(async () => {
      await harness.api.generateImageForNode("n1");
    });

    await waitFor(() => {
      expect(harness.api.failedImageNodes.has("n1")).toBe(true);
      expect(harness.getState().isImageGenerating).toBe(false);
      expect(harness.getState().generatingNodeId).toBeNull();
    });
    expect(harness.onGenerationIssue).toHaveBeenCalledWith({
      code: "generation_error",
      nodeId: "n1",
      error: "generation failed",
    });
  });
});
