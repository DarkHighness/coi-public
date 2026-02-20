/**
 * ============================================================================
 * Entity Design Atom: Attribute Design Context
 * ============================================================================
 *
 * Attribute 设计上下文 — 用于属性创建和运行时属性管理。
 * 定义创建 Attribute 时的设计哲学和质量要求。
 *
 * An attribute is not a number — it is the body's honest accounting.
 * Strength is the memory of everything you have ever lifted.
 * Intelligence is the residue of every problem you have ever solved,
 * and every one that defeated you. The number is just
 * the world's shorthand for a life of accumulation.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const attributeDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/attributeDesign#attributeDesign",
    source: "atoms/entities/attributeDesign.ts",
    exportName: "attributeDesign",
  },
  () => `
<game_system_context>
**ATTRIBUTE DESIGN FOR REALITY RENDERING ENGINE:**

Attributes are the foundation beneath everything — the raw capacities that determine not what a character DOES (that is skills) but what they CAN do and what it COSTS them. A strong man can carry the wounded ally; a weak man must choose who to leave behind. This is not a mechanical difference. It is a moral one. Attributes create the conditions for ethical dilemmas.

<attribute_philosophy>
**THE BODY'S HONESTY — ATTRIBUTES AS LIVED REALITY:**

Attributes are not abstract scores. They are the physical, mental, and social realities that a character lives inside every moment of every day. High Strength is not "+3 to lift checks." It is the way doorframes feel too small, the way children instinctively reach for your hand, the way you forget that other people can't just... move things.

**KEY PRINCIPLE**: Attributes should be NARRATED, never DISPLAYED. The reader should FEEL the character's capabilities through the prose, not read them from a stat sheet. This applies to ALL actors — NPCs also have attributes that shape their behavior and capabilities.

| Attribute | High Expression (narrative) | Low Expression (narrative) |
|-----------|---------------------------|--------------------------|
| **Strength** | "You lift the beam one-handed. It's heavy, but your body has carried heavier." | "The beam doesn't budge. Your arms burn, your vision darkens at the edges." |
| **Agility** | "Your body flows between the blades like water around stones." | "You lurch sideways. Too slow. The blade finds the gap your body couldn't close." |
| **Endurance** | "Mile twenty. Your legs have forgotten why they were tired." | "Your lungs are bellows with holes. Each breath costs more than the last." |
| **Perception** | "You smell the smoke before anyone else. Three blocks east, wood smoke, not coal." | "The assassin was behind the curtain. You looked right at it and saw only fabric." |
| **Intellect** | "The pattern clicks. You see the connections before you can name them." | "The cipher mocks you. Letters swim. You've been staring for an hour." |
| **Willpower** | "The pain is real. You put it in a box and close the lid. Later." | "Your resolve crumbles like wet bread. You say yes because no is too expensive." |
| **Charisma** | "The room shifts when you speak. Not because you're loud — because you're inevitable." | "Your words land like dead birds. The silence afterward is worse." |
</attribute_philosophy>

<attribute_coupling>
**ATTRIBUTE-ENTITY COUPLING:**

Attributes do not exist in isolation. They form the substrate on which everything else operates:

**ATTRIBUTES → SKILLS:**
- Attributes GATE skill ceiling: no amount of practice makes a weak man a master blacksmith
- Attributes MODIFY skill reliability: high Perception makes Tracking more detailed, not just "better"
- Attributes CREATE skill access: some skills simply cannot exist without minimum attribute thresholds (complex surgery requires steady hands AND medical knowledge)

**ATTRIBUTES → CONDITIONS:**
- High Endurance resists disease and slows condition escalation
- Low Willpower makes psychological conditions harder to shake
- Attribute damage FROM conditions creates cascading degradation (broken hand lowers effective Agility, which degrades combat skills, which increases injury risk)

**ATTRIBUTES → TRAITS:**
- Traits COLOR how attributes express: a strong, gentle man uses strength to protect; a strong, cruel man uses it to dominate
- Attribute extremes can GENERATE traits over time: sustained high Perception can develop into Hypervigilance (a trait with its own dual nature)

**ATTRIBUTES → ITEMS:**
- Minimum attributes required to wield certain items effectively
- Items can temporarily boost attributes (stimulants, armor, tools) with costs
- Attribute-item mismatch creates friction: a delicate scholar in heavy plate armor is a liability, not a tank

**ATTRIBUTES → SOCIAL REALITY:**
- Physical attributes are VISIBLE: strength shows in build, agility in movement, endurance in complexion
- Social attributes are FELT: charisma in attention patterns, willpower in eye contact, intellect in conversation depth
- NPCs react to attribute impressions before they know the character
</attribute_coupling>

<attribute_change>
**ATTRIBUTE CHANGE — THE BODY'S SLOW LEDGER:**

Attributes change, but grudgingly. The body is a conservative institution.

**GROWTH CHANNELS:**
| Channel | Speed | Example |
|---------|-------|---------|
| **Training** | Slow, reliable | Daily sword practice gradually builds Strength and Agility |
| **Trauma** | Instant, negative | Spinal injury permanently reduces Agility |
| **Crisis adaptation** | Moderate, conditional | Surviving weeks in the wilderness can boost Endurance |
| **Supernatural** | Variable, costly | A blessing may enhance Willpower — but at what price? |
| **Age** | Gradual, inevitable | Physical attributes peak and decline; mental attributes may continue growing |
| **Sustained conditions** | Moderate, insidious | Chronic pain slowly erodes Endurance; malnutrition degrades Strength |

**NARRATIVE RENDERING OF CHANGE:**
- Growth: "You notice it in small ways. The pack feels lighter. The hill feels shorter. You couldn't pinpoint when it changed."
- Decline: "Your hand trembles. It didn't used to do that. You grip tighter, but the tremor just migrates to your wrist."
- Never: "Your Strength increased from 14 to 15." (This is death to immersion.)
</attribute_change>

<attribute_examples>
**DO / DON'T EXAMPLES:**

✅ GOOD attribute in narrative:
"He grabbed the merchant's wrist — and immediately knew. The merchant's bones felt like kindling. The grip that was casual for him was causing real pain. He let go quickly, seeing the white fingerprints on the man's skin. He always forgot. He always forgot how much force was too much."
(High Strength expressed through accidental social consequence — SHOWS the attribute, FEELS the attribute.)

❌ BAD attribute in narrative:
"With his Strength of 16, he easily overpowered the merchant."
(Stat display, not experience. No sensory reality, no character.)

✅ GOOD attribute-skill interaction:
"She could read the map. She understood the route intellectually — the passes, the timing, the water sources. But her legs had nothing left. The knowledge was perfect; the body refused. She would have to choose: the shorter route through the dangerous pass, or the longer route her body could actually walk."
(High Intellect + Low Endurance creates a real dilemma. The attribute interaction generates a moral choice.)

❌ BAD attribute-skill interaction:
"She failed the Navigation check because her Endurance was too low."
(Mechanical, no drama, no choice.)
</attribute_examples>

<schema_field_mapping>
**WHERE TO WRITE — Attribute Schema Field Paths (characterAttribute):**
| Design Concept | → Schema Field |
|---|---|
| Attribute name | \`label\` (e.g. "Health", "Sanity", "Stamina") |
| Current level | \`value\` (integer) |
| Maximum capacity | \`maxValue\` (integer) |
| Visual color hint | \`color\` (red/blue/green/yellow/purple/gray) |
| Icon | \`icon\` (emoji) |

**NOTE**: Attributes are flat numeric bars — no visible/hidden split. Narrative meaning lives in HOW you describe value changes in prose (the body's honest testimony), not in the number itself. Attributes apply to ANY actor (player and NPC alike).
**FALLBACK**: Threshold descriptions (what 20% Health feels like), decay rules, cross-attribute coupling logic → write to character \`notes.md\` or world \`notes.md\`.
</schema_field_mapping>
</game_system_context>
`,
);

export const attributeDesignDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/attributeDesign#attributeDesignDescription",
    source: "atoms/entities/attributeDesign.ts",
    exportName: "attributeDesignDescription",
  },
  () => `
<game_system_context>
**ATTRIBUTE DESIGN**: Attributes are the body's honest accounting, not abstract scores.
- Semantic meaning defined per world context
- High/low expression through narrative, not numbers
- Coupling (gate skills, resist conditions, constrain items)
- Growth channels (training, trauma, crisis, age, chronic conditions)
- Change narrated through sensation and consequence
</game_system_context>
`,
);

export const attributeDesignSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/attributeDesign#attributeDesignSkill",
    source: "atoms/entities/attributeDesign.ts",
    exportName: "attributeDesignSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(attributeDesign),
    quickStart: `
1. Define each attribute's semantic meaning in THIS world (not generic RPG stats)
2. Write high/low expression narratives (what does a 'high' look like in prose?)
3. Map coupling: which skills are gated? Which conditions are resisted?
4. Define growth channels: how can this attribute change? At what speed?
5. Define narrative rendering: how do changes APPEAR in prose?
6. Map social visibility: what do others SEE of this attribute?
`.trim(),
    checklist: [
      "Attribute meaning is explicit and non-overlapping?",
      "High expression shown through behavior (not 'Strength: High')?",
      "Low expression creates real constraints (not just penalty)?",
      "Skill gating defined (what skills need this attribute)?",
      "Condition resistance/vulnerability defined?",
      "Growth/decline channels realistic for the world?",
      "Change is narrated through sensation (not stat announcement)?",
      "Social visibility defined (what others see/feel)?",
    ],
    examples: [
      {
        scenario: "Attribute in Narrative",
        wrong: `"With his Strength of 16, he easily overpowered the merchant."
(Stat display. No sensation, no consequence.)`,
        right: `"He grabbed the merchant's wrist — and immediately knew.
The bones felt like kindling. The grip that was casual for him
was causing real pain. He let go quickly, seeing the white
fingerprints. He always forgot how much force was too much."
(Attribute experienced through accidental social consequence.)`,
      },
      {
        scenario: "Attribute-Skill Interaction",
        wrong: `"Failed Navigation check — Endurance too low."
(Mechanical. No drama, no choice.)`,
        right: `"She understood the route perfectly — the passes, the timing.
But her legs had nothing left. The knowledge was perfect;
the body refused. She would have to choose: the dangerous
short pass, or the longer route her body could actually walk."
(High Intellect + Low Endurance generates a real dilemma.)`,
      },
      {
        scenario: "Attribute Change",
        wrong: `"Strength increased from 14 to 15."
(Game UI. Death to immersion.)`,
        right: `"You notice it in small ways. The pack feels lighter.
The hill feels shorter. You couldn't pinpoint when it changed."
(Growth felt through daily experience, not announced.)`,
      },
    ],
  }),
);

export const attributeLogic: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/attributeDesign#attributeLogic",
    source: "atoms/entities/attributeDesign.ts",
    exportName: "attributeLogic",
  },
  () => `
<game_system_context>
**ATTRIBUTE LOGIC**: Attribute values gate capability and reliability.

**THRESHOLD MECHANICS:**
- Actions read attribute thresholds and produce partial/full/exceptional outcomes
- The threshold is not a binary gate — it is a spectrum of competence
- Near-threshold actions succeed with cost; far-below-threshold actions fail with consequences; far-above-threshold actions succeed with ease that itself can be narratively interesting

**MODIFIER STACKING:**
- Temporary modifiers from conditions, items, and environment stack with explicit caps
- Positive modifiers: equipment, stimulants, adrenaline, favorable conditions
- Negative modifiers: injury, exhaustion, hostile environment, emotional distress
- Stacking ceiling: even the best equipment cannot make a weak man into a strongman

**OVEREXTENSION:**
- Pushing beyond attribute limits is possible but creates condition triggers
- Sprint past Endurance: collapse, muscle damage, vulnerability
- Think past Intellect: confusion, wrong conclusions accepted as right
- Charm past Charisma: the mask slips, the act becomes visible
- Overextension traces persist and compound with repeated abuse

**CASCADING EFFECTS:**
- Attribute changes re-evaluate ALL dependent systems
- Strength drop → weapon effectiveness drops → combat options narrow → injury risk increases
- Perception drop → tracking fails → lost in wilderness → resource pressure → condition triggers
- The cascade is the POINT: attributes are load-bearing walls, and removing one column threatens the whole structure
</game_system_context>
`,
);

export const attributeLogicDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/attributeDesign#attributeLogicDescription",
    source: "atoms/entities/attributeDesign.ts",
    exportName: "attributeLogicDescription",
  },
  () => `
<game_system_context>
**ATTRIBUTE LOGIC**: Thresholds, modifiers, bounded deltas.
- Spectrum outcomes, not binary pass/fail
- Overextension triggers conditions
- Changes cascade through dependent systems
</game_system_context>
`,
);

export const attributeLogicSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/attributeDesign#attributeLogicSkill",
    source: "atoms/entities/attributeDesign.ts",
    exportName: "attributeLogicSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(attributeLogic),
    quickStart: `
1. Evaluate attribute threshold for attempted action (spectrum, not binary)
2. Apply temporary modifiers with caps (conditions, items, environment)
3. Determine outcome quality: far-below, near, at, above threshold
4. If overextension: generate condition triggers and trace
5. Cascade attribute changes to dependent skills, conditions, and options
6. Narrate outcome through sensation and consequence, not stat rolls
`.trim(),
    checklist: [
      "Threshold produces spectrum outcome (not just pass/fail)?",
      "Modifier stacking respects ceiling caps?",
      "Overextension costs are concrete (conditions, fatigue)?",
      "Dependent skills re-evaluated after attribute change?",
      "Cascade effects traced through connected systems?",
      "Outcome narrated through experience (not mechanics)?",
      "Long-term attribute change uses bounded deltas?",
      "Recovery windows respected (no instant restoration)?",
    ],
  }),
);

export default attributeDesign;
