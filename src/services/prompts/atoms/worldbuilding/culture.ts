/**
 * ============================================================================
 * Worldbuilding Atom: Culture & Customs
 * ============================================================================
 *
 * Culture 设计上下文 - 定义文化系统的设计哲学。
 * 涵盖：禁忌、社会等级、仪式、待客之道、沟通风格。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

/**
 * Culture Systems - 完整版
 */
export const cultureSystem: Atom<void> = () => `
<worldbuilding_context>
**CULTURE & CUSTOMS DESIGN:**

Culture is constraint. Customs are law without enforcement.
Breaking them has no legal penalty—only social death.

<taboos_sacred>
**TABOOS & SACRED:**

**TABOO CATEGORIES:**
| Type | Example | Breaking It |
|------|---------|-------------|
| **FOOD** | Never eat pork, horse, human | Marks you as savage/impure |
| **BODY** | Never show feet, touch left hand | Profound disrespect |
| **SPEECH** | Never say the dead king's name | Attracts curse/wrath |
| **PLACE** | Never enter the sacred grove | Death, exile, divine punishment |
| **TIME** | Never work on holy day | Social exclusion |
| **PERSON** | Never look at the emperor's face | Execution |

**SACRED PROTECTIONS:**
- What makes something/someone untouchable?
- Guest rights (harming guests is ultimate sin)
- Clergy immunity (hands off the priests)
- Blood ties (family is sacred)
- Oaths (sworn word binds)

**TABOO QUESTIONS:**
- What can NEVER be done here?
- What happens to violators?
- Are there exceptions?
- Who enforces this?

**TABOO AS DRAMA:**
- Player must break taboo for important goal
- NPC breaks taboo (why? at what cost?)
- False accusation of taboo violation
- Discovering why taboo exists (it protects something)
</taboos_sacred>

<social_hierarchy>
**SOCIAL HIERARCHY:**

**CLASS STRUCTURES:**
| Class | Markers | Mobility | Treatment |
|-------|---------|----------|-----------|
| **NOBILITY** | Blood, title, land | Birth only | Above law |
| **CLERGY** | Ordination, robes | By calling | Separate law |
| **MERCHANTS** | Wealth, trade | By success | Respected but suspect |
| **ARTISANS** | Skill, guild | By craft | Pride in work |
| **COMMON** | None | Stuck | Invisible |
| **OUTCAST** | Mark, profession | Never | Less than human |

**CASTE INTERACTIONS:**
- Who can speak to whom?
- Who enters through which door?
- Who eats with whom?
- Who can marry whom?

**OUTSIDERS:**
- Foreigners: exotic or threatening?
- Travelers: guests or spies?
- Refugees: charity cases or competition?
- Different religion: tolerated or persecuted?

**MOBILITY PATHS:**
- Marriage (up or down)
- Wealth (buys status... sometimes)
- Service (military, religious, royal)
- Crime (fake identity, stolen credentials)
- Revolution (destroy the system)
</social_hierarchy>

<rituals_ceremonies>
**RITUALS & CEREMONIES:**

**LIFE STAGES:**
| Event | Ritual | Significance |
|-------|--------|--------------|
| **BIRTH** | Naming ceremony | Welcomed into community |
| **COMING OF AGE** | Trial, marking, celebration | Now responsible |
| **MARRIAGE** | Exchange, binding, feast | Families united |
| **DEATH** | Funeral rites | Proper send-off |

**SEASONAL CEREMONIES:**
- Planting (pray for growth)
- Harvest (give thanks)
- Solstice (mark the turning)
- New Year (renewal, debts settled)

**RELIGIOUS OBSERVANCES:**
- Daily (prayers, offerings)
- Weekly (services, rest)
- Monthly (moon phases, festivals)
- Annual (major holidays)

**RITUAL REQUIREMENTS:**
- Who must attend?
- What must be done?
- What happens if it's done wrong?
- What happens if it's skipped?

**RITUAL AS DRAMA:**
- Must complete ritual under time pressure
- Ritual goes wrong (what happens next?)
- Discover secret meaning of ritual
- Forced to participate in enemy's ritual
</rituals_ceremonies>

<hospitality_rules>
**HOSPITALITY RULES:**

**GUEST RIGHTS:**
| Culture | Rule | Duration | Violation |
|---------|------|----------|-----------|
| **STRICT** | Guest is sacred | Until departure | Death/war |
| **FORMAL** | Host provides, guest respects | 3 days | Feud |
| **PRACTICAL** | Fair exchange expected | Negotiated | Bad reputation |
| **SUSPICIOUS** | Prove yourself first | Earned | None |

**HOST OBLIGATIONS:**
- Provide food and shelter
- Protect from enemies (even your own allies)
- Don't ask business first night
- Send guest off properly

**GUEST OBLIGATIONS:**
- Accept what's offered graciously
- Don't insult the host
- Don't overstay
- Gift upon leaving

**HOSPITALITY ABUSE:**
- Using guest rights to access enemies
- Poisoning guests (ultimate betrayal)
- Stealing while guest
- Betraying information learned as guest
</hospitality_rules>

<communication_styles>
**COMMUNICATION STYLES:**

**DIRECTNESS:**
| Style | Culture | Risks |
|-------|---------|-------|
| **DIRECT** | Say what you mean | May give offense |
| **INDIRECT** | Implication, face-saving | May be misunderstood |
| **FORMAL** | Scripted phrases, protocol | Miss the subtext |
| **CASUAL** | Informal, equal | May seem disrespectful |

**SILENCE:**
- Means agreement?
- Means refusal?
- Means thinking?
- Means anger?
- (Different answers in different cultures)

**PHYSICAL CUES:**
- Eye contact: respectful or challenging?
- Touch: warm or invasive?
- Distance: close or far?
- Gesture: universal or local?

**NEGOTIATION STYLES:**
- Haggling expected vs insulting
- First offer serious vs opening bid
- Refusal first time polite vs real
- Gifts before business vs bribery
</communication_styles>

<gender_age_roles>
**GENDER & AGE ROLES:**

**GENDER EXPECTATIONS:**
| Area | One Expectation | Alternative | Transgression |
|------|-----------------|-------------|---------------|
| **WORK** | Men farm, women weave | Different division | Shame, mockery |
| **POWER** | Men rule, women advise | Matriarchy, equality | Challenge tradition |
| **VIOLENCE** | Men fight, women don't | Warrior women | Respect or horror |
| **SPEECH** | Men speak first | Women speak for family | Scandal |

**AGE EXPECTATIONS:**
- Youth: obey, learn, serve
- Adult: produce, protect, decide
- Elder: advise, judge, be served

**EXCEPTIONS:**
- Roles can be earned, bought, or granted
- Exceptional individuals transcend rules
- Crisis suspends normal expectations
- Foreigners held to different standards

**TRANSGRESSION:**
- What happens when someone doesn't fit?
- Hidden identities (passing as other gender/age)
- Open defiance (accepting consequences)
- Creating new categories (finding loopholes)
</gender_age_roles>

<food_drink>
**FOOD & DRINK:**

**FOOD AS CULTURE:**
- What's staple food? (Rice, bread, corn, meat)
- What's luxury food? (Rare, expensive, imported)
- What's forbidden food? (Religious, practical, disgusting)
- What's celebration food? (Holidays, weddings)

**EATING RITUALS:**
- Who eats first?
- Who serves?
- Shared dishes or individual?
- Utensils or hands?

**DRINK CULTURE:**
- What's drunk? (Water, ale, wine, tea, coffee)
- When is drinking appropriate?
- What seals a deal?
- What's drunkenness mean? (Disgrace or honesty)

**FOOD AS DRAMA:**
- Poisoning fears
- Feast as political arena
- Famine changes everything
- Food taboo creates conflict
</food_drink>
</worldbuilding_context>
`;

