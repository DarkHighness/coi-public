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

  it("documents outline guidance with player-first adaptation protocol", () => {
    const content = stateManagement();
    expect(content).toContain("current/outline/outline.json");
    expect(content).toContain("current/outline/story_outline/plan.md");
    expect(content).toContain("current/outline/progress.json");
    expect(content).toContain("plan.md is guidance");
    expect(content).toContain("Natural recovery");
    expect(content).toContain("Revise `plan.md`");
    expect(content).toContain("No deus-ex-machina corrections");
    expect(content).toContain("from only for move/copy");
  });
});
