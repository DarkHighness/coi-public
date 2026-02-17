/**
 * Narrative Atom: Temporal Philosophy
 * Content from knowing/temporal.ts
 */
import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const temporalPhilosophy: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/temporalPhilosophy#temporalPhilosophy",
    source: "atoms/narrative/temporalPhilosophy.ts",
    exportName: "temporalPhilosophy",
  },
  () => `
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
    Under threat, seconds stretch into hours. Under comfort, hours slide by.
    Boredom makes minutes grind. Render this through heartbeats, breaths,
    attention narrowing, and bodily stress.
  </three_times>

  <temporal_weaving>
    THE GM MUST WEAVE ALL THREE:

    Example — A fight scene:
    - COSMIC: "The duel lasted exactly twelve seconds."
    - NARRATIVE: "The blade descended. In the space between heartbeats:
      the notch in the steel, the sweat on his brow, the slight tremor in his grip..."
    - LIVED: "Twelve seconds. It felt like twelve years."

    State COSMIC TIME for consistency. Render NARRATIVE TIME for drama.
    Reference LIVED TIME for immersion.

    **PROPORTION**: Cosmic (1 sentence anchor) → Narrative (main prose) → Lived (1-2 sensory beats).
    One time dominates per passage; the other two provide grounding.
  </temporal_weaving>

  <temporal_laws>
    CORE TEMPORAL PRINCIPLES (break only with explicit in-world justification):

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
    "Three days of fever; the world reduces to thirst."
    "The journey was uneventful. You arrived at dusk."

    **THE TEMPORAL ECHO**: Past reverberating into present.
    "His laugh—familiar, wrong. Where?"
    "The smell of smoke; a childhood flash at the edge of the moment."

    **THE SHADOW OF FUTURE**: Foreshadowing without prophecy.
    Avoid authorial mind-reading like "You didn't know it then...".
    Foreshadow with concrete, external cues:
    - "The lantern wick burns too fast."
    - "The guard keeps glancing at the side gate, as if waiting for a signal."
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
`,
);

export const temporalPhilosophyPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/temporalPhilosophy#temporalPhilosophyPrimer",
    source: "atoms/narrative/temporalPhilosophy.ts",
    exportName: "temporalPhilosophyPrimer",
  },
  () => `
<temporal_philosophy>
  THREE TIMES: COSMIC (world clock), NARRATIVE (story rhythm), LIVED (protagonist's perception).
  LAWS: Time irreversible. Cause precedes effect. Things decay. World doesn't pause for player.
  TECHNIQUES: Pause before impact. Skip routine. Echo past. Shadow future.
</temporal_philosophy>
`,
);

export default temporalPhilosophy;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const temporalPhilosophySkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/narrative/temporalPhilosophy#temporalPhilosophySkill",
    source: "atoms/narrative/temporalPhilosophy.ts",
    exportName: "temporalPhilosophySkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(temporalPhilosophy),

    quickStart: `
1. Three times: Cosmic (world clock), Narrative (story rhythm), Lived (subjective)
2. Expand for: combat, revelation, emotional climax
3. Compress for: travel, recovery, waiting, mundane
4. Time passes off-screen - world doesn't wait
`.trim(),

    checklist: [
      "Tracking cosmic time (world events continue off-screen)?",
      "Adjusting narrative time (expand/compress appropriately)?",
      "Rendering lived time (subjective perception under stress)?",
      "Not freezing world during player inaction?",
      "Using temporal cues (meanwhile, later, while you slept)?",
    ],

    examples: [
      {
        scenario: "Time Expansion",
        wrong: `"You fight. You win."
(Combat compressed into summary.)`,
        right: `"The blade arcs. Time stretches. You see the edge catching light—
the trajectory, the inevitable point of impact..."
(Critical moment expanded, rendered in detail.)`,
      },
      {
        scenario: "Time Compression",
        wrong: `"Day 1 of travel... Day 2 of travel... Day 3 of travel..."
(Routine given excessive detail.)`,
        right: `"The journey took three days. By the end, your boots had worn thin."
(Mundane compressed, one telling detail.)`,
      },
    ],
  }),
);
