/**
 * ============================================================================
 * Worldbuilding Atom: Travel & Distance
 * ============================================================================
 *
 * Travel 设计上下文 - 定义旅行系统的设计哲学。
 * 涵盖：距离摩擦、危险、驿站、补给、季节效应。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

/**
 * Travel Systems - 完整版
 */
export const travelSystem: Atom<void> = () => `
<worldbuilding_context>
**TRAVEL & DISTANCE DESIGN:**

Travel is not a loading screen. Distance has friction.
Journeys are stories, not transitions.

<distance_mechanics>
**DISTANCE MECHANICS:**

**TRAVEL SPEEDS:**
| Method | Speed | Stamina | Capacity |
|--------|-------|---------|----------|
| **On foot** | 20-30 km/day | Limited | What you carry |
| **Riding** | 40-60 km/day | Horse dependent | Saddlebags |
| **Carriage** | 30-50 km/day | Horses/road | Significant cargo |
| **Ship** | 50-150 km/day | Wind/crew | Massive cargo |
| **Magic** | Varies | Spell dependent | Usually personal |

**WHAT SLOWS TRAVEL:**
- Terrain: Mountains, swamps, forests, desert
- Weather: Rain, snow, heat, storms
- Roads: None, poor, maintained, paved
- Burden: Heavy loads, injured, elderly, children
- Encounters: Checkpoints, bandits, monsters, bureaucracy

**DISTANCE QUESTIONS:**
- How long does it take? (Not "a few days")
- What's the fastest route vs safest route?
- What landmarks mark progress?
- Where do you stop each night?
</distance_mechanics>

<travel_dangers>
**TRAVEL DANGERS:**

**HUMAN THREATS:**
| Threat | Where | What They Want |
|--------|-------|----------------|
| **BANDITS** | Forests, passes | Money, goods |
| **TOLL KEEPERS** | Bridges, gates | Payment, papers |
| **DESERTERS** | Borderlands | Food, equipment |
| **SLAVERS** | Wilderness | People |
| **RIVAL GROUPS** | Trade routes | Competition eliminated |

**ENVIRONMENTAL THREATS:**
| Threat | Effect | Mitigation |
|--------|--------|------------|
| **WEATHER** | Slow, damage, kill | Shelter, timing |
| **TERRAIN** | Block, trap, exhaust | Guides, equipment |
| **WILDLIFE** | Predators, stampedes | Watch, weapons |
| **DISEASE** | Weaken, spread, kill | Clean water, rest |
| **GETTING LOST** | Wasted time, danger | Maps, guides, landmarks |

**SUPERNATURAL THREATS:**
- Haunted stretches of road
- Territories of monsters
- Cursed lands between places
- Things that hunt travelers specifically

**TIMING DANGERS:**
- Traveling at night (what comes out)
- Traveling alone (no backup)
- Traveling fast (exhaustion, mistakes)
- Arriving at wrong time (gates closed, tides wrong)
</travel_dangers>

<waypoints>
**WAYPOINTS:**

**INN/TAVERN:**
- Rest, food, information, rumors
- Quality varies: flea-ridden to luxurious
- Social hub: who else is staying?
- Risks: overcharging, theft, worse

**CARAVANSERAI:**
- Walled compound for merchants
- Safety in numbers
- Trade opportunities
- Caravan schedule information

**SAFE HOUSE:**
- Known only to some
- For those fleeing/hiding
- Operated by: guild, rebels, criminals
- Requires trust or payment

**DANGEROUS CROSSING:**
- Ferry, bridge, ford, pass
- Controlled by: toll keeper, bandits, monsters
- Unavoidable chokepoint
- Weather dependent

**HOLY GROUND:**
- Temple, shrine, sacred grove
- Protection: spiritual, social, actual
- Obligations: offerings, behavior, confession
- Information: pilgrims know things
</waypoints>

<supplies_logistics>
**SUPPLIES & LOGISTICS:**

**ESSENTIAL SUPPLIES:**
| Need | Duration | Consequence of Lack |
|------|----------|---------------------|
| **FOOD** | 2-3 days without | Weakness, then death |
| **WATER** | 1-2 days without | Faster death |
| **WARMTH** | Hours in cold | Hypothermia |
| **SHELTER** | Depends on weather | Exposure, illness |
| **LIGHT** | Night/underground | Vulnerability, accidents |

**ANIMAL NEEDS:**
- Horses need fodder, water, rest
- Pack animals need care
- Animals get injured, sick, spooked
- Animals attract predators (noise, scent)

**EQUIPMENT DEGRADATION:**
- Clothes tear, shoes wear
- Weapons need maintenance
- Food spoils, water goes stale
- Everything gets wet, dirty, damaged

**RESUPPLY POINTS:**
- Where can you get more?
- How much does it cost there?
- Is it available now?
- Can you carry enough?
</supplies_logistics>

<season_effects>
**SEASON EFFECTS:**

**SPRING:**
- Thaw floods roads
- Passes reopen
- New growth obscures paths
- Animals active (dangerous mothers)

**SUMMER:**
- Best travel weather
- Longest days
- Heat exhaustion risk
- Water sources dry

**AUTUMN:**
- Harvest traffic on roads
- Weather turning
- Last chance before winter
- Migrating animals, hunting parties

**WINTER:**
- Passes close
- Short days, long nights
- Cold kills
- Tracks visible in snow
- Frozen rivers: shortcuts or traps

**FESTIVALS & EVENTS:**
- Religious holidays affect travel
- Wars close borders
- Plagues create quarantines
- Markets draw traffic
</season_effects>

<social_friction>
**SOCIAL FRICTION:**

**BUREAUCRACY:**
| Obstacle | What They Want | Consequence |
|----------|----------------|-------------|
| **TOLLS** | Payment | Can't pass without paying |
| **PAPERS** | Documentation | Detained, questioned |
| **CHECKPOINTS** | Search, interrogation | Delayed, things confiscated |
| **GUIDES** | Mandatory local guide | Extra cost, eyes on you |
| **BRIBES** | "Facilitation fees" | Faster but costly |

**CULTURAL BARRIERS:**
- Different languages
- Different customs (offend accidentally)
- Different religions (wrong god = enemy)
- Different standards (what's legal here?)

**REPUTATION EFFECTS:**
- Known as friend: doors open
- Known as enemy: doors close, traps set
- Unknown: suspicion, testing
- Famous: can't travel quietly
</social_friction>

<journey_as_drama>
**JOURNEY AS DRAMA:**

**JOURNEY BEATS:**
| Beat | Function | Example |
|------|----------|---------|
| **DEPARTURE** | Establish stakes | "If we're not there by the full moon..." |
| **EARLY TRAVEL** | Show the road | Weather, fellow travelers, routine |
| **OBSTACLE** | Test the party | Blocked pass, broken wheel, sick animal |
| **ENCOUNTER** | Revelation or fight | Meet someone, learn something, fight something |
| **DARK MOMENT** | Stakes increase | Supplies run out, injury, betrayal |
| **FINAL PUSH** | Climactic effort | Race against time, last obstacle |
| **ARRIVAL** | Changed by journey | Different people than who left |

**TRAVEL ISN'T A LOADING SCREEN:**
- Things happen on the road
- People change during travel
- Relationships form and break
- Information arrives during journeys
- The destination isn't the point

**WHAT MAKES TRAVEL INTERESTING:**
- Companions and their conflicts
- Choices about route and speed
- Resources running out
- Encounters that matter
- Changes in the travelers themselves
</journey_as_drama>
</worldbuilding_context>
`;

