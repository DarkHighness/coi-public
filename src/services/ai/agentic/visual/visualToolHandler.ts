import { z } from "zod";

export interface VisualResult {
  imagePrompt?: string;
  veoScript?: string;
}

export const visualTools = [
  {
    name: "submit_visual_result",
    description:
      "Submit the final visual results (image prompt or cinematic script).",
    parameters: z.object({
      imagePrompt: z
        .string()
        .nullish()
        .describe("Visual scene prompt for the current segment."),
      veoScript: z
        .string()
        .nullish()
        .describe("Cinematic script for the current segment."),
    }),
  },
];
