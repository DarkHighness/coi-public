import { describe, it, expect } from "vitest";
import { stateManagement } from "../stateManagement";

describe("stateManagement atom", () => {
  it("requires VFS tools for state updates", () => {
    const content = stateManagement();
    const legacyFinishTool = ["finish", "turn"].join("_");
    expect(content).toContain("vfs_write");
    expect(content).toContain("vfs_edit");
    expect(content).toContain("vfs_merge");
    expect(content).toContain("JSON Patch");
    expect(content).toContain("vfs_delete");
    expect(content).toContain("current/world/");
    expect(content).toContain("forks/{forkId}/**");
    expect(content).toContain("current/**");
    expect(content).toContain("vfs_commit_turn");
    expect(content).not.toContain(legacyFinishTool);
    expect(content).toContain("omit optional fields");
    expect(content).toContain("shared/narrative/conversation/*.json");
  });

  it("documents outline immutability and VFS outline paths", () => {
    const content = stateManagement();
    expect(content).toContain("current/outline/outline.json");
    expect(content).toContain("current/outline/progress.json");
    expect(content).toContain("shared/narrative/outline/outline.json");
    expect(content).toContain("shared/narrative/outline/progress.json");
    expect(content).toContain("outline is immutable");
    expect(content).toContain("sudo");
    expect(content).toContain("god mode");
    expect(content).toContain("from only for move/copy");
  });
});
