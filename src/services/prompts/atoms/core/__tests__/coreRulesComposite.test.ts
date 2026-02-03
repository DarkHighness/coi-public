import { describe, it, expect } from "vitest";
import { coreRulesComposite } from "../coreRulesComposite";

describe("coreRulesComposite", () => {
  it("avoids deprecated tool references", () => {
    const content = coreRulesComposite();
    const legacyActivateTool = ["activate", "skill"].join("_");
    const legacySearchTool = ["search", "tool"].join("_");
    const legacyFinishTool = ["finish", "turn"].join("_");
    const legacyForceUpdateTool = ["complete", "force", "update"].join("_");
    expect(content).not.toContain(legacyActivateTool);
    expect(content).not.toContain(legacySearchTool);
    expect(content).not.toContain(legacyFinishTool);
    expect(content).not.toContain(legacyForceUpdateTool);
  });
});
