import { describe, it, expect } from "vitest";
import {
  gmKnowledge,
  idAndEntityPolicy,
  memoryPolicy,
  outputFormat,
  protocols,
  protocolsPrimer,
  roleInstruction,
  styleGuide,
  stateManagement,
  toolUsage,
} from "../index";
import { writingCraft } from "../../narrative/writingCraft";

describe("core prompt hygiene", () => {
  it("removes deprecated tool references and keeps VFS contract aligned", () => {
    const content = [
      roleInstruction(),
      protocolsPrimer(),
      protocols(),
      outputFormat({ language: "en" }),
      toolUsage({ finishToolName: "vfs_commit_turn" }),
      idAndEntityPolicy(),
      memoryPolicy(),
      stateManagement(),
      gmKnowledge(),
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

    // Canonical + alias path model
    expect(content).toContain("shared/**");
    expect(content).toContain("forks/{forkId}/**");
    expect(content).toContain("current/**");

    // Notes scratch pad policy (VFS markdown)
    expect(content).toContain("current/world/notes.md");
    expect(content).toContain("current/**/notes.md");
    expect(content).toContain("Story Teller AI to itself");
    expect(content).toContain("read → modify → write");
    expect(content).toContain("vfs_write");
    expect(content).toContain("vfs_write");
    expect(content).toContain("vfs_write");
    expect(content).toContain("current/summary/state.json");
    expect(content).toContain("forks/{activeFork}/story/world/**");
    expect(content).toContain("current/world/global.json");
    expect(content).toContain('vfs_ls({ patterns: ["current/**/notes.md"] })');
    expect(content).not.toContain("vfs_read path=");
    expect(content).not.toContain("vfs_ls patterns=");
    expect(content).not.toContain("vfs_write({ path:");

    // Turn finish protocol should avoid generic conversation writes
    expect(content).toContain("vfs_commit_turn");
    expect(content).toContain("vfs_write");
    expect(content).toContain("current/conversation/**");
    expect(content).toContain("shared/narrative/conversation/*.json");
    expect(content).not.toContain(
      "write both files via `vfs_write`/`vfs_write`",
    );
    expect(content).not.toContain("or conversation writes");

    // Permission contract clarity
    expect(content).toContain("immutable_readonly");
    expect(content).toContain("default_editable");
    expect(content).toContain("elevated_editable");
    expect(content).toContain("one-time user-confirmed token");
    expect(content).toContain("skills/**");
    expect(content).toContain("refs/**");

    // Outline adaptation protocol must be present in runtime prompts
    expect(content).toContain("current/outline/story_outline/plan.md");
    expect(content).toContain("plan.md is guidance");
    expect(content).toContain("Natural recovery");
    expect(content).toContain("No deus-ex-machina corrections");
    expect(content).toContain("worldSettingUnlocked");
    expect(content).toContain("mainGoalUnlocked");

    // SUDO semantics must remain controlled (not hard bypass)
    expect(content).toContain("elevated update");
    expect(content).toContain("immutable/finish guards");
    expect(content).not.toContain(
      "Bypasses all game rules and simulation logic",
    );
  });

  it("keeps humanizer tone concise while preserving canonical state consistency", () => {
    const content = [styleGuide({}), writingCraft()].join("\n");

    expect(content).toContain("<humanizer_tone>");
    expect(content).toContain("Style polish must NOT alter canonical state");
    expect(content).toContain("Never rewrite canonical state for style");
    expect(content).toContain("inventory");
    expect(content).toContain("timeline");
  });
});
