/**
 * Narrative Atom: Combat Mechanics
 * Content from acting/mechanics.ts
 */
import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const combatMechanics: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/combat#combatMechanics",
    source: "atoms/narrative/combat.ts",
    exportName: "combatMechanics",
  },
  () => `
<rule name="COMBAT & ACTION">
  <core_combat_philosophy>
    **COMBAT IS UGLY**:
    - It is not a dance. It is fast, confusing, and exhausting.
    - **No "Exchanges"**: Don't write "He attacks, you block, he attacks again." Write "A blur of steel. The jar of impact travels up your arm. You are breathing hard."
    - **Environmental Chaos**: Tables overturn. Mud makes footing slippery. Blood gets in eyes. Use the mess.
    - **Duration Reality**: Most real fights last seconds, not minutes. A knife fight is over in two heartbeats. A siege is days of boredom punctuated by hours of terror.
  </core_combat_philosophy>

  <spatial_combat>
    **SPACE IS A WEAPON**:
    - Every fight happens somewhere. The "where" matters as much as the "who."
    - Narrow corridors neutralize numbers. Open ground favors archers. Stairs give high-ground advantage but limit retreat.
    - Render positions: "Your back hits the wall. The door is three strides to the left. Two of them are between you and it."
    - Objects in the scene are tools: a chair is a shield, a lantern is a weapon, a rug can be pulled.
  </spatial_combat>

  <fatigue_and_degradation>
    **FATIGUE IS THE REAL ENEMY**:
    - After 30 seconds of real combat, arms burn. After a minute, everything is survival.
    - Armor is heavy. Weapons get slippery with sweat and blood. Grips fail.
    - Render degradation: "Your sword arm is lead. Each parry comes slower. The next one might not come at all."
    - A fresh fighter beating an exhausted expert is realistic, not dramatic license.
  </fatigue_and_degradation>

  <injury_system>
    **PAIN IS PHYSICAL**:
    - Don't say "You take 10 damage."
    - Say "The blade bites deep into your thigh. The leg buckles. Warmth spreads down your boot."
    - **Injury Persistence**: If the narrative says "leg broken", you CANNOT run in the next sentence. You crawl. You limp. The penalty persists across turns.
    - **Adrenaline Masking**: In combat, injuries may not register immediately. The slash across your ribs only starts screaming when the adrenaline fades. Render the delay.
    - **Accumulation**: Minor wounds stack. Three small cuts don't individually slow you, but together they're bleeding you dry.
  </injury_system>

  <aftermath>
    **AFTER THE FIGHT**:
    - Violence has consequences beyond the combat itself. Hands shake. Ears ring. Stomach turns.
    - The first kill is not glorious. It is vomit, trembling, and the inability to stop seeing it.
    - Survivors are changed: hypervigilance, flinching at loud sounds, checking exits.
    - The scene left behind tells a story: blood patterns, broken furniture, the smell that doesn't leave.
  </aftermath>

  <logic_enforcement>
    **CONSISTENCY IS LAW**:
    - **Genre/Tech Coherence**:
      * **Fantasy**: Magic exists but follows rules (cost/fatigue). A fireball singes the caster's eyebrows.
      * **Historical**: Weapons are heavy, armor has gaps, and a single arrow wound can be fatal.
      * **Sci-Fi**: Physics kills. Vacuum is instant. Energy weapons cauterize. Zero-G combat is disorienting.
    - **Weapon Physics**: A sword cannot cut through plate armor. A dagger is useless at range. A bow requires strength AND training. Respect the tools.
  </logic_enforcement>

  <combat_pacing>
    **FIGHT DURATION → TURN MAPPING**:
    Real combat is fast. Map fictional duration to prose density:
    | Fight Duration | Turns | Prose per Exchange |
    |---------------|-------|--------------------|
    | Ambush / sucker punch | 1 turn | 2-3 sentences (it's over before you process it) |
    | Knife fight / brawl | 1-2 turns | 3-4 sentences per turn (fast, desperate) |
    | Sword duel / melee | 2-4 turns | 4-6 sentences per turn (space for tactics) |
    | Siege / battle | 5+ turns | 5-8 sentences per turn (multiple fronts, pacing shifts) |

    **PROSE RHYTHM**: Combat prose uses SHORT sentences during action (impact, reaction, breath) and LONGER sentences during pauses (assessment, dread, tactical thinking). Alternate. Never write a chain of 5+ action sentences without a pause beat.

    ❌ "He swung. You dodged. He swung again. You blocked. He kicked. You stumbled."
    ✅ "Steel comes fast — you twist, feel the blade slice air where your throat was.
       A heartbeat of nothing. Your feet find the ground.
       Then he's moving again."
  </combat_pacing>

  <injury_scaffolding>
    **INJURY TIER SYSTEM** (determines movement and capability):
    | Tier | Examples | Mobility | Combat Capability | Cognitive |
    |------|---------|----------|-------------------|-----------|
    | MINOR | Cuts, bruises, sprains | ~90% | Slightly slower reactions | Clear |
    | MODERATE | Deep laceration, cracked rib, concussion | ~60% | One-handed fighting, no heavy weapons | Fuzzy, slower decisions |
    | SEVERE | Broken limb, puncture wound, heavy blood loss | ~30% | Defensive only, cannot initiate | Tunnel vision, shock risk |
    | CRITICAL | Arterial bleed, organ damage, multiple fractures | Near-zero | Cannot fight | Consciousness fading |

    **PERSISTENCE RULE**: Injuries do NOT heal between turns. A broken leg in Turn 5 means crawling in Turn 6, limping with a splint in Turn 10, and a visible limp in Turn 30. Track via protagonist's conditions array.

    **ADRENALINE WINDOW**: During combat, injuries one tier lower than actual may be felt (MODERATE feels MINOR). After combat ends, full tier hits. "The adrenaline fades. That's when you realize the cut is deeper than you thought."
  </injury_scaffolding>

  <escalation_signals>
    **STAKES ESCALATION** (introduce new KINDS of threat, not more of the same):
    Escalation is NOT "hit harder." It is "the situation becomes more complex and dangerous."

    Pattern — introduce one new threat element every 2-3 combat turns:
    1. **Spatial threat**: "He's herding you toward the window — and the window opens onto the ravine."
    2. **Temporal threat**: "Reinforcements. You can hear boots on the stairs."
    3. **Resource threat**: "Your sword-hand is slick with blood. Three more exchanges and you lose the grip."
    4. **Moral threat**: "The child is still in the room. Every swing risks hitting the crate she's hiding behind."
    5. **Escape closing**: "The door locks from the outside. Someone just turned the key."

    Each signal adds a NEW decision dimension. The player's choices expand (or contract) with each escalation.
  </escalation_signals>
</rule>
`,
);

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const combatMechanicsSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/narrative/combat#combatMechanicsSkill",
    source: "atoms/narrative/combat.ts",
    exportName: "combatMechanicsSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(combatMechanics),

    quickStart: `
1. Combat is ugly - fast, confusing, exhausting (not choreographed)
2. Space is a weapon - positions, objects, terrain all matter
3. Fatigue degrades everything - arms burn, grips fail, reactions slow
4. Pain is physical - describe the wound, not HP loss
5. Injuries persist and accumulate across turns
6. Aftermath matters - shaking hands, ringing ears, the smell that stays
`.trim(),

    checklist: [
      "Combat feels chaotic and disorienting (not choreographed)?",
      "Using spatial positioning and environmental objects?",
      "Rendering fatigue and degradation as combat progresses?",
      "Pain described physically (not abstractly as HP/damage)?",
      "Injuries persist and affect subsequent scenes (tracked in conditions)?",
      "Aftermath rendered (psychological and physical toll)?",
      "Weapon physics respected (no cutting through plate armor)?",
      "Genre consistency maintained (no anachronisms)?",
      "Prose rhythm alternates short action sentences with pause beats?",
      "Escalation introduces new threat KINDS every 2-3 turns (not more damage)?",
      "Injury tier matches protagonist's actual mobility and capability?",
    ],

    examples: [
      {
        scenario: "Spatial combat awareness",
        context: [
          "A tavern brawl erupts around the player in a tight room with overturned tables and a narrow exit.",
          "Two attackers approach from different directions.",
        ],
        constraints: [
          "Render specific positions, distances, and available environmental objects.",
          "Do not describe combat as abstract exchanges — ground it in the room.",
        ],
        pitfalls: [
          "Writing combat in a featureless void where space doesn't matter.",
          "Ignoring the narrow exit that should force tactical decisions.",
        ],
        wrong: `"He attacks. You block. He attacks again."
(Turn-based, mechanical, no space.)`,
        right: `"Your back hits the bar. The door is three strides to the left. One of them kicks a chair into your path — the other is already swinging."
(Spatial, chaotic, objects matter.)`,
      },
      {
        scenario: "Fatigue and injury accumulation",
        context: [
          "The player has been fighting for over a minute and has sustained a cut to the forearm.",
          "The opponent is fresh, having just arrived.",
        ],
        constraints: [
          "Show fatigue degrading the player's performance.",
          "The earlier wound should still be bleeding and affecting grip.",
        ],
        pitfalls: [
          "Treating the player as equally capable despite wounds and exhaustion.",
          "Forgetting the forearm cut when describing sword work.",
        ],
        wrong: `"You parry his strike easily and counter-attack."
(No fatigue, no wound effect.)`,
        right: `"Your sword arm is lead. The parry comes late — the impact jars through the cut on your forearm and your grip almost fails. He's fresh. You are not."
(Fatigue + injury compounding.)`,
      },
    ],
  }),
);
