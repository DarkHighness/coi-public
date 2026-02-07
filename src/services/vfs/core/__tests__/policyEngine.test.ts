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
      elevationToken: vfsElevationTokenManager.issueAiElevationToken(),
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

    const token = vfsElevationTokenManager.issueAiElevationToken();
    const batchContext = {
      actor: "ai" as const,
      mode: "sudo" as const,
      elevationToken: token,
    };

    const first = vfsPolicyEngine.canWrite("outline/phases/phase0.json", batchContext);
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
      },
    );
    expect(reusedTokenInNewContext.allowed).toBe(false);
    expect(reusedTokenInNewContext.code).toBe("ELEVATION_REQUIRED");
  });

  it("enforces finish-guarded paths unless explicitly enabled", () => {
    const blocked = vfsPolicyEngine.canWrite("conversation/index.json", {
      actor: "ai",
      mode: "normal",
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.code).toBe("FINISH_GUARD_REQUIRED");

    const allowed = vfsPolicyEngine.canWrite("conversation/index.json", {
      actor: "ai",
      mode: "normal",
      allowFinishGuardedWrite: true,
    });
    expect(allowed.allowed).toBe(true);
    expect(allowed.code).toBe("OK");
  });
});
