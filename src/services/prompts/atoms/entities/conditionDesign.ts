/**
 * ============================================================================
 * Entity Design Atom: Condition Design Context
 * ============================================================================
 *
 * Condition 设计上下文 — 用于状态创建和运行时条件管理。
 * 定义创建 Condition 时的设计哲学和质量要求。
 *
 * A condition is not a debuff icon — it is the body's memory of what happened.
 * The fever remembers the swamp. The limp remembers the fall.
 * The tremor in the hands remembers the thing they did in the dark.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const conditionDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/conditionDesign#conditionDesign",
    source: "atoms/entities/conditionDesign.ts",
    exportName: "conditionDesign",
  },
  () => `
<game_system_context>
**CONDITION DESIGN FOR REALITY RENDERING ENGINE:**

Conditions are the body's testimony. They are what happens AFTER the event — the lingering truth that the protagonist carries forward into every subsequent scene. A wound is not "-5 HP." It is the way you favor your left side when you walk, the sharp intake of breath when you reach for something on a high shelf, the bloodstain on your shirt that makes the innkeeper's eyes widen.

<condition_philosophy>
**SCARS AS MEMORY — THE ONTOLOGY OF CONDITIONS:**

Conditions exist on a spectrum from acute crisis to chronic companion:

**ACUTE** → The wound is fresh. The body screams. Everything is organized around THIS.
**SUBACUTE** → The crisis has passed but the residue remains. You can function, but the body reminds you.
**CHRONIC** → The condition has become part of you. You've adapted, compensated — but the adaptation itself creates new patterns.
**PERMANENT** → The old you is gone. This is who you are now. The scar is a feature, not a bug.

**KEY PRINCIPLE**: Conditions are not numbers that go up and down. They are NARRATIVE PRESSURES that reshape what the character does, how they do it, and what it costs.
</condition_philosophy>

<condition_categories>
**CONDITION CATEGORIES:**

**PHYSICAL** — The body's complaints
- Wounds (laceration, fracture, burn, puncture — each with its own vocabulary of pain)
- Illness (fever, infection, poisoning — the body fighting itself)
- Exhaustion (fatigue, sleep deprivation, overexertion — the body's honest accounting)
- Deprivation (hunger, thirst, cold, heat — the environment's demands unpaid)

**PSYCHOLOGICAL** — The mind's weather
- Trauma (flashback triggers, hypervigilance, emotional numbness)
- Stress (anxiety, paranoia, decision fatigue — the mind grinding its gears)
- Grief (the weight that makes everything slower, quieter, further away)
- Obsession (the thought that colonizes every silence)

**SOCIAL** — The world's verdict
- Reputation damage (suspicion, distrust, exile)
- Debt (obligation that restricts freedom of action)
- Oath-bound (sacred commitment that constrains choice)
- Marked (bounty, curse-mark, brand — visible signs that change how others react)

**SUPERNATURAL** — Beyond the body's jurisdiction
- Curses (progressive, conditional, dormant)
- Corruption (gradual transformation, alien influence)
- Possession (shared or stolen agency)
- Divine attention (blessing that weighs, gaze that judges)
</condition_categories>

<condition_anatomy>
**ANATOMY OF A WELL-DESIGNED CONDITION:**

**1. SOURCE VECTOR** — How it was acquired
- Not just "was poisoned" but "drank from the well in the abandoned village — the water tasted of copper and something sweeter"
- The source should be traceable, memorable, and potentially plot-relevant

**2. SYMPTOM PROFILE** — How it manifests
| Layer | Description | Example |
|-------|-------------|---------|
| **Visible** | What others can see | "Your hands shake when you hold them still" |
| **Felt** | What the character experiences | "A grinding ache behind your left eye that worsens with bright light" |
| **Behavioral** | What it forces or prevents | "You cannot sleep on your right side. You flinch at sudden sounds." |
| **Hidden** | What progresses unseen | "The numbness has spread from your fingertips to your wrist" |

**3. CONSTRAINT PROFILE** — What it costs
- What actions become harder, slower, or impossible?
- What decisions are forced (must rest, must treat, must hide)?
- What resources does management consume?
- How does it interact with existing skills and attributes?

**4. ESCALATION PATH** — What happens if ignored
- Stage 1: Inconvenience (can be pushed through with willpower)
- Stage 2: Impairment (meaningful penalties, visible degradation)
- Stage 3: Crisis (forced decision point — treat NOW or face permanent consequences)
- Stage 4: Transformation (the condition becomes permanent, reshaping identity)

**5. RESOLUTION ROUTES** — How it ends
- Treatment (medicine, surgery, magic — each with its own cost and reliability)
- Time (the body heals, but slowly, and sometimes wrong)
- Sacrifice (what must be given up to be free of it?)
- Adaptation (not cured, but mastered — the limp becomes a swagger)
- Acceptance (the condition is no longer fought; it is integrated)
</condition_anatomy>

<condition_examples>
**DO / DON'T EXAMPLES:**

✅ GOOD condition:
"**Fractured Ribs (Left Side)** — Source: thrown against the stone wall by the golem. Symptoms: sharp pain on deep breath, cannot twist torso fully, sleeping is an ordeal of finding the one position that doesn't ignite the nerves. Constraints: cannot wear heavy armor (pressure is unbearable), climbing is possible but costs twice the effort, laughing or coughing is a special kind of punishment. Untreated escalation: risk of pneumonia from shallow breathing. Resolution: proper binding and 2-3 weeks of restricted movement, or magical healing (if available and affordable)."

❌ BAD condition:
"Injured — -2 to physical checks."
(No source, no texture, no narrative weight, no escalation.)

✅ GOOD psychological condition:
"**Night Terrors (The Burning)** — Source: survived the fire that killed everyone else in the tavern. Symptoms: wakes screaming, drenched in sweat that smells of smoke (it doesn't, but he swears it does). Cannot tolerate enclosed spaces with open flames — will make excuses to leave, then bolt if excuses fail. Fire in combat triggers freeze response for a critical heartbeat before training overrides instinct. The freeze is getting shorter. But it's still there."

❌ BAD psychological condition:
"PTSD — Gets scared sometimes."
(Label, not experience. No specificity, no behavioral consequence.)

✅ GOOD condition escalation:
"Day 1: The cut is clean and shallow. You barely notice it. Day 3: The edges are red, warm to the touch. Day 5: The red has spread. Moving the arm produces a deep, wet ache. Day 7: You wake shivering though the room is warm. Your vision swims when you stand. Day 9: The herbalist takes one look and goes pale. 'Why didn't you come sooner?' she whispers."

❌ BAD condition escalation:
"Wound worsens over time if untreated. -1 per day."
(Mechanical, no narrative, no sensory reality.)
</condition_examples>

<schema_field_mapping>
**WHERE TO WRITE — Condition Schema Field Paths:**
| Design Concept | → Schema Field |
|---|---|
| Observable symptoms | \`visible.description\` |
| Apparent severity | \`visible.perceivedSeverity\` |
| True cause (GM-only) | \`hidden.trueCause\` |
| True severity | \`hidden.actualSeverity\` |
| How it evolves over time | \`hidden.progression\` |
| Cure or removal method | \`hidden.cure\` |
| Visible effects | \`effects.visible[]\` |
| Hidden effects (GM-only) | \`effects.hidden[]\` |
| Category | \`type\` (wound, poison, buff, mental, curse, etc.) |
| Severity label | \`severity\` (Mild, Moderate, Severe) |
| Onset time | \`startTime\` |
| Visibility scope | \`knownBy[]\` |
| Unlock trigger | \`unlocked\` = true + \`unlockReason\` |

**FALLBACK**: Escalation chains, cross-condition interactions, or narrative rendering cues → write to entity \`notes.md\`.

**ACTOR SCOPE**: Conditions affect ANY actor (player or NPC). NPCs can be wounded, poisoned, cursed, etc.
</schema_field_mapping>
</game_system_context>
`,
);

export const conditionDesignDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/conditionDesign#conditionDesignDescription",
    source: "atoms/entities/conditionDesign.ts",
    exportName: "conditionDesignDescription",
  },
  () => `
<game_system_context>
**CONDITION DESIGN**: Conditions are the body's testimony, not debuff icons.
- Categories (physical, psychological, social, supernatural)
- Source vector (traceable, plot-relevant origin)
- Symptom layers (visible, felt, behavioral, hidden)
- Escalation path (inconvenience → impairment → crisis → transformation)
- Resolution routes (treatment, time, sacrifice, adaptation)
</game_system_context>
`,
);

export const conditionDesignSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/conditionDesign#conditionDesignSkill",
    source: "atoms/entities/conditionDesign.ts",
    exportName: "conditionDesignSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(conditionDesign),
    quickStart: `
1. Define source vector: HOW was this condition acquired? (specific, traceable)
2. Build symptom profile: visible, felt, behavioral, and hidden layers
3. Define constraint profile: what actions become harder/impossible?
4. Map escalation path: inconvenience → impairment → crisis → transformation
5. Define resolution routes: treatment, time, sacrifice, adaptation, acceptance
6. Wire cross-entity effects: skills degraded, attributes altered, social perception changed
`.trim(),
    checklist: [
      "Source is specific and traceable (not just 'was injured')?",
      "Symptoms include observable behavioral constraints?",
      "Condition shown through sensory detail (not stat penalties)?",
      "Escalation path defined with clear stage transitions?",
      "Resolution routes include cost and reliability?",
      "Cross-entity effects defined (skills/attributes/social)?",
      "Psychological conditions have specific triggers (not vague)?",
      "Chronic/permanent conditions reshape identity (not just persist)?",
    ],
    examples: [
      {
        scenario: "Physical Condition",
        wrong: `"Injured — -2 to physical checks."
(No source, no texture, no narrative weight.)`,
        right: `"Fractured Ribs (Left Side) — thrown against stone wall by the golem.
Sharp pain on deep breath. Cannot twist torso fully. Sleeping is
an ordeal of finding the one position that doesn't ignite the nerves.
Cannot wear heavy armor. Climbing costs twice the effort.
Risk of pneumonia if untreated."
(Source, sensation, constraint, escalation.)`,
      },
      {
        scenario: "Psychological Condition",
        wrong: `"PTSD — Gets scared sometimes."
(Label, not experience.)`,
        right: `"Night Terrors (The Burning) — survived the fire that killed everyone
else. Wakes screaming, drenched in sweat that smells of smoke
(it doesn't, but he swears it does). Cannot tolerate enclosed spaces
with open flames. Fire in combat triggers freeze response for a
critical heartbeat before training overrides instinct."
(Specific trigger, specific behavior, specific cost.)`,
      },
      {
        scenario: "Condition Escalation",
        wrong: `"Wound worsens over time. -1 per day."
(Mechanical, no narrative.)`,
        right: `"Day 1: The cut is clean and shallow. Day 3: The edges are red,
warm to the touch. Day 5: Moving the arm produces a deep, wet ache.
Day 7: You wake shivering though the room is warm. Day 9:
The herbalist goes pale. 'Why didn't you come sooner?'"
(Progressive, sensory, creates urgency.)`,
      },
    ],
  }),
);

export const conditionLogic: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/conditionDesign#conditionLogic",
    source: "atoms/entities/conditionDesign.ts",
    exportName: "conditionLogic",
  },
  () => `
<game_system_context>
**CONDITION LOGIC**: Conditions evolve by triggers, treatment, and time.

**TICK PROGRESSION:**
- Conditions advance through context: rest accelerates healing, exertion accelerates degradation
- Environmental factors apply: cold worsens respiratory conditions, humidity softens fever
- Stress compounds psychological conditions; safety allows processing
- Multiple conditions interact: exhaustion weakens immune response, pain disrupts sleep, poor sleep impairs judgment

**EFFECT APPLICATION:**
- Apply constraint modifiers to skill checks, movement, dialogue, and judgment
- Conditions modify OPTIONS, not just outcomes — a broken arm doesn't make climbing "harder," it makes the character choose whether to climb at all
- Social perception shifts: visible conditions trigger pity, disgust, fear, or predatory interest in NPCs
- Decision-making under condition pressure: pain makes short-term relief attractive; fever makes complex reasoning unreliable

**STACKING & INTERACTION:**
- Multiple conditions compound non-linearly (exhaustion + wound + cold ≠ sum of parts)
- Some conditions mask others (adrenaline hides pain; shock hides grief)
- Treatment for one condition may worsen another (painkillers cause drowsiness; stimulants worsen anxiety)

**REMISSION, RELAPSE & TRANSFORMATION:**
- Remission is not instant: "better" does not mean "the same as before"
- Relapse conditions: healed injuries re-open under specific stress
- Chronic conversion: acute conditions that persist too long become part of identity
- Recovery leaves its own marks: the healed bone is stronger but aches before rain
</game_system_context>
`,
);

export const conditionLogicDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/conditionDesign#conditionLogicDescription",
    source: "atoms/entities/conditionDesign.ts",
    exportName: "conditionLogicDescription",
  },
  () => `
<game_system_context>
**CONDITION LOGIC**: Advance by triggers; resolve by cost.
- Tick by context (rest heals, exertion worsens)
- Modify available options, not just outcomes
- Recovery leaves its own marks
</game_system_context>
`,
);

export const conditionLogicSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/conditionDesign#conditionLogicSkill",
    source: "atoms/entities/conditionDesign.ts",
    exportName: "conditionLogicSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(conditionLogic),
    quickStart: `
1. Advance condition clock from scene context (time, exertion, environment, stress)
2. Apply constraint modifiers: what options are removed or degraded?
3. Resolve stacking and interaction with other active conditions
4. Apply treatment/resolution outcomes with realistic timelines
5. Check for chronic conversion if acute condition persists too long
6. Propagate social/quest/relationship side effects
`.trim(),
    checklist: [
      "Condition clock advanced from concrete context (not arbitrary)?",
      "Constraints modify options, not just success rates?",
      "Multiple condition interactions handled (compounding, masking)?",
      "Treatment side effects considered (painkillers cause drowsiness)?",
      "Remission is gradual (not instant 'cured')?",
      "Relapse conditions defined for healed injuries?",
      "Social perception updated (NPCs react to visible conditions)?",
      "Quest pace and available actions adjusted for condition pressure?",
    ],
  }),
);

export default conditionDesign;
