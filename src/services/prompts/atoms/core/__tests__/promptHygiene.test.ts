import { describe, it, expect } from "vitest";
import {
  idAndEntityPolicy,
  memoryPolicy,
  outputFormat,
  protocols,
  roleInstruction,
  styleGuide,
  toolUsage,
} from "../index";

describe("core prompt hygiene", () => {
  it("removes deprecated tool references from core prompts", () => {
    const content = [
      roleInstruction(),
      protocols({ forSystemPrompt: false }),
      outputFormat({ language: "en" }),
      styleGuide({ language: "en" }),
      toolUsage({}),
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
  });
});
