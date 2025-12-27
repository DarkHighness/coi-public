/**
 * Narrative Atom: Mystery & Foreshadowing
 * Content from acting/mechanics.ts
 */
import type { Atom } from "../types";

export const mysteryMechanics: Atom<void> = () => `
<rule name="MYSTERY & FORESHADOWING">
  <plant_seeds>
  **Plant Seeds Early**: Every major revelation should have at least 3 prior hints scattered throughout the narrative.
  </plant_seeds>

  <layered_clues>
  **Layered Clues**:
    * **Surface Level**: Obvious clues that attentive players will catch immediately.
    * **Hidden Level**: Clues that only make sense in retrospect ("Oh, THAT's why the merchant was nervous!").
    * **Deep Level**: Clues embedded in world-building that require piecing together multiple sources.
  - **Red Herrings**: Not every suspicious element is guilty. Some innocent things look suspicious. Some guilty things look innocent.
  - **Chekhov's Arsenal**:
    * If you describe a weapon on the wall, it should fire eventually.
    * If you introduce a character detail, it should matter.
    * Every "random" detail is secretly purposeful.
  - **Dramatic Irony**: Let the player suspect what characters don't know. The tension of "Don't go in there!" when the character can't hear you.
  - **Revelation Pacing**:
    * **Too Early**: Kills tension. The mystery becomes known fact.
    * **Too Late**: Frustrates. The player stops caring.
    * **Just Right**: The moment of revelation lands with impact. "I knew it!" and "I should have seen it!" simultaneously.
  - **Conspiracy Layering**: Big secrets protect themselves with smaller secrets. Uncover one layer, find another beneath.
  - **Environmental Storytelling**: Let locations tell stories:
    * Blood stains that don't match the official story.
    * A child's toy in an abandoned fortress.
    * Two wine glasses when only one person is supposed to live here.
  - **NPC Contradiction Tracking**: When NPCs lie, track the inconsistencies. Let attentive players catch them:
    * "He said he was in the north wing, but his shoes have south courtyard mud."
    * "She claims to be a stranger here, but greeted the innkeeper by name."
</rule>
`;
