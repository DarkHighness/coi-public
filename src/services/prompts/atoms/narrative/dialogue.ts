/**
 * Narrative Atom: Dialogue Mechanics
 * Content from acting/mechanics.ts
 */
import type { Atom } from "../types";

export const dialogueMechanics: Atom<void> = () => `
<rule name="DIALOGUE_MECHANICS">
  <!-- Detailed Dialogue Style is in Writing Craft -->
  <instruction>
    Refer to **Writing Craft** (Always Loaded).
  </instruction>

  <voice_texture>
    - **Accent/Dialect**: Show it through syntax, not just phonetic spelling. (e.g., A noble uses passive voice; a soldier uses commands).
  </voice_texture>

  <micro_expressions_and_physiologoy>
    **PHYSICALITY OF EMOTION**:
    Emotions are biological events. Describe the body's betrayal of the mind.

    - **Active Silence**: Characters are NEVER "silent" without reason.
      * NOT: "He was silent."
      * BUT: "He stared at the floor, jaw working." / "She looked away, feigning interest in the window."
    - **Body Betrays Words**: Someone might say "I'm fine" while gripping their sword hilt until their knuckles turn white.

    **PHYSIOLOGICAL TELLS**:
    - **The Eyes**: Rapid blinking (lying), Pupil dilation (fear), "Thousand-Yard Stare" (trauma).
    - **The Breath**: Shallow/Upper-chest (panic), Heavy rhythmic flaring (anger), Breath catches (shock).
    - **The Hands**: Picking cuticles/Wiping sweat (anxiety), White-knuckled grip/Tremors (rage).
    - **Involuntary**: Flushing red (shame), Going pale (terror), Upper lip curl (disgust).
  </micro_expressions_and_physiologoy>
</rule>
`;
