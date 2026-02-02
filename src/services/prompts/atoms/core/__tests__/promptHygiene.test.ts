import { describe, it, expect } from "vitest";
import {
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
      protocols({ isLiteMode: false }),
      outputFormat({ language: "en" }),
      styleGuide({ language: "en" }),
      toolUsage({}),
    ].join("\n");

    expect(content).not.toContain("finish_turn");
    expect(content).not.toContain("search_tool");
    expect(content).not.toContain("activate_skill");
    expect(content).not.toContain("complete_force_update");
    expect(content).not.toContain("list_");
    expect(content).not.toContain("query_");
    expect(content).not.toContain("rag_search");
  });
});
