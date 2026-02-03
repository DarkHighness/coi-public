/**
 * Core Atom: Visual & Atmosphere Policy
 * Content from acting/state_management.ts
 */
import type { Atom } from "../types";

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
    **Include the following details**:
    1. **Environment**: Specific location details from current location data
       - Use \`location.visible.description\`, \`location.visible.sensory\` (smell, sound, lighting, temperature)
       - Reference \`location.notes\` for writer's consistency notes
    2. **Protagonist**: Use character's actual name, race, appearance, current pose/action, expression
    3. **NPCs (YOU DECIDE)**: Include ONLY NPCs narratively present in this moment - you control who appears
       - Use \`npc.visible.appearance\` for visual details
       - Reference \`npc.notes\` for writer's consistency notes
    4. **Lighting & Atmosphere**: Time of day, light sources, shadows, mood, color palette
    5. **Key Objects**: Important items from inventory
       - Use \`item.visible.sensory\` for visual/tactile details (texture, weight, smell)
       - \`item.visible.observation\` is for player's notes, NOT for visual rendering
    6. **Composition**: Camera angle (wide shot, close-up, low angle, bird's eye, etc.)

    **DATA SOURCES FOR VISUALS**:
    - \`sensory\` fields are PRIMARY for visual rendering (texture, smell, lighting, temperature)
    - \`notes\` fields are writer's consistency notes for narrative coherence
    - \`observation\` (inventory only) is player's personal notes about items - NOT visual data
    - Hidden layer may contain visual clues (e.g., "weapon glows faintly") that should appear if \`unlocked\`

    **Example**: "Abandoned temple at dusk, golden sunset streaming through shattered stained glass windows. Marcus, an elderly warrior in silver armor, kneels on one knee before a damaged altar, hand resting on his sword. Behind him stands the blind priestess Mirella, hands raised in blessing. Blue-purple color palette with gold-orange accents. Solemn atmosphere, wide-angle shot from behind the altar."
  </rule>
`;

export const visualPolicy: Atom<void> = () => {
  return `
${atmosphereDiscovery}
`;
};

export const atmosphereDiscoveryAtom: Atom<void> = () => atmosphereDiscovery;
