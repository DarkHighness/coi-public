import { describe, expect, it } from "vitest";
import { getOutlineSystemInstruction } from "../storyOutline";

describe("outline tool instruction consistency", () => {
  it("does not ask for raw JSON text output in tool-calling mode", () => {
    const prompt = getOutlineSystemInstruction({ language: "en" });

    expect(prompt).not.toContain("ONLY THE RAW JSON");
    expect(prompt).not.toContain("Failure to output raw JSON");
    expect(prompt).toContain("You MUST call the currently provided submit tool");
    expect(prompt).toContain("Return no extra text outside the tool call");
    expect(prompt).toContain("outline generation flow");
    expect(prompt).toContain("does NOT apply to normal turn/cleanup/summary flows");
  });
});
