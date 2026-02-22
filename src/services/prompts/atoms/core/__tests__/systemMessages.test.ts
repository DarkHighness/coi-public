import { describe, it, expect } from "vitest";
import {
  cleanupTurnInstruction,
  normalTurnInstruction,
  noToolCallError,
  sudoModeInstruction,
} from "../systemMessages";

describe("systemMessages atoms", () => {
  it("normal turn instruction uses VFS-only workflow", () => {
    const content = normalTurnInstruction({});
    const legacyFinishTool = "vfs_commit_turn";
    const legacySearchTool = "search_tool";
    expect(content).toContain("vfs_write_file");
    expect(content).toContain("current/conversation/");
    // Immutable zone referenced in shared capability line
    expect(content).toContain("immutable zones");
    expect(content).toContain("WRITE FAILURE REPAIR MODE");
    expect(content).toContain("NO COMMIT SPAM");
    expect(content).toContain("PREFLIGHT");
    expect(content).toContain("broad full-file");
    expect(content).not.toContain("vfs_vm");
    expect(content).toContain("workspace/PLAN.md");
    expect(content).toContain("major branch fracture");
    expect(content).not.toContain("current/custom_rules/NN-*/RULES.md");
    expect(content).not.toContain(legacyFinishTool);
    expect(content).not.toContain(legacySearchTool);
  });

  it("includes vfs_vm protocol only when experimental toggle is enabled", () => {
    const content = normalTurnInstruction({ vfsVmEnabled: true });
    expect(content).toContain("vfs_vm");
    expect(content).toContain("ONLY top-level tool call");
    expect(content).toContain("JS script");
    expect(content).toContain("globalThis");
    expect(content).toContain("VFS.*");
    expect(content).toContain("ctx.call");
  });

  it("removes semantic guidance when RAG is disabled", () => {
    const normal = normalTurnInstruction({ ragEnabled: false });
    const cleanup = cleanupTurnInstruction({ ragEnabled: false });

    expect(normal.toLowerCase()).not.toContain("semantic");
    expect(cleanup.toLowerCase()).not.toContain("semantic");
  });

  it("no-tool-call error references VFS tools", () => {
    const content = noToolCallError({});
    const legacyFinishTool = "vfs_commit_turn";
    const legacySearchTool = "search_tool";
    expect(content).toContain("vfs_");
    expect(content).not.toContain(legacyFinishTool);
    expect(content).not.toContain(legacySearchTool);
  });

  it("cleanup turn instruction mentions cleanup helpers", () => {
    const content = cleanupTurnInstruction({});
    expect(content).toContain("vfs_ls");
    expect(content).toContain("vfs_search");
    expect(content).toContain("WRITE FAILURE REPAIR MODE");
    expect(content).toContain("PREFLIGHT");
    expect(content).not.toContain("vfs_vm");
  });

  it("sudo mode instruction uses controlled elevated VFS workflow", () => {
    const content = sudoModeInstruction({});
    const legacyForceUpdateTool = "complete_force_update";
    expect(content).toContain("vfs_write_file");
    expect(content).toContain("already prefixed with **[SUDO]**");
    expect(content).toContain("forced elevated update payload");
    expect(content).toContain("immutable/finish policy constraints");
    expect(content).toContain("PREFLIGHT");
    expect(content).not.toContain("vfs_vm");
    expect(content).not.toContain("bypass normal simulation constraints");
    expect(content).not.toContain(legacyForceUpdateTool);
  });
});
