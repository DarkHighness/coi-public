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
      return React.createElement(
        "div",
        null,
        progress ? "has-progress" : "none",
      );
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
        ? `${progress.stage}:${progress.current}/${progress.total}:${progress.messageKey || "no-key"}`
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
        messageKey: "ragDebugger.progressEmbeddingChunks",
        messageParams: {
          current: 3,
          total: 9,
        },
      });
    });

    expect(
      screen.getByText("indexing:3/9:ragDebugger.progressEmbeddingChunks"),
    ).toBeTruthy();
    expect(ragService.on).toHaveBeenCalledWith(
      "progress",
      expect.any(Function),
    );
  });

  it("uses completion count as displayed progress when provided", () => {
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
        ? `${progress.stage}:${progress.current}/${progress.total}:${progress.messageKey || "no-key"}`
        : "none";
      return React.createElement("div", null, text);
    };

    render(React.createElement(Probe));

    act(() => {
      progressHandler?.({
        phase: "indexing",
        current: 970,
        total: 970,
        message: "Reindex complete (484 chunks)",
        messageKey: "ragDebugger.progressReindexComplete",
        messageParams: {
          count: 484,
        },
      });
    });

    expect(
      screen.getByText("indexing:484/484:ragDebugger.progressReindexComplete"),
    ).toBeTruthy();
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
