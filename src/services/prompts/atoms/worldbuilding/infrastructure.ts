/**
 * ============================================================================
 * Worldbuilding Atom: Infrastructure
 * ============================================================================
 *
 * Infrastructure 设计上下文 - 定义基础设施的设计哲学。
 * 涵盖：城市、道路、通信、水利、防御。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

/**
 * Infrastructure Systems - 完整版
 */
export const infrastructureSystem: Atom<void> = () => `
<worldbuilding_context>
**INFRASTRUCTURE DESIGN:**

Infrastructure shapes movement, concentration, and vulnerability.
When it works, it's invisible. When it fails, everything stops.

<cities_settlements>
**CITIES & SETTLEMENTS:**

**SETTLEMENT HIERARCHY:**
| Type | Population | Features | Governance |
|------|------------|----------|------------|
| **HAMLET** | 20-100 | Few buildings, no services | Elder/headman |
| **VILLAGE** | 100-1000 | Inn, market, temple | Council |
| **TOWN** | 1000-10000 | Walls, guilds, courts | Mayor/lord |
| **CITY** | 10000-100000 | Districts, institutions | Complex hierarchy |
| **METROPOLIS** | 100000+ | Everything, overwhelming | Bureaucracy |

**CITY DISTRICTS:**
- **NOBLE QUARTER**: Clean, quiet, guards, walls-within-walls
- **MERCHANT DISTRICT**: Shops, warehouses, money changers
- **TEMPLE DISTRICT**: Religious buildings, pilgrims, charity
- **CRAFTSMAN QUARTER**: Workshops, guilds, noise, fire risk
- **SLUMS**: Overcrowded, poor, crime, disease
- **DOCKS/GATES**: Trade, travelers, customs, vice

**URBAN PROBLEMS:**
- Fire (wood buildings, narrow streets)
- Disease (crowding, poor sanitation)
- Crime (anonymity, poverty)
- Food (massive supply requirements)
- Order (too many people to watch)

**CITY QUESTIONS:**
- Where is the protagonist's destination in the city?
- Who controls different areas?
- Where is it safe? Where isn't it?
- What's visible from the street vs hidden?
</cities_settlements>

<roads_bridges>
**ROADS & BRIDGES:**

**ROAD QUALITY:**
| Type | Travel Speed | Weather Effect | Who Maintains |
|------|--------------|----------------|---------------|
| **TRAIL** | Slow | Disappears in rain | No one |
| **DIRT ROAD** | Moderate | Mud, flooding | Local community |
| **PAVED ROAD** | Fast | All-weather | Kingdom/empire |
| **MOUNTAIN PASS** | Slow | Seasonal closure | Varies |
| **ANCIENT ROAD** | Fast | Mysteriously good | Unknown |

**BRIDGE CONTROL:**
- Bridges are chokepoints (toll, checkpoint, ambush)
- Who built it? Who maintains it? Who controls it?
- What happens when it's out?
- Are there alternatives?

**ROAD ENCOUNTERS:**
- Fellow travelers (merchants, pilgrims, soldiers)
- Patrols (whose? friendly?)
- Waymarkers (reliable? misleading?)
- Road conditions (washouts, repairs, obstacles)

**NAVIGATION:**
- Are roads marked?
- Do maps exist? Are they accurate?
- Who knows the way?
- What happens when you get lost?
</roads_bridges>

<communication_systems>
**COMMUNICATION SYSTEMS:**

**MESSAGE METHODS:**
| Method | Speed | Range | Security | Cost |
|--------|-------|-------|----------|------|
| **MESSENGER** | Walking/riding | Any | Variable | Low |
| **COURIER SYSTEM** | Relay riding | Major routes | Low | Medium |
| **CARRIER BIRDS** | Fast | Trained locations | Low | High |
| **SIGNAL FIRES** | Instant | Line of sight | None | Infrastructure |
| **MAGIC** | Instant | Varies | Varies | Rare/expensive |

**COMMUNICATION DELAYS:**
- How long for news to travel?
- Information asymmetry creates drama
- Outdated orders cause problems
- "By the time you hear, it's too late"

**INTERCEPTION:**
- Messages can be read
- Messengers can be caught
- Codes and ciphers exist
- Who's listening?

**INFORMATION NETWORKS:**
- Official: Royal messengers, church communications
- Commercial: Merchant news, guild information
- Criminal: Thieves' cant, underground signals
- Personal: Friends, family, allies
</communication_systems>

<water_sanitation>
**WATER & SANITATION:**

**WATER SOURCES:**
| Source | Quality | Control | Vulnerability |
|--------|---------|---------|---------------|
| **WELLS** | Variable | Private/communal | Contamination |
| **RIVERS** | Depends on upstream | Public access | Flooding, pollution |
| **AQUEDUCTS** | Consistent | Government | Sabotage, cost |
| **CISTERNS** | Stored | Building owners | Stagnation |
| **SPRINGS** | Good | Often sacred | Seasonal |

**SANITATION REALITIES:**
- Waste disposal (where does it go?)
- Street cleaning (or not)
- Disease vectors (rats, flies, water)
- Smell (cities stink)

**WATER AS DRAMA:**
- Poisoned wells (murder or warfare)
- Drought (rationing, conflict)
- Flooding (disaster, opportunity)
- Control of water = power
</water_sanitation>

<power_systems>
**POWER SYSTEMS:**

**MECHANICAL POWER:**
| Type | Used For | Dependent On |
|------|----------|--------------|
| **WATER MILLS** | Grinding grain, smithing | River location, season |
| **WIND MILLS** | Grinding, pumping | Wind availability |
| **ANIMAL POWER** | Transport, farming | Feed, care, breeding |
| **HUMAN LABOR** | Everything else | Willing or forced |

**MAGICAL POWER:**
- Enchanted machinery (rare, expensive)
- Bound spirits (ethically questionable)
- Natural magic sites (location-dependent)
- Mage labor (expensive, temperamental)

**POWER CONCENTRATION:**
- Who controls the power sources?
- What happens when they fail?
- Can they be monopolized?
- Who maintains them?
</power_systems>

<defense_systems>
**DEFENSE SYSTEMS:**

**FORTIFICATION TYPES:**
| Type | Protects Against | Weakness |
|------|------------------|----------|
| **PALISADE** | Raiders, wildlife | Fire, siege |
| **WALLS** | Armies, monsters | Siege engines, starvation |
| **CASTLE** | Everything conventional | Time, treachery |
| **MOAT** | Assault, tunneling | Filling, freezing |
| **WATCH TOWERS** | Surprise attack | Manning, blindspots |

**MILITIA & GUARDS:**
- How many? Trained or conscripted?
- Who commands them?
- Response time to incidents?
- Corrupt? Competent? Both?

**ALARM SYSTEMS:**
- Bells, horns, signal fires
- Who raises alarm? Who responds?
- False alarms and their consequences
- What happens at night?

**SIEGE CONSIDERATIONS:**
- Food supplies (how long?)
- Water access (within walls?)
- Disease (crowding kills)
- Morale (hope vs despair)
</defense_systems>

<infrastructure_failure>
**INFRASTRUCTURE FAILURE:**

**FAILURE CASCADES:**
| Failure | Immediate Effect | Secondary Effect |
|---------|------------------|------------------|
| **ROAD BLOCKED** | Detours, delays | Prices rise, news stops |
| **BRIDGE OUT** | Route severed | Communities isolated |
| **WELL POISONED** | Water crisis | Disease, panic |
| **FIRE** | Destruction | Homelessness, chaos |
| **WALLS BREACHED** | Vulnerability | Evacuation, surrender |

**FAILURE AS DRAMA:**
- Protagonist must restore/bypass
- Failure reveals hidden dependencies
- Scapegoating and blame
- Opportunity in chaos

**RECOVERY:**
- Who repairs infrastructure?
- How long does it take?
- What's lost forever?
- Who benefits from the disruption?
</infrastructure_failure>
</worldbuilding_context>
`;

