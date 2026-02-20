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
      phaseSchemaVersion: 3,
      theme: "fantasy",
      language: "en",
      customContext: "test",
      conversationHistory: [],
      partial: {},
      currentPhaseId: "world_foundation",
    } as any;

    writeOutlineProgress(session, progress);

    const loaded = readOutlineProgress(session.snapshot());
    expect(loaded?.currentPhaseId).toBe("world_foundation");
    expect(loaded?.phaseSchemaVersion).toBe(3);
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
          phaseSchemaVersion: 2,
          currentPhaseId: "factions",
        } as any,
        3,
      ),
    ).toBe(true);

    expect(
      shouldRestartOutlineFromPhase1(
        {
          phaseSchemaVersion: 3,
          currentPhaseId: "factions",
        } as any,
        3,
      ),
    ).toBe(false);
  });
});
