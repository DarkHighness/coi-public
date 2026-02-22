import { z } from "zod";
import type { ZodToolDefinition } from "../../../providers/types";
import { vfsToolRegistry, type VfsToolName } from "../../../vfs/tools";
import { READ_ONLY_INSPECTION_TOOL_NAMES } from "../common/toolCallPolicies";

export interface VisualResult {
  imagePrompt?: string;
  veoScript?: string;
}

export type VisualLoopTarget = "image_prompt" | "veo_script";

export const IMAGE_PROMPT_SUBMIT_TOOL_NAME = "submit_image_prompt_result";
export const VEO_SCRIPT_SUBMIT_TOOL_NAME = "submit_veo_script_result";

const SUBMIT_IMAGE_PROMPT_TOOL: ZodToolDefinition = {
  name: IMAGE_PROMPT_SUBMIT_TOOL_NAME,
  description:
    "Submit the final image prompt for the current segment. The prompt MUST include canonical character identities (name, age, gender, race, appearance) matching game state exactly, and reflect the correct location and time of day.",
  parameters: z.object({
    imagePrompt: z
      .string()
      .min(1)
      .describe(
        "Vivid cinematographic scene description. Must anchor character identity (name, age, gender, race, appearance from game state), match current location and time. Write as a narrative paragraph, not keyword list.",
      ),
  }),
};

const SUBMIT_VEO_SCRIPT_TOOL: ZodToolDefinition = {
  name: VEO_SCRIPT_SUBMIT_TOOL_NAME,
  description:
    "Submit the final VEO script for the current segment. The script MUST maintain character fidelity (canonical name, age, gender, race, appearance) and location/time consistency with game state.",
  parameters: z.object({
    veoScript: z
      .string()
      .min(1)
      .describe(
        "Cinematic video script maintaining character fidelity and location/time consistency with game state.",
      ),
  }),
};

const toVfsToolName = (name: string): VfsToolName | null =>
  vfsToolRegistry.has(name) ? name : null;

export const VISUAL_READ_ONLY_VFS_TOOL_NAMES: VfsToolName[] = Array.from(
  READ_ONLY_INSPECTION_TOOL_NAMES.values(),
)
  .map(toVfsToolName)
  .filter((name): name is VfsToolName => name !== null);

const READ_ONLY_VFS_TOOLS: ZodToolDefinition[] =
  VISUAL_READ_ONLY_VFS_TOOL_NAMES.map((name) =>
    vfsToolRegistry.getDefinition(name, { ragEnabled: false }),
  );

export const getVisualSubmitToolName = (target: VisualLoopTarget): string =>
  target === "image_prompt"
    ? IMAGE_PROMPT_SUBMIT_TOOL_NAME
    : VEO_SCRIPT_SUBMIT_TOOL_NAME;

export const getVisualToolsForTarget = (
  target: VisualLoopTarget,
): ZodToolDefinition[] => [
  ...READ_ONLY_VFS_TOOLS,
  target === "image_prompt" ? SUBMIT_IMAGE_PROMPT_TOOL : SUBMIT_VEO_SCRIPT_TOOL,
];
