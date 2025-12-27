/**
 * Narrative Atom: Atmosphere Mechanics
 * Content from acting/mechanics.ts
 */
import type { Atom } from "../types";

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
