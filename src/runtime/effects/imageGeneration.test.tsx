// @vitest-environment jsdom

import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const generateSceneImageMock = vi.hoisted(() => vi.fn());
const saveImageMock = vi.hoisted(() => vi.fn());

vi.mock("../../services/aiService", () => ({
  generateSceneImage: generateSceneImageMock,
}));

vi.mock("../../utils/imageStorage", () => ({
  saveImage: saveImageMock,
}));

import { useImageGenerationQueue } from "./imageGeneration";

const createHarness = (node: any, aiSettings: any = {}) => {
  let state = {
    nodes: { n1: node },
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
      gameStateRef,
      setGameState,
      triggerSave,
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
  });
});
