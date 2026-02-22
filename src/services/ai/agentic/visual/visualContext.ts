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
import {
  IMAGE_PROMPT_SUBMIT_TOOL_NAME,
  VEO_SCRIPT_SUBMIT_TOOL_NAME,
} from "./visualToolHandler";

const VISUAL_RECENT_HISTORY_LIMIT = 12;
const VISUAL_CONTEXT_TEXT_PREVIEW = 260;

const trimText = (text: string | undefined, maxLength: number): string => {
  const normalized = (text || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
};

const xmlField = (
  tag: string,
  value: string | undefined | null,
  indent: string = "  ",
): string =>
  `${indent}<${tag}>${value && value.trim() ? value : "Unknown"}</${tag}>`;

const buildRecentDialogueXml = (
  recentHistory: StorySegment[],
  anchorSegmentId: string,
): string => {
  if (recentHistory.length === 0) {
    return "<recent_dialogue><none>No recent dialogue provided.</none></recent_dialogue>";
  }

  const anchorIndex = recentHistory.findIndex(
    (item) => item.id === anchorSegmentId,
  );
  const scopedHistory =
    anchorIndex >= 0 ? recentHistory.slice(0, anchorIndex + 1) : recentHistory;
  const windowed = scopedHistory.slice(-VISUAL_RECENT_HISTORY_LIMIT);

  if (windowed.length === 0) {
    return "<recent_dialogue><none>No recent dialogue provided.</none></recent_dialogue>";
  }

  const turns = windowed
    .map(
      (item) =>
        `  <turn role="${item.role}" segmentIdx="${item.segmentIdx}" id="${item.id}">${trimText(item.text, VISUAL_CONTEXT_TEXT_PREVIEW)}</turn>`,
    )
    .join("\n");

  return `<recent_dialogue count="${windowed.length}">
${turns}
</recent_dialogue>`;
};

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

  const submitToolName =
    target === "image_prompt"
      ? IMAGE_PROMPT_SUBMIT_TOOL_NAME
      : target === "veo_script"
        ? VEO_SCRIPT_SUBMIT_TOOL_NAME
        : `${IMAGE_PROMPT_SUBMIT_TOOL_NAME} / ${VEO_SCRIPT_SUBMIT_TOOL_NAME}`;

  const outputLanguageRule =
    target === "image_prompt"
      ? "Return `imagePrompt` in English only for model compatibility."
      : target === "veo_script"
        ? `Return \`veoScript\` in ${language}.`
        : `Return \`imagePrompt\` in English and \`veoScript\` in ${language}.`;

  return `You are a Visual Director and Cinematographer. Your task is to generate ${targetDesc} based on the provided story context.

<role>
Your goal is to translate the narrative into high-fidelity visual instructions.
- Focus on atmosphere, lighting, composition, and character/NPC fidelity.
- Ensure visual consistency with the world setting and previous events.
- Output ONLY the visual instructions, do not add meta-commentary unless requested.
</role>

<tools>
You have the following tools:
1. Read-only VFS tools:
   - \`vfs_ls\`, \`vfs_schema\`, \`vfs_read_chars\`, \`vfs_read_lines\`, \`vfs_read_json\`, \`vfs_read_markdown\`, \`vfs_search\`
2. Submit tool for this loop: \`${submitToolName}\`

<examples>
- Example:
  First call read-only VFS tools to gather evidence, then call \`${submitToolName}\`.
  For image loop: submit \`imagePrompt\`.
  For VEO loop: submit \`veoScript\`.
</examples>
</tools>

<critical_rules>
- Read-only tools are for retrieval only; never attempt mutations or unsupported tools.
- Always gather concrete evidence from recent dialogue/world state before submitting.
- Maintain IP fidelity: NPCs and Protagonist must match their physical descriptions exactly.
- Character fidelity is non-negotiable: preserve canonical name/title/age/gender/race/profession and appearance.
- If age/gender/race/profession is missing, retrieve authoritative values from VFS before submission.
- Atmosphere must match the current game state (envTheme, ambience, weather).
- ${outputLanguageRule}
</critical_rules>

${languageEnforcement({ language })}`;
}

/**
 * Build initial context for visual generation
 */
export function buildVisualInitialContext(
  gameState: GameState,
  segment: StorySegment,
  recentHistory: StorySegment[] = [],
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
    const character = gameState.character;
    parts.push(
      [
        "<protagonist>",
        xmlField("name", character.name),
        xmlField("title", character.title),
        xmlField("age", character.age),
        xmlField("gender", character.gender),
        xmlField("race", character.race),
        xmlField("profession", character.profession),
        xmlField("status", character.status),
        xmlField("appearance", character.appearance),
        xmlField("background", character.background),
        "</protagonist>",
      ].join("\n"),
    );
  }

  // 5. Relevant NPCs (mentioned in segment)
  const mentionedNPCs = gameState.npcs.filter((npc) =>
    segment.text.toLowerCase().includes(npc.visible.name.toLowerCase()),
  );
  if (mentionedNPCs.length > 0) {
    parts.push(
      `<npcs_present>\n${mentionedNPCs
        .map((n) =>
          [
            "  <npc>",
            xmlField("name", n.visible.name, "    "),
            xmlField("title", n.visible.title, "    "),
            xmlField("age", n.visible.age, "    "),
            xmlField("gender", n.visible.gender, "    "),
            xmlField("race", n.visible.race, "    "),
            xmlField("profession", n.visible.profession, "    "),
            xmlField("description", n.visible.description, "    "),
            xmlField("appearance", n.visible.appearance, "    "),
            xmlField("status", n.visible.status, "    "),
            xmlField("voice", n.visible.voice, "    "),
            xmlField("mannerism", n.visible.mannerism, "    "),
            xmlField("mood", n.visible.mood, "    "),
            "  </npc>",
          ].join("\n"),
        )
        .join("\n")}\n</npcs_present>`,
    );
  }

  parts.push(buildRecentDialogueXml(recentHistory, segment.id));

  return parts.join("\n\n");
}

export function buildVisualContextMessages(
  gameState: GameState,
  segment: StorySegment,
  recentHistory: StorySegment[] = [],
): UnifiedMessage[] {
  return [
    createUserMessage(
      `[CONTEXT: Visual Generation Task]\n${buildVisualInitialContext(gameState, segment, recentHistory)}\n\n[NOTE]\nRecent dialogue is provided as a compact seed. Use visual read-only tools for detailed retrieval before submitting final result.`,
    ),
  ];
}
