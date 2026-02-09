// @vitest-environment jsdom

import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const initializeRAGServiceMock = vi.hoisted(() => vi.fn());
const getRAGServiceMock = vi.hoisted(() => vi.fn());
const terminateRAGServiceMock = vi.hoisted(() => vi.fn());

const getGeminiEmbeddingModelsMock = vi.hoisted(() => vi.fn());
const getOpenAIEmbeddingModelsMock = vi.hoisted(() => vi.fn());
const getOpenRouterEmbeddingModelsMock = vi.hoisted(() => vi.fn());
const getClaudeEmbeddingModelsMock = vi.hoisted(() => vi.fn());

const extractDocumentsFromStateMock = vi.hoisted(() => vi.fn());
const indexInitialRagDocumentsMock = vi.hoisted(() => vi.fn());

vi.mock("../services/rag", () => ({
  initializeRAGService: initializeRAGServiceMock,
  getRAGService: getRAGServiceMock,
  terminateRAGService: terminateRAGServiceMock,
}));

vi.mock("../services/providers/geminiProvider", () => ({
  getEmbeddingModels: getGeminiEmbeddingModelsMock,
}));

vi.mock("../services/providers/openaiProvider", () => ({
  getEmbeddingModels: getOpenAIEmbeddingModelsMock,
}));

vi.mock("../services/providers/openRouterProvider", () => ({
  getEmbeddingModels: getOpenRouterEmbeddingModelsMock,
}));

vi.mock("../services/providers/claudeProvider", () => ({
  getEmbeddingModels: getClaudeEmbeddingModelsMock,
}));

vi.mock("../services/rag/documentExtraction", () => ({
  extractDocumentsFromState: extractDocumentsFromStateMock,
}));

vi.mock("./effects/ragDocuments", () => ({
  indexInitialEntities: indexInitialRagDocumentsMock,
}));

import { useRagRuntime } from "./ragRuntime";

const createServiceMock = () => {
  const listeners = new Map<string, Set<(payload: any) => void>>();

  return {
    on: vi.fn((event: string, callback: (payload: any) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(callback);
    }),
    emit: (event: string, payload: any) => {
      listeners.get(event)?.forEach((callback) => callback(payload));
    },
    getStatus: vi.fn(async () => ({ currentSaveId: null })),
    switchSave: vi.fn(async () => ({ success: true })),
    checkModelMismatch: vi.fn(async () => null),
    addDocuments: vi.fn(async () => ({ count: 1 })),
    search: vi.fn(async () => []),
    getRecentDocuments: vi.fn(async () => []),
    rebuildForModel: vi.fn(async () => undefined),
    deleteOldestSaves: vi.fn(async () => undefined),
    getAllSaveStats: vi.fn(async () => ({ totalSaves: 0 })),
    cleanup: vi.fn(async () => undefined),
  };
};

const createSettings = (overrides?: Partial<any>) =>
  ({
    embedding: {
      enabled: true,
      providerId: "provider-1",
      modelId: "embed-1",
      dimensions: 1536,
      ...(overrides?.embedding || {}),
    },
    providers: {
      instances: [
        {
          id: "provider-1",
          protocol: "gemini",
          apiKey: "k-1",
          baseUrl: "https://gemini.local",
        },
      ],
      ...(overrides?.providers || {}),
    },
  }) as any;

const mountRuntime = () => {
  let current: ReturnType<typeof useRagRuntime> | null = null;

  const Probe = () => {
    current = useRagRuntime();
    return React.createElement("div");
  };

  render(React.createElement(Probe));

  return {
    get value() {
      if (!current) {
        throw new Error("Runtime hook not mounted");
      }
      return current;
    },
  };
};

