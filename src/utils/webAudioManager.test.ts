// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/zodSchemas", () => ({
  ambienceSchema: {
    options: ["forest", "cave"],
  },
}));

import {
  ENVIRONMENTS,
  getAudioTrack,
  preloadAudio,
  stopAllAudio,
  webAudioManager,
} from "./webAudioManager";

class AudioContextMock {
  state: "suspended" | "running" = "suspended";
  destination = { id: "dest" };
  currentTime = 0;

  createGain = vi.fn(() => ({
    gain: {
      value: 0,
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  }));

  createBufferSource = vi.fn(() => ({
    buffer: null,
    loop: false,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
  }));

  decodeAudioData = vi.fn(async () => ({ id: "buf" }) as any);
  resume = vi.fn(async () => {
    this.state = "running";
  });
  close = vi.fn();
}

describe("webAudioManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    webAudioManager.dispose();

    Object.defineProperty(window, "AudioContext", {
      value: AudioContextMock,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "webkitAudioContext", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it("exports normalized environments", () => {
    expect(ENVIRONMENTS).toEqual(["forest", "cave"]);
  });

  it("unlocks audio context and becomes ready", async () => {
    expect(webAudioManager.isReady).toBe(false);

    const unlocked = await webAudioManager.unlock();

    expect(unlocked).toBe(true);
    expect(webAudioManager.isReady).toBe(true);
  });

  it("preloads environments with progress callback and tolerates failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

    vi.stubGlobal("fetch", fetchMock as any);

    const progress: number[] = [];
    await preloadAudio((value) => progress.push(value));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(progress).toEqual([50, 100]);

    await preloadAudio();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns false for unknown environment", async () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    const ok = await webAudioManager.play("unknown-world", 0.3);

    expect(ok).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("plays, pauses, resumes and stops environment audio", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    });
    vi.stubGlobal("fetch", fetchMock as any);

    const played = await webAudioManager.play("forest", 0.4, true);

    expect(played).toBe(true);
    expect(webAudioManager.getCurrentEnvironment()).toBe("forest");

    webAudioManager.setVolume(0.7);
    expect(webAudioManager.getVolume()).toBe(0.7);

    webAudioManager.pause();
    expect(webAudioManager.getIsPaused()).toBe(true);

    webAudioManager.setVolume(0.2);
    expect(webAudioManager.getVolume()).toBe(0.2);

    webAudioManager.resume();
    expect(webAudioManager.getIsPaused()).toBe(false);

    webAudioManager.stop(undefined, false);
    expect(webAudioManager.getCurrentEnvironment()).toBeNull();
  });

  it("supports stopAllAudio helper and dispose cleanup", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    });
    vi.stubGlobal("fetch", fetchMock as any);

    await webAudioManager.play("forest", 0.5, false);
    await webAudioManager.play("cave", 0.5, false);

    stopAllAudio();
    expect(webAudioManager.getCurrentEnvironment()).toBeNull();

    webAudioManager.dispose();
    expect(webAudioManager.getCurrentEnvironment()).toBeNull();
    expect(webAudioManager.isReady).toBe(false);
  });

  it("returns null for deprecated getAudioTrack helper", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    const track = getAudioTrack("forest");

    expect(track).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});
