/**
 * Visual Loop Context
 *
 * Builds context for visual generation:
 * - Current segment narrative
 * - Atmosphere (theme, ambience)
 * - Protagonist/NPC appearance
 * - World setting
 */

import type {
  GameState,
  StorySegment,
  UnifiedMessage,
} from "../../../../types";
import { createUserMessage } from "../../../messageTypes";
import { languageEnforcement } from "../../../prompts/atoms/cultural";

/**
 * Get system instruction for visual generation
 */
export function getVisualSystemInstruction(
  language: string,
  target: "image_prompt" | "veo_script" | "both",
): string {
  const targetDesc =
    target === "image_prompt"
      ? "a detailed image prompt for a static scene"
      : target === "veo_script"
        ? "a cinematic video script (VEO script)"
        : "both a detailed image prompt and a cinematic video script";

  return `You are a Visual Director and Cinematographer. Your task is to generate ${targetDesc} based on the provided story context.

<role>
Your goal is to translate the narrative into high-fidelity visual instructions.
- Focus on atmosphere, lighting, composition, and character/NPC fidelity.
- Ensure visual consistency with the world setting and previous events.
- Output ONLY the visual instructions, do not add meta-commentary unless requested.
</role>

<tools>
You have the following tools:
1. \`submit_visual_result\`: Submit the final visual results.
</tools>

<critical_rules>
- Maintain IP fidelity: NPCs and Protagonist must match their physical descriptions exactly.
- Atmosphere must match the current game state (envTheme, ambience, weather).
- Output in ${language}.
</critical_rules>

${languageEnforcement({ language })}`;
}

/**
 * Build initial context for visual generation
 */
export function buildVisualInitialContext(
  gameState: GameState,
  segment: StorySegment,
): string {
  const parts: string[] = [];

  // 1. Narrative Context
  parts.push(`<current_narrative>\n${segment.text}\n</current_narrative>`);

  // 2. World Context
  parts.push(
    `<world_context>\n  <theme>${gameState.theme}</theme>\n  <location>${gameState.currentLocation}</location>\n  <time>${gameState.time}</time>\n</world_context>`,
  );

  // 3. Atmosphere
  parts.push(
    `<atmosphere>\n  <envTheme>${gameState.atmosphere.envTheme}</envTheme>\n  <ambience>${gameState.atmosphere.ambience}</ambience>\n  <weather>${gameState.atmosphere.weather || "Clear"}</weather>\n</atmosphere>`,
  );

  // 4. Protagonist
  if (gameState.character) {
    parts.push(
      `<protagonist>\n  <name>${gameState.character.name}</name>\n  <appearance>${gameState.character.appearance}</appearance>\n</protagonist>`,
    );
  }

  // 5. Relevant NPCs (mentioned in segment)
  const mentionedNPCs = gameState.npcs.filter((npc) =>
    segment.text.toLowerCase().includes(npc.visible.name.toLowerCase()),
  );
  if (mentionedNPCs.length > 0) {
    parts.push(
      `<npcs_present>\n${mentionedNPCs.map((n) => `  <npc>\n    <name>${n.visible.name}</name>\n    <appearance>${n.visible.appearance}</appearance>\n  </npc>`).join("\n")}\n</npcs_present>`,
    );
  }

  return parts.join("\n\n");
}

export function buildVisualContextMessages(
  gameState: GameState,
  segment: StorySegment,
): UnifiedMessage[] {
  return [
    createUserMessage(
      `[CONTEXT: Visual Generation Task]\n${buildVisualInitialContext(gameState, segment)}`,
    ),
  ];
}
