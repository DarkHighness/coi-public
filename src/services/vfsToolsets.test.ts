import { describe, expect, it } from "vitest";
import {
  VFS_TOOLSETS,
  formatVfsToolCapabilitiesForPrompt,
  formatVfsToolsForPrompt,
} from "./vfsToolsets";

describe("vfsToolsets", () => {
  it("ensures each toolset contains its own finish tool", () => {
    expect(VFS_TOOLSETS.turn.tools).toContain(VFS_TOOLSETS.turn.finishToolName);
    expect(VFS_TOOLSETS.playerRate.tools).toContain(
      VFS_TOOLSETS.playerRate.finishToolName,
    );
    expect(VFS_TOOLSETS.cleanup.tools).toContain(
      VFS_TOOLSETS.cleanup.finishToolName,
    );
    expect(VFS_TOOLSETS.summary.tools).toContain(
      VFS_TOOLSETS.summary.finishToolName,
    );
    expect(VFS_TOOLSETS.outline.tools).toContain(
      VFS_TOOLSETS.outline.finishToolName,
    );

    expect(VFS_TOOLSETS.turn.tools).not.toContain("vfs_commit_summary");
    expect(VFS_TOOLSETS.turn.tools).not.toContain("vfs_commit_soul");
    expect(VFS_TOOLSETS.playerRate.tools).toContain("vfs_commit_soul");
    expect(VFS_TOOLSETS.playerRate.tools).not.toContain("vfs_commit_turn");
    expect(VFS_TOOLSETS.playerRate.tools).not.toContain("vfs_write");
    expect(VFS_TOOLSETS.cleanup.tools).not.toContain("vfs_commit_summary");
    expect(VFS_TOOLSETS.summary.tools).toContain("vfs_commit_summary");
    expect(VFS_TOOLSETS.outline.tools).toContain("vfs_commit_outline_phase_9");
    expect(VFS_TOOLSETS.outline.tools).not.toContain("vfs_commit_turn");
    expect(VFS_TOOLSETS.outline.tools).not.toContain("vfs_commit_summary");
  });

  it("formats tool list for prompts with markdown bullets", () => {
    const output = formatVfsToolsForPrompt([
      "vfs_ls",
      "vfs_read",
      "vfs_commit_turn",
    ]);
    expect(output).toBe("- `vfs_ls`\n- `vfs_read`\n- `vfs_commit_turn`");
  });

  it("formats capability contract with one line per tool", () => {
    const tools = ["vfs_ls", "vfs_write", "vfs_commit_turn"];
    const output = formatVfsToolCapabilitiesForPrompt(tools);
    const lines = output.split("\n");

    expect(lines).toHaveLength(tools.length);
    for (const tool of tools) {
      expect(output).toContain(`- \`${tool}\`:`);
    }
  });

  it("includes elevation and immutable notes in capability contract", () => {
    const output = formatVfsToolCapabilitiesForPrompt(["vfs_write"]);

    expect(output).toContain(
      "elevated_editable requires one-time user-confirmed token",
    );
    expect(output).toContain("resource-template operation contracts enforced");
    expect(output).toContain("immutable: shared/system/skills/**");
    expect(output).toContain("skills/**");
    expect(output).toContain("refs/**");
  });
});
