import { describe, expect, it } from "vitest";
import { visualTools } from "./visualToolHandler";

describe("visualToolHandler", () => {
  it("defines submit_visual_result tool with optional prompt fields", () => {
    expect(visualTools).toHaveLength(1);

    const [tool] = visualTools;
    expect(tool.name).toBe("submit_visual_result");

    const valid = tool.parameters.safeParse({
      imagePrompt: "a rainy alley",
      veoScript: "shot-1",
    });
    expect(valid.success).toBe(true);

    const nullish = tool.parameters.safeParse({
      imagePrompt: null,
      veoScript: undefined,
    });
    expect(nullish.success).toBe(true);

    const empty = tool.parameters.safeParse({});
    expect(empty.success).toBe(true);
  });
});
