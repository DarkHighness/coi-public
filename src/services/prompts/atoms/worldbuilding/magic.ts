/**
 * ============================================================================
 * Worldbuilding Atom: Magic Systems
 * ============================================================================
 *
 * Magic 设计上下文 - 定义魔法系统的设计哲学。
 * 涵盖：成本框架、限制设计、社会整合、失败模式。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

/**
 * Magic Systems - 完整版
 */
export const magicSystem: Atom<void> = () => `
<worldbuilding_context>
**MAGIC SYSTEM DESIGN:**

Magic without limits isn't magic—it's wish fulfillment.
The best magic systems create drama through constraints.

<cost_framework>
**COST FRAMEWORK** (Magic always costs something):

**PERSONAL COSTS:**
| Cost Type | Example | Narrative Effect |
|-----------|---------|------------------|
| **FATIGUE** | Each spell drains stamina | Forces rest, creates vulnerability windows |
| **PAIN** | Magic burns the caster | Creates visible toll, discourages overuse |
| **LIFESPAN** | Shorten your life per cast | Tragic trade-offs, aging mages |
| **MEMORY** | Forget something to remember the spell | Identity erosion, lost loved ones |
| **SANITY** | See things that shouldn't be seen | Unreliable narrator, creeping madness |
| **MORTALITY** | Lose a piece of your soul | Slow descent, point of no return |

**MATERIAL COSTS:**
| Cost Type | Example | Narrative Effect |
|-----------|---------|------------------|
| **COMPONENTS** | Rare herbs, monster parts | Creates quests, economics |
| **SACRIFICE** | Blood, life, precious objects | Moral weight, hard choices |
| **LOCATION** | Must be cast at specific place | Journey requirement, territory control |
| **TIME** | Hours/days of preparation | Planning matters, interruption risk |
| **TOOLS** | Wand, circle, focus object | Equipment dependencies, theft risk |

**SOCIAL COSTS:**
| Cost Type | Example | Narrative Effect |
|-----------|---------|------------------|
| **DEBT** | Owe the spirit/demon/god | Obligations come due |
| **REPUTATION** | Mark of the witch | Social consequences |
| **SECRECY** | Must hide practice | Double life tension |
| **OBLIGATION** | Serve your master/order | Chain of command |

**COST QUESTIONS:**
- What does this spell cost the caster?
- Can the cost be delayed? Transferred? Avoided?
- What happens if you can't pay?
- Who benefits from the cost? (Gods, spirits, the world itself?)
</cost_framework>

<limitation_design>
**LIMITATION DESIGN** (Why isn't magic solving everything?):

**RARITY LIMITATIONS:**
- Few can do it (bloodline, training, gift)
- Knowledge is lost/forbidden/hoarded
- Components are rare/expensive/controlled
- Tools are unique/irreplaceable

**CAPABILITY LIMITATIONS:**
- Can't affect certain things (iron, running water, consecrated ground)
- Can't be used for certain purposes (killing, creation, time)
- Effects are imprecise (wish corruption, unintended consequences)
- Power scales poorly (small effects easy, large effects catastrophic)

**SITUATIONAL LIMITATIONS:**
- Moon phase, time of day, alignment of stars
- Emotional state required (rage, love, despair)
- Physical requirements (hands free, voice clear, standing still)
- Environmental requirements (outdoors, underground, near water)

**SOCIAL LIMITATIONS:**
- Illegal in most places
- Tracked by authorities
- Hunted by organizations
- Corrupting to relationships

**THE GANDALF PROBLEM:**
Why doesn't the powerful wizard just solve everything?
Good answers:
- He has bigger problems elsewhere
- His power has specific limitations
- Using power has terrible costs
- He's bound by rules/oaths/debts
- He's being watched by something worse
</limitation_design>

<magic_ecology>
**MAGIC ECOLOGY** (How magic affects the world):

**ENCHANTED ITEMS:**
- How common? (Every household vs legendary artifacts)
- How long do they last? (Eternal vs gradual fade)
- Can they be made now? (Lost art vs ongoing craft)
- What happens when they break?

**MAGICAL CREATURES:**
- Where did they come from? (Evolution, creation, corruption)
- Can they be understood? (Intelligence, motivations)
- What do they need to survive?
- How do mundane creatures adapt to them?

**CORRUPTED LANDS:**
- What happens to land exposed to magic?
- Are effects permanent? Reversible?
- Do they spread? How?
- What lives there now?

**MAGICAL RESOURCES:**
- What natural resources are magical?
- Who controls them?
- What happens when they run out?
- Can they be synthesized?

**LAYERED REALITY:**
- Are there other planes/dimensions?
- How do they interact with the mundane world?
- What comes through when barriers weaken?
- What happens to the dead?
</magic_ecology>

<social_integration>
**SOCIAL INTEGRATION** (How society handles magic):

**SOCIAL STRUCTURES:**
| Model | Description | Conflict Source |
|-------|-------------|-----------------|
| **GUILD** | Licensed mages, regulated practice | Unlicensed magic, guild corruption |
| **PERSECUTION** | Magic is evil, practitioners hunted | Hidden practitioners, witch hunts |
| **REVERENCE** | Mages are priests/prophets | Religious schisms, false prophets |
| **COMMERCIALIZATION** | Magic is a service industry | Class divide, magical debt |
| **INTEGRATION** | Magic is like any other skill | Mundane resentment, magical elitism |
| **SECRECY** | Magic exists but is hidden | Masquerade maintenance, exposure risks |

**POWER DYNAMICS:**
- Do mages rule? Why/why not?
- How do mundanes protect themselves?
- What keeps magical and mundane in balance?
- What would upset that balance?

**EDUCATION & TRANSMISSION:**
- How is magic learned? (Schools, apprenticeship, self-taught)
- Who decides who gets taught?
- What happens to those with talent but no training?
- Can talent be identified? Hidden? Suppressed?
</social_integration>

<detection_countermeasures>
**DETECTION & COUNTERMEASURES:**

**DETECTION:**
- Can magic be sensed? (By everyone? Trained individuals? Items?)
- Can it be tracked after the fact? (Magical forensics)
- Are there telltale signs? (Smell, sound, visual)
- Can detection be fooled?

**COUNTERMEASURES:**
- Can magic be blocked? (Wards, materials, conditions)
- Can it be dispelled? (During casting? After?)
- Can it be absorbed? Redirected?
- What is the countermeasure's cost?

**MAGICAL ARMS RACE:**
- What beats what?
- Are there absolute defenses? Absolute attacks?
- How do practitioners innovate?
- What happens when new magic appears?
</detection_countermeasures>

<failure_modes>
**FAILURE MODES** (What happens when magic goes wrong):

**FAILURE TYPES:**
| Type | Description | Narrative Use |
|------|-------------|---------------|
| **FIZZLE** | Nothing happens, resources wasted | Resource tension |
| **BACKFIRE** | Effect hits caster instead | Danger of overreach |
| **CORRUPTION** | Effect works but is tainted | Moral compromise |
| **ESCALATION** | Effect is too strong | Collateral damage |
| **ATTRACTION** | Something notices your magic | External threat |
| **DEBT** | Effect works but incurs obligation | Future complication |
| **TRANSFORMATION** | Caster is changed | Body horror, identity loss |

**FAILURE TRIGGERS:**
- Interrupted casting
- Wrong components
- Emotional instability
- External interference
- Insufficient power
- Forbidden target
- Divine displeasure

**CRITICAL FAILURES:**
- What's the worst that can happen?
- Are some failures unrecoverable?
- What precautions do experienced mages take?
- What warnings do they give students?
</failure_modes>

<learning_progression>
**LEARNING & PROGRESSION:**

**HOW IS MAGIC LEARNED?**
| Method | Pros | Cons |
|--------|------|------|
| **FORMAL SCHOOL** | Structured, safe, resources | Slow, expensive, controlled |
| **APPRENTICESHIP** | Personal attention, practical | Dependent on master, narrow |
| **SELF-TAUGHT** | Freedom, speed | Dangerous, gaps, isolation |
| **INNATE/AWAKENING** | No training needed | Uncontrolled, overwhelming |
| **PACT/GRANTED** | Immediate power | Obligations, not yours |
| **STOLEN/FORBIDDEN** | Power others can't get | Hunted, corrupted |

**PROGRESSION MILESTONES:**
- What can a novice do?
- What separates journeyman from master?
- What does true mastery look like?
- Is there a ceiling? What's beyond it?

**THE PRICE OF MASTERY:**
- What do masters sacrifice to get there?
- Are they still human?
- Would they do it again?
- What do they regret?
</learning_progression>
</worldbuilding_context>
`;

