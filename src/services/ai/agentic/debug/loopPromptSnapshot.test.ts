import { describe, expect, it } from "vitest";
import {
  buildLoopPromptSnapshot,
  formatLoopPromptSnapshotMarkdown,
} from "./loopPromptSnapshot";

describe("loopPromptSnapshot", () => {
  it("builds prompt snapshots for all major loops with skill guidance", () => {
    const snapshot = buildLoopPromptSnapshot({ languageCode: "en" });

    expect(snapshot.turn.systemInstruction).toContain(
      "current/skills/commands/runtime/SKILL.md",
    );
    expect(snapshot.turn.systemInstruction).toContain(
      "current/skills/commands/runtime/turn/SKILL.md",
    );

    expect(snapshot.cleanup.systemInstruction).toContain("<loop_quickstart>");
    expect(snapshot.cleanup.systemInstruction).toContain(
      "current/skills/commands/runtime/cleanup/SKILL.md",
    );

    expect(snapshot.summaryQuery.systemInstruction).toContain(
      "Loop quick-start (recommended)",
    );
    expect(snapshot.summaryQuery.systemInstruction).toContain(
      "current/skills/commands/runtime/summary/SKILL.md",
    );
    expect(snapshot.summaryQuery.anchorTemplate).toContain(
      "current/conversation/session.jsonl",
    );

    expect(snapshot.summaryCompact.triggerInstruction).toContain(
      "current/skills/commands/runtime/compact/SKILL.md",
    );
    expect(snapshot.summaryCompact.anchorTemplate).toContain(
      "MODE CONTRACT: SESSION_COMPACT",
    );

    expect(snapshot.outline.systemInstruction).toContain(
      "current/skills/commands/runtime/outline/SKILL.md",
    );
  });

  it("formats snapshots to markdown with stable section headers", () => {
    const markdown = formatLoopPromptSnapshotMarkdown(
      buildLoopPromptSnapshot(),
    );

    expect(markdown).toContain("# Loop System Prompt Snapshot");
    expect(markdown).toContain("## turn");
    expect(markdown).toContain("## cleanup");
    expect(markdown).toContain("## summary.query_summary");
    expect(markdown).toContain("## summary.session_compact.trigger");
    expect(markdown).toContain("## outline");
  });
});
