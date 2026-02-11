import { describe, expect, it, vi } from "vitest";
import { renderGodMode, renderWorldFoundation } from "./worldFoundation";

const toToonMock = vi.hoisted(() => vi.fn((value: unknown) => `TOON:${JSON.stringify(value)}`));

vi.mock("../../toon", () => ({
  toToon: toToonMock,
}));

describe("worldFoundation renderer", () => {
  it("returns empty output when outline is missing", () => {
    expect(renderWorldFoundation({ outline: undefined })).toBe("");
  });

  it("renders world foundation sections with toon-converted blocks", () => {
    const outline = {
      title: "Broken Sky",
      premise: "A city survives inside a cracked dome",
      mainGoal: { primary: "Find the source of rifts" },
      worldSetting: { era: "post-collapse", tone: "grim" },
    } as any;

    const output = renderWorldFoundation({ outline });

    expect(output).toContain("<world_foundation>");
    expect(output).toContain("<title>Broken Sky</title>");
    expect(output).toContain("<premise>A city survives inside a cracked dome</premise>");
    expect(output).toContain("<main_goal>TOON:{\"primary\":\"Find the source of rifts\"}</main_goal>");
    expect(output).toContain("<world_setting>TOON:{\"era\":\"post-collapse\",\"tone\":\"grim\"}</world_setting>");
    expect(toToonMock).toHaveBeenCalledTimes(2);
  });

  it("renders god mode notice only when enabled", () => {
    expect(renderGodMode({ godMode: false })).toBe("");

    const output = renderGodMode({ godMode: true });
    expect(output).toContain("<god_mode>");
    expect(output).toContain("GOD MODE ACTIVE");
  });
});