/**
 * Culture Systems - 精简版
 */
export const cultureSystemLite: Atom<void> = () => `
<worldbuilding_context>
**CULTURE & CUSTOMS**: Culture is constraint. Customs are law without enforcement.
- Taboos & sacred (food, body, speech, place, person)
- Social hierarchy (class, caste, outsiders, mobility)
- Rituals & ceremonies (life stages, seasonal, religious)
- Hospitality rules (guest rights, host/guest obligations)
- Communication styles (direct/indirect, silence meaning, negotiation)
- Gender & age roles (expectations, exceptions, transgression)
- Food & drink (staples, forbidden, rituals)
</worldbuilding_context>
`;

export default cultureSystem;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const cultureSystemSkill: SkillAtom<void> = (): SkillOutput => ({
  main: cultureSystem(),

  quickStart: `
1. Taboos are law without courts (breaking them = social death)
2. Hierarchy determines who speaks to whom, who enters where
3. Rituals mark transitions (birth, adulthood, marriage, death)
4. Hospitality has rules (guest rights can be exploited or violated)
5. Communication varies (direct vs indirect, silence means different things)
6. Food reveals culture (what's eaten, what's forbidden, who eats first)
`.trim(),

  checklist: [
    "Key taboos defined (what can NEVER be done)?",
    "Social hierarchy clear (who ranks above whom)?",
    "Important rituals established (life stages, seasons)?",
    "Hospitality rules specified (guest rights, obligations)?",
    "Communication style described (direct/indirect)?",
    "Gender/age expectations outlined?",
    "Food culture present (staples, forbidden, rituals)?",
    "Outsider treatment defined?",
  ],

  examples: [
    {
      scenario: "Taboo Creates Drama",
      wrong: `"They have some taboos."
(Vague, no gameplay.)`,
      right: `"Never speak the dead king's name. Ever. Those who do are marked—
shunned by all, unable to trade or marry. But the only map to the tomb
has his name as the password. You must say it to open the door."
(Specific taboo, forced violation, clear consequence.)`,
    },
    {
      scenario: "Hospitality Rules",
      wrong: `"Guests are treated well."
(No structure, no drama.)`,
      right: `"Guest rights last three days. The host must protect you—
even from their own allies. But on day four, you're fair game.
The assassin became my guest yesterday. I have two days
to figure out how to survive what happens when he leaves."
(Timer, protection, exploitation.)`,
    },
    {
      scenario: "Social Hierarchy",
      wrong: `"There are nobles and commoners."
(Generic, no texture.)`,
      right: `"She's a merchant's daughter—richer than most nobles,
but she enters through the servants' door. He's a ruined knight—
penniless, but he sits at the high table. Wealth and status
are different currencies here."
(Specific rules, creates tension.)`,
    },
    {
      scenario: "Communication Style",
      wrong: `"They communicate formally."
(No detail.)`,
      right: `"'That would be difficult' means 'no.' 'I will consider it' means 'never.'
'With respect' means 'you're an idiot.' She's been saying 'no' for an hour,
and he keeps asking because he doesn't speak the language of refusal."
(Indirect communication creates misunderstanding.)`,
    },
  ],
});
