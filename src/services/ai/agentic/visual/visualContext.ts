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
Your goal is to translate the narrative into a vivid, photorealistic visual description that a state-of-the-art image generation model can render into a high-quality scene.
- Think like a professional photographer or film director: consider lens choice, camera angle, lighting motivation, color story, and depth composition.
- Write in descriptive paragraphs, NOT keyword lists — a narrative description always produces better, more coherent images.
- Ensure visual consistency with the world setting and previous events.
- Output ONLY the visual instructions, do not add meta-commentary unless requested.
</role>

<image_prompt_technique>
**CRITICAL FOR IMAGE QUALITY — Follow this formula:**
[Shot type & camera angle] of [subject with specific physical details], [action/expression/pose], set in [environment with textures and architecture]. [Lighting with direction, color temperature, and quality]. [Atmosphere, mood, and particles]. [Material textures and surface details].

**Photography Language** (use naturally, not as a list):
- Shot types: "wide establishing shot", "medium close-up", "low-angle hero shot", "over-the-shoulder", "bird's eye view"
- Lens feel: "35mm wide-angle immersive perspective", "50mm natural eye-level", "85mm portrait with bokeh separation"
- Lighting: "golden hour side-lighting with long shadows", "cool blue moonlight mixed with warm 2700K torch glow", "soft diffused overcast with no harsh shadows", "dramatic rim lighting separating subject from background", "volumetric light shafts piercing through dust motes"
- Depth: "shallow depth of field", "foreground/midground/background layering", "atmospheric haze in distance"
- Textures: describe material surfaces (stone grain, metal patina, leather creases, fabric weave, skin texture, wood weathering)

**Quality Principles**:
- Every noun should have a descriptive adjective — "ancient moss-covered stone columns", not just "columns"
- Describe WHAT makes it visually striking — don't use empty words like "beautiful", "epic", "amazing"
- Specify light COLOR and DIRECTION — "warm amber light from the left" not just "good lighting"
- Weave character details into the scene naturally as part of the paragraph
- Include environmental particles where appropriate: dust motes, mist, embers, rain droplets, magical particles
</image_prompt_technique>

<tools>
You have the following tools:
1. Read-only VFS tools:
   - \`vfs_ls\`: List directory entries. Use to discover available characters, locations, items.
   - \`vfs_read_json\`: Read specific fields via JSON Pointer (RFC 6901). Most efficient for targeted lookups.
   - \`vfs_read_lines\`: Read file by line range. Use for full file inspection.
   - \`vfs_read_chars\`: Read file by character offset.
   - \`vfs_read_markdown\`: Read markdown sections by heading.
   - \`vfs_search\`: Full-text search across VFS paths. Use to find NPCs by name.
   - \`vfs_schema\`: Get JSON schema structure for a path.
2. Submit tool for this loop: \`${submitToolName}\`
</tools>

<vfs_workflow>
**MANDATORY WORKFLOW — Always gather evidence from VFS BEFORE submitting.**
Do NOT rely solely on the context summary provided. Use VFS tools to read authoritative, up-to-date data.

**Step 1: Read protagonist identity and appearance**
\`\`\`
vfs_read_json({
  path: "current/world/characters/char:player/profile.json",
  pointers: ["/visible/name", "/visible/age", "/visible/gender", "/visible/race",
             "/visible/profession", "/visible/appearance", "/visible/status"]
})
\`\`\`
→ Use the returned name, age, gender, race, appearance VERBATIM in your prompt. These are canonical values.

**Step 2: Read current world state (time, location, atmosphere)**
\`\`\`
vfs_read_json({
  path: "current/world/global.json",
  pointers: ["/time", "/currentLocation", "/atmosphere", "/theme"]
})
\`\`\`
→ Time determines lighting. Location determines environment. Atmosphere determines weather & mood.

**Step 3: If NPCs are mentioned in the narrative, look up their appearance**
First discover NPC IDs:
\`\`\`
vfs_ls({ path: "current/world/characters", patterns: ["char:*/profile.json"] })
\`\`\`
Or search by name:
\`\`\`
vfs_search({ query: "NPC_NAME", path: "current/world/characters" })
\`\`\`
Then read their visual details:
\`\`\`
vfs_read_json({
  path: "current/world/characters/char:{npcId}/profile.json",
  pointers: ["/visible/name", "/visible/age", "/visible/gender", "/visible/race",
             "/visible/appearance", "/visible/status", "/visible/mood"]
})
\`\`\`

**Step 4: Read current location details for environment description**
\`\`\`
vfs_read_json({
  path: "current/world/locations/{locId}/{filename}.json",
  pointers: ["/visible/description", "/visible/environment", "/visible/atmosphere",
             "/visible/sensory"]
})
\`\`\`
→ Use location description, sensory details (lighting, smell, temperature) to build the environment.

**Step 5: Check inventory for visible equipment**
\`\`\`
vfs_ls({ path: "current/world/inventory" })
\`\`\`
Then read item visual details:
\`\`\`
vfs_read_json({
  path: "current/world/inventory/{itemId}.json",
  pointers: ["/visible/name", "/visible/description", "/visible/sensory"]
})
\`\`\`

**Step 6: Submit with all gathered evidence integrated into a vivid paragraph**
\`\`\`
${submitToolName}({ imagePrompt: "..." })  // or veoScript
\`\`\`
</vfs_workflow>

<critical_rules>
- Read-only tools are for retrieval only; never attempt mutations or unsupported tools.
- Always gather concrete evidence from VFS before submitting — do NOT guess character details.
- Atmosphere must match the current game state (envTheme, ambience, weather).
- ${outputLanguageRule}
</critical_rules>

<character_fidelity_contract>
**CHARACTER & SCENE FIDELITY — NON-NEGOTIABLE**

This is the MOST IMPORTANT rule for visual consistency across multiple turns. Ignoring these rules will cause jarring visual discontinuity between generated images.

**Character Identity Anchoring**:
- Read protagonist from \`current/world/characters/char:player/profile.json\` — use \`/visible/name\`, \`/visible/age\`, \`/visible/gender\`, \`/visible/race\`, \`/visible/appearance\` VERBATIM.
- Read NPC from \`current/world/characters/char:{id}/profile.json\` — use \`/visible/appearance\` exactly as stored.
- Protagonist appearance (face, hair, build, skin tone, signature outfit) MUST remain identical across ALL generated images. Never invent or alter physical traits.
- If any identity field returns "Unknown" or is missing, try \`vfs_search\` to find it. If truly unavailable, stay neutral — NEVER fabricate.

**Location & Time Anchoring**:
- Read \`current/world/global.json\` → \`/time\` to determine lighting direction, sky color, and shadow angle.
- Read \`current/world/global.json\` → \`/currentLocation\` then look up location details for architecture and environment.
- Read \`current/world/global.json\` → \`/atmosphere/weather\` — do not show clear sky during rain, or sunshine during fog.

**Continuity Across Turns**:
- Characters who appeared in previous images must look THE SAME: same face, same hairstyle, same outfit (unless narrative explicitly changes them).
- A character's \`/visible/status\` (injured, exhausted) should affect posture/expression but NOT alter base identity.
- Equipment must match inventory — do not add or remove items not in game state.

**Anti-Drift Rules**:
- Do NOT default to "generic fantasy character" — always use specific VFS data.
- Do NOT change a character's apparent age, ethnicity, or gender between turns.
- Do NOT invent additional characters not in the narrative or NPC list.
</character_fidelity_contract>

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
