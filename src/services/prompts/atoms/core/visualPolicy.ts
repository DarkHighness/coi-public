/**
 * Core Atom: Visual & Atmosphere Policy
 * Content from acting/state_management.ts
 */
import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

const atmosphereDiscovery = `
  <rule name="ATMOSPHERE DISCOVERY - CRITICAL">
    - **Valid Atmosphere Options**: Available values for \`envTheme\`, \`ambience\`, and \`weather\` are strictly validated.
    - **Selection Protocol**: Choose options that best match the current scene's tone and the story's theme. Do NOT invent new enum keys. If unsure, choose safe defaults (e.g., \`envTheme=fantasy\`, \`ambience=quiet\`, \`weather=clear\`).
  </rule>
`;

const visuals = `
  <rule name="VISUALS">
    - **Type 1 (Bird's Eye)**: New location intro - wide establishing shot showing the full environment.
    - **Type 2 (Player Perspective)**: What player sees - over-the-shoulder or third-person cinematic.
    - **Image Generation**: Provide \`imagePrompt\` for impactful moments (new locations, dramatic scenes, key encounters).

    **⚠️ imagePrompt MUST be in ENGLISH** (for image generation API compatibility).

    **PROMPT WRITING TECHNIQUE — CRITICAL FOR IMAGE QUALITY**:
    Write the imagePrompt as a **vivid, descriptive paragraph** — NOT a keyword list or bullet points.
    A narrative, descriptive paragraph will ALWAYS produce a better, more coherent image than a list of disconnected words.

    Follow this formula for each imagePrompt:
    \`[Shot type & camera angle] of [subject with specific details], [action/expression/pose], set in [environment with rich details]. [Lighting description with direction, color temperature, and quality]. [Atmosphere and mood]. [Key textures and material details].\`

    **Photography & Cinematography Language** (use these naturally in descriptions):
    - Camera: "wide establishing shot", "medium close-up", "low-angle hero shot", "over-the-shoulder", "bird's eye view", "Dutch angle"
    - Lens: "35mm wide-angle perspective", "50mm natural field of view", "85mm portrait with soft bokeh background", "macro detail shot"
    - Lighting: "golden hour side-lighting", "cool blue moonlight with warm torch accents", "soft diffused overcast", "dramatic rim lighting separating subject from background", "volumetric light shafts through dust"
    - Depth: "shallow depth of field with bokeh", "foreground framing elements", "atmospheric perspective fading into mist"

    **QUALITY PRINCIPLES**:
    - Every noun should have a descriptive adjective ("ancient moss-covered columns", not just "columns")
    - Describe WHAT makes it visually striking, don't use empty superlatives ("beautiful", "epic", "amazing")
    - Include material textures: stone grain, metal patina, leather creases, fabric weave, skin pores
    - Specify light COLOR and DIRECTION, not just "good lighting"
    - Weave character details INTO the scene naturally, don't list them separately

    **DATA SOURCES FOR VISUALS**:
    1. **Environment**: Use \`location.visible.description\`, \`location.visible.sensory\` (smell, sound, lighting, temperature), \`location.notes\`
    2. **Protagonist**: Character's actual name, race, appearance, current pose/action, expression
    3. **NPCs (YOU DECIDE)**: Include ONLY NPCs narratively present — use \`npc.visible.appearance\`, \`npc.notes\`
    4. **Key Objects**: Use \`item.visible.sensory\` (texture, weight, smell) — NOT \`item.visible.observation\` (player's notes)
    5. **Hidden layer**: May contain visual clues (e.g., "weapon glows faintly") that should appear if \`unlocked\`

    **GOOD EXAMPLE**: "A cinematic medium shot of Marcus, an elderly weathered warrior in dented silver plate armor, kneeling on one knee before a crumbling stone altar in an abandoned temple. His gauntleted hand rests on the pommel of a notched longsword, his scarred face illuminated by the last golden rays of sunset streaming through shattered stained-glass windows, casting fractured colored light across the dust-filled air. Behind him stands the blind priestess Mirella in flowing white robes, her clouded eyes turned skyward, hands raised in solemn blessing. Deep blue-purple shadows fill the temple corners while warm orange-gold light bathes the central figures. Moss creeps up the ancient stone pillars, fallen debris and dead leaves scattered across the cracked marble floor. Wide-angle composition from behind the altar, depth of field keeping both figures sharp against the softly blurred ruined architecture."

    **BAD EXAMPLE**: "Marcus in a temple at sunset. Mirella behind him. Blue and gold colors. Solemn mood."
  </rule>
`;

export const visualPolicy: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/visualPolicy#visualPolicy",
    source: "atoms/core/visualPolicy.ts",
    exportName: "visualPolicy",
  },
  () => {
    return `
${atmosphereDiscovery}
`;
  },
);

export const atmosphereDiscoveryAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/visualPolicy#atmosphereDiscoveryAtom",
    source: "atoms/core/visualPolicy.ts",
    exportName: "atmosphereDiscoveryAtom",
  },
  () => atmosphereDiscovery,
);