/**
 * Travel Systems - 精简版
 */
export const travelSystemLite: Atom<void> = () => `
<worldbuilding_context>
**TRAVEL & DISTANCE**: Travel is not a loading screen.
- Distance mechanics (speed, what slows travel)
- Dangers (human, environmental, supernatural, timing)
- Waypoints (inns, caravanserai, safe houses, crossings)
- Supplies & logistics (food, water, equipment degradation)
- Season effects (spring floods, summer heat, winter death)
- Social friction (tolls, papers, cultural barriers)
- Journey as drama (beats, encounters, changes)
</worldbuilding_context>
`;

export default travelSystem;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const travelSystemSkill: SkillAtom<void> = (): SkillOutput => ({
  main: travelSystem(),

  quickStart: `
1. Distance has friction (terrain, weather, roads, burden)
2. Travel is dangerous (bandits, weather, disease, getting lost)
3. Waypoints matter (where do you stop? what's there?)
4. Supplies run out (food, water, equipment degrade)
5. Seasons change everything (winter closes passes, summer dries water)
6. Journey is story (encounters, changes, arrival different than departure)
`.trim(),

  checklist: [
    "Travel time is specific (not 'a few days')?",
    "Route has landmarks and waypoints?",
    "Dangers are concrete (who, where, why)?",
    "Supply management matters?",
    "Season effects considered?",
    "Social friction present (tolls, papers, language)?",
    "Journey has story beats (obstacle, encounter, dark moment)?",
    "Travelers change during journey?",
  ],

  examples: [
    {
      scenario: "Distance Friction",
      wrong: `"They traveled to the capital."
(Skipped, no texture.)`,
      right: `"Five days on the King's Road. The first two were easy—
good weather, fellow travelers, wayside inns. The third day
the rain started. The fourth day they found the bridge out.
The fifth day they arrived, mud-soaked and late."
(Specific days, specific problems, consequences.)`,
    },
    {
      scenario: "Supplies Matter",
      wrong: `"They had enough supplies."
(Boring, no stakes.)`,
      right: `"Three days of food left. Two if they shared with the horse.
The next town was four days away. Someone was going to go hungry,
or they'd have to hunt—and hunting meant stopping, and stopping
meant missing the deadline."
(Math creates choices.)`,
    },
    {
      scenario: "Journey Changes People",
      wrong: `"They arrived at the destination."
(Arrival is just logistics.)`,
      right: `"They'd started as strangers sharing a road.
Somewhere between the wolf attack and the shared fever,
they'd become something else. When they finally reached the gates,
the woman he'd meant to betray had saved his life twice."
(Relationship changed, stakes changed.)`,
    },
    {
      scenario: "Waypoint Drama",
      wrong: `"They stopped at an inn."
(Generic, no hooks.)`,
      right: `"The inn was half-empty. The innkeeper's smile didn't reach his eyes.
The only other guest was a man in a hooded cloak who'd paid for the week
but never came downstairs for meals. His room was above theirs."
(Mystery, tension, potential encounter.)`,
    },
  ],
});
