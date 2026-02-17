import { describe, expect, it } from "vitest";
import {
  buildLoopPromptSnapshot,
  formatLoopPromptSnapshotMarkdown,
} from "./loopPromptSnapshot";

describe("loopPromptSnapshot", () => {
  it("builds prompt snapshots for all major loops with skill guidance", () => {
    const snapshot = buildLoopPromptSnapshot({ languageCode: "en" });
    const staticView = snapshot.static!;
    const effectiveView = snapshot.effective!;

    // Turn system instruction references runtime hub skill
    expect(staticView.turn.systemInstruction).toContain(
      "current/skills/commands/runtime/SKILL.md",
    );
    // Turn skill path referenced generically in runtime floor preflight
    expect(staticView.turn.systemInstruction).toContain("turn");

    expect(staticView.cleanup.systemInstruction).toContain("<loop_quickstart>");
    expect(staticView.cleanup.systemInstruction).toContain(
      "current/skills/commands/runtime/cleanup/SKILL.md",
    );

    expect(staticView.summaryQuery.systemInstruction).toContain(
      "Loop quick-start (recommended)",
    );
    expect(staticView.summaryQuery.systemInstruction).toContain(
      "current/skills/commands/runtime/summary/SKILL.md",
    );
    expect(staticView.summaryQuery.anchorTemplate).toContain(
      "current/conversation/session.jsonl",
    );

    expect(staticView.summaryCompact.triggerInstruction).toContain(
      "current/skills/commands/runtime/compact/SKILL.md",
    );
    expect(staticView.summaryCompact.anchorTemplate).toContain(
      "MODE CONTRACT: SESSION_COMPACT",
    );

    expect(staticView.outline.systemInstruction).toContain(
      "current/skills/commands/runtime/outline/SKILL.md",
    );

    expect(effectiveView.cleanup.systemInstruction).toContain(
      "<runtime_floor>",
    );
    expect(effectiveView.cleanup.systemInstruction).toContain(
      "<loop_quickstart>",
    );
    expect(effectiveView.cleanup.contextInjections).toContain(
      "CLEANUP CONSISTENCY ANCHOR",
    );
    expect(effectiveView.turn.contextInjections).toContain(
      "MODE SKILL GUIDANCE",
    );
  });

  it("formats snapshots to markdown with stable section headers", () => {
    const markdown = formatLoopPromptSnapshotMarkdown(
      buildLoopPromptSnapshot(),
    );

    expect(markdown).toContain("# Loop System Prompt Snapshot");
    expect(markdown).toContain("## turn (static)");
    expect(markdown).toContain("## turn (effective)");
    expect(markdown).toContain("## cleanup.context_injections (effective)");
    expect(markdown).toContain("## summary.query_summary (static)");
    expect(markdown).toContain(
      "## summary.session_compact.trigger (effective)",
    );
    expect(markdown).toContain("## outline.phase_submit_example (effective)");
  });
});
