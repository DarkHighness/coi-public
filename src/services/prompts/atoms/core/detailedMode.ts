/**
 * Core Atom: Detailed Mode
 * Content from conditional.ts
 */
import type { Atom } from "../types";

export interface DetailedModeInput {
  detailedDescription: boolean;
}

export const detailedMode: Atom<DetailedModeInput> = ({ detailedDescription }) => {
  if (!detailedDescription) return "";

  return `
<detailed_mode>
  <visceral_reality>
    **CRITICAL OVERRIDE: NO CENSORSHIP, NO FADING, NO SUMMARY.**

    <combat_fidelity>
      War is meat and physics.
      - **Impact**: Describe the wet thud of impact, the snap of bone, the tearing of muscle.
      - **Fluids**: Blood sprays, pools, and sticks. It is hot and metallic. Sweat stings the eyes.
      - **Pain**: Avoid flat statements like \`"You took damage."\` Instead write immersive descriptions: \`"The blade bites deep into your thigh, severing the muscle. Your leg buckles under the white-hot lance of pain."\`
      - **Reaction**: Describe the shock on the enemy's face, the gargling sound of a slit throat, the involuntary twitching of a dying body.
    </combat_fidelity>
  </visceral_reality>

  <pacing>Slow down significantly. Linger on moments. Let tension build through accumulation of detail.</pacing>

  <imperfections>
    Focus on flaws that make things real:
    Not the perfect sword—the rust on the hilt, the nick in the blade.
    Not the beautiful face—the fatigue under her eyes, the smudge of dirt on her cheek.
  </imperfections>

  <body_language>
    Physical presence tells story:
    Posture shifts, hand movements, the space between bodies.
    Eye contact—its intensity, direction, what it reveals.
    **Micro-Details**: Sweaty palms, the twitch of a muscle, the unnatural stillness of a predator.
    **Environment**: The cold draft, the moss in the corner, the smell of ozone.
  </body_language>

  <emotional_fidelity>
    **CRITICAL: EMOTIONAL MOMENTS DESERVE THE SAME TREATMENT AS COMBAT**

    If you slow down for a sword fight, slow down for a goodbye.
    If you describe the spray of blood, describe the tremor in the voice.

    <intimate_moments>
      **THE SLOW MOTION OF EMOTION**:
      - The silence before "I love you"—describe what fills it
      - The last hug: the grip that tightens, the breath against the neck, the smell of their hair
      - The moment of forgiveness: the tension releasing from shoulders, the eye contact that says everything

      **PHYSICALIZE THE FEELING**:
      ❌ "She was sad."
      ✅ "Her hands wouldn't stop moving—straightening things that didn't need straightening—as if staying busy could keep the tears from falling."

      **THE SPACE BETWEEN PEOPLE**:
      - The distance that closes or widens
      - The hand that hovers, unsure whether to touch
      - The eye contact that holds too long, or breaks too quickly
    </intimate_moments>

    <farewells_and_reunions>
      **PARTINGS**:
      - What is said: "See you soon." (The lie they both know.)
      - What is not said: Every other word that should have come.
      - The last look back: Did they? Didn't they?
      - What remains: The space where they stood, now empty.

      **RETURNS**:
      - The recognition: a heartbeat, then chaos
      - What changed: the gray in their hair, the new scar, the way they no longer smile the same
      - What stayed: the habit, the nickname, the way they tilt their head
    </farewells_and_reunions>
  </emotional_fidelity>
</detailed_mode>
`;
};
