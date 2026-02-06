import { describe, expect, it } from "vitest";
import { VFS_TOOLSETS, formatVfsToolsForPrompt } from "./vfsToolsets";

describe("vfsToolsets", () => {
  it("ensures each toolset contains its own finish tool", () => {
    expect(VFS_TOOLSETS.turn.tools).toContain(VFS_TOOLSETS.turn.finishToolName);
    expect(VFS_TOOLSETS.cleanup.tools).toContain(VFS_TOOLSETS.cleanup.finishToolName);
    expect(VFS_TOOLSETS.summary.tools).toContain(VFS_TOOLSETS.summary.finishToolName);

    expect(VFS_TOOLSETS.turn.tools).not.toContain("vfs_finish_summary");
    expect(VFS_TOOLSETS.cleanup.tools).not.toContain("vfs_finish_summary");
    expect(VFS_TOOLSETS.summary.tools).toContain("vfs_finish_summary");
  });

  it("formats tool list for prompts with markdown bullets", () => {
    const output = formatVfsToolsForPrompt(["vfs_ls", "vfs_read", "vfs_commit_turn"]);
    expect(output).toBe("- `vfs_ls`\n- `vfs_read`\n- `vfs_commit_turn`");
  });
});
