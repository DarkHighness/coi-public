import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  initialize: vi.fn(async () => undefined),
  getSession: vi.fn(async () => undefined),
  saveSession: vi.fn(async () => undefined),
  enforceLruLimit: vi.fn(async () => undefined),
  deleteSession: vi.fn(async () => undefined),
  deleteSlotSessions: vi.fn(async () => 0),
  clearAll: vi.fn(async () => undefined),
  getStats: vi.fn(async () => ({ sessionCount: 0, totalHistoryItems: 0 })),
}));
const createProviderMock = vi.hoisted(() => vi.fn());

vi.mock("../sessionStorage", () => ({
  sessionStorage: storage,
}));

vi.mock("../provider/createProvider", () => ({
  createProvider: createProviderMock,
}));

import { sessionManager } from "../sessionManager";

const configA = {
  slotId: "slot-a",
  forkId: 0,
  providerId: "provider-1",
  modelId: "model-1",
  protocol: "openai",
} as const;

const configB = {
  ...configA,
  modelId: "model-2",
} as const;

describe("sessionManager", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    storage.getSession.mockResolvedValue(undefined);
    await sessionManager.clearAll();
  });

  afterEach(async () => {
    await vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
    await sessionManager.clearAll();
  });

  it("creates session and persists previous one on config switch", async () => {
    const first = await sessionManager.getOrCreateSession(configA as any);
    sessionManager.appendHistory(first.id, [{ role: "user", text: "hi" }]);

    const second = await sessionManager.getOrCreateSession(configB as any);

    expect(first.id).toBe("slot-a:0:provider-1:model-1");
    expect(second.id).toBe("slot-a:0:provider-1:model-2");
    expect(storage.saveSession).toHaveBeenCalledTimes(1);
    expect(storage.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: first.id }),
    );
  });

  it("deduplicates adjacent history entries on append", async () => {
    const session = await sessionManager.getOrCreateSession(configA as any);

    const msgA = { role: "user", content: "A" };
    const msgB = { role: "assistant", content: "B" };

    sessionManager.appendHistory(session.id, [msgA, msgA, msgB, msgB, msgA]);

    expect(sessionManager.getHistory(session.id)).toEqual([msgA, msgB, msgA]);
  });

  it("supports checkpoint and rollback to last checkpoint", async () => {
    const session = await sessionManager.getOrCreateSession(configA as any);

    sessionManager.appendHistory(session.id, [{ id: 1 }, { id: 2 }]);
    sessionManager.checkpoint(session.id);
    sessionManager.appendHistory(session.id, [{ id: 3 }]);

    expect(sessionManager.getHistoryLength(session.id)).toBe(3);

    sessionManager.rollbackToLastCheckpoint(session.id);

    expect(sessionManager.getHistoryLength(session.id)).toBe(2);
    expect(sessionManager.getHistory(session.id)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("clears history and cache hint when summary is created", async () => {
    const session = await sessionManager.getOrCreateSession(configA as any);

    sessionManager.appendHistory(session.id, [{ id: "m1" }]);
    sessionManager.setCacheHint(session.id, {
      protocol: "openai",
      cacheKey: "k1",
    });

    await sessionManager.onSummaryCreated(session.id, "summary-1");

    expect(sessionManager.getHistory(session.id)).toEqual([]);
    expect(sessionManager.getCacheHint(session.id)).toBeNull();
    expect(sessionManager.getCurrentSession()?.lastSummaryId).toBe("summary-1");
    expect(storage.deleteSession).toHaveBeenCalledWith(session.id);
  });

  it("overrides toolChoice to auto when forceAuto is true", () => {
    expect(
      sessionManager.getEffectiveToolChoice("session-1", "required", true),
    ).toBe("auto");
    expect(
      sessionManager.getEffectiveToolChoice("session-1", "required", false),
    ).toBe("required");
  });

  it("loads stored session and sanitizes dangling or duplicate history", async () => {
    storage.getSession.mockResolvedValueOnce({
      id: "slot-a:0:provider-1:model-1",
      slotId: "slot-a",
      config: configA,
      nativeHistory: [
        { role: "assistant", content: "stable" },
        { role: "assistant", content: "stable" },
        { role: "model", parts: [] },
        { role: "user", content: "dangling-user" },
      ],
      systemInstruction: "sys",
      lastSummaryId: null,
      createdAt: 1,
      lastAccessedAt: 2,
      cacheHint: null,
      checkpoints: [],
    });

    const session = await sessionManager.getOrCreateSession(configA as any);

    expect(session.nativeHistory).toEqual([{ role: "assistant", content: "stable" }]);

    await vi.runOnlyPendingTimersAsync();
    expect(storage.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        id: session.id,
        nativeHistory: [{ role: "assistant", content: "stable" }],
      }),
    );
  });

  it("validates provider identity/protocol and caches provider instance", async () => {
    const session = await sessionManager.getOrCreateSession(configA as any);
    createProviderMock.mockReturnValue({ tag: "provider" });

    expect(() => sessionManager.getProvider(session.id)).toThrow(
      "Provider instance required",
    );
    expect(() =>
      sessionManager.getProvider(session.id, {
        id: "provider-x",
        protocol: "openai",
      } as any),
    ).toThrow("Provider mismatch");
    expect(() =>
      sessionManager.getProvider(session.id, {
        id: "provider-1",
        protocol: "gemini",
      } as any),
    ).toThrow("Protocol mismatch");

    const first = sessionManager.getProvider(session.id, {
      id: "provider-1",
      protocol: "openai",
    } as any);
    const second = sessionManager.getProvider(session.id);

    expect(first).toEqual({ tag: "provider" });
    expect(second).toBe(first);
    expect(createProviderMock).toHaveBeenCalledTimes(1);
  });

  it("supports history helpers and rollback safeguards", async () => {
    const session = await sessionManager.getOrCreateSession(configA as any);

    expect(sessionManager.getHistory("missing")).toEqual([]);
    expect(sessionManager.getHistoryLength("missing")).toBe(0);
    expect(sessionManager.isEmpty("missing")).toBe(true);

    sessionManager.setHistory(session.id, [{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(sessionManager.getHistoryLength(session.id)).toBe(3);
    expect(sessionManager.isEmpty(session.id)).toBe(false);

    sessionManager.checkpoint(session.id);
    sessionManager.checkpoint(session.id);
    expect(sessionManager.getCurrentSession()?.checkpoints).toEqual([3]);

    sessionManager.rollbackHistory(session.id, 0);
    expect(sessionManager.getHistoryLength(session.id)).toBe(3);

    sessionManager.rollbackHistory(session.id, 10);
    expect(sessionManager.getHistoryLength(session.id)).toBe(0);
  });

  it("handles context overflow and manual invalidation even when storage delete fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const session = await sessionManager.getOrCreateSession(configA as any);

    sessionManager.appendHistory(session.id, [{ id: "msg-1" }]);
    storage.deleteSession.mockRejectedValueOnce(new Error("delete failed"));

    const overflow = await sessionManager.onContextOverflow(session.id);
    expect(overflow).toEqual({ needsSummary: true });
    expect(sessionManager.getHistory(session.id)).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();

    await sessionManager.invalidate("not-current", "manual_clear");
    expect(storage.deleteSession).toHaveBeenCalledTimes(1);

    await sessionManager.invalidate(session.id, "manual_clear");
    expect(storage.deleteSession).toHaveBeenCalledTimes(2);
  });

  it("clears in-memory session on slot deletion and returns 0 on deletion errors", async () => {
    await sessionManager.getOrCreateSession(configA as any);
    storage.deleteSlotSessions.mockResolvedValueOnce(2);

    await expect(sessionManager.deleteSlotSessions("slot-a")).resolves.toBe(2);
    expect(sessionManager.getCurrentSession()).toBeNull();

    storage.deleteSlotSessions.mockRejectedValueOnce(new Error("boom"));
    await expect(sessionManager.deleteSlotSessions("slot-b")).resolves.toBe(0);
  });

  it("exposes cache hint/system instruction and falls back when stats storage fails", async () => {
    const session = await sessionManager.getOrCreateSession(configA as any);

    expect(sessionManager.getCacheHint("missing")).toBeNull();
    expect(sessionManager.getSystemInstruction("missing")).toBeNull();

    sessionManager.setCacheHint(session.id, {
      protocol: "openai",
      cacheKey: "cache-1",
    });
    sessionManager.setSystemInstruction(session.id, "system v1");

    expect(sessionManager.getCacheHint(session.id)).toEqual({
      protocol: "openai",
      cacheKey: "cache-1",
    });
    expect(sessionManager.getSystemInstruction(session.id)).toBe("system v1");

    storage.getStats.mockRejectedValueOnce(new Error("stats failed"));
    const stats = await sessionManager.getStats();
    expect(stats).toEqual({
      currentSessionId: session.id,
      currentHistoryLength: 0,
      persistedSessionCount: 0,
      totalHistoryItems: 0,
    });
  });

  it("returns fallback session when storage loading throws", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    storage.getSession.mockRejectedValueOnce(new Error("db offline"));

    const session = await sessionManager.getOrCreateSession(configA as any);

    expect(session.id).toBe("slot-a:0:provider-1:model-1");
    expect(session.nativeHistory).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      "[SessionManager] Failed to load session from storage:",
      expect.any(Error),
    );
  });

  it("no-ops non-current operations while overflow still requests summary", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    sessionManager.setHistory("missing", [{ id: 1 }]);
    sessionManager.appendHistory("missing", [{ id: 1 }]);
    sessionManager.rollbackHistory("missing", 2);
    sessionManager.rollbackToLastCheckpoint("missing");
    sessionManager.checkpoint("missing");
    sessionManager.setCacheHint("missing", { protocol: "openai", cacheKey: "x" });
    sessionManager.setSystemInstruction("missing", "sys");
    await sessionManager.onSummaryCreated("missing", "sum-1");
    await sessionManager.invalidate("missing", "manual_clear");
    const overflow = await sessionManager.onContextOverflow("missing");

    expect(overflow).toEqual({ needsSummary: true });
    expect(storage.deleteSession).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("flush skips empty session persistence and recovers from save failures", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const session = await sessionManager.getOrCreateSession(configA as any);

    await sessionManager.flush();
    expect(storage.saveSession).not.toHaveBeenCalled();

    sessionManager.appendHistory(session.id, [{ role: "user", content: "hello" }]);

    storage.saveSession.mockRejectedValueOnce(new Error("save failed"));
    await sessionManager.flush();
    expect(warnSpy).toHaveBeenCalledWith(
      "[SessionManager] Failed to persist session:",
      expect.any(Error),
    );

    storage.saveSession.mockResolvedValueOnce(undefined);
    await sessionManager.flush();
    expect(storage.saveSession).toHaveBeenCalled();
    expect(storage.enforceLruLimit).toHaveBeenCalled();
  });

  it("initializes once and tolerates storage initialize failures", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    storage.initialize.mockRejectedValueOnce(new Error("no indexeddb"));

    await sessionManager.initialize();
    await sessionManager.initialize();

    expect(storage.initialize).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[SessionManager] IndexedDB not available, using memory only:",
      expect.any(Error),
    );
  });
});