/**
 * Magic systems primer (system-prompt safe).
 */
export const magicSystemPrimer: Atom<void> = () => `
<worldbuilding_context>
**MAGIC SYSTEMS**: Magic without limits isn't magic—it's wish fulfillment.
- Cost framework (personal, material, social)
- Limitation design (rarity, capability, situational, social)
- Magic ecology (items, creatures, corrupted lands)
- Social integration (guild, persecution, reverence, commercialization)
- Failure modes (fizzle, backfire, corruption, escalation)
- Learning progression (school, apprenticeship, self-taught, innate)
</worldbuilding_context>
`;

export default magicSystem;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const magicSystemSkill: SkillAtom<void> = (): SkillOutput => ({
  main: magicSystem(),

  quickStart: `
1. Every spell COSTS something (fatigue, components, sacrifice, debt)
2. Limitations create drama (why doesn't magic solve everything?)
3. Magic affects the world (items, creatures, corrupted lands)
4. Society reacts (guild, persecution, reverence, secrecy)
5. Failure has consequences (backfire, corruption, escalation)
6. Learning has a price (what do masters sacrifice?)
`.trim(),

  checklist: [
    "Cost framework defined (what does magic cost)?",
    "Limitations clear (why isn't magic solving everything)?",
    "Magic ecology considered (items, creatures, lands)?",
    "Social integration defined (how does society handle magic)?",
    "Detection and countermeasures exist?",
    "Failure modes have narrative consequences?",
    "Learning progression has milestones and costs?",
    "The Gandalf Problem addressed (why don't powerful mages just win)?",
  ],

  examples: [
    {
      scenario: "Cost Framework",
      wrong: `"He cast a fireball."
(No cost, no stakes.)`,
      right: `"He spoke the Word of Burning. His hands blackened
from wrist to fingertips—that was three uses now.
Two more and he'd never hold anything again."
(Visible, cumulative, creates choices.)`,
    },
    {
      scenario: "The Gandalf Problem",
      wrong: `"The wizard is powerful enough to solve this,
but he's busy doing other things."
(Hand-wave, not satisfying.)`,
      right: `"The Archmage could level the castle—but the Treaty of Seven Towers
forbids magic in siege warfare. Break it, and every other mage
on the continent becomes an enemy. He's powerful. Not stupid."
(Clear constraint, creates drama.)`,
    },
    {
      scenario: "Failure Mode",
      wrong: `"The spell failed."
(No consequence, no drama.)`,
      right: `"The healing worked—the wound closed, the blood stopped.
But the flesh that grew back was pale. Cold. It didn't feel like his arm.
It moved when he told it to. He tried not to think about what else
might be living in there now."
(Success with cost, ongoing consequence.)`,
    },
    {
      scenario: "Social Integration",
      wrong: `"Magic is normal in this world."
(No tension, no structure.)`,
      right: `"Licensed mages wear the Iron Collar—marks them as Guild-bonded,
insured against accident, taxed at triple rate. Unlicensed magic
is a hanging offense. The Hedge Witches work in the slums,
healing for coin, one step ahead of the Inquisitors."
(Structure creates conflict and story hooks.)`,
    },
  ],
});
