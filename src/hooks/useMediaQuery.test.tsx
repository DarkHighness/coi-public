// @vitest-environment jsdom

import React from "react";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useIsMobile, useMediaQuery } from "./useMediaQuery";

type Listener = (event: { matches: boolean }) => void;

const createMatchMediaMock = (initialMap: Record<string, boolean>) => {
  const listeners = new Map<string, Set<Listener>>();
  const state = new Map(Object.entries(initialMap));

  const matchMedia = vi.fn((query: string) => {
    if (!listeners.has(query)) listeners.set(query, new Set());
    return {
      matches: Boolean(state.get(query)),
      media: query,
      addEventListener: (_: string, cb: Listener) =>
        listeners.get(query)!.add(cb),
      removeEventListener: (_: string, cb: Listener) =>
        listeners.get(query)!.delete(cb),
      dispatch: (matches: boolean) => {
        state.set(query, matches);
        listeners.get(query)?.forEach((cb) => cb({ matches }));
      },
    };
  });

  return { matchMedia };
};

describe("useMediaQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns initial matches value", () => {
    const mm = createMatchMediaMock({ "(min-width: 1024px)": true });
    vi.stubGlobal("matchMedia", mm.matchMedia as any);

    const Probe = () => {
      const matched = useMediaQuery("(min-width: 1024px)");
      return React.createElement("div", null, matched ? "yes" : "no");
    };

    render(React.createElement(Probe));
    expect(screen.getByText("yes")).toBeTruthy();
  });

  it("reacts to media query change events", () => {
    const mm = createMatchMediaMock({ "(min-width: 1024px)": false });
    vi.stubGlobal("matchMedia", mm.matchMedia as any);

    const Probe = () => {
      const matched = useMediaQuery("(min-width: 1024px)");
      return React.createElement("div", null, matched ? "yes" : "no");
    };

    render(React.createElement(Probe));
    expect(screen.getByText("no")).toBeTruthy();

    const queryObj = (window.matchMedia as any)("(min-width: 1024px)");
    act(() => {
      queryObj.dispatch(true);
    });

    expect(screen.getByText("yes")).toBeTruthy();
  });

  it("useIsMobile proxies max-width mobile query", () => {
    const mm = createMatchMediaMock({ "(max-width: 767px)": true });
    vi.stubGlobal("matchMedia", mm.matchMedia as any);

    const Probe = () => {
      const mobile = useIsMobile();
      return React.createElement("div", null, mobile ? "mobile" : "desktop");
    };

    render(React.createElement(Probe));
    expect(screen.getByText("mobile")).toBeTruthy();
  });
});
