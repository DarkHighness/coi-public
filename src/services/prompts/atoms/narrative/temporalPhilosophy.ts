/**
 * Narrative Atom: Temporal Philosophy
 * Content from knowing/temporal.ts
 */
import type { Atom } from "../types";

export const temporalPhilosophy: Atom<void> = () => `
<temporal_philosophy>
  TIME IS NOT A NUMBER. TIME IS THE FABRIC OF EXISTENCE.

  <three_times>
    You must weave THREE temporal experiences simultaneously:

    **COSMIC TIME** (宇宙时间) — The world's indifferent clock.
    Flows constantly, never stops, never reverses. Seasons change, NPCs age,
    empires crumble—with or without the protagonist. This is objective, merciless time.
    Use phrases like: "Meanwhile...", "Three days later...", "While you slept..."

    **NARRATIVE TIME** (叙事时间) — The story's elastic rhythm.
    Stretches for significance: a sword swing can take three paragraphs.
    Compresses routine: "The winter passed in quiet labor."
    Expand for: combat, revelation, emotional climax, first encounters.
    Compress for: travel, recovery, waiting, the mundane.

    **LIVED TIME** (体验时间) — The protagonist's subjective perception.
    Fear stretches seconds into hours. Joy compresses days into moments.
    Boredom makes minutes feel like centuries. Describe through heartbeats,
    breaths, attention shifts, memory distortion.
  </three_times>

  <temporal_weaving>
    THE GM MUST WEAVE ALL THREE:

    Example — A fight scene:
    - COSMIC: "The duel lasted exactly twelve seconds."
    - NARRATIVE: "The blade descended. In the space between heartbeats, you saw
      the notch in the steel, the sweat on his brow, the slight tremor in his grip..."
    - LIVED: "Twelve seconds. It felt like twelve years."

    State COSMIC TIME for consistency. Render NARRATIVE TIME for drama.
    Reference LIVED TIME for immersion.
  </temporal_weaving>

  <temporal_laws>
    METAPHYSICAL AXIOMS (Unbreakable):

    **IRREVERSIBILITY**: Time flows in one direction only.
    No going back. No undoing. What is done, is done.
    Even "flashbacks" are memories, not time travel.

    **CAUSALITY**: Cause precedes effect. Always.
    The arrow hits AFTER the bow is drawn. Never narrate effect before cause.

    **ENTROPY**: Order decays. Wounds fester. Memories fade.
    Things left alone deteriorate. Neglected relationships wither.

    **SIMULTANEITY**: The world does not pause for the protagonist.
    While you sleep, the assassin travels. While you rest, the enemy plans.
  </temporal_laws>

  <temporal_techniques>
    **THE PREGNANT PAUSE**: Before impact, slow down.
    "For a heartbeat, no one moved."
    "The silence stretched. And stretched."

    **THE MERCIFUL SKIP**: Not everything needs narration.
    "Three days of fever. You remember nothing but thirst."
    "The journey was uneventful. You arrived at dusk."

    **THE TEMPORAL ECHO**: Past reverberating into present.
    "His laugh—you'd heard it before. Where?"
    "The smell of smoke. Suddenly you were eight years old again."

    **THE SHADOW OF FUTURE**: Foreshadowing without prophecy.
    "You didn't know it then, but this was the last time."
    "If you had looked up, you might have seen—but you didn't."
  </temporal_techniques>

  <time_and_state>
    How time affects game state:
    - NPCs: Age, change opinions, move through routines, pursue goals
    - Items: Degrade, rust, spoil, become obsolete
    - Locations: Weather changes, seasons shift, buildings decay
    - Quests: Deadlines pass, opportunities expire, situations evolve

    Update atmosphere when significant time passes. Update NPC states
    when their timelines progress. Mark items as degraded appropriately.
  </time_and_state>

  <temporal_layering_in_timeline>
    **THE ARCHAEOLOGY OF TIME**:
    - Layer 1: What characters REMEMBER (often wrong, colored by emotion)
    - Layer 2: What RECORDS say (propaganda, official history)
    - Layer 3: What ACTUALLY happened (hidden layer)
  </temporal_layering_in_timeline>
</temporal_philosophy>
`;

export const temporalPhilosophyLite: Atom<void> = () => `
<temporal_philosophy>
  THREE TIMES: COSMIC (world clock), NARRATIVE (story rhythm), LIVED (protagonist's perception).
  LAWS: Time irreversible. Cause precedes effect. Things decay. World doesn't pause for player.
  TECHNIQUES: Pause before impact. Skip routine. Echo past. Shadow future.
</temporal_philosophy>
`;

export default temporalPhilosophy;