/**
 * Infrastructure Systems - 精简版
 */
export const infrastructureSystemLite: Atom<void> = () => `
<worldbuilding_context>
**INFRASTRUCTURE**: When it works, it's invisible. When it fails, everything stops.
- Cities & settlements (districts, urban problems)
- Roads & bridges (quality, control, chokepoints)
- Communication (messengers, signals, interception)
- Water & sanitation (sources, disease, control)
- Power systems (mills, labor, magical power)
- Defense (walls, militia, alarms)
- Failure cascades (what breaks, what follows)
</worldbuilding_context>
`;

export default infrastructureSystem;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const infrastructureSystemSkill: SkillAtom<void> = (): SkillOutput => ({
  main: infrastructureSystem(),

  quickStart: `
1. Cities have districts (each with character, control, danger)
2. Roads have quality (affects speed, depends on weather)
3. Bridges are chokepoints (toll, checkpoint, ambush)
4. Communication has delays (information asymmetry creates drama)
5. Water is power (wells, rivers, aqueducts—control = leverage)
6. Failure cascades (one break causes many problems)
`.trim(),

  checklist: [
    "Settlement hierarchy appropriate to scale?",
    "City districts have character and control?",
    "Road quality affects travel?",
    "Chokepoints (bridges, gates) controlled?",
    "Communication delays create drama?",
    "Water sources and vulnerabilities noted?",
    "Defense capabilities match threats?",
    "Failure scenarios considered?",
  ],

  examples: [
    {
      scenario: "City Districts",
      wrong: `"The city has different areas."
(Vague, no gameplay.)`,
      right: `"The Temple District is safe—priests patrol, sanctuary granted.
The Docks are dangerous after dark—no patrols, thieves' territory.
Between them is the Merchant Quarter: safe by day, depends on purse by night."
(Clear zones with different rules.)`,
    },
    {
      scenario: "Communication Delay",
      wrong: `"They sent a message."
(Instant, no drama.)`,
      right: `"The message left three days ago. The army moves tomorrow.
If the rider made it through the pass, reinforcements will come.
If the pass was blocked by snow, no one's coming.
We won't know until we see which banners crest the hill."
(Uncertainty from delay creates tension.)`,
    },
    {
      scenario: "Infrastructure Failure",
      wrong: `"The bridge was out."
(Minor obstacle.)`,
      right: `"The bridge collapsed last month. No replacement until spring.
The grain that fed three villages can't get through. Prices doubled.
The ferry operator is getting rich. The miller is starving.
Someone's going to do something desperate soon."
(Cascade of consequences from one failure.)`,
    },
    {
      scenario: "Water as Power",
      wrong: `"There was a well."
(Mundane detail.)`,
      right: `"The only well in the village belongs to the landlord.
Pay the fee or walk two miles to the river. In winter,
when the river freezes, he triples the price.
Three families left last year. He bought their farms."
(Control of water = control of people.)`,
    },
  ],
});
