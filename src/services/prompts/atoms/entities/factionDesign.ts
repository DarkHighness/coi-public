/**
 * ============================================================================
 * Entity Design Atom: Faction Design Context
 * ============================================================================
 *
 * Faction 设计上下文 - 用于 StoryOutline Phase 4。
 * 定义创建 Faction 时的设计哲学和质量要求。
 *
 * Enriched with: power structure, lifecycle, resources/leverage, recruitment,
 * inter-faction dynamics, player interaction patterns
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

/**
 * Faction 设计上下文 - 完整版
 */
export const factionDesign: Atom<void> = () => `
<game_system_context>
**FACTION DESIGN FOR REALITY RENDERING ENGINE:**

Factions are not monolithic -- they are living organisms. They have immune systems that attack intruders, metabolisms that consume resources, and life cycles that run from hungry youth to bloated decline. Like any organism, they are coalitions of cells with competing interests, held together by shared purpose until that purpose fractures.

<power_structures>
**POWER STRUCTURE TYPES:**

**AUTOCRAT**: One person rules absolutely
- Strength: Fast decisions, clear chain of command
- Weakness: Succession crisis, bottleneck at the top
- Exploit: Remove the head, the body dies

**COUNCIL**: Group of equals (or "equals") share power
- Strength: Multiple perspectives, harder to decapitate
- Weakness: Slow decisions, internal gridlock, backroom deals
- Exploit: Play members against each other

**FIGUREHEAD**: Visible leader controlled by hidden power
- Strength: Deniability, public face absorbs anger
- Weakness: Figurehead may grow resentful, seek real power
- Exploit: Reveal the truth, or turn the puppet against the puppeteer

**SHADOW RULER**: Official structure is a facade
- Strength: Enemies attack the wrong target
- Weakness: Legitimacy crisis if exposed
- Exploit: Find and expose the true power

**HYDRA**: No single leader, cells operate independently
- Strength: Impossible to fully destroy, resilient
- Weakness: Poor coordination, conflicting actions
- Exploit: Difficult—must destroy the ideology, not the people
</power_structures>

<faction_lifecycle>
**FACTION LIFECYCLE:**

**RISE** (Hungry and dangerous):
- Small, hungry, taking risks -- the wolf pack in its first winter
- Charismatic founder with vision that burns like fever
- Early members are true believers, baptized in shared sacrifice
- Willing to break rules, no one's watching

**PEAK** (Powerful and vulnerable):
- Maximum power, maximum enemies -- the throne is also the target
- Bureaucracy develops, slows action like arteries hardening
- Original vision diluted by pragmatism, the way clear water muddies as the river widens
- Succession questions emerge like cracks in a dam

**DECLINE** (Desperate and unpredictable):
- Losing ground, resources shrinking -- the organism cannibalizing itself
- Factions within faction compete for scraps like siblings over a dwindling inheritance
- May take desperate, destructive actions
- Some members jump ship, some double down with the fervor of the drowning

**FALL** (Scattered but not dead):
- Organization destroyed, people remain -- embers that remember being fire
- Scattered loyalists nurse grudges like precious wounds
- Hidden caches, forgotten assets
- Seeds of resurrection or revenge, dormant but alive

**LIFECYCLE QUESTIONS:**
- Where is this faction in its lifecycle?
- What event could push it to the next stage?
- Who benefits from that transition?
</faction_lifecycle>

<resources_leverage>
**RESOURCES & LEVERAGE:**

What does the faction actually control?

**MONEY**: Cash, property, trade routes, debts owed
- "We own the docks. Nothing moves without our cut."

**VIOLENCE**: Armed forces, assassins, protection
- "We have 200 swords. The city watch has 50."

**INFORMATION**: Spies, secrets, blackmail material
- "We know who visits the bishop's private chambers."

**LEGITIMACY**: Legal authority, religious blessing, popular support
- "The people believe we speak for the gods."

**EXPERTISE**: Unique knowledge, rare skills, irreplaceable talent
- "Only our alchemists know the formula."

**RELATIONSHIPS**: Alliances, marriages, old debts, blood ties
- "The Duke's son owes us his life—literally."

**LEVERAGE IN ACTION:**
- What does the faction have that others want?
- What can they threaten to withhold?
- What would destroy them if lost?
</resources_leverage>

<hidden_agenda>
**HIDDEN AGENDA EXAMPLES:**
✅ GOOD hidden.agenda: "The Order publicly 'protects' villages from monsters. In truth, they breed the monsters to justify their protection fees. Elder Varen knows but stays silent—the Order funds his daughter's medicine."
❌ BAD hidden.agenda: "They have secret evil plans."

**AGENDA LAYERS:**
- **Public Face**: What they say they want
- **Real Goal**: What they actually pursue
- **Secret Shame**: What they'd never admit
- **Ultimate Fear**: What would destroy them
</hidden_agenda>

<internal_conflict>
**INTERNAL CONFLICT (REQUIRED):**
Every faction has at least ONE schism:

**REFORMISTS vs TRADITIONALISTS**:
- "The old ways are failing. We must adapt or die."
- "The old ways made us great. Change is weakness."

**HAWKS vs DOVES**:
- "We should strike first while we're strong."
- "Diplomacy is cheaper than war. We can't afford the losses."

**LEADER vs HEIR**:
- "Father is too cautious. He'll lose everything."
- "My son is too reckless. He'll destroy us."

**IDEALISTS vs PRAGMATISTS**:
- "We must hold to our principles, whatever the cost."
- "Principles don't feed soldiers. Results matter."

**OLD GUARD vs NEW BLOOD**:
- "These newcomers don't understand our traditions."
- "The old guard is stuck in the past."

**CONFLICT QUESTIONS:**
- Who leads each faction within the faction?
- What would trigger open conflict?
- Who would win, and what would be lost?
</internal_conflict>

<recruitment_patterns>
**RECRUITMENT PATTERNS:**

**BLOOD**: Born into it (families, clans, dynasties)
- Loyalty through identity
- Can't truly leave

**INDOCTRINATION**: Raised into beliefs (religions, cults, academies)
- Loyalty through worldview
- Leaving means losing self

**MUTUAL BENEFIT**: Transactional relationship (guilds, cartels)
- Loyalty through profit
- Leaves when deal sours

**DESPERATION**: Joined for survival (refugees, outcasts, criminals)
- Loyalty through necessity
- Leaves when alternatives appear

**BLACKMAIL**: Trapped by secrets or debts
- Loyalty through fear
- Always looking for escape

**QUESTIONS:**
- How does this faction recruit?
- What keeps members loyal?
- What makes members leave?
- What happens to those who leave?
</recruitment_patterns>

<inter_faction_dynamics>
**INTER-FACTION DYNAMICS:**

**ALLIANCE TYPES:**
| Type | Description | Stability |
|------|-------------|-----------|
| Open Alliance | Public partnership, mutual defense | Stable but limiting |
| Secret Alliance | Hidden cooperation, deniable support | Fragile, high value |
| Marriage Alliance | Blood ties, hostage exchange | Stable until death/divorce |
| Mutual Enemy | Cooperate only against shared threat | Dissolves when threat ends |
| Client-Patron | Subordinate relationship, protection for service | Stable if patron is strong |

**RIVALRY PATTERNS:**
- **Resource Competition**: Same market, same territory
- **Ideological Opposition**: Incompatible worldviews
- **Historical Grudge**: Old wrongs never forgiven
- **Personal Vendetta**: Leaders hate each other
- **Proxy War**: Fighting through others

**FACTION RELATIONS EXAMPLES:**
✅ GOOD hidden.relations: "{ target: 'merchant_guild', status: 'Publicly allies, but we're embezzling their trade taxes through our port officials.' }"
❌ BAD hidden.relations: "{ target: 'merchant_guild', status: 'enemies' }"
</inter_faction_dynamics>

<player_interaction>
**PLAYER INTERACTION PATTERNS:**

**HOW FACTIONS REACT TO PLAYER ACTIONS:**

**FAVOR GAINED**:
- First: Small rewards, minor access
- Then: Better missions, some secrets shared
- Finally: Inner circle access, major resources, real trust

**FAVOR LOST**:
- First: Warnings, reduced access, cold shoulders
- Then: Active obstruction, doors closed, prices raised
- Finally: Active hostility, contracts on head, enemies everywhere

**FACTION PRESSURE:**
- What does the faction want from the player?
- What will they offer?
- What will they threaten?
- At what point do they give up—or escalate to violence?

**PLAYING FACTIONS AGAINST EACH OTHER:**
- What happens when the player aids rival factions?
- How do factions discover betrayal?
- What are the consequences of being caught?
</player_interaction>

<offscreen_progression>
**FACTION PROGRESSION OFF-SCREEN:**
While the protagonist sleeps, factions breathe:
- Hold secret meetings in rooms the protagonist will never see
- Assassinate rivals over quarrels the protagonist will never hear about
- Forge and break alliances like bones that set crooked
- Move troops and resources across maps the protagonist does not possess
- Plant spies and spread rumors -- the slow, invisible warfare
- Celebrate victories, mourn defeats, bury their dead
- Plan for a future that may not include the protagonist at all

The world doesn't pause when the player looks away. It accelerates.
</offscreen_progression>
</game_system_context>
`;

