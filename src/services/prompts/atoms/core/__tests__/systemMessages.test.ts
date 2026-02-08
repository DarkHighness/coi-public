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
    const legacyFinishTool = ["finish", "turn"].join("_");
    const legacySearchTool = ["search", "tool"].join("_");
    expect(content).toContain("vfs_write");
    expect(content).toContain("current/conversation/");
    expect(content).toContain("shared/**");
    expect(content).toContain("forks/{forkId}/**");
    expect(content).toContain("shared/system/skills/**");
    expect(content).toContain("shared/system/refs/**");
    expect(content).not.toContain("current/custom_rules/NN-*/RULES.md");
    expect(content).not.toContain(legacyFinishTool);
    expect(content).not.toContain(legacySearchTool);
  });

  it("no-tool-call error references VFS tools", () => {
    const content = noToolCallError({});
    const legacyFinishTool = ["finish", "turn"].join("_");
    const legacySearchTool = ["search", "tool"].join("_");
    expect(content).toContain("vfs_");
    expect(content).not.toContain(legacyFinishTool);
    expect(content).not.toContain(legacySearchTool);
  });

  it("cleanup turn instruction mentions cleanup helpers", () => {
    const content = cleanupTurnInstruction({});
    expect(content).toContain("vfs_ls_entries");
    expect(content).toContain("vfs_suggest_duplicates");
  });

  it("sudo mode instruction uses controlled elevated VFS workflow", () => {
    const content = sudoModeInstruction({});
    const legacyForceUpdateTool = ["complete", "force", "update"].join("_");
    expect(content).toContain("vfs_write");
    expect(content).toContain("already prefixed with **[SUDO]**");
    expect(content).toContain("forced elevated update payload");
    expect(content).toContain("immutable/finish policy constraints");
    expect(content).not.toContain("bypass normal simulation constraints");
    expect(content).not.toContain(legacyForceUpdateTool);
  });
});
