/**
 * ============================================================================
 * Entity Design Atom: Skill Design Context
 * ============================================================================
 *
 * Skill 设计上下文 — 用于 StoryOutline 和运行时技能创建。
 * 定义创建 Skill 时的设计哲学和质量要求。
 *
 * A skill is not a button you press — it is a language the body speaks.
 * The swordsman does not "use Swordsmanship Level 3." His wrist remembers
 * ten thousand cuts, and the blade finds the gap between the ribs
 * because the body knows where ribs end before the mind does.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const skillDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/skillDesign#skillDesign",
    source: "atoms/entities/skillDesign.ts",
    exportName: "skillDesign",
  },
  () => `
<game_system_context>
**SKILL DESIGN FOR REALITY RENDERING ENGINE:**

Skills are not menu items. They are the crystallized residue of years lived a certain way — the locksmith's fingers that feel tumblers like a lover's pulse, the herbalist's nose that reads a forest floor like a newspaper. A skill is a worldview made functional. It determines not just what a character CAN do, but what they NOTICE, what they INSTINCTIVELY REACH FOR, and what they are BLIND TO because of it.

<skill_philosophy>
**THE ICEBERG PRINCIPLE OF SKILLS:**

The visible part of a skill is the action. The invisible part — vastly larger — is the perceptual filter it installs. A tracker does not "use Tracking." They walk into a clearing and cannot NOT see the bent grass, the scuffed bark, the silence where birdsong should be. The skill has rewired their senses.

**KEY PRINCIPLE**: Every skill is simultaneously a CAPABILITY and a LENS.
- Capability: what the character can DO
- Lens: what the character PERCEIVES that others miss
- Blind spot: what the character OVERLOOKS because the lens is pointed elsewhere

**SKILLS ARE WORLDVIEW PROJECTIONS:**
- A soldier's "Tactical Assessment" makes them see a marketplace as terrain — chokepoints, lines of retreat, high ground
- A merchant's "Appraisal Eye" makes them see the same marketplace as a web of margins — profit, loss, counterfeit
- A thief's "Street Sense" makes them see the same marketplace as a map of pockets, distractions, and exits
- All three are correct. None are complete. That is the point.
</skill_philosophy>

<skill_anatomy>
**ANATOMY OF A WELL-DESIGNED SKILL:**

**1. TRIGGER CONTEXT** — When does this skill activate?
- Physical context: what body state, position, tools are needed?
- Environmental context: what setting enables or disables it?
- Social context: are witnesses a problem? Is trust required?
- Knowledge context: what must the character already know?

**2. CAPABILITY BOUNDARY** — The edge where competence ends
- Hard limits: what this skill absolutely CANNOT do (a locksmith cannot pick a warded lock with thieves' tools designed for pin tumblers)
- Soft limits: what it CAN attempt but with degraded reliability (a swordsman can fight in mud, but footwork suffers)
- Adjacent reach: what related actions the skill partially covers (a blacksmith can attempt crude surgery — they know anatomy of metal, and flesh is not so different)

**3. FAILURE SIGNATURE** — How this skill fails
- Every skill fails in a characteristic way. A scholar's negotiation fails with condescension. A soldier's diplomacy fails with intimidation they didn't intend.
- Failure should reveal character, not just produce bad outcomes.

**4. PROGRESSION PATH** — How skills deepen over time
| Stage | Description | Narrative Signal |
|-------|-------------|-----------------|
| **Novice** | Conscious effort, frequent errors | "You fumble with the lockpick, the mechanism resisting your uncertain touch" |
| **Competent** | Reliable under normal conditions | "The lock yields to your practiced hands" |
| **Proficient** | Adapted instinct, handles complications | "Your fingers read the lock's internal geography like braille" |
| **Expert** | Teaches others, innovates techniques | "You feel a mechanism you've never encountered — and your hands invent a solution before your mind names the problem" |
| **Master** | The skill is invisible, like breathing | "The lock opens. You're not sure when your hands moved." |

**5. COST & TRACE** — Skills leave marks
- Physical: fatigue, calluses, repetitive strain, resource consumption
- Social: witnesses remember demonstrations; reputation spreads
- Material: tools wear, reagents deplete, ammunition diminishes
- Temporal: skilled work takes time; rushing degrades quality
</skill_anatomy>

<skill_cross_entity>
**CROSS-ENTITY INTERACTIONS:**

Skills do not exist in isolation. They couple with every other entity type:

| Entity | Interaction |
|--------|-------------|
| **Attributes** | Physical attributes gate physical skills; mental attributes gate cognitive skills. Low Endurance degrades any sustained skill. |
| **Conditions** | Broken hand disables fine manipulation. Fever clouds judgment. Intoxication loosens social inhibition (sometimes a bonus). |
| **Traits** | "Perfectionist" improves crafting but slows it. "Reckless" enables desperate skill uses but increases failure consequences. |
| **Items** | Master-grade tools extend capability boundaries. Improvised tools compress them. Some skills REQUIRE specific tools. |
| **Knowledge** | You cannot pick a lock you don't know exists. You cannot brew a potion from a formula you haven't seen. Knowledge gates skill APPLICATION, not skill possession. |
| **Reputation** | Demonstrated mastery changes how NPCs engage. A known swordsman is challenged or avoided, never ignored. |
</skill_cross_entity>

<skill_examples>
**DO / DON'T EXAMPLES:**

✅ GOOD skill definition:
"**Forgery** — Years apprenticed to a scribe gave you the eye for letterforms and the hand to replicate them. You can reproduce signatures, seals, and documents given a sample and adequate materials. Your forgeries pass casual inspection reliably; expert scrutiny depends on time invested and material quality. You cannot forge magical wards, languages you don't read, or the voice of a known speaker. Using this skill requires writing implements, reference material, and uninterrupted time. Each use risks: discovery (if the forgery is examined by an expert who knows the original), material evidence (drafts, ink stains on your fingers), and reputation damage (once exposed, your word is worthless)."

❌ BAD skill definition:
"**Forgery Level 3** — Can forge documents. Success rate: 75%."
(No context, no limits, no cost, no narrative texture.)

✅ GOOD skill in narrative:
"She studied the merchant's signature — the confident downstroke of the 'K', the way the ink pooled where the nib paused at the cross of the 't'. Her fingers already knew the rhythm. Three practice runs on scrap paper, each closer than the last. The fourth was the one she'd use. She flexed her cramping hand and blew on the ink."

❌ BAD skill in narrative:
"She used her Forgery skill to forge the document. It was successful."
(No process, no cost, no sensory reality.)
</skill_examples>

<schema_field_mapping>
**WHERE TO WRITE — Skill Schema Field Paths:**
| Design Concept | → Schema Field |
|---|---|
| Public description & known effects | \`visible.description\`, \`visible.knownEffects[]\` |
| True nature, hidden power | \`hidden.trueDescription\` |
| Undiscovered effects | \`hidden.hiddenEffects[]\` |
| Hidden costs, drawbacks | \`hidden.drawbacks[]\` |
| Proficiency stage | \`level\` (e.g. Novice, Competent, Master) |
| Skill category | \`category\` |
| Visibility scope | \`knownBy[]\` (who knows this skill exists) |
| Unlock trigger | \`unlocked\` = true + \`unlockReason\` (evidence) |
| Internal planning notes | \`notes\` — or entity \`notes.md\` for extended context |

**FALLBACK**: Progression conditions, cross-entity coupling logic, or narrative rendering rules that don't fit above → write to the skill's \`notes\` field or \`notes.md\`.

**ACTOR SCOPE**: Skills belong to ANY actor (player or NPC). NPCs have their own skill sets that drive autonomous behavior.
</schema_field_mapping>
</game_system_context>
`,
);

export const skillDesignDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/skillDesign#skillDesignDescription",
    source: "atoms/entities/skillDesign.ts",
    exportName: "skillDesignDescription",
  },
  () => `
<game_system_context>
**SKILL DESIGN**: Skills are worldview projections, not menu buttons.
- Trigger context (prerequisites: body, environment, knowledge)
- Capability boundary (hard limits, adjacent reach)
- Failure signature (how failure reveals character)
- Cost & trace (fatigue, witnesses, tool wear, time)
- Cross-entity coupling (attributes gate, conditions constrain, items extend)
</game_system_context>
`,
);

export const skillDesignSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/skillDesign#skillDesignSkill",
    source: "atoms/entities/skillDesign.ts",
    exportName: "skillDesignSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(skillDesign),
    quickStart: `
1. Define the skill as LENS + CAPABILITY (what does the character perceive differently?)
2. Set trigger context: physical, environmental, social, and knowledge prerequisites
3. Draw capability boundary: hard limits, soft limits, and adjacent reach
4. Define failure signature: how does this skill characteristically fail?
5. Map progression path: novice → competent → proficient → expert → master
6. Define cost & trace: what marks does using this skill leave?
7. Wire cross-entity interactions: attributes, conditions, traits, items, knowledge
`.trim(),
    checklist: [
      "Skill is defined as both CAPABILITY and perceptual LENS?",
      "Trigger context includes physical/environmental/social prerequisites?",
      "Hard limits explicit (what it CANNOT do)?",
      "Failure signature reveals character (not just 'failed')?",
      "Progression stage has narrative signals (not just numbers)?",
      "Usage costs are concrete (fatigue, materials, time, witnesses)?",
      "Cross-entity coupling defined (attributes/conditions/traits/items)?",
      "Knowledge prerequisites gate application, not possession?",
    ],
    examples: [
      {
        scenario: "Skill Definition",
        wrong: `"Forgery Level 3 — Can forge documents. Success rate: 75%."
(No context, no limits, no cost, no narrative texture.)`,
        right: `"Forgery — Years apprenticed to a scribe gave you the eye for letterforms
and the hand to replicate them. You can reproduce signatures given a sample
and adequate materials. Expert scrutiny depends on time invested. Cannot forge
magical wards or languages you don't read. Requires writing implements,
reference material, and uninterrupted time. Risks: discovery, ink stains,
reputation damage if exposed."
(Context, limits, cost, consequences.)`,
      },
      {
        scenario: "Skill in Narrative",
        wrong: `"She used her Forgery skill to forge the document. It was successful."
(No process, no cost, no sensory reality.)`,
        right: `"She studied the merchant's signature — the confident downstroke
of the 'K', the way the ink pooled at the cross of the 't'. Her fingers
already knew the rhythm. Three practice runs on scrap paper.
She flexed her cramping hand and blew on the ink."
(Process visible, cost felt, senses engaged.)`,
      },
      {
        scenario: "Skill as Perceptual Lens",
        wrong: `"The soldier entered the marketplace."
(Skill doesn't filter perception.)`,
        right: `"The soldier entered the marketplace and immediately catalogued:
two chokepoints at the east and west arches, high ground on the fountain
steps, a cart that could serve as cover. The spice merchant's awning
blocked sightlines from the rooftops. He relaxed slightly."
(Tactical Assessment skill rewires what the character NOTICES.)`,
      },
    ],
  }),
);

export const skillLogic: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/skillDesign#skillLogic",
    source: "atoms/entities/skillDesign.ts",
    exportName: "skillLogic",
  },
  () => `
<game_system_context>
**SKILL LOGIC**: Skill activation and growth are evidence-bound.

**ACTIVATION PROTOCOL:**
- Preconditions must be met: bodily state, equipment, environment, knowledge
- Outcome quality scales with attribute support and degrades with condition penalties
- Rushed execution compresses quality; patient execution costs time the scene may not grant
- Context modifiers stack: a locksmith with broken fingers, in darkness, under time pressure, is not the same locksmith in their workshop

**TRACE GENERATION:**
- Every skill use produces traces: fatigue, witnesses, material evidence, tool wear, heat/attention
- Traces persist and can become evidence, reputation, or plot complications
- Exceptional successes and spectacular failures generate stronger traces than routine use

**GROWTH & REGRESSION:**
- Growth is incremental: repeated validated use under varied conditions deepens mastery
- Instruction accelerates growth but requires trust, time, and a qualified teacher
- Breakthrough moments (using a skill under extreme pressure with novel constraints) can catalyze stage transitions
- Regression from trauma, disuse, or conflicting conditions is possible and should be narrated (the pianist whose fingers were broken plays differently after they heal)
- Stage transitions should be SHOWN through changed narrative rendering, not TOLD through level-up announcements

**FAILURE FORWARD:**
- Failed skill use must still advance the scene (reveal information, create complications, shift NPC attitudes)
- The nature of failure reflects the skill level: novices fail from ignorance, experts fail from overconfidence or impossible conditions
</game_system_context>
`,
);

export const skillLogicDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/skillDesign#skillLogicDescription",
    source: "atoms/entities/skillDesign.ts",
    exportName: "skillLogicDescription",
  },
  () => `
<game_system_context>
**SKILL LOGIC**: Activation and growth follow preconditions.
- Check: body state, equipment, environment
- Trace: fatigue, witnesses, tool wear
- Growth: incremental, evidence-gated
</game_system_context>
`,
);

export const skillLogicSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/skillDesign#skillLogicSkill",
    source: "atoms/entities/skillDesign.ts",
    exportName: "skillLogicSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(skillLogic),
    quickStart: `
1. Validate activation preconditions (body, equipment, environment, knowledge)
2. Compute outcome quality from attribute support and condition penalties
3. Generate traces (fatigue, witnesses, material evidence, tool wear)
4. On success: advance scene, record trace, evaluate growth
5. On failure: advance scene differently, reveal information through failure mode
6. Update progression state if evidence threshold met
`.trim(),
    checklist: [
      "Activation preconditions checked (not just 'has skill')?",
      "Context modifiers applied (conditions, tools, pressure)?",
      "Outcome quality reflects attribute support?",
      "Traces generated (fatigue, witnesses, evidence)?",
      "Failure advances scene (not just 'nothing happens')?",
      "Failure mode matches skill level (novice ≠ expert failure)?",
      "Growth evidence accumulated toward stage transition?",
      "Stage transition shown in narrative (not announced)?",
    ],
    examples: [
      {
        scenario: "Skill Activation Under Pressure",
        wrong: `"He picked the lock. Success."
(No preconditions, no modifiers, no trace.)`,
        right: `"His hands were shaking — the guard's footsteps echoed
three corridors away and closing. The first pick slipped. Second attempt:
he forced himself to breathe, let his fingers read the tumblers.
The lock clicked. He left the pick in the mechanism — no time to
retrieve it. Evidence. But he was through."
(Preconditions: time pressure. Modifiers: shaking hands.
Trace: abandoned pick. Cost: evidence left behind.)`,
      },
      {
        scenario: "Skill Growth Shown Not Told",
        wrong: `"After practice, his Swordsmanship leveled up to 4."
(Game UI, not narrative.)`,
        right: `"He realized, mid-parry, that he'd stopped thinking about his
footwork. His body had memorized the dance. When had that happened?
Last week he'd counted steps. Now the steps counted themselves."
(Internal shift narrated. Player infers the growth.)`,
      },
    ],
  }),
);

export default skillDesign;
