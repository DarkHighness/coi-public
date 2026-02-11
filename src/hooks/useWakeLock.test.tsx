// @vitest-environment jsdom

import React from "react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWakeLock } from "./useWakeLock";

type ReleaseHandler = () => void;

interface SentinelMock {
  release: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  triggerRelease: () => void;
}

const createSentinel = (): SentinelMock => {
  let onRelease: ReleaseHandler | null = null;

  return {
    release: vi.fn(async () => undefined),
    addEventListener: vi.fn((event: string, handler: ReleaseHandler) => {
      if (event === "release") {
        onRelease = handler;
      }
    }),
    triggerRelease: () => {
      onRelease?.();
    },
  };
};

describe("useWakeLock", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("requests wake lock when active and toggles locked state", async () => {
    const sentinel = createSentinel();
    const request = vi.fn(async () => sentinel as any);

    Object.defineProperty(navigator, "wakeLock", {
      value: { request },
      configurable: true,
    });

    const Probe = ({ active }: { active: boolean }) => {
      const { isLocked } = useWakeLock(active);
      return React.createElement("div", null, isLocked ? "locked" : "idle");
    };

    render(React.createElement(Probe, { active: true }));

    expect(request).toHaveBeenCalledWith("screen");
    expect(await screen.findByText("locked")).toBeTruthy();

    act(() => {
      sentinel.triggerRelease();
    });

    expect(await screen.findByText("idle")).toBeTruthy();
  });

  it("releases wake lock when becoming inactive", async () => {
    const sentinel = createSentinel();
    const request = vi.fn(async () => sentinel as any);

    Object.defineProperty(navigator, "wakeLock", {
      value: { request },
      configurable: true,
    });

    const Probe = ({ active }: { active: boolean }) => {
      const { isLocked } = useWakeLock(active);
      return React.createElement("div", null, isLocked ? "locked" : "idle");
    };

    const view = render(React.createElement(Probe, { active: true }));
    expect(await screen.findByText("locked")).toBeTruthy();

    await act(async () => {
      view.rerender(React.createElement(Probe, { active: false }));
    });

    expect(sentinel.release).toHaveBeenCalled();
    expect(await screen.findByText("idle")).toBeTruthy();
  });

  it("re-acquires lock on visibilitychange when visible", async () => {
    const sentinelA = createSentinel();
    const sentinelB = createSentinel();
    const request = vi
      .fn()
      .mockResolvedValueOnce(sentinelA as any)
      .mockResolvedValueOnce(sentinelB as any);

    Object.defineProperty(navigator, "wakeLock", {
      value: { request },
      configurable: true,
    });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });

    const Probe = () => {
      const { isLocked } = useWakeLock(true);
      return React.createElement("div", null, isLocked ? "locked" : "idle");
    };

    render(React.createElement(Probe));
    expect(await screen.findByText("locked")).toBeTruthy();

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });

    expect(request).toHaveBeenCalledTimes(2);
  });

  it("warns when wake lock request fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const request = vi.fn(async () => {
      throw new Error("denied");
    });

    Object.defineProperty(navigator, "wakeLock", {
      value: { request },
      configurable: true,
    });

    const Probe = () => {
      const { isLocked } = useWakeLock(true);
      return React.createElement("div", null, isLocked ? "locked" : "idle");
    };

    render(React.createElement(Probe));

    expect(request).toHaveBeenCalledWith("screen");
    expect(await screen.findByText("idle")).toBeTruthy();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("keeps idle when wakeLock object is missing", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    Object.defineProperty(navigator, "wakeLock", {
      value: undefined,
      configurable: true,
    });

    const Probe = () => {
      const { isLocked } = useWakeLock(true);
      return React.createElement("div", null, isLocked ? "locked" : "idle");
    };

    render(React.createElement(Probe));

    expect(screen.getByText("idle")).toBeTruthy();
    expect(warnSpy).toHaveBeenCalled();
  });
});
