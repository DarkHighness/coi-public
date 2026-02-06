import { describe, it, expect } from "vitest";
import {
  idAndEntityPolicy,
  memoryPolicy,
  outputFormat,
  protocolsPrimer,
  roleInstruction,
  toolUsage,
} from "../index";

describe("core prompt hygiene", () => {
  it("removes deprecated tool references from core prompts", () => {
    const content = [
      roleInstruction(),
      protocolsPrimer(),
      outputFormat({ language: "en" }),
      toolUsage({ finishToolName: "vfs_commit_turn" }),
      idAndEntityPolicy(),
      memoryPolicy(),
    ].join("\n");

    const legacyFinishTool = ["finish", "turn"].join("_");
    const legacySearchTool = ["search", "tool"].join("_");
    const legacyActivateTool = ["activate", "skill"].join("_");
    const legacyForceUpdateTool = ["complete", "force", "update"].join("_");
    const legacyRagSearchTool = ["rag", "search"].join("_");
    expect(content).not.toContain(legacyFinishTool);
    expect(content).not.toContain(legacySearchTool);
    expect(content).not.toContain(legacyActivateTool);
    expect(content).not.toContain(legacyForceUpdateTool);
    expect(content).not.toContain(legacyRagSearchTool);
    expect(content).not.toContain("list_");
    expect(content).not.toContain("query_");
    expect(content).not.toContain("add_");
    expect(content).toContain("vfs_");

    // Notes scratch pad policy (VFS markdown)
    expect(content).toContain("current/world/notes.md");
    expect(content).toContain("current/**/notes.md");
    expect(content).toContain("read → modify → write");
    expect(content).toContain("vfs_append");
    expect(content).toContain("vfs_text_edit");
    expect(content).toContain("vfs_text_patch");
    expect(content).toContain("current/summary/state.json");
    expect(content).toContain("current/world/global.json");
    expect(content).toContain('vfs_glob patterns=["current/**/notes.md"]');

    // Turn finish protocol should avoid generic conversation writes
    expect(content).toContain("vfs_commit_turn");
    expect(content).toContain("vfs_tx");
    expect(content).toContain("current/conversation/*");
    expect(content).not.toContain("write both files via `vfs_write`/`vfs_edit`");
    expect(content).not.toContain("or conversation writes");
  });
});
