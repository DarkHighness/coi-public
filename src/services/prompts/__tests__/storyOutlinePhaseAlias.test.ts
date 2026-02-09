import { describe, expect, it } from "vitest";
import { getOutlinePhase6Prompt } from "../storyOutline";

describe("storyOutline legacy phase alias", () => {
  it("keeps legacy phase-6 helper aligned to reordered quests+knowledge contract", () => {
    const prompt = getOutlinePhase6Prompt();

    expect(prompt).toContain("[PHASE 7 OF 9: QUESTS + KNOWLEDGE]");
    expect(prompt).toContain("data: { quests, knowledge }");
    expect(prompt).not.toContain("data: { quests }");
  });
});
