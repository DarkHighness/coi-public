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
      toolUsage({ finishToolName: "vfs_finish_turn" }),
      idAndEntityPolicy(),
      memoryPolicy(),
      stateManagement(),
      gmKnowledge(),
    ].join("\n");

    const legacyFinishTool = "vfs_commit_turn";
    const legacySearchTool = "search_tool";
    const legacyActivateTool = "activate_skill";
    const legacyForceUpdateTool = "complete_force_update";
    const legacyRagSearchTool = "rag_search";

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
    expect(content).toContain("vfs_write_file");
    expect(content).toContain("vfs_write_file");
    expect(content).toContain("vfs_write_file");
    expect(content).toContain("current/summary/state.json");
    expect(content).toContain("forks/{activeFork}/story/world/**");
    expect(content).toContain("current/world/global.json");
    expect(content).toContain('vfs_ls({ patterns: ["current/**/notes.md"] })');
    expect(content).not.toContain("vfs_read_chars path=");
    expect(content).not.toContain("vfs_ls patterns=");
    expect(content).not.toContain("vfs_write_file({ path:");
    expect(content).toContain("vfs_read_json");
    expect(content).toContain("pointers first");
    expect(content).toContain("avoid broad `vfs_read_chars` reads by default");

    // Turn finish protocol should avoid generic conversation writes
    expect(content).toContain("vfs_finish_turn");
    expect(content).toContain("vfs_write_file");
    expect(content).toContain("current/conversation/**");
    expect(content).toContain("shared/narrative/conversation/*.json");
    expect(content).toContain("WRITE-FAILURE REPAIR MODE");
    expect(content).toContain("NO COMMIT SPAM");
    expect(content).not.toContain(
      "write both files via `vfs_write_file`/`vfs_write_file`",
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
    expect(content).toContain("is NOT a container for those collections");
    expect(content).toContain("JSON pointer `/unlocked` or `/unlockReason`");
    expect(content).toContain("Never guess leaf filenames");
    expect(content).toContain("Placeholder promotion (MANDATORY)");
    expect(content).toContain("knownBy vs unlocked decision protocol (STRICT)");
    expect(content).toContain(
      "hidden-truth proof, not about first-time appearance",
    );
    expect(content).toContain("current/world/placeholders/**/*.md");
    expect(content).not.toContain("current/world/placeholder/");
    expect(content).not.toContain("world/placeholder/");
    expect(content).toContain("delete draft only after canonical write succeeds");
    expect(content).toContain("If canonical write fails, keep draft");

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
