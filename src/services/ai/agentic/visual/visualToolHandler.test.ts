import { describe, expect, it } from "vitest";
import {
  getVisualToolsForTarget,
  VISUAL_READ_ONLY_VFS_TOOL_NAMES,
  IMAGE_PROMPT_SUBMIT_TOOL_NAME,
  VEO_SCRIPT_SUBMIT_TOOL_NAME,
} from "./visualToolHandler";

describe("visualToolHandler", () => {
  it("includes read-only vfs tools", () => {
    expect(VISUAL_READ_ONLY_VFS_TOOL_NAMES).toEqual(
      expect.arrayContaining([
        "vfs_ls",
        "vfs_schema",
        "vfs_read_chars",
        "vfs_read_lines",
        "vfs_read_json",
        "vfs_read_markdown",
        "vfs_search",
      ]),
    );
    expect(VISUAL_READ_ONLY_VFS_TOOL_NAMES).not.toContain("vfs_write_file");
  });

  it("splits submit tools between image and veo loops", () => {
    const imageTools = getVisualToolsForTarget("image_prompt");
    const veoTools = getVisualToolsForTarget("veo_script");

    expect(imageTools.map((tool) => tool.name)).toContain(
      IMAGE_PROMPT_SUBMIT_TOOL_NAME,
    );
    expect(imageTools.map((tool) => tool.name)).not.toContain(
      VEO_SCRIPT_SUBMIT_TOOL_NAME,
    );

    expect(veoTools.map((tool) => tool.name)).toContain(
      VEO_SCRIPT_SUBMIT_TOOL_NAME,
    );
    expect(veoTools.map((tool) => tool.name)).not.toContain(
      IMAGE_PROMPT_SUBMIT_TOOL_NAME,
    );

    const imageSubmitTool = imageTools.find(
      (item) => item.name === IMAGE_PROMPT_SUBMIT_TOOL_NAME,
    );
    expect(imageSubmitTool).toBeTruthy();
    if (!imageSubmitTool) return;

    const imageValid = imageSubmitTool.parameters.safeParse({
      imagePrompt: "a rainy alley",
    });
    expect(imageValid.success).toBe(true);

    const imageInvalid = imageSubmitTool.parameters.safeParse({
      veoScript: "shot-1",
    });
    expect(imageInvalid.success).toBe(false);

    const veoSubmitTool = veoTools.find(
      (item) => item.name === VEO_SCRIPT_SUBMIT_TOOL_NAME,
    );
    expect(veoSubmitTool).toBeTruthy();
    if (!veoSubmitTool) return;

    const veoValid = veoSubmitTool.parameters.safeParse({
      veoScript: "shot-1",
    });
    expect(veoValid.success).toBe(true);

    const veoInvalid = veoSubmitTool.parameters.safeParse({
      imagePrompt: "a rainy alley",
    });
    expect(veoInvalid.success).toBe(false);
  });
});
