// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RAGService,
  getRAGService,
  initializeRAGService,
  terminateRAGService,
} from "./service";

class MockPort {
  onmessage: ((event: MessageEvent<any>) => void) | null = null;
  onmessageerror: ((event: MessageEvent<any>) => void) | null = null;
  sent: any[] = [];
  start = vi.fn();
  close = vi.fn();

  postMessage = vi.fn((request: any) => {
    this.sent.push(request);
    const response = requestHandler?.(request);
    if (response !== undefined) {
      queueMicrotask(() => {
        this.onmessage?.({ data: response } as MessageEvent<any>);
      });
    }
  });

  emit(data: any) {
    this.onmessage?.({ data } as MessageEvent<any>);
  }

  emitError(event: any) {
    this.onmessageerror?.(event as MessageEvent<any>);
  }
}

let lastPort: MockPort | null = null;
let requestHandler: ((request: any) => any) | null = null;
let workerCreateCount = 0;

class MockSharedWorker {
  port: MockPort;

  constructor(_url: URL, _options: { type: string; name: string }) {
    workerCreateCount += 1;
    this.port = new MockPort();
    lastPort = this.port;
  }
}

describe("RAGService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    lastPort = null;
    requestHandler = (request) => ({ id: request.id, success: true, data: {} });
    workerCreateCount = 0;

    Object.defineProperty(globalThis, "SharedWorker", {
      value: MockSharedWorker,
      configurable: true,
      writable: true,
    });

    (window as any).ragServiceInstance = null;
  });

  it("throws when SharedWorker is unsupported", async () => {
    const original = (globalThis as any).SharedWorker;
    Object.defineProperty(globalThis, "SharedWorker", {
      value: undefined,
      configurable: true,
    });

    const service = new RAGService();
    await expect(service.initialize({}, {})).rejects.toThrow(
      "SharedWorker not supported in this browser",
    );

    Object.defineProperty(globalThis, "SharedWorker", {
      value: original,
      configurable: true,
      writable: true,
    });
  });

  it("initializes once and reuses init promise for concurrent calls", async () => {
    vi.useFakeTimers();

    requestHandler = (request) => {
      if (request.type === "init") {
        setTimeout(() => {
          lastPort?.emit({ id: request.id, success: true, data: { ok: true } });
        }, 5);
      }
      return undefined;
    };

    const service = new RAGService();
    const p1 = service.initialize({ provider: "openai", modelId: "m" } as any, {
      openai: { apiKey: "k" },
    });
    const p2 = service.initialize({ provider: "gemini" } as any, {
      gemini: { apiKey: "g" },
    });

    expect((globalThis as any).SharedWorker).toBe(MockSharedWorker);

    await vi.advanceTimersByTimeAsync(10);
    await p1;

    expect(service.initialized).toBe(true);
    expect(lastPort?.start).toHaveBeenCalledTimes(1);
    expect(workerCreateCount).toBe(1);

    vi.useRealTimers();
  });

  it("returns default status before initialization", async () => {
    const service = new RAGService();

    const status = await service.getStatus();

    expect(status).toMatchObject({
      initialized: false,
      currentSaveId: null,
      isSearching: false,
      pending: 0,
    });
  });

  it("throws for operations requiring initialized service", async () => {
    const service = new RAGService();

    await expect(service.addDocuments([] as any)).rejects.toThrow(
      "RAG Service not initialized",
    );
  });

  it("routes API methods through worker requests", async () => {
    requestHandler = (request) => ({
      id: request.id,
      success: true,
      data: { type: request.type, payload: request.payload },
    });

    const service = new RAGService();
    await service.initialize(
      { provider: "openai", modelId: "model-x" } as any,
      {
        openai: { apiKey: "k" },
      },
    );

    await service.addDocuments([
      { entityId: "npc:1", saveId: "s", forkId: 0, turnNumber: 1 },
    ] as any);
    await service.updateDocument({ entityId: "npc:1" } as any);
    await service.deleteDocuments({ saveId: "s" } as any);
    const search = await service.search("harbor", { topK: 3 });
    const byEmbedding = await service.searchWithEmbedding(
      new Float32Array([1, 2, 3]),
      {
        threshold: 0.5,
      },
    );
    const recent = await service.getRecentDocuments(5, ["npc"] as any);
    await service.getDocumentsPaginated(0, 10, ["story"] as any);
    await service.switchSave("save-1", 0, { nodes: {} } as any);
    await service.getSaveStats("save-1");
    await service.clearSave("save-1");
    await service.cleanup();
    await service.updateConfig({ dimensions: 1536 });
    await service.getStatus();
    await service.checkModelMismatch("save-1");
    await service.rebuildForModel("save-1");
    await service.checkStorageOverflow();
    await service.deleteOldestSaves(["s1", "s2"]);
    await service.getAllSaveStats();
    await service.exportSaveData("save-1");
    await service.importSaveData({ docs: [] } as any, "save-2");

    expect(search).toMatchObject({ type: "search" });
    expect(byEmbedding).toMatchObject({ type: "search" });
    expect(recent).toMatchObject({ type: "getRecentDocuments" });

    const sentTypes = (lastPort?.sent || []).map((request) => request.type);
    expect(sentTypes).toEqual(
      expect.arrayContaining([
        "init",
        "upsertFileChunks",
        "updateDocument",
        "deleteDocuments",
        "search",
        "getRecentDocuments",
        "getDocumentsPaginated",
        "switchSave",
        "getSaveStats",
        "clearSave",
        "cleanup",
        "updateConfig",
        "getStatus",
        "checkModelMismatch",
        "rebuildForModel",
        "checkStorageOverflow",
        "deleteOldestSaves",
        "getAllSaveStats",
        "exportSaveData",
        "importSaveData",
      ]),
    );
  });

  it("handles worker events, unknown events, and message errors", async () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const service = new RAGService();
    await service.initialize(
      { provider: "openai", modelId: "model-x" } as any,
      {
        openai: { apiKey: "k" },
      },
    );

    const onReady = vi.fn();
    const onError = vi.fn();
    const onProgress = vi.fn();

    service.on("ready", onReady);
    service.on("error", onError);
    service.on("progress", onProgress);

    lastPort?.emit({ type: "ready" });
    lastPort?.emit({ type: "progress", data: { phase: "indexing" } });
    lastPort?.emit({ type: "unknown_type", data: {} });
    lastPort?.emitError({ code: 1 });

    expect(onReady).toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith({ phase: "indexing" });
    expect(onError).toHaveBeenCalledWith("Worker communication error");
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    service.off("ready", onReady);
    lastPort?.emit({ type: "ready" });
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("times out pending requests when worker does not respond", async () => {
    vi.useFakeTimers();

    requestHandler = (request) => {
      if (request.type === "init") {
        return { id: request.id, success: true, data: {} };
      }
      return undefined;
    };

    const service = new RAGService();
    await service.initialize(
      { provider: "openai", modelId: "model-x" } as any,
      {
        openai: { apiKey: "k" },
      },
    );

    const promise = service.addDocuments([
      { entityId: "npc:1", saveId: "s", forkId: 0, turnNumber: 0 },
    ] as any);
    const rejection = expect(promise).rejects.toThrow("timed out");

    await vi.advanceTimersByTimeAsync(60001);

    await rejection;

    vi.useRealTimers();
  });

  it("rejects pending requests when service terminates", async () => {
    requestHandler = (request) => {
      if (request.type === "init") {
        return { id: request.id, success: true, data: {} };
      }
      return undefined;
    };

    const service = new RAGService();
    await service.initialize(
      { provider: "openai", modelId: "model-x" } as any,
      {
        openai: { apiKey: "k" },
      },
    );

    const pending = service.search("pending-query");
    const rejection = expect(pending).rejects.toThrow("Service terminated");
    service.terminate();

    await rejection;
    expect(lastPort?.close).toHaveBeenCalled();
    expect(service.initialized).toBe(false);
  });

  it("manages singleton initialize/get/terminate lifecycle", async () => {
    requestHandler = (request) => ({ id: request.id, success: true, data: {} });

    const instance = await initializeRAGService({ modelId: "m-a" }, {});
    expect(getRAGService()).toBe(instance);

    const updateSpy = vi.spyOn(instance, "updateConfig");
    const same = await initializeRAGService({ modelId: "m-b" }, {});

    expect(same).toBe(instance);
    expect(updateSpy).toHaveBeenCalledWith({ modelId: "m-b" });

    terminateRAGService();
    expect(getRAGService()).toBeNull();
  });

  it("allows retrying initialize on the same instance after failure", async () => {
    let initCalls = 0;
    requestHandler = (request) => {
      if (request.type !== "init") {
        return { id: request.id, success: true, data: {} };
      }
      initCalls += 1;
      if (initCalls === 1) {
        return { id: request.id, success: false, error: "init failed once" };
      }
      return { id: request.id, success: true, data: {} };
    };

    const service = new RAGService();
    await expect(
      service.initialize({ provider: "openai", modelId: "m1" } as any, {
        openai: { apiKey: "k1" },
      }),
    ).rejects.toThrow("init failed once");

    expect(service.initialized).toBe(false);
    expect(workerCreateCount).toBe(1);

    await expect(
      service.initialize({ provider: "openai", modelId: "m2" } as any, {
        openai: { apiKey: "k2" },
      }),
    ).resolves.toBeUndefined();

    expect(service.initialized).toBe(true);
    expect(workerCreateCount).toBe(2);
  });

  it("clears failed singleton init so a later initializeRAGService can recover", async () => {
    let initCalls = 0;
    requestHandler = (request) => {
      if (request.type !== "init") {
        return { id: request.id, success: true, data: {} };
      }
      initCalls += 1;
      if (initCalls === 1) {
        return { id: request.id, success: false, error: "singleton init failed" };
      }
      return { id: request.id, success: true, data: {} };
    };

    await expect(initializeRAGService({ modelId: "m-a" }, {})).rejects.toThrow(
      "singleton init failed",
    );
    expect(getRAGService()).toBeNull();

    const recovered = await initializeRAGService({ modelId: "m-b" }, {});
    expect(recovered.initialized).toBe(true);
    expect(getRAGService()).toBe(recovered);
    expect(workerCreateCount).toBe(2);
  });
});
