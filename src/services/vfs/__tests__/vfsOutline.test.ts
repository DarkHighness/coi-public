import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";
import {
  readOutlineFile,
  readOutlineProgress,
  readOutlineStoryPlan,
  shouldRestartOutlineFromPhase1,
  writeOutlineFile,
  writeOutlineProgress,
  writeOutlineStoryPlan,
} from "../outline";

describe("vfs outline helpers", () => {
  it("writes and reads outline progress", () => {
    const session = new VfsSession();
    const progress = {
      phaseSchemaVersion: 2,
      theme: "fantasy",
      language: "en",
      customContext: "test",
      conversationHistory: [],
      partial: {},
      currentPhase: 2,
    } as any;

    writeOutlineProgress(session, progress);

    const loaded = readOutlineProgress(session.snapshot());
    expect(loaded?.currentPhase).toBe(2);
    expect(loaded?.phaseSchemaVersion).toBe(2);
  });

  it("writes and reads outline file", () => {
    const session = new VfsSession();
    const outline = {
      title: "Test Outline",
      premise: "A quick test.",
    } as any;

    writeOutlineFile(session, outline);

    const loaded = readOutlineFile(session.snapshot());
    expect(loaded?.title).toBe("Test Outline");
  });

  it("writes and reads story plan markdown", () => {
    const session = new VfsSession();
    writeOutlineStoryPlan(session, "# Story Plan\n\n- Beat 1");

    const loaded = readOutlineStoryPlan(session.snapshot());
    expect(loaded).toContain("# Story Plan");
    expect(loaded).toContain("Beat 1");
  });

  it("detects schema-version mismatch for resume restart", () => {
    expect(
      shouldRestartOutlineFromPhase1(
        {
          phaseSchemaVersion: 1,
          currentPhase: 5,
        } as any,
        2,
      ),
    ).toBe(true);

    expect(
      shouldRestartOutlineFromPhase1(
        {
          phaseSchemaVersion: 2,
          currentPhase: 5,
        } as any,
        2,
      ),
    ).toBe(false);
  });
});
