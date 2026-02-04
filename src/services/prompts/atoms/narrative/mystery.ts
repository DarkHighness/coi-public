/**
 * Narrative Atom: Mystery & Foreshadowing
 * Content from acting/mechanics.ts
 */
import type { Atom, SkillAtom, SkillOutput } from "../types";

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
    * If you *foreground* a detail, it should matter. Background texture can stay texture.
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
  </layered_clues>

  <evidence_fairness>
    **FAIR MYSTERY (NO CHEAP HIDING)**
    - Do NOT hide the only solution behind a single roll or a single NPC.
    - Always provide multiple routes to the next fact:
      * witness → rumor network → physical trace
      * paperwork → location → person
      * observation → tailing → interception
    - If a roll fails, reveal *something* (a partial, a new risk, a worse lead), not “nothing happens”.
  </evidence_fairness>

  <clue_design>
    **CLUES MUST BE PHYSICAL / SOCIAL / DOCUMENTARY (NOT VIBES)**
    Prefer:
    - physical: mud on boots, missing dust, fresh nails on an old door, mismatched blood pattern
    - social: who flinches, who pays too fast, who shows up where they “shouldn’t”, who won’t meet eyes when names are spoken
    - documentary: ledger gaps, stamp marks, torn page edges, different ink, inconsistent dates

    Each major secret should have:
    - 1 obvious clue (for momentum),
    - 1 misleading clue (for tension),
    - 1 “silent” clue (only makes sense later).
  </clue_design>

  <clue_bookkeeping>
    **MAKE PROGRESS LEGIBLE**
    When the player finds a clue, convert it into a concrete state change:
    - update Knowledge (what was learned, where it came from, what it points to next)
    - update Quest visible objective (next actionable step)
    - update NPC visible status/impression (based on what was observed, not mind-reading)
  </clue_bookkeeping>
</rule>
`;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const mysteryMechanicsSkill: SkillAtom<void> = (): SkillOutput => ({
  main: mysteryMechanics(),

  quickStart: `
1. Plant 3+ hints before any major revelation
2. Layered clues: obvious, hidden (retrospect), deep (piecing)
3. Fair mystery: multiple routes to each fact
4. Physical/social/documentary clues (not vibes)
5. Convert clues to state changes (Knowledge, Quest, NPC)
`.trim(),

  checklist: [
    "Major revelations have 3+ prior hints?",
    "Multiple routes to discover each fact?",
    "Clues are physical/social/documentary (not vibes)?",
    "Red herrings present to create tension?",
    "Clue discovery updates game state (Knowledge, etc.)?",
    "NPC lies tracked for player detection?",
  ],

  examples: [
    {
      scenario: "Fair Mystery",
      wrong: `The only way to learn the secret is one NPC.
If you miss them, you never know.
(Single point of failure - unfair.)`,
      right: `Routes: witness → rumor network → physical trace
OR paperwork → location → person
(Multiple paths to same truth.)`,
    },
    {
      scenario: "Clue Design",
      wrong: `"Something felt off about the room."
(Vibe, not clue.)`,
      right: `"Dust covered everything—except a rectangle on the desk.
Something had been removed recently."
(Physical, checkable, leads somewhere.)`,
    },
  ],
});
