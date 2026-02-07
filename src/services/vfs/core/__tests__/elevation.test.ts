import { beforeEach, describe, expect, it } from "vitest";
import { vfsElevationTokenManager } from "../elevation";

describe("vfsElevationTokenManager", () => {
  beforeEach(() => {
    vfsElevationTokenManager.reset();
  });

  it("consumes ai elevation tokens only once", () => {
    const token = vfsElevationTokenManager.issueAiElevationToken();

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
    const aiToken = vfsElevationTokenManager.issueAiElevationToken();
    const editorToken = vfsElevationTokenManager.issueEditorSessionToken();

    vfsElevationTokenManager.reset();

    expect(vfsElevationTokenManager.consumeAiElevationToken(aiToken)).toBe(false);
    expect(vfsElevationTokenManager.isValidEditorSessionToken(editorToken)).toBe(
      false,
    );
  });
});
