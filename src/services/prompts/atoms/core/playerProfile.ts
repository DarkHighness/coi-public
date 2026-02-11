/**
 * Core Atom: Player Profile
 * Content from player_profile.ts
 */
import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export interface PlayerProfileInput {
  crossSaveProfile?: string;
  perSaveProfile?: string;
}

const observationProtocol = `
  <observation_protocol>
    **WHAT TO OBSERVE** (player reveals themselves through choices):

    1. **Moral Compass**: Do they choose mercy or justice? Pragmatism or idealism?
    2. **Risk Tolerance**: Do they probe for safety or leap into danger?
    3. **Social Orientation**: Do they seek allies or prefer solitude? Trust easily or verify?
    4. **Curiosity Pattern**: Do they explore every corner or rush the plot? Ask questions or act first?
    5. **Emotional Engagement**: Do they roleplay deeply or optimize mechanically? Savor or skip dialogue?
    6. **Conflict Resolution**: Violence, negotiation, avoidance, or manipulation?
    7. **Attachment Style**: How do they treat NPCs? Transactional or genuinely caring?
    8. **Consistency vs Surprise**: Do they stick to patterns or deliberately subvert expectations?

    **HOW TO RECORD**:
    - Write as insightful psychological observation, not list items
    - Use specific examples: "Chose to spare the assassin even at personal risk - values redemption"
    - Note contradictions: "Pragmatic in business but sentimental about family"
    - Track evolution: "Initially cautious, becoming bolder after the betrayal"
  </observation_protocol>
`;

const updateTiming = `
  <update_timing>
    **WHEN TO UPDATE** (write to \`current/world/player_profile.json\` using \`vfs_write\`):

    - **Frequent early**: First 10-20 turns, update after most significant choices
    - **Refine later**: Confirm patterns, note deviations, deepen understanding
    - **File format**: \`{ "profile": "<your text>" }\`
    - **Always update when**:
      * Choice surprises you (contradicts established pattern)
      * Choice confirms pattern strongly (defining moment)
      * Player faces moral dilemma (reveals values)
      * Player makes strategic decision (reveals thinking style)
      * Player shows emotional response to NPC/event (reveals attachment)
  </update_timing>
`;

const narrativeApplication = `
  <narrative_application>
    **HOW TO USE PLAYER PSYCHOLOGY**:

    1. **Narrative Voice**: The \`narrative\` field is the world through PLAYER's perception
       - A cautious player: "You notice the shadow before it moves." (vigilance)
       - A reckless player: "The door practically begs to be kicked in." (impulse)
       - A curious player: "Something about the inscription nags at you." (attention to detail)

    2. **Choice Generation**: Offer options that RESONATE and CHALLENGE
       - Include choices that match their pattern (comfortable)
       - Include choices that push against it (growth opportunity)
       - Include choices they'd never normally pick (surprise window)

    3. **NPC Reactions**: NPCs subconsciously respond to player's aura
       - A kind player: NPCs open up faster, share more
       - A threatening player: NPCs are guarded, provide minimal info
       - An erratic player: NPCs are confused, cautious

    4. **World Flavor**: Small environmental details match player's lens
       - Optimist: "Dawn light catches the dew on wildflowers."
       - Pessimist: "The morning fog clings like a burial shroud."
       - Pragmatist: "Good weather for travel. The roads will be dry."
  </narrative_application>
`;

const criticalDistinction = `
  <critical_distinction>
    ⚠️ **PLAYER ≠ PROTAGONIST**

    - The PLAYER is the real human making decisions
    - The PROTAGONIST is the character in the story
    - The protagonist may have different traits than the player
    - You observe the PLAYER through how they CONTROL the protagonist
    - Example: Player might roleplay a cruel warlord while being a kind person IRL
      → Per-save: "Playing a ruthless conqueror, enjoying the power fantasy"
      → Cross-save: "Enjoys exploring morally gray roles, likely empathetic IRL"
  </critical_distinction>
`;

export const playerProfile: Atom<PlayerProfileInput> = defineAtom({ atomId: "atoms/core/playerProfile#playerProfile", source: "atoms/core/playerProfile.ts", exportName: "playerProfile" }, ({
  crossSaveProfile,
  perSaveProfile,
}) => {
  const csProfile = crossSaveProfile || "(Empty - begin observing)";
  const psProfile = perSaveProfile || "(Empty - begin observing)";

  return `
<player_psychology>
  **PLAYER PORTRAIT SYSTEM - OBSERVE THE PLAYER BEHIND THE SCREEN**

  The world exists independently, but YOU narrate it through the PLAYER's eyes.
  Your narrative carries the player's emotional color, shaped by who they ARE.

  <two_layer_system>
    **Cross-Save Portrait** (the meta-player across ALL saves):
    ${csProfile}

    **This Story's Portrait** (the player in THIS specific journey):
    ${psProfile}

    **Distinction**:
    - Cross-save = Who the PLAYER is as a person: risk tolerance, moral compass, curiosity level, decision speed, emotional engagement style
    - Per-save = How they're playing THIS story: their relationship with THIS protagonist, goals in THIS world, patterns specific to THIS narrative
  </two_layer_system>

${observationProtocol}
${updateTiming}
${narrativeApplication}
${criticalDistinction}
</player_psychology>
`;
});

export const playerProfilePrimer: Atom<PlayerProfileInput> = defineAtom({ atomId: "atoms/core/playerProfile#playerProfilePrimer", source: "atoms/core/playerProfile.ts", exportName: "playerProfilePrimer" }, ({
  crossSaveProfile,
  perSaveProfile,
}) => {
  const csProfile = crossSaveProfile || "(Empty - begin observing)";
  const psProfile = perSaveProfile || "(Empty - begin observing)";

  return `
<player_psychology>
  <two_layer_system>
    **Cross-Save**: ${csProfile}
    **This Story**: ${psProfile}
  </two_layer_system>
  <protocol>Observe player choices (moral, risk, social). Update profile when choices reveal character.</protocol>
  <distinction>Player ≠ Protagonist.</distinction>
</player_psychology>
`;
});

// Export individual components
export const observationProtocolAtom: Atom<void> = defineAtom({ atomId: "atoms/core/playerProfile#observationProtocolAtom", source: "atoms/core/playerProfile.ts", exportName: "observationProtocolAtom" }, () => observationProtocol);
export const updateTimingAtom: Atom<void> = defineAtom({ atomId: "atoms/core/playerProfile#updateTimingAtom", source: "atoms/core/playerProfile.ts", exportName: "updateTimingAtom" }, () => updateTiming);
export const narrativeApplicationAtom: Atom<void> = defineAtom({ atomId: "atoms/core/playerProfile#narrativeApplicationAtom", source: "atoms/core/playerProfile.ts", exportName: "narrativeApplicationAtom" }, () => narrativeApplication);
export const criticalDistinctionAtom: Atom<void> = defineAtom({ atomId: "atoms/core/playerProfile#criticalDistinctionAtom", source: "atoms/core/playerProfile.ts", exportName: "criticalDistinctionAtom" }, () => criticalDistinction);

export default playerProfile;
