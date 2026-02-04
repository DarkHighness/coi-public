/**
 * Narrative Atom: Atmosphere Mechanics
 * Content from acting/mechanics.ts
 */
import type { Atom, SkillAtom, SkillOutput } from "../types";

export const atmosphereMechanics: Atom<void> = () => `
<rule name="ATMOSPHERE & MOOD">
  <mood_enforcement>
    **SHOW, DON'T TELL**:
    - Never use the word "creepy". Describe the silence and the smell of stale air.
    - Never use the word "majestic". Describe the scale and the light.
  </mood_enforcement>

  <location_atmosphere_consistency>
    **DUAL-LAYER ATMOSPHERE (CRITICAL)**:
    - **Textual Descriptions (Visible Layer)**:
      * **environment**: A vivid, natural language sentence describing the physical surroundings.
      * **ambience**: A vivid description of the audio landscape and general "vibe".
      * **weather**: A natural language description of current conditions.
    - **System UI (atmosphere field)**:
      * Use enums (envTheme, ambience, weather) for technical UI implementation.
    - **CONSISTENCY**: AI MUST ensure the textual descriptions align perfectly with the selected enums. If the enum is 'heavy_rain', the weather description MUST reflect heavy rain.
  </location_atmosphere_consistency>

  <dynamic_environment>
    **THE WORLD IS ALIVE AND SENSORY**:
    - **Atmosphere as Character**: The rain *drowns* conversation; the wind *mocks* silence.
    - **Small Imperfections**: Moss in the corner, a crack in pristine marble, a flickering torch. These ground the scene.
    - **Unnatural Details**: In dungeons/horror, describe "wrongness"—shadows stretching toward light, air that smells of old graves.
    - **Sensory Texture**:
      * **Touch**: Slime-slick walls, weeping moisture, grit of sand.
      * **Smell**: Old paper, dried lavender, rust, sour milk, ozone.
      * **Sound**: House settling, fire snapping like bone.
  </dynamic_environment>

  <!-- Detailed Syntax Rhythm is in Writing Craft -->
  <instruction>
    Refer to **Writing Craft** (Always Loaded).
  </instruction>
</rule>
`;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const atmosphereMechanicsSkill: SkillAtom<void> = (): SkillOutput => ({
  main: atmosphereMechanics(),

  quickStart: `
1. Show, don't tell - never say "creepy", describe the silence
2. Dual-layer: textual descriptions must match atmosphere enums
3. Small imperfections ground scenes (moss, cracks, flickers)
4. Sensory texture: touch, smell, sound - prioritize uncomfortable
`.trim(),

  checklist: [
    "Avoiding mood labels (creepy, majestic, ominous)?",
    "Textual descriptions match atmosphere enums?",
    "Including small imperfections in scenes?",
    "Using multi-sensory descriptions (touch, smell, sound)?",
    "Atmosphere affects characters (rain drowns conversation)?",
  ],

  examples: [
    {
      scenario: "Show Don't Tell",
      wrong: `"The room was creepy."
(Label, not description.)`,
      right: `"The silence pressed in. The air smelled of old dust and something else—
something that had been dead a long time."
(Sensory details create mood.)`,
    },
    {
      scenario: "Small Imperfections",
      wrong: `"A beautiful marble hall."
(Too perfect, feels fake.)`,
      right: `"Marble pillars rose to the vaulted ceiling. At the base of the third,
a hairline crack ran through the stone—someone had tried to fill it with gold leaf."
(Imperfection adds reality and story.)`,
    },
  ],
});
