import { describe, it, expect } from "vitest";
import { coreRulesComposite } from "../coreRulesComposite";

describe("coreRulesComposite", () => {
  it("avoids deprecated tool references", () => {
    const content = coreRulesComposite();
    expect(content).not.toContain("activate_skill");
    expect(content).not.toContain("search_tool");
    expect(content).not.toContain("finish_turn");
    expect(content).not.toContain("complete_force_update");
  });
});
