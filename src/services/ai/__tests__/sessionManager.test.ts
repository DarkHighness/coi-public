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

vi.mock("../sessionStorage", () => ({
  sessionStorage: storage,
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
});
