import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VfsSession } from "./vfs/vfsSession";
import {
  CUSTOM_RULES_ACK_STATE_PATH,
  applyCustomRulesRetconAck,
  buildCustomRulesAckSignature,
  getCustomRulesAckState,
  syncCustomRulesAckState,
} from "./customRulesAckState";

const writeRule = (session: VfsSession, content: string) => {
  session.writeFile("custom_rules/12-custom/rule.md", content, "text/markdown");
};

describe("customRulesAckState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-11T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds signature from custom-rules content and ignores README-only changes", () => {
    const session = new VfsSession();
    writeRule(session, "rule v1");
    session.writeFile("custom_rules/README.md", "# index", "text/markdown");

    const first = buildCustomRulesAckSignature(session);

    session.writeFile("custom_rules/README.md", "# changed", "text/markdown");
    const second = buildCustomRulesAckSignature(session);

    expect(first.customRulesHash).toBe(second.customRulesHash);

    writeRule(session, "rule v2");
    const third = buildCustomRulesAckSignature(session);
    expect(third.customRulesHash).not.toBe(second.customRulesHash);
  });

  it("creates initial ack state and then marks pending when custom-rules change", () => {
    const session = new VfsSession();
    writeRule(session, "rule v1");

    const initial = syncCustomRulesAckState(session);
    expect(initial.pendingHash).toBeUndefined();
    expect(initial.acknowledgedHash).toBe(initial.effectiveHash);

    writeRule(session, "rule v2");
    const changed = syncCustomRulesAckState(session);

    expect(changed.pendingReason).toBe("customRules");
    expect(changed.pendingHash).toBe(changed.effectiveHash);
    expect(changed.acknowledgedHash).toBe(initial.acknowledgedHash);
  });

  it("migrates legacy ack state missing customRulesHash", () => {
    const session = new VfsSession();
    writeRule(session, "rule v1");
    session.writeFile(
      CUSTOM_RULES_ACK_STATE_PATH,
      JSON.stringify({
        effectiveHash: "legacy-hash",
        acknowledgedHash: "legacy-hash",
        updatedAt: 1,
      }),
      "application/json",
    );

    const migrated = syncCustomRulesAckState(session);
    expect(migrated.customRulesHash).toBeTruthy();
    expect(migrated.pendingHash).toBeUndefined();
    expect(migrated.acknowledgedHash).toBe(migrated.effectiveHash);
  });

  it("rejects missing retconAck, hash mismatch, and empty summary when pending exists", () => {
    const session = new VfsSession();
    writeRule(session, "rule v1");
    syncCustomRulesAckState(session);
    writeRule(session, "rule v2");
    const state = syncCustomRulesAckState(session);

    const missing = applyCustomRulesRetconAck(session);
    expect(missing).toMatchObject({ ok: false, code: "INVALID_DATA" });

    const mismatch = applyCustomRulesRetconAck(session, {
      hash: "wrong",
      summary: "ok",
    });
    expect(mismatch).toMatchObject({ ok: false, code: "INVALID_DATA" });

    const emptySummary = applyCustomRulesRetconAck(session, {
      hash: state.pendingHash!,
      summary: "   ",
    });
    expect(emptySummary).toMatchObject({ ok: false, code: "INVALID_DATA" });
  });

  it("applies retcon ack, appends timeline event, and clears pending state", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      JSON.stringify({ time: "Night 3" }),
      "application/json",
    );
    writeRule(session, "rule v1");
    syncCustomRulesAckState(session);
    writeRule(session, "rule v2");
    const pending = syncCustomRulesAckState(session);

    const result = applyCustomRulesRetconAck(session, {
      hash: pending.pendingHash!,
      summary: "Retcon accepted by player.",
    });

    expect(result.ok).toBe(true);
    expect(result.applied).toBe(true);
    if (!result.ok || !result.applied) {
      return;
    }

    const eventPath = `world/timeline/${result.eventId}.json`;
    const eventFile = session.readFile(eventPath);
    expect(eventFile).toBeTruthy();

    const event = JSON.parse(eventFile!.content);
    expect(event.gameTime).toBe("Night 3");
    expect(event.visible.description).toBe("Retcon accepted by player.");
    expect(event.hidden.trueDescription).toContain(pending.pendingHash!);

    const playerViewFile = session.readFile(
      `world/characters/char:player/views/timeline/${result.eventId}.json`,
    );
    expect(playerViewFile).toBeTruthy();

    const nextState = getCustomRulesAckState(session);
    expect(nextState?.pendingHash).toBeUndefined();
    expect(nextState?.pendingReason).toBeUndefined();
    expect(nextState?.acknowledgedHash).toBe(pending.pendingHash);
  });

  it("returns applied=false when no pending retcon acknowledgement exists", () => {
    const session = new VfsSession();
    writeRule(session, "rule v1");
    syncCustomRulesAckState(session);

    const result = applyCustomRulesRetconAck(session, {
      hash: "anything",
      summary: "ignored",
    });

    expect(result).toMatchObject({
      ok: true,
      applied: false,
    });
  });
});
