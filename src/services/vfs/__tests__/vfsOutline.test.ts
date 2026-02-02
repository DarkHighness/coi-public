import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";
import {
  readOutlineFile,
  readOutlineProgress,
  writeOutlineFile,
  writeOutlineProgress,
} from "../outline";

describe("vfs outline helpers", () => {
  it("writes and reads outline progress", () => {
    const session = new VfsSession();
    const progress = {
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
});
