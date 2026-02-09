// @vitest-environment jsdom

import React from "react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getRAGServiceMock = vi.hoisted(() => vi.fn());

vi.mock("../services/rag", () => ({
  getRAGService: getRAGServiceMock,
}));

import { useEmbeddingStatus } from "./useEmbeddingStatus";

describe("useEmbeddingStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when RAG service is unavailable", () => {
    getRAGServiceMock.mockReturnValue(null);

    const Probe = () => {
      const progress = useEmbeddingStatus();
      return React.createElement("div", null, progress ? "has-progress" : "none");
    };

    render(React.createElement(Probe));

    expect(screen.getByText("none")).toBeTruthy();
  });

  it("subscribes to progress events and updates state", () => {
    let progressHandler: ((event: any) => void) | null = null;
    const ragService = {
      on: vi.fn((event: string, handler: (payload: any) => void) => {
        if (event === "progress") {
          progressHandler = handler;
        }
      }),
      off: vi.fn(),
    };

    getRAGServiceMock.mockReturnValue(ragService);

    const Probe = () => {
      const progress = useEmbeddingStatus();
      const text = progress
        ? `${progress.stage}:${progress.current}/${progress.total}`
        : "none";
      return React.createElement("div", null, text);
    };

    render(React.createElement(Probe));

    act(() => {
      progressHandler?.({
        phase: "indexing",
        current: 3,
        total: 9,
        message: "embedding",
      });
    });

    expect(screen.getByText("indexing:3/9")).toBeTruthy();
    expect(ragService.on).toHaveBeenCalledWith("progress", expect.any(Function));
  });

  it("unsubscribes from progress on unmount", () => {
    let progressHandler: ((event: any) => void) | null = null;
    const ragService = {
      on: vi.fn((event: string, handler: (payload: any) => void) => {
        if (event === "progress") {
          progressHandler = handler;
        }
      }),
      off: vi.fn(),
    };

    getRAGServiceMock.mockReturnValue(ragService);

    const Probe = () => {
      useEmbeddingStatus();
      return React.createElement("div");
    };

    const view = render(React.createElement(Probe));
    const handlerRef = progressHandler;

    view.unmount();

    expect(ragService.off).toHaveBeenCalledWith("progress", handlerRef);
  });
});
