/**
 * ============================================================================
 * Entity Design Atom: Trait Design Context
 * ============================================================================
 *
 * Trait 设计上下文 — 用于角色特质创建和运行时特质管理。
 * 定义创建 Trait 时的设计哲学和质量要求。
 *
 * A trait is not a tag — it is a groove worn into the soul by repetition.
 * The courageous man is not brave because he chose to be.
 * He is brave because somewhere in his history, standing ground
 * became cheaper than running. And now he cannot run
 * even when running would save him.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const traitDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/traitDesign#traitDesign",
    source: "atoms/entities/traitDesign.ts",
    exportName: "traitDesign",
  },
  () => `
<game_system_context>
**TRAIT DESIGN FOR REALITY RENDERING ENGINE:**

Traits are the cracks in the foundation of identity — the persistent patterns that determine how a person breaks under pressure. They are not buffs or labels. They are the GROOVES in the soul, carved by formative experience, that make certain responses automatic and others nearly impossible. The generous man does not CHOOSE to give; giving is the path of least resistance for a soul shaped that way.

<trait_philosophy>
**THE DUAL-NATURE PRINCIPLE:**

Every trait is simultaneously a strength and a weakness. There are no "good" traits and "bad" traits — only traits that serve you in some contexts and betray you in others.

| Trait | Serves You When... | Betrays You When... |
|-------|-------------------|---------------------|
| **Courageous** | Danger requires action | Retreat is the wise choice |
| **Cautious** | Danger can be avoided | Opportunity requires risk |
| **Loyal** | Allies deserve trust | Allies become enemies |
| **Independent** | Alone against the world | Cooperation is the only path |
| **Empathetic** | Understanding opens doors | Others' pain becomes yours |
| **Detached** | Objectivity is needed | Warmth would save a life |
| **Honest** | Trust must be earned | A lie would spare someone |
| **Cunning** | Deception is survival | No one can believe you |

**KEY PRINCIPLE**: A trait's dark side is not its opposite — it is its EXCESS. Courage pushed too far is recklessness. Caution pushed too far is paralysis. The breaking point is where the narrative lives.
</trait_philosophy>

<trait_origin>
**TRAIT ORIGINS — WHERE GROOVES ARE CUT:**

Traits do not appear from nowhere. Each one is a scar from a lesson learned (or mislearned):

**INNATE** — Born this way
- Temperamental tendencies (quick to anger, slow to trust, naturally curious)
- These are the deepest grooves — the hardest to change, the most fundamental

**FORMATIVE EVENT** — The lesson that stuck
- A single event that rewired the response pattern
- "He saw his father beg and decided he would never beg. Now he fights when negotiation would serve him better."
- The event need not be dramatic — sometimes a small cruelty teaches a permanent lesson

**CULTURAL** — The water you swim in
- The values absorbed from community, family, faith, class
- "She was raised to believe that showing emotion is weakness. She is strong and utterly alone."

**CHOSEN** — The oath that shapes
- Deliberately adopted principles or codes
- "He swore to never kill again. The oath keeps him human. It will also get him killed."

**TRAUMATIC** — The wound that rewired
- Post-traumatic behavioral patterns
- "After the ambush, she sleeps with her back to the wall and one eye open. She calls it 'being careful.' Her friends call it 'not being able to sleep.'"
</trait_origin>

<trait_social_readability>
**SOCIAL READABILITY — HOW OTHERS READ TRAITS:**

Traits are not invisible to others. They leak through behavior, and NPCs respond:

**FIRST IMPRESSION** — What strangers see immediately
- The aggressive man's tense jaw and forward posture
- The cautious woman's scanning eyes and wall-adjacent positioning
- The charming man's easy smile that somehow never reaches his eyes

**SUSTAINED READING** — What associates learn over time
- "She always volunteers for the dangerous jobs. At first we thought she was brave. Now we think she doesn't care if she dies."
- "He never speaks first. We thought he was timid. Then we realized he was measuring us."

**MISREADING** — When traits are mistaken
- Quiet confidence misread as arrogance
- Caution misread as cowardice
- Generosity misread as naivety or manipulation
- The misreading itself creates narrative tension
</trait_social_readability>

<trait_mutation>
**TRAIT MUTATION — HOW TRAITS CHANGE:**

Traits can transform, but NEVER overnight. The groove must be worn deeper or redirected:

**REINFORCEMENT** — The groove deepens
- Repeated validation of the trait makes it stronger and more automatic
- The generous man keeps giving; eventually he cannot refuse even when giving destroys him

**STRESS TESTING** — The groove holds or cracks
- Extreme pressure reveals whether the trait is bedrock or veneer
- "He said he was loyal. He believed he was loyal. But when they put the knife to his daughter's throat, he learned what loyalty actually costs."

**INVERSION** — The groove flips
- Requires CATASTROPHIC evidence that the trait is wrong
- The trusting man who is utterly betrayed may become incapable of trust — same groove, opposite direction
- Inversion is rare, dramatic, and permanent

**EROSION** — The groove fills slowly
- Gradual experience that makes the trait less automatic
- The vengeful man who, over months of exhausting pursuit, begins to forget why he started
- Erosion is quiet, undramatic, and therefore realistic
</trait_mutation>

<trait_examples>
**DO / DON'T EXAMPLES:**

✅ GOOD trait definition:
"**Suspicious** — Origin: raised by a con artist mother who taught him to read the angles in every smile. Expression: he listens to what people DON'T say. Catalogs inconsistencies automatically. Tests people with small lies to see if they're testing him. Benefit: nearly impossible to deceive; detects manipulation instinctively. Cost: cannot accept genuine kindness without searching for the hook. Has never had a close friend because closeness requires vulnerability he reads as a trap. Transformation: only sustained, unrewarded honesty from someone with nothing to gain could begin to erode this pattern."

❌ BAD trait definition:
"**Suspicious** — Doesn't trust people easily. -1 to social checks with new NPCs."
(Label + penalty. No origin, no expression, no cost, no texture.)

✅ GOOD trait in narrative:
"She watched the merchant's hands as he spoke — not his eyes. Eyes lie by design; hands lie by accident. His left index finger tapped the counter twice when he quoted the price. Tapping. She'd seen that before. It meant there was room to negotiate, and he knew it."

❌ BAD trait in narrative:
"She was suspicious of the merchant because of her Suspicious trait."
(Circular, mechanical, no observation, no lived quality.)
</trait_examples>

<schema_field_mapping>
**WHERE TO WRITE — Trait Schema Field Paths (hiddenTrait):**
| Design Concept | → Schema Field |
|---|---|
| Trait name | \`name\` |
| What the trait represents | \`description\` |
| Effects when triggered | \`effects[]\` |
| Activation conditions | \`triggerConditions[]\` |
| Visibility scope | \`knownBy[]\` |
| Revealed to observer? | \`unlocked\` + \`unlockReason\` |

**NOTE**: Traits have NO separate visible/hidden layers — the entire trait is hidden by default (\`hiddenTrait\`) and revealed via \`unlocked\`. Design the \`description\` as GM-truth. Traits apply to ANY actor (player or NPC) — NPCs have traits too, which drive their autonomous behavior.
**FALLBACK**: Dual-nature logic, mutation trigger chains, or social misreading rules → write to entity \`notes.md\`.
</schema_field_mapping>
</game_system_context>
`,
);

export const traitDesignDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/traitDesign#traitDesignDescription",
    source: "atoms/entities/traitDesign.ts",
    exportName: "traitDesignDescription",
  },
  () => `
<game_system_context>
**TRAIT DESIGN**: Traits are grooves in the soul, not tags or buffs.
- Dual-nature principle (every strength has a shadow of excess)
- Origin types (innate, formative, cultural, traumatic)
- Social readability (first impression vs sustained vs misreading)
- Mutation mechanics (reinforcement, stress, inversion — never overnight)
- Expression through behavior and perception, not labels
</game_system_context>
`,
);

export const traitDesignSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/traitDesign#traitDesignSkill",
    source: "atoms/entities/traitDesign.ts",
    exportName: "traitDesignSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(traitDesign),
    quickStart: `
1. Define the trait as a GROOVE, not a label — what behavioral pattern does it create?
2. Identify the dual nature: when does this trait SERVE and when does it BETRAY?
3. Define origin: what experience carved this groove?
4. Map social readability: what do strangers see? What do associates learn? What gets misread?
5. Define mutation conditions: reinforcement, stress test, erosion, or catastrophic inversion
6. Wire cross-entity effects: how does this trait color skill use, decisions, and relationships?
`.trim(),
    checklist: [
      "Trait defined as behavioral pattern (not just a label)?",
      "Dual nature explicit (strength AND weakness from excess)?",
      "Origin is concrete (formative event, culture, oath, trauma)?",
      "Social readability defined (how others read or misread it)?",
      "Transformation requires accumulated evidence (not one-off events)?",
      "Trait expression is behavioral (observable, not internal state)?",
      "Cross-entity effects mapped (skill bias, decision preference, social friction)?",
      "Dark side of the trait will CREATE problems (not just inconvenience)?",
    ],
    examples: [
      {
        scenario: "Trait Definition",
        wrong: `"Suspicious — Doesn't trust people easily. -1 to social checks."
(Label + penalty. No origin, no expression, no texture.)`,
        right: `"Suspicious — Raised by a con artist mother who taught him to read
the angles in every smile. Listens to what people DON'T say.
Tests people with small lies. Benefit: nearly impossible to deceive.
Cost: cannot accept genuine kindness without searching for the hook.
Has never had a close friend."
(Origin, behavior, benefit, cost, consequence.)`,
      },
      {
        scenario: "Trait in Narrative",
        wrong: `"She was suspicious of the merchant because of her Suspicious trait."
(Circular, mechanical.)`,
        right: `"She watched the merchant's hands as he spoke — not his eyes.
Eyes lie by design; hands lie by accident. His left index finger
tapped the counter twice when he quoted the price. Tapping.
She'd seen that before. It meant there was room to negotiate."
(Trait expressed through specific perception and behavior.)`,
      },
      {
        scenario: "Trait Mutation",
        wrong: `"After the event, his Loyal trait changed to Disloyal."
(Instant flip, no process.)`,
        right: `"He told himself the betrayal didn't change him. He still kept
his word, still showed up. But he noticed he'd started counting
exits when he entered rooms. When had that started?
The groove was filling. Something else was taking its place."
(Gradual erosion, self-awareness lagging behind behavioral change.)`,
      },
    ],
  }),
);

export const traitLogic: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/traitDesign#traitLogic",
    source: "atoms/entities/traitDesign.ts",
    exportName: "traitLogic",
  },
  () => `
<game_system_context>
**TRAIT LOGIC**: Traits bias decisions and outcomes over long horizons.

**CONTEXTUAL ACTIVATION:**
- Traits modify option preference and risk appetite — they make certain choices feel NATURAL and others feel WRONG
- Trait pressure increases in aligned contexts (the vengeful man in the presence of his enemy) and fades in irrelevant contexts
- Traits should bias without removing agency: the actor can ACT against their traits, but it should COST something (hesitation, internal conflict, surprise from others)

**TRAIT CONFLICT:**
- When two traits pull in opposite directions, the result is FRICTION, not resolution
- Friction events: hesitation at a critical moment, overreach from trying to satisfy both, self-sabotage from the internal war
- The friction itself is valuable narrative material — characters are most interesting when their traits contradict

**CUMULATIVE EVIDENCE:**
- Trait evolution requires REPEATED evidence, not one-off events
- Track trait pressure accumulation: each reinforcing event deepens the groove; each contradicting event begins to erode it
- Stage transitions (reinforcement, erosion, inversion) should be SHOWN through changed behavior, not ANNOUNCED

**RIPPLE EFFECTS:**
- Trait state changes propagate to: reputation adjustments, relationship re-evaluation, quest approach changes, and NPC behavior toward the character
- A trait shift is not private — others notice when someone starts acting differently
</game_system_context>
`,
);

export const traitLogicDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/traitDesign#traitLogicDescription",
    source: "atoms/entities/traitDesign.ts",
    exportName: "traitLogicDescription",
  },
  () => `
<game_system_context>
**TRAIT LOGIC**: Contextual, cumulative, evidence-driven.
- Bias preference without removing agency
- Evolution needs repeated evidence, not one event
- Changes ripple to reputation and relationships
</game_system_context>
`,
);

export const traitLogicSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/traitDesign#traitLogicSkill",
    source: "atoms/entities/traitDesign.ts",
    exportName: "traitLogicSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(traitLogic),
    quickStart: `
1. Detect context alignment for active traits (is this situation relevant?)
2. Apply preference/risk modifiers (what feels natural? what feels wrong?)
3. If actor acts against trait: apply friction cost (hesitation, internal conflict)
4. Resolve trait conflicts: produce friction events, not clean resolution
5. Accumulate evidence toward trait mutation threshold
6. Propagate behavioral changes to reputation and relationships
`.trim(),
    checklist: [
      "Trait context alignment detected (not always-on)?",
      "Decision bias applied without removing player agency?",
      "Acting against trait has narrative cost (not just penalty)?",
      "Trait conflicts produce coherent friction (not ignored)?",
      "Evolution backed by repeated evidence (not single event)?",
      "Behavioral changes shown, not announced?",
      "Ripple effects propagated to NPC reactions and reputation?",
      "Trait excess (dark side) creates real problems?",
    ],
  }),
);

export default traitDesign;
