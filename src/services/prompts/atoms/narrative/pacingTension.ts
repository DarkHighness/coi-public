/**
 * ============================================================================
 * Narrative Atom: Pacing & Tension Control
 * ============================================================================
 *
 * 节奏不是速度——它是紧张与释放的交替。一部只有高潮的故事就像一部只有尖叫的恐怖片。
 * 沉默让爆发更响亮。平静让风暴更猛烈。控制节奏就是控制情绪。
 */

import type { SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const pacingTensionControl = defineAtom(
  {
    atomId: "atoms/narrative/pacingTension#pacingTensionControl",
    source: "atoms/narrative/pacingTension.ts",
    exportName: "pacingTensionControl",
  },
  () => `
<rule name="PACING_AND_TENSION_CONTROL">
  <core_principle>
    **PACING IS THE RHYTHM OF EMOTIONAL INVESTMENT**

    Tension is not constant threat. It is the DISTANCE between what the player expects and what might happen.
    Pacing is the art of controlling that distance — widening it (dread), narrowing it (relief), and occasionally slamming it shut (revelation).

    A story at constant high tension is exhausting and numbing.
    A story at constant low tension is boring.
    The art is in the WAVE: tension → peak → release → new tension.
  </core_principle>

  <tension_wave_model>
    **THE SAWTOOTH PATTERN** (every 3-5 turns):

    \`\`\`
    Tension
      ▲
      │    /\\      /\\      /\\
      │   /  \\    /  \\    /  \\
      │  /    \\  /    \\  /    \\
      │ /      \\/      \\/      \\
      └──────────────────────── Turn →
        BUILD  PEAK  BREATHE  BUILD
    \`\`\`

    1. **BUILD** (2-3 turns): Introduce threat signals. Foreshadow. Create information gaps.
       - Environmental pressure increases (weather worsens, supplies dwindle, deadline approaches)
       - NPC behavior shifts subtly (less eye contact, shorter answers, more locks on doors)
       - Player's options narrow slightly (one exit closes, one ally becomes unavailable)

    2. **PEAK** (1 turn): The threat manifests. Decision point. Maximum stakes.
       - The confrontation happens
       - The truth is revealed
       - The choice must be made NOW

    3. **BREATHE** (1-2 turns): Aftermath. Process. Let the player absorb what happened.
       - Consequences settle (not all at once — some ripple outward)
       - Character moments (NPC reactions, protagonist's body processing shock)
       - Environmental calm (but with traces of the storm — broken things, changed landscape)
       - Quieter choices: interpersonal, restorative, reflective

    **ANTI-PATTERN**: Never follow a PEAK with another PEAK. The player needs breathing room to feel the next escalation.
  </tension_wave_model>

  <micro_pacing_per_turn>
    **WITHIN A SINGLE TURN** (sentence-level rhythm):

    | Scene Type | Sentence Length | Detail Density | Pacing |
    |-----------|----------------|----------------|--------|
    | Action/combat | Short, clipped (5-12 words) | High sensory, low reflection | Fast |
    | Investigation | Medium (12-20 words) | High detail, moderate reflection | Measured |
    | Social/dialogue | Mixed (alternating short/long) | Low environmental, high interpersonal | Conversational |
    | Exploration | Long, flowing (15-25 words) | High environmental, low urgency | Slow |
    | Aftermath | Variable (short impact → long reflection) | Emotional, physical consequence | Decelerating |

    **TRANSITION BEATS**: When changing pace (action → dialogue, exploration → combat), use a SINGLE TRANSITIONAL SENTENCE that bridges the two rhythms:
    - Action → calm: "The last echo fades. Your ears ring in the silence."
    - Calm → danger: "The dog stops barking. That's when you notice the silence is wrong."
    - Dialogue → action: "She's mid-sentence when the window explodes inward."
  </micro_pacing_per_turn>

  <tension_sources>
    **WHAT CREATES TENSION** (use these as building blocks):

    | Source | Mechanism | Example |
    |--------|-----------|---------|
    | **Ticking clock** | External deadline the player cannot pause | "The tide comes in at midnight. The cave floods." |
    | **Information gap** | Player knows something is wrong but not what | "The innkeeper is too friendly. Why?" |
    | **Resource pressure** | Supplies, health, or allies running low | "Three arrows left. Four guards." |
    | **Moral dilemma** | No good choice, only less-bad ones | "Save the child or stop the bomber. Not both." |
    | **Pursuit/hunted** | Someone is coming, and they are closer every turn | "The dogs have your scent." |
    | **Social exposure** | A secret the player has that could be revealed | "The forger's apprentice recognizes you." |
    | **Environmental hostility** | The world itself is the threat | "The temperature is dropping. Your fingers are numb." |
    | **Delayed consequence** | Something the player did is about to come due | "The merchant you robbed has connections." |

    **LAYERING**: The best tension uses 2-3 sources simultaneously. A ticking clock + resource pressure + pursuit creates a scene where every turn MATTERS.
  </tension_sources>

  <release_mechanics>
    **HOW TO RELEASE TENSION** (the exhale is as important as the inhale):

    - **Resolution**: The threat is addressed (not necessarily solved — deferred, escaped, confronted)
    - **Comedy/warmth**: A small human moment — a joke, a shared meal, an unexpected kindness
    - **Beauty**: A moment of environmental wonder that reminds the player the world has more than threats
    - **Competence**: The protagonist does something WELL. The satisfaction of earned skill.
    - **Connection**: A genuine moment between protagonist and NPC — trust, vulnerability, shared history

    **RELEASE RULE**: After a high-tension sequence (3+ turns), the next 1-2 turns should feature at least one release element. This is NOT filler — it's the emotional counterpoint that makes the next tension arc hit harder.

    ❌ BAD: Tension → more tension → more tension → player feels numb
    ✅ GOOD: Tension → peak → release (warm fire, friendly NPC, moment of peace) → new threat seed planted during the calm
  </release_mechanics>

  <quiet_tension>
    **THE ART OF QUIET THREAT**:

    The most effective tension is often the ABSENCE of threat — when things are too quiet, too normal, too convenient.

    - "Nothing happens" as a threat: "The corridor is empty. Clean. The dust pattern shows no one has walked here in weeks. But the torch on the wall is freshly lit."
    - Normality as wrongness: "The village is having a festival. Children laugh. Music plays. Everything is exactly as it should be. That's what bothers you."
    - Kindness as trap: "He offers you dinner. Free lodging. No questions. In this world, nothing is free."

    These create DREAD — tension without a visible source. The player's imagination fills in the threat, which is always worse than anything you could describe.
  </quiet_tension>
</rule>
`,
);

export const pacingTensionDescription = defineAtom(
  {
    atomId: "atoms/narrative/pacingTension#pacingTensionDescription",
    source: "atoms/narrative/pacingTension.ts",
    exportName: "pacingTensionDescription",
  },
  () =>
    `
<pacing_primer>
**PACING**: Follow the sawtooth pattern — BUILD (2-3 turns) → PEAK (1 turn) → BREATHE (1-2 turns). Never chain peaks. Within turns: short sentences for action, long for exploration, mixed for dialogue. Tension sources layer (clock + resources + pursuit). Release tension with warmth, beauty, competence, or connection.
</pacing_primer>
`.trim(),
);

export const pacingTensionSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/narrative/pacingTension#pacingTensionSkill",
    source: "atoms/narrative/pacingTension.ts",
    exportName: "pacingTensionSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(pacingTensionControl),
    quickStart: `
1. Follow sawtooth: BUILD (2-3 turns) → PEAK (1 turn) → BREATHE (1-2 turns)
2. Never chain peaks — player needs breathing room to feel the next escalation
3. Layer tension sources: combine 2-3 from {clock, info gap, resources, dilemma, pursuit, exposure, environment, delayed consequence}
4. After high tension, include at least one release element (warmth, beauty, competence, connection)
5. Match sentence length to scene type: short for action, long for exploration
`.trim(),
    checklist: [
      "Recent turn history follows sawtooth pattern (not constant high or low)?",
      "At least one tension source is active in the current scene?",
      "Breathing room provided after intense sequences?",
      "Sentence rhythm matches scene type (short/action, long/exploration)?",
      "Transition beats bridge pace changes smoothly?",
      "Quiet tension used occasionally (absence of threat as threat)?",
      "Release elements feel earned, not filler?",
    ],
    examples: [
      {
        scenario: "Breathing room after combat",
        wrong: `"After the fight, three more guards appear." (peak → peak, numbing)`,
        right: `"After the fight, silence. Your ears ring. Blood drips from your fingers onto the stone.
The courtyard is empty now. A bird sings from the wall — absurdly normal. 
Your hands are shaking. You sit on the steps and breathe.
The bread in your pack is stale, but it's the best thing you've ever tasted."
(Physical processing, sensory reset, small human comfort)`,
      },
      {
        scenario: "Quiet tension through wrong normality",
        wrong: `"The village seems suspicious." (telling, not showing)`,
        right: `"The village is having a festival. Streamers. Music. Children running between stalls.
Every adult smiles at you. Every single one.
The same smile. The same timing. As if they'd been waiting."
(Normality as wrongness — player's imagination does the work)`,
      },
    ],
  }),
);
