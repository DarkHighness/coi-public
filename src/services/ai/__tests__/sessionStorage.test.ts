import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredSession } from "../sessionStorage";

const createRequest = <T>(executor: (request: any) => T | void) => {
  const request: any = {
    result: undefined,
    error: null,
    onsuccess: null,
    onerror: null,
  };

  setTimeout(() => {
    try {
      const maybeResult = executor(request);
      if (maybeResult !== undefined) {
        request.result = maybeResult;
      }
      request.onsuccess?.({ target: request });
    } catch (error) {
      request.error = error;
      request.onerror?.({ target: request });
    }
  }, 0);

  return request;
};

type SessionRecord = {
  id: string;
  slotId: string;
  lastAccessedAt: number;
  nativeHistory?: unknown[];
  [key: string]: unknown;
};

const createFakeIndexedDB = () => {
  const stores = new Map<string, Map<string, SessionRecord>>();
  let dbInstance: any = null;
  let dbVersion = 0;

  const buildStoreApi = (storeName: string) => {
    const store = stores.get(storeName);
    if (!store) {
      throw new Error(`Store not found: ${storeName}`);
    }

    return {
      put: (value: SessionRecord) =>
        createRequest(() => {
          store.set(value.id, { ...value });
        }),
      get: (id: string) =>
        createRequest(() => {
          const found = store.get(id);
          return found ? { ...found } : undefined;
        }),
      delete: (id: string) =>
        createRequest(() => {
          store.delete(id);
        }),
      clear: () =>
        createRequest(() => {
          store.clear();
        }),
      count: () => createRequest(() => store.size),
      getAll: () => createRequest(() => [...store.values()].map((v) => ({ ...v }))),
      index: (indexName: string) => ({
        openCursor: (keyRange?: { value?: string }) => {
          const all = [...store.values()];
          const filtered =
            indexName === "slotId" && keyRange?.value
              ? all.filter((value) => value.slotId === keyRange.value)
              : indexName === "lastAccessedAt"
                ? [...all].sort(
                    (a, b) => (a.lastAccessedAt || 0) - (b.lastAccessedAt || 0),
                  )
                : all;

          let cursorIndex = 0;
          const request: any = {
            result: null,
            error: null,
            onsuccess: null,
            onerror: null,
          };

          const emit = () => {
            if (cursorIndex < filtered.length) {
              const current = filtered[cursorIndex];
              request.result = {
                value: { ...current },
                delete: () => {
                  store.delete(current.id);
                },
                continue: () => {
                  cursorIndex += 1;
                  setTimeout(emit, 0);
                },
              };
            } else {
              request.result = null;
            }

            request.onsuccess?.({ target: request });
          };

          setTimeout(emit, 0);
          return request;
        },
      }),
      createIndex: (_name: string, _keyPath: string) => undefined,
    };
  };

  const buildDb = () => ({
    objectStoreNames: {
      contains: (name: string) => stores.has(name),
    },
    deleteObjectStore: (name: string) => {
      stores.delete(name);
    },
    createObjectStore: (name: string) => {
      stores.set(name, new Map());
      return buildStoreApi(name);
    },
    transaction: (storeName: string) => ({
      error: null,
      onerror: null,
      objectStore: () => buildStoreApi(storeName),
    }),
  });

  return {
    open: (_dbName: string, version: number) => {
      const request: any = {
        result: null,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      setTimeout(() => {
        try {
          const needsUpgrade = !dbInstance || version > dbVersion;
          if (needsUpgrade) {
            dbVersion = version;
            dbInstance = buildDb();
            request.result = dbInstance;
            request.onupgradeneeded?.({ target: request });
          }

          request.result = dbInstance;
          request.onsuccess?.();
        } catch (error) {
          request.error = error;
          request.onerror?.();
        }
      }, 0);

      return request;
    },
  };
};

const loadSessionStorage = async () => {
  vi.resetModules();
  const mod = await import("../sessionStorage");
  return mod.sessionStorage;
};

const createSession = (
  id: string,
  slotId: string,
  lastAccessedAt: number,
): StoredSession => ({
  id,
  slotId,
  config: {
    slotId,
    forkId: 0,
    providerId: "provider-1",
    modelId: "model-1",
    protocol: "openai" as const,
  },
  systemInstruction: "sys",
  nativeHistory: [{ id: `${id}-msg` }],
  lastSummaryId: null,
  createdAt: 1,
  lastAccessedAt,
  cacheHint: null,
  checkpoints: [],
});

describe("sessionStorage", () => {
  beforeEach(() => {
    (globalThis as any).indexedDB = createFakeIndexedDB();
    (globalThis as any).IDBKeyRange = {
      only: (value: string) => ({ value }),
    };
  });

  it("saves, reads, deletes and clears sessions", async () => {
    const sessionStorage = await loadSessionStorage();

    await sessionStorage.initialize();
    await sessionStorage.saveSession(createSession("s1", "slot-a", 10));
    await sessionStorage.saveSession(createSession("s2", "slot-a", 20));

    const s1 = await sessionStorage.getSession("s1");
    expect(s1?.id).toBe("s1");

    const statsBeforeDelete = await sessionStorage.getStats();
    expect(statsBeforeDelete).toEqual({ sessionCount: 2, totalHistoryItems: 2 });

    await sessionStorage.deleteSession("s1");
    expect(await sessionStorage.getSession("s1")).toBeUndefined();

    await sessionStorage.clearAll();
    const statsAfterClear = await sessionStorage.getStats();
    expect(statsAfterClear).toEqual({ sessionCount: 0, totalHistoryItems: 0 });
  });

  it("deletes sessions by slot id only", async () => {
    const sessionStorage = await loadSessionStorage();

    await sessionStorage.initialize();
    await sessionStorage.saveSession(createSession("a1", "slot-a", 1));
    await sessionStorage.saveSession(createSession("a2", "slot-a", 2));
    await sessionStorage.saveSession(createSession("b1", "slot-b", 3));

    const deleted = await sessionStorage.deleteSlotSessions("slot-a");
    expect(deleted).toBe(2);

    expect(await sessionStorage.getSession("a1")).toBeUndefined();
    expect(await sessionStorage.getSession("a2")).toBeUndefined();
    expect(await sessionStorage.getSession("b1")).toMatchObject({ id: "b1" });
  });

  it("enforces LRU by evicting oldest sessions over limit", async () => {
    const sessionStorage = await loadSessionStorage();

    await sessionStorage.initialize();

    for (let i = 0; i < 102; i += 1) {
      await sessionStorage.saveSession(createSession(`s-${i}`, "slot-a", i));
    }

    const evicted = await sessionStorage.enforceLruLimit();
    expect(evicted).toBe(2);

    const stats = await sessionStorage.getStats();
    expect(stats.sessionCount).toBe(100);

    expect(await sessionStorage.getSession("s-0")).toBeUndefined();
    expect(await sessionStorage.getSession("s-1")).toBeUndefined();
    expect(await sessionStorage.getSession("s-2")).toMatchObject({ id: "s-2" });
  });

  it("reports availability based on indexedDB presence", async () => {
    const sessionStorage = await loadSessionStorage();
    expect(sessionStorage.isAvailable()).toBe(true);

    delete (globalThis as any).indexedDB;
    const freshSessionStorage = await loadSessionStorage();
    expect(freshSessionStorage.isAvailable()).toBe(false);
  });
});
