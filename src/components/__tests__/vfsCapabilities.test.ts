import { describe, it, expect } from "vitest";
import { VfsSession } from "../../services/vfs/vfsSession";
import { vfsElevationTokenManager } from "../../services/vfs/core/elevation";
import {
  getDirectoryPathCapabilities,
  getFilePathCapabilities,
} from "../vfsExplorer/capabilities";

const createContext = () => ({
  editorSessionToken: vfsElevationTokenManager.issueEditorSessionToken(),
  activeForkId: 0,
});

describe("vfs capabilities", () => {
  it("locks README move/delete but keeps editing enabled", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/characters/README.md",
      "# Characters",
      "text/markdown",
    );

    const capabilities = getFilePathCapabilities(
      "world/characters/README.md",
      createContext(),
    );

    expect(capabilities.canEdit).toBe(true);
    expect(capabilities.canRenameMove).toBe(false);
    expect(capabilities.canDelete).toBe(false);
    expect(capabilities.renameMoveReason).toContain("README");
    expect(capabilities.deleteReason).toContain("README");
  });

  it("locks scaffold directory rename/delete", () => {
    const session = new VfsSession();
    const capabilities = getDirectoryPathCapabilities(
      "custom_rules/00-system-core",
      session.snapshotAll(),
      createContext(),
    );

    expect(capabilities.canRenameMove).toBe(false);
    expect(capabilities.canDelete).toBe(false);
    expect(capabilities.renameMoveReason).toContain("Scaffold");
    expect(capabilities.deleteReason).toContain("Scaffold");
  });

  it("marks outline story plan as editable", () => {
    const capabilities = getFilePathCapabilities(
      "outline/story_outline/plan.md",
      createContext(),
    );

    expect(capabilities.canEdit).toBe(true);
    expect(capabilities.canRenameMove).toBe(true);
    expect(capabilities.canDelete).toBe(true);
  });

  it("allows non-scaffold folder operations even with README marker", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/knowledge/tmp/README.md",
      "# tmp",
      "text/markdown",
    );
    session.writeFile(
      "world/knowledge/tmp/rules.md",
      "- item",
      "text/markdown",
    );

    const capabilities = getDirectoryPathCapabilities(
      "world/knowledge/tmp",
      session.snapshotAll(),
      createContext(),
    );

    expect(capabilities.canRenameMove).toBe(true);
    expect(capabilities.canDelete).toBe(true);
  });
});
