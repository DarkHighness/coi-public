import { z } from "zod";
import type { GameState, StorySegment } from "../../../../types";
import {
  QUERY_INVENTORY_TOOL,
  QUERY_NPCS_TOOL,
  QUERY_LOCATIONS_TOOL,
  QUERY_QUESTS_TOOL,
  QUERY_KNOWLEDGE_TOOL,
  QUERY_TIMELINE_TOOL,
  QUERY_GLOBAL_TOOL,
  QUERY_CHARACTER_PROFILE_TOOL,
  QUERY_CHARACTER_ATTRIBUTES_TOOL,
  QUERY_CHARACTER_SKILLS_TOOL,
  QUERY_CHARACTER_CONDITIONS_TOOL,
} from "../../../tools";

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
  QUERY_INVENTORY_TOOL,
  QUERY_NPCS_TOOL,
  QUERY_LOCATIONS_TOOL,
  QUERY_QUESTS_TOOL,
  QUERY_KNOWLEDGE_TOOL,
  QUERY_TIMELINE_TOOL,
  QUERY_GLOBAL_TOOL,
  QUERY_CHARACTER_PROFILE_TOOL,
  QUERY_CHARACTER_ATTRIBUTES_TOOL,
  QUERY_CHARACTER_SKILLS_TOOL,
  QUERY_CHARACTER_CONDITIONS_TOOL,
];
