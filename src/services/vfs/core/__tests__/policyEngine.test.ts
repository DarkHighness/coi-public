import { beforeEach, describe, expect, it } from "vitest";
import { vfsElevationTokenManager } from "../elevation";
import { vfsPolicyEngine } from "../policyEngine";

describe("vfsPolicyEngine", () => {
  beforeEach(() => {
    vfsElevationTokenManager.reset();
  });

  it("enforces immutable paths for all actors", () => {
    const decision = vfsPolicyEngine.canWrite("skills/README.md", {
      actor: "ai",
      mode: "sudo",
      elevationToken: vfsElevationTokenManager.issueAiElevationToken({
        intent: "sudo_command",
        scopeTemplateIds: "all_elevated",
      }),
    });

    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("IMMUTABLE_READONLY");
  });

  it("allows AI writes on default editable paths in normal mode", () => {
    const decision = vfsPolicyEngine.canWrite("world/global.json", {
      actor: "ai",
      mode: "normal",
    });

    expect(decision.allowed).toBe(true);
    expect(decision.code).toBe("OK");
  });

  it("allows AI writes to outline story plan in normal mode", () => {
    const decision = vfsPolicyEngine.canWrite("workspace/PLAN.md", {
      actor: "ai",
      mode: "normal",
    });

    expect(decision.allowed).toBe(true);
    expect(decision.code).toBe("OK");
  });

  it("allows writing outline story plan in normal editor flow", () => {
    const sessionToken = vfsElevationTokenManager.issueEditorSessionToken();
    const decision = vfsPolicyEngine.canWrite("workspace/PLAN.md", {
      actor: "user_editor",
      mode: "normal",
      editorSessionToken: sessionToken,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.code).toBe("OK");
  });

  it("requires editor confirmation token for user_editor writes", () => {
    const withoutToken = vfsPolicyEngine.canWrite("world/global.json", {
      actor: "user_editor",
      mode: "normal",
    });
    expect(withoutToken.allowed).toBe(false);
    expect(withoutToken.code).toBe("EDITOR_CONFIRM_REQUIRED");

    const sessionToken = vfsElevationTokenManager.issueEditorSessionToken();
    const withToken = vfsPolicyEngine.canWrite("world/global.json", {
      actor: "user_editor",
      mode: "normal",
      editorSessionToken: sessionToken,
    });
    expect(withToken.allowed).toBe(true);
    expect(withToken.code).toBe("OK");
  });

  it("requires elevation for elevated paths and supports request-batch reuse", () => {
    const denied = vfsPolicyEngine.canWrite("outline/phases/phase0.json", {
      actor: "ai",
      mode: "normal",
    });
    expect(denied.allowed).toBe(false);
    expect(denied.code).toBe("ELEVATION_REQUIRED");

    const token = vfsElevationTokenManager.issueAiElevationToken({
      intent: "sudo_command",
      scopeTemplateIds: "all_elevated",
    });
    const batchContext = {
      actor: "ai" as const,
      mode: "sudo" as const,
      elevationToken: token,
      elevationIntent: "sudo_command" as const,
      elevationScopeTemplateIds: "all_elevated" as const,
    };

    const first = vfsPolicyEngine.canWrite(
      "outline/phases/phase0.json",
      batchContext,
    );
    expect(first.allowed).toBe(true);

    const second = vfsPolicyEngine.canWrite(
      "conversation/history_rewrites/req-1.json",
      batchContext,
    );
    expect(second.allowed).toBe(true);

    const reusedTokenInNewContext = vfsPolicyEngine.canWrite(
      "outline/phases/phase1.json",
      {
        actor: "ai",
        mode: "sudo",
        elevationToken: token,
        elevationIntent: "sudo_command",
        elevationScopeTemplateIds: "all_elevated",
      },
    );
    expect(reusedTokenInNewContext.allowed).toBe(false);
    expect(reusedTokenInNewContext.code).toBe("ELEVATION_REQUIRED");
  });

  it("applies identical permissions for alias and canonical paths", () => {
    const alias = vfsPolicyEngine.canWrite("world/global.json", {
      actor: "ai",
      mode: "normal",
      activeForkId: 2,
    });
    const canonical = vfsPolicyEngine.canWrite(
      "forks/2/story/world/global.json",
      {
        actor: "ai",
        mode: "normal",
        activeForkId: 2,
      },
    );

    expect(alias.allowed).toBe(canonical.allowed);
    expect(alias.code).toBe(canonical.code);
  });

  it("enforces finish-guarded paths unless explicitly enabled", () => {
    const blocked = vfsPolicyEngine.canWrite("conversation/index.json", {
      actor: "ai",
      mode: "normal",
      operation: "finish_commit",
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.code).toBe("FINISH_GUARD_REQUIRED");

    const allowed = vfsPolicyEngine.canWrite("conversation/index.json", {
      actor: "ai",
      mode: "normal",
      operation: "finish_commit",
      allowFinishGuardedWrite: true,
    });
    expect(allowed.allowed).toBe(true);
    expect(allowed.code).toBe("OK");
  });

  it("rejects elevated writes when intent mismatches", () => {
    const token = vfsElevationTokenManager.issueAiElevationToken({
      intent: "sudo_command",
      scopeTemplateIds: "all_elevated",
    });

    const decision = vfsPolicyEngine.canWrite("outline/phases/phase0.json", {
      actor: "ai",
      mode: "sudo",
      elevationToken: token,
      elevationIntent: "outline_submit",
      elevationScopeTemplateIds: ["template.narrative.outline.phases"],
    });

    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("ELEVATION_REQUIRED");
  });

  it("rejects elevated writes when scope excludes template", () => {
    const token = vfsElevationTokenManager.issueAiElevationToken({
      intent: "outline_submit",
      scopeTemplateIds: ["template.narrative.outline.phases"],
    });

    const decision = vfsPolicyEngine.canWrite(
      "forks/0/ops/history_rewrites/req-1.json",
      {
        actor: "ai",
        mode: "sudo",
        elevationToken: token,
        elevationIntent: "outline_submit",
        elevationScopeTemplateIds: ["template.narrative.outline.phases"],
      },
    );

    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("ELEVATION_REQUIRED");
  });

  it("reuses granted elevated scope only within same request context", () => {
    const token = vfsElevationTokenManager.issueAiElevationToken({
      intent: "outline_submit",
      scopeTemplateIds: ["template.narrative.outline.phases"],
    });
    const context = {
      actor: "ai" as const,
      mode: "sudo" as const,
      elevationToken: token,
      elevationIntent: "outline_submit" as const,
      elevationScopeTemplateIds: ["template.narrative.outline.phases"],
    };

    const first = vfsPolicyEngine.canWrite(
      "outline/phases/phase0.json",
      context,
    );
    expect(first.allowed).toBe(true);

    const second = vfsPolicyEngine.canWrite(
      "outline/phases/phase1.json",
      context,
    );
    expect(second.allowed).toBe(true);

    const deniedOutsideScope = vfsPolicyEngine.canWrite(
      "forks/0/ops/history_rewrites/req-2.json",
      context,
    );
    expect(deniedOutsideScope.allowed).toBe(false);
    expect(deniedOutsideScope.code).toBe("ELEVATION_REQUIRED");
  });

  it("enforces allowed operations declared by resource templates", () => {
    const deniedWrite = vfsPolicyEngine.canWrite("summary/state.json", {
      actor: "ai",
      mode: "normal",
      allowFinishGuardedWrite: true,
      operation: "write",
    });
    expect(deniedWrite.allowed).toBe(false);
    expect(deniedWrite.code).toBe("FINISH_GUARD_REQUIRED");

    const allowedSummary = vfsPolicyEngine.canWrite("summary/state.json", {
      actor: "ai",
      mode: "normal",
      allowFinishGuardedWrite: true,
      operation: "finish_summary",
    });
    expect(allowedSummary.allowed).toBe(true);
    expect(allowedSummary.code).toBe("OK");
  });
});
