// @vitest-environment jsdom

import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const generateSpeechMock = vi.hoisted(() => vi.fn());
const loadAudioMock = vi.hoisted(() => vi.fn());
const saveAudioMock = vi.hoisted(() => vi.fn());

vi.mock("../services/aiService", () => ({
  generateSpeech: generateSpeechMock,
}));

vi.mock("../utils/indexedDB", () => ({
  loadAudio: loadAudioMock,
  saveAudio: saveAudioMock,
}));

import { useStoryAudio } from "./useStoryAudio";

type ContextState = "running" | "suspended";

let nextContextState: ContextState = "running";
let lastAudioContext: AudioContextMock | null = null;

class AudioContextMock {
  state: ContextState;
  destination = { id: "dest" };
  gainNode: any;
  sourceNode: any;

  constructor(initialState: ContextState) {
    this.state = initialState;
  }

  createGain = vi.fn(() => {
    this.gainNode = {
      gain: { value: 1 },
      connect: vi.fn(),
    };
    return this.gainNode;
  });

  createBufferSource = vi.fn(() => {
    this.sourceNode = {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    return this.sourceNode;
  });

  decodeAudioData = vi.fn(async () => ({ duration: 1 } as AudioBuffer));
  resume = vi.fn(async () => {
    this.state = "running";
  });
  close = vi.fn(async () => undefined);
}

const createArrayBuffer = (...bytes: number[]) =>
  Uint8Array.from(bytes).buffer as ArrayBuffer;

describe("useStoryAudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nextContextState = "running";
    lastAudioContext = null;

    class MockAudioContext extends AudioContextMock {
      constructor(_opts?: unknown) {
        super(nextContextState);
        lastAudioContext = this;
      }
    }

    Object.defineProperty(window, "AudioContext", {
      value: MockAudioContext,
      configurable: true,
      writable: true,
    });

    Object.defineProperty(window, "webkitAudioContext", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it("warns and exits when muted", async () => {
    let api: ReturnType<typeof useStoryAudio> | null = null;
    const onWarning = vi.fn();

    const Probe = () => {
      api = useStoryAudio("hello", {} as any, 1, true, onWarning);
      return React.createElement("div");
    };

    render(React.createElement(Probe));

    await act(async () => {
      await api!.playAudio();
    });

    expect(onWarning).toHaveBeenCalledWith("Voice is muted in settings.");
    expect(loadAudioMock).not.toHaveBeenCalled();
    expect(generateSpeechMock).not.toHaveBeenCalled();
    expect(lastAudioContext).toBeNull();
  });

  it("plays cached audio when audioKey exists", async () => {
    let api: ReturnType<typeof useStoryAudio> | null = null;
    loadAudioMock.mockResolvedValue({
      arrayBuffer: vi.fn(async () => createArrayBuffer(1, 2, 3)),
    } as any);

    const Probe = () => {
      api = useStoryAudio("cached text", {} as any, 0.8, false, undefined, undefined, undefined, "audio:key");
      return React.createElement("div", null, api!.isPlaying ? "playing" : "idle");
    };

    render(React.createElement(Probe));

    await act(async () => {
      await api!.playAudio();
    });

    expect(loadAudioMock).toHaveBeenCalledWith("audio:key");
    expect(generateSpeechMock).not.toHaveBeenCalled();
    expect(lastAudioContext?.decodeAudioData).toHaveBeenCalled();
    expect(lastAudioContext?.sourceNode.start).toHaveBeenCalledTimes(1);
    expect(screen.getByText("playing")).toBeTruthy();

    act(() => {
      lastAudioContext?.sourceNode.onended?.();
    });

    await waitFor(() => {
      expect(screen.getByText("idle")).toBeTruthy();
    });
  });

  it("generates and stores audio when cache is missing", async () => {
    let api: ReturnType<typeof useStoryAudio> | null = null;
    const onAudioGenerated = vi.fn();

    loadAudioMock.mockResolvedValue(null);
    generateSpeechMock.mockResolvedValue(createArrayBuffer(4, 5, 6));

    const Probe = () => {
      api = useStoryAudio(
        "narration",
        { id: "settings" } as any,
        1,
        false,
        undefined,
        "mysterious",
        "segment-1",
        "cache:key",
        onAudioGenerated,
      );
      return React.createElement("div");
    };

    render(React.createElement(Probe));

    await act(async () => {
      await api!.playAudio();
    });

    expect(generateSpeechMock).toHaveBeenCalledWith(
      { id: "settings" },
      "narration",
      undefined,
      "mysterious",
    );
    expect(saveAudioMock).toHaveBeenCalledWith("segment-1", expect.any(Blob));
    expect(onAudioGenerated).toHaveBeenCalledWith("segment-1");
    expect(lastAudioContext?.sourceNode.start).toHaveBeenCalled();
  });

  it("stops current source when playAudio is called during playback", async () => {
    let api: ReturnType<typeof useStoryAudio> | null = null;

    loadAudioMock.mockResolvedValue(null);
    generateSpeechMock.mockResolvedValue(createArrayBuffer(7, 8, 9));

    const Probe = () => {
      api = useStoryAudio("toggle", {} as any);
      return React.createElement("div", null, api!.isPlaying ? "playing" : "idle");
    };

    render(React.createElement(Probe));

    await act(async () => {
      await api!.playAudio();
    });

    const firstSource = lastAudioContext?.sourceNode;
    expect(screen.getByText("playing")).toBeTruthy();

    await act(async () => {
      await api!.playAudio();
    });

    expect(firstSource?.stop).toHaveBeenCalledTimes(1);
    expect(screen.getByText("idle")).toBeTruthy();
  });

  it("logs and exits when no audio data is available", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let api: ReturnType<typeof useStoryAudio> | null = null;

    loadAudioMock.mockResolvedValue(null);
    generateSpeechMock.mockResolvedValue(null);

    const Probe = () => {
      api = useStoryAudio("empty", {} as any, 1, false, undefined, undefined, undefined, "cache:none");
      return React.createElement("div", null, api!.isLoadingAudio ? "loading" : "ready");
    };

    render(React.createElement(Probe));

    await act(async () => {
      await api!.playAudio();
    });

    expect(errorSpy).toHaveBeenCalledWith("No audio data available to play.");
    expect(lastAudioContext?.decodeAudioData).not.toHaveBeenCalled();
    expect(screen.getByText("ready")).toBeTruthy();
  });

  it("resumes suspended context and applies volume updates", async () => {
    nextContextState = "suspended";
    let api: ReturnType<typeof useStoryAudio> | null = null;

    generateSpeechMock.mockResolvedValue(createArrayBuffer(10, 11, 12));

    const Probe = ({ volume, muted }: { volume: number; muted: boolean }) => {
      api = useStoryAudio("volume", {} as any, volume, muted);
      return React.createElement("div");
    };

    const view = render(React.createElement(Probe, { volume: 0.7, muted: false }));

    await act(async () => {
      await api!.playAudio();
    });

    expect(lastAudioContext?.resume).toHaveBeenCalledTimes(1);
    expect(lastAudioContext?.gainNode.gain.value).toBe(0.7);

    await act(async () => {
      view.rerender(React.createElement(Probe, { volume: 0.2, muted: true }));
    });

    expect(lastAudioContext?.gainNode.gain.value).toBe(0);

    await act(async () => {
      view.rerender(React.createElement(Probe, { volume: 0.2, muted: false }));
    });

    expect(lastAudioContext?.gainNode.gain.value).toBe(0.2);
  });

  it("stops and closes audio context on unmount", async () => {
    let api: ReturnType<typeof useStoryAudio> | null = null;

    generateSpeechMock.mockResolvedValue(createArrayBuffer(13, 14, 15));

    const Probe = () => {
      api = useStoryAudio("cleanup", {} as any);
      return React.createElement("div");
    };

    const view = render(React.createElement(Probe));

    await act(async () => {
      await api!.playAudio();
    });

    const source = lastAudioContext?.sourceNode;

    await act(async () => {
      view.unmount();
    });

    expect(source?.stop).toHaveBeenCalled();
    expect(lastAudioContext?.close).toHaveBeenCalled();
  });
});