describe("useRagRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRAGServiceMock.mockReturnValue(null);
    getGeminiEmbeddingModelsMock.mockResolvedValue([]);
    getOpenAIEmbeddingModelsMock.mockResolvedValue([]);
    getOpenRouterEmbeddingModelsMock.mockResolvedValue([]);
    getClaudeEmbeddingModelsMock.mockResolvedValue([]);
    extractDocumentsFromStateMock.mockReturnValue([]);
    indexInitialRagDocumentsMock.mockResolvedValue(undefined);
  });

  it("returns false immediately when embedding is disabled", async () => {
    const runtime = mountRuntime();

    let result = false;
    await act(async () => {
      result = await runtime.value.actions.initialize(
        createSettings({ embedding: { enabled: false } }),
      );
    });

    expect(result).toBe(false);
    expect(initializeRAGServiceMock).not.toHaveBeenCalled();
    expect(runtime.value.isInitialized).toBe(false);
  });

  it("initializes service with embedding model context length", async () => {
    const service = createServiceMock();
    service.getStatus.mockResolvedValue({ currentSaveId: "save-1" });
    initializeRAGServiceMock.mockResolvedValue(service);
    getGeminiEmbeddingModelsMock.mockResolvedValue([
      { id: "embed-1", contextLength: 8192 },
    ]);

    const runtime = mountRuntime();

    let result = false;
    await act(async () => {
      result = await runtime.value.actions.initialize(createSettings());
    });

    expect(result).toBe(true);
    expect(getGeminiEmbeddingModelsMock).toHaveBeenCalledWith({ apiKey: "k-1" });
    expect(initializeRAGServiceMock).toHaveBeenCalledWith(
      {
        provider: "gemini",
        modelId: "embed-1",
        dimensions: 1536,
        contextLength: 8192,
      },
      {
        gemini: {
          apiKey: "k-1",
          baseUrl: "https://gemini.local",
        },
        openai: undefined,
        openrouter: undefined,
        claude: undefined,
      },
    );

    await waitFor(() => {
      expect(runtime.value.isInitialized).toBe(true);
      expect(runtime.value.currentSaveId).toBe("save-1");
      expect(runtime.value.error).toBeNull();
    });
  });

  it("stores initialization error when provider instance is missing", async () => {
    const runtime = mountRuntime();

    let result = true;
    await act(async () => {
      result = await runtime.value.actions.initialize(
        createSettings({ providers: { instances: [] } }),
      );
    });

    expect(result).toBe(false);
    expect(initializeRAGServiceMock).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(runtime.value.error).toContain("Embedding provider not found");
      expect(runtime.value.isLoading).toBe(false);
    });
  });

  it("returns false when switching save before initialization", async () => {
    const runtime = mountRuntime();

    let switched = true;
    await act(async () => {
      switched = await runtime.value.actions.switchSave("save-a", 0, {
        nodes: { 0: { id: 0, parentId: null } },
      } as any);
    });

    expect(switched).toBe(false);
  });

  it("switches save and maps fork tree ids to numbers", async () => {
    const service = createServiceMock();
    service.getStatus
      .mockResolvedValueOnce({ currentSaveId: null })
      .mockResolvedValueOnce({ currentSaveId: "save-b" });
    service.checkModelMismatch.mockResolvedValue({
      currentModel: "old",
      targetModel: "new",
    });

    initializeRAGServiceMock.mockResolvedValue(service);
    const runtime = mountRuntime();

    await act(async () => {
      await runtime.value.actions.initialize(createSettings());
    });

    let switched = false;
    await act(async () => {
      switched = await runtime.value.actions.switchSave("save-b", 7, {
        nodes: {
          1: { id: 1, parentId: null },
          2: { id: 2, parentId: 1 },
        },
      } as any);
    });

    expect(switched).toBe(true);
    expect(service.switchSave).toHaveBeenCalledWith("save-b", 7, {
      nodes: {
        1: { id: 1, parentId: null },
        2: { id: 2, parentId: 1 },
      },
    });
    expect(runtime.value.currentSaveId).toBe("save-b");
    expect(runtime.value.modelMismatch).not.toBeNull();
  });

  it("updates documents with save context metadata", async () => {
    const service = createServiceMock();
    service.getStatus
      .mockResolvedValueOnce({ currentSaveId: null })
      .mockResolvedValueOnce({ currentSaveId: "save-doc" });

    initializeRAGServiceMock.mockResolvedValue(service);
    extractDocumentsFromStateMock.mockReturnValue([
      { entityId: "npc:1", type: "npc", content: "content" },
    ]);

    const runtime = mountRuntime();

    await act(async () => {
      await runtime.value.actions.initialize(createSettings());
      await runtime.value.actions.switchSave("save-doc", 0, {
        nodes: { 0: { id: 0, parentId: null } },
      } as any);
    });

    await waitFor(() => {
      expect(runtime.value.currentSaveId).toBe("save-doc");
    });

    await act(async () => {
      await runtime.value.actions.updateDocuments(
        {
          forkId: 3,
          turnNumber: 11,
        } as any,
        ["npc:1"],
      );
    });

    expect(extractDocumentsFromStateMock).toHaveBeenCalledWith(
      expect.objectContaining({ forkId: 3, turnNumber: 11 }),
      ["npc:1"],
    );
    expect(service.addDocuments).toHaveBeenCalledWith([
      {
        entityId: "npc:1",
        type: "npc",
        content: "content",
        saveId: "save-doc",
        forkId: 3,
        turnNumber: 11,
      },
    ]);
  });

  it("builds grouped context from search results", async () => {
    const service = createServiceMock();
    service.getStatus.mockResolvedValue({ currentSaveId: "save-c" });
    service.search.mockResolvedValue([
      { document: { type: "story", content: "The gate opens" } },
      { document: { type: "npc", content: "Alice watches" } },
      { document: { type: "location", content: "Clocktower roof" } },
    ]);

    initializeRAGServiceMock.mockResolvedValue(service);
    const runtime = mountRuntime();

    await act(async () => {
      await runtime.value.actions.initialize(createSettings());
    });

    let context = "";
    await act(async () => {
      context = await runtime.value.actions.getContext(
        "gate",
        { forkId: 2 } as any,
      );
    });

    expect(context).toContain("## Recent Story Context");
    expect(context).toContain("The gate opens");
    expect(context).toContain("## Relevant NPCs");
    expect(context).toContain("## Relevant Locations");
  });

  it("handles disable mismatch action by terminating RAG", async () => {
    const service = createServiceMock();
    service.getStatus.mockResolvedValue({ currentSaveId: "save-z" });
    initializeRAGServiceMock.mockResolvedValue(service);

    const runtime = mountRuntime();

    await act(async () => {
      await runtime.value.actions.initialize(createSettings());
    });

    await act(async () => {
      await runtime.value.actions.handleModelMismatch("disable");
    });

    expect(terminateRAGServiceMock).toHaveBeenCalled();
    expect(runtime.value.isInitialized).toBe(false);
    expect(runtime.value.currentSaveId).toBeNull();
  });

  it("clears storage overflow after deleting saves", async () => {
    const service = createServiceMock();
    service.getStatus.mockResolvedValue({ currentSaveId: "save-y" });
    initializeRAGServiceMock.mockResolvedValue(service);

    const runtime = mountRuntime();

    await act(async () => {
      await runtime.value.actions.initialize(createSettings());
    });

    act(() => {
      service.emit("storageOverflow", {
        totalSizeMB: 120,
        maxSizeMB: 100,
      });
    });

    await waitFor(() => {
      expect(runtime.value.storageOverflow).not.toBeNull();
    });

    await act(async () => {
      await runtime.value.actions.handleStorageOverflow(["save-old"]);
    });

    expect(service.deleteOldestSaves).toHaveBeenCalledWith(["save-old"]);
    expect(runtime.value.storageOverflow).toBeNull();
  });

  it("indexes initial entities and refreshes status", async () => {
    const service = createServiceMock();
    service.getStatus
      .mockResolvedValueOnce({ currentSaveId: "save-m" })
      .mockResolvedValueOnce({ currentSaveId: "save-m" });
    initializeRAGServiceMock.mockResolvedValue(service);

    const runtime = mountRuntime();

    await act(async () => {
      await runtime.value.actions.initialize(createSettings());
      await runtime.value.actions.indexInitialEntities({} as any, "save-m");
    });

    expect(indexInitialRagDocumentsMock).toHaveBeenCalledWith({}, "save-m");
    expect(service.getStatus).toHaveBeenCalledTimes(2);
  });
});
