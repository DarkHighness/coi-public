import { describe, expect, it } from "vitest";
import { vfsResourceTemplateRegistry } from "../resourceTemplateRegistry";

describe("vfsResourceTemplateRegistry", () => {
  it("matches immutable shared system templates", () => {
    const template = vfsResourceTemplateRegistry.match(
      "shared/system/skills/README.md",
    );

    expect(template.id).toBe("template.system.skills");
    expect(template.permissionClass).toBe("immutable_readonly");
    expect(template.scope).toBe("shared");
    expect(template.allowedWriteOps).toEqual([]);
  });

  it("matches finish-guarded conversation and summary templates", () => {
    const conversation = vfsResourceTemplateRegistry.match(
      "forks/0/story/conversation/turns/fork-0/turn-1.json",
    );
    expect(conversation.permissionClass).toBe("finish_guarded");
    expect(conversation.domain).toBe("story");
    expect(conversation.allowedWriteOps).toContain("finish_commit");

    const summary = vfsResourceTemplateRegistry.match(
      "forks/0/story/summary/state.json",
    );
    expect(summary.permissionClass).toBe("finish_guarded");
    expect(summary.id).toBe("template.story.summary");
    expect(summary.allowedWriteOps).toEqual(["finish_summary"]);

    const sessionMirror = vfsResourceTemplateRegistry.match(
      "forks/0/runtime/session/session-a.jsonl",
    );
    expect(sessionMirror.permissionClass).toBe("finish_guarded");
    expect(sessionMirror.id).toBe("template.runtime.session_jsonl");
    expect(sessionMirror.allowedWriteOps).toEqual(["finish_commit"]);

    const lineage = vfsResourceTemplateRegistry.match(
      "forks/0/runtime/session/lineage.json",
    );
    expect(lineage.permissionClass).toBe("finish_guarded");
    expect(lineage.id).toBe("template.runtime.session_lineage");
    expect(lineage.allowedWriteOps).toEqual(["finish_commit"]);
  });

  it("matches elevated templates for outline phases and history rewrites", () => {
    const outline = vfsResourceTemplateRegistry.match(
      "shared/narrative/outline/phases/phase0.json",
    );
    expect(outline.permissionClass).toBe("elevated_editable");
    expect(outline.criticality).toBe("core");

    const rewrite = vfsResourceTemplateRegistry.match(
      "forks/3/ops/history_rewrites/req-1.json",
    );
    expect(rewrite.permissionClass).toBe("elevated_editable");
    expect(rewrite.domain).toBe("ops");
    expect(rewrite.retention).toBe("archival");
  });

  it("matches editable save-scoped workspace plan template", () => {
    const plan = vfsResourceTemplateRegistry.match(
      "forks/0/story/workspace/PLAN.md",
    );

    expect(plan.id).toBe("template.story.workspace_plan");
    expect(plan.permissionClass).toBe("default_editable");
    expect(plan.shape).toBe("markdown_doc");
    expect(plan.allowedWriteOps).toContain("write");
  });

  it("matches editable workspace user memory template", () => {
    const soul = vfsResourceTemplateRegistry.match(
      "shared/config/workspace/USER.md",
    );

    expect(soul.id).toBe("template.config.workspace_user");
    expect(soul.permissionClass).toBe("default_editable");
    expect(soul.scope).toBe("shared");
    expect(soul.contentTypes).toContain("text/markdown");
  });

  it("falls back to fork runtime template for unmatched paths", () => {
    const fallback = vfsResourceTemplateRegistry.match(
      "forks/0/runtime/misc/notes.txt",
    );
    expect(fallback.id).toBe("template.runtime.fork");
    expect(fallback.criticality).toBe("ephemeral");
    expect(fallback.retention).toBe("session");
  });
});