/**
 * Faction 设计上下文 - 精简版
 */
export const factionDesignPrimer: Atom<void> = () => `
<game_system_context>
**FACTION DESIGN**: Factions are living organisms with immune systems, metabolisms, and life cycles.
- Power structure (autocrat, council, figurehead, shadow, hydra)
- Lifecycle (rise, peak, decline, fall)
- Resources & leverage (money, violence, information, legitimacy)
- Hidden agenda (detailed, not generic)
- Internal conflict (schisms and rivalries)
- Recruitment patterns (blood, indoctrination, mutual benefit, desperation, blackmail)
- Inter-faction dynamics (alliances, rivalries)
- Off-screen progression
</game_system_context>
`;

export default factionDesign;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const factionDesignSkill: SkillAtom<void> = (): SkillOutput => ({
  main: factionDesign(),

  quickStart: `
1. Power Structure: Who actually rules? (autocrat, council, figurehead, shadow, hydra)
2. Lifecycle Stage: Where are they? (rise, peak, decline, fall)
3. Resources: What do they control? (money, violence, information, legitimacy)
4. Internal Schism: What divides them? (reformers vs traditionalists, hawks vs doves)
5. Hidden Agenda: What they really want vs what they say
6. Off-Screen Action: Factions move while the player isn't watching
`.trim(),

  checklist: [
    "Power structure type defined?",
    "Lifecycle stage identified (rise/peak/decline/fall)?",
    "Resources and leverage specified (not just 'powerful')?",
    "At least one internal schism present?",
    "Hidden agenda is specific (not 'secret evil plans')?",
    "Recruitment pattern defined?",
    "Relations with other factions are complex (not just allies/enemies)?",
    "Off-screen progression considered?",
  ],

  examples: [
    {
      scenario: "Hidden Agenda",
      wrong: `hidden.agenda: "They have secret evil plans."
(Vague, unplayable.)`,
      right: `hidden.agenda: "The Order publicly 'protects' villages from monsters.
In truth, they breed the monsters to justify their protection fees.
Elder Varen knows but stays silent—the Order funds his daughter's medicine."
(Specific, creates moral complexity, has leverage points.)`,
    },
    {
      scenario: "Internal Conflict",
      wrong: `"The faction is united under strong leadership."
(No drama, no hooks.)`,
      right: `"Hawks want to strike the merchant guild now while they're weak.
Doves argue war will bankrupt them. The leader is dying and hasn't
named an heir—both sides are positioning for succession."
(Multiple angles for player involvement.)`,
    },
    {
      scenario: "Faction Relations",
      wrong: `relations: { merchant_guild: "enemies" }
(Binary, no nuance.)`,
      right: `relations: { merchant_guild: "Publicly allies, but we're embezzling
their trade taxes through our port officials. They suspect but can't prove it.
If they could, we'd have a war." }
(Complex, has secrets, creates opportunities.)`,
    },
    {
      scenario: "Resources & Leverage",
      wrong: `"They're powerful and influential."
(Meaningless, no specifics.)`,
      right: `"Control the docks—nothing moves without their cut.
200 armed men vs city watch's 50. Own the debts of three council members.
Know where the bishop's bastard children live."
(Specific leverage, playable hooks.)`,
    },
  ],
});
