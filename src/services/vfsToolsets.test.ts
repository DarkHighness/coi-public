import { describe, expect, it } from "vitest";
import {
  formatVfsToolCapabilitiesForPrompt,
  formatVfsToolsForPrompt,
  listVfsToolsets,
} from "./vfsToolsets";

describe("vfsToolsets", () => {
  it("ensures each toolset contains its own finish tool", () => {
    const toolsets = listVfsToolsets();
    expect(toolsets.turn.tools).toContain(toolsets.turn.finishToolName);
    expect(toolsets.playerRate.tools).toContain(
      toolsets.playerRate.finishToolName,
    );
    expect(toolsets.cleanup.tools).toContain(
      toolsets.cleanup.finishToolName,
    );
    expect(toolsets.summary.tools).toContain(
      toolsets.summary.finishToolName,
    );
    expect(toolsets.outline.tools).toContain(
      toolsets.outline.finishToolName,
    );

    expect(toolsets.turn.tools).not.toContain("vfs_finish_summary");
    expect(toolsets.turn.tools).not.toContain("vfs_finish_soul");
    expect(toolsets.playerRate.tools).toContain("vfs_finish_soul");
    expect(toolsets.playerRate.tools).not.toContain("vfs_finish_turn");
    expect(toolsets.playerRate.tools).not.toContain("vfs_mutate");
    expect(toolsets.cleanup.tools).not.toContain("vfs_finish_summary");
    expect(toolsets.summary.tools).toContain("vfs_finish_summary");
    expect(toolsets.outline.tools).toContain("vfs_finish_outline");
    expect(toolsets.outline.tools).not.toContain("vfs_finish_turn");
    expect(toolsets.outline.tools).not.toContain("vfs_finish_summary");
  });

  it("formats tool list for prompts with markdown bullets", () => {
    const output = formatVfsToolsForPrompt([
      "vfs_ls",
      "vfs_read",
      "vfs_finish_turn",
    ]);
    expect(output).toBe("- `vfs_ls`\n- `vfs_read`\n- `vfs_finish_turn`");
  });

  it("formats capability contract with one line per tool", () => {
    const tools = ["vfs_ls", "vfs_mutate", "vfs_finish_turn"];
    const output = formatVfsToolCapabilitiesForPrompt(tools);
    const lines = output.split("\n");

    expect(lines).toHaveLength(tools.length);
    for (const tool of tools) {
      expect(output).toContain(`- \`${tool}\`:`);
    }
  });

  it("includes elevation and immutable notes in capability contract", () => {
    const output = formatVfsToolCapabilitiesForPrompt(["vfs_mutate"]);

    expect(output).toContain(
      "elevated_editable requires one-time user-confirmed token",
    );
    expect(output).toContain("resource-template operation contracts enforced");
    expect(output).toContain("immutable: shared/system/skills/**");
    expect(output).toContain("skills/**");
    expect(output).toContain("refs/**");
  });
});
