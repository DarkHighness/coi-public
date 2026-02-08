import { beforeEach, describe, expect, it } from "vitest";
import { vfsElevationTokenManager } from "../elevation";

describe("vfsElevationTokenManager", () => {
  beforeEach(() => {
    vfsElevationTokenManager.reset();
  });

  it("consumes ai elevation tokens only once", () => {
    const token = vfsElevationTokenManager.issueAiElevationToken({ intent: "sudo_command", scopeTemplateIds: "all_elevated" });

    expect(vfsElevationTokenManager.consumeAiElevationToken(token)).toBe(true);
    expect(vfsElevationTokenManager.consumeAiElevationToken(token)).toBe(false);
  });

  it("tracks editor session token validity and revocation", () => {
    const token = vfsElevationTokenManager.issueEditorSessionToken();

    expect(vfsElevationTokenManager.isValidEditorSessionToken(token)).toBe(true);

    vfsElevationTokenManager.revokeEditorSessionToken(token);

    expect(vfsElevationTokenManager.isValidEditorSessionToken(token)).toBe(false);
  });

  it("reset clears all token records", () => {
    const aiToken = vfsElevationTokenManager.issueAiElevationToken({ intent: "sudo_command", scopeTemplateIds: "all_elevated" });
    const editorToken = vfsElevationTokenManager.issueEditorSessionToken();

    vfsElevationTokenManager.reset();

    expect(vfsElevationTokenManager.consumeAiElevationToken(aiToken)).toBe(false);
    expect(vfsElevationTokenManager.isValidEditorSessionToken(editorToken)).toBe(
      false,
    );
  });

  it("enforces intent and scope binding for AI elevation token", () => {
    const token = vfsElevationTokenManager.issueAiElevationToken({
      intent: "outline_submit",
      scopeTemplateIds: ["template.narrative.outline.phases"],
    });

    expect(
      vfsElevationTokenManager.consumeAiElevationToken(token, {
        requiredIntent: "sudo_command",
      }),
    ).toBe(false);

    expect(
      vfsElevationTokenManager.consumeAiElevationToken(token, {
        requiredIntent: "outline_submit",
        requiredScopeTemplateIds: ["template.ops.history_rewrites"],
      }),
    ).toBe(false);

    expect(
      vfsElevationTokenManager.consumeAiElevationToken(token, {
        requiredIntent: "outline_submit",
        requiredScopeTemplateIds: ["template.narrative.outline.phases"],
        templateId: "template.narrative.outline.phases",
      }),
    ).toBe(true);
    expect(vfsElevationTokenManager.consumeAiElevationToken(token)).toBe(false);
  });
});
