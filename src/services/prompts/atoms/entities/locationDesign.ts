/**
 * ============================================================================
 * Entity Design Atom: Location Design Context
 * ============================================================================
 *
 * Location 设计上下文 - 用于 StoryOutline Phase 3。
 * 定义创建 Location 时的设计哲学和质量要求。
 *
 * Enriched with: lifecycle, hidden layer, NPC relationships, sensory tables
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * Location 设计上下文 - 完整版
 */
export const locationDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/locationDesign#locationDesign",
    source: "atoms/entities/locationDesign.ts",
    exportName: "locationDesign",
  },
  () => `
<game_system_context>
**LOCATION DESIGN FOR REALITY RENDERING ENGINE:**

Locations are not backdrops -- they are characters with memory pressed into their walls, history worn into their floors, and secrets buried under their foundations. A room should tell you who lived there and what happened without a single word of dialogue. The best places, like Manderley or Yoknapatawpha County, haunt the reader long after the people in them are forgotten.

<sensory_fields>
**SENSORY HIERARCHY** (use all five, prioritize unusual):

**SMELL** (the sense that bypasses reason and strikes memory directly):
✅ GOOD: "Copper and wet stone, with an undercurrent of something rotting in the walls."
✅ GOOD: "Incense failing to mask the smell of old blood. The sweetness makes it worse."
❌ BAD: "Smells bad."

**SOUND** (the architecture of atmosphere):
✅ GOOD: "Dripping water echoes arrhythmically. Somewhere deeper, metal scrapes on stone."
✅ GOOD: "The silence is wrong -- no birds, no insects. Just the wind through empty windows, like breath through missing teeth."
❌ BAD: "It's quiet."

**TOUCH** (the detail that makes a reader's skin prickle):
✅ GOOD: "The stone is slick with something that isn't water. Your hand comes away oily."
✅ GOOD: "The air is thick, almost chewy. Each breath tastes like dust and old paper."
❌ BAD: "It's cold."

**SIGHT** (describe lighting, not just objects):
✅ GOOD: "Candlelight makes shadows dance on the walls. The corners stay dark."
✅ GOOD: "Harsh noon sun bleaches everything. No shadows to hide in."
❌ BAD: "It's a room with tables."

**SENSORY TABLE BY LOCATION TYPE:**
| Type | Smell | Sound | Touch |
|------|-------|-------|-------|
| Tavern | Spilled ale, sweat, woodsmoke | Murmurs, dice, creaking stairs | Sticky tables, warm fire |
| Temple | Incense, old stone, candle wax | Echoing footsteps, chanting | Cold marble, worn prayer cushions |
| Dungeon | Mold, rust, waste, old blood | Dripping, distant screams, chains | Wet stone, rough rope burns |
| Market | Spices, animal dung, sweat | Haggling, animals, cart wheels | Jostling crowds, coin-worn fabric |
| Forest | Pine, decay, wet earth | Wind in leaves, snapping twigs | Bark scrapes, damp underbrush |
| Battlefield | Blood, smoke, disturbed earth | Groaning wounded, crows, flies | Churned mud, cold metal |
</sensory_fields>

<environmental_storytelling>
**ENVIRONMENTAL STORYTELLING:**
Objects tell stories the way fossils tell of ancient seas. Include at least ONE detail that implies what happened here:
- A half-eaten meal with two chairs, one overturned
- Scratch marks on the INSIDE of a door
- A child's toy next to an adult skeleton
- Fresh flowers on an ancient grave -- someone still remembers
- Candles still burning in an abandoned room
- A bloodstain someone tried to wash out -- and failed. The floor remembers what the scrubber wanted to forget.

**DETAILS THAT REVEAL HISTORY:**
- What was this place BEFORE? (temple now barracks, palace now ruin -- every repurposed building carries the ghost of its former self)
- What event scarred it? (fire marks, battle damage, flood lines on the walls like rings in a tree)
- Who cared for it? Who stopped caring? (fresh paint over decay, abandoned repairs mid-stroke)
- What's hidden? (secret doors, buried treasures, forgotten bodies)
</environmental_storytelling>

<location_lifecycle>
**LOCATION LIFECYCLE** (how it changes through time):

**DAWN**: Who arrives first? What routines begin?
- Market: Vendors setting up, fresh produce arrives
- Temple: Morning prayers, doors unlock
- Tavern: Cleanup from last night, bleary staff

**NOON**: Peak activity, maximum population
- Market: Crowded, loud, pickpockets active
- Temple: Quiet hours, meditation
- Tavern: Lunch crowd, quieter than night

**DUSK**: Transition, different crowd arrives
- Market: Vendors pack up, scavengers appear
- Temple: Evening services, candles lit
- Tavern: After-work crowd, noise increases

**MIDNIGHT**: Who's still there? What happens in darkness?
- Market: Empty, patrol routes, thieves' opportunity
- Temple: Vigils, secret meetings, forbidden rituals
- Tavern: Drunks, secrets spoken, deals in back rooms

**REST DAYS/FESTIVALS**: Different rules apply
- What's closed? What's uniquely open?
- What traditions change the space?
</location_lifecycle>

<hidden_layer>
**HIDDEN LAYER** (visible vs hidden dangers):

Every location has a surface and an underbelly:

| Visible | Hidden |
|---------|--------|
| Busy marketplace | Thieves' guild operates from the cheese stall |
| Peaceful temple | Smuggling tunnel in the catacombs |
| Friendly tavern | Owner reports to the city watch |
| Abandoned warehouse | Underground fighting ring |
| Noble manor | Servants' passages for surveillance |

**DANGER GRADIENTS:**
- Safe zones (where violence brings consequences)
- Gray zones (violence possible, consequences uncertain)
- Dark zones (no law, no witnesses)
- Traps and hazards (natural and man-made)
</hidden_layer>

<location_relationships>
**LOCATION-NPC RELATIONSHIPS:**

Who "owns" this space?
- **Official owner**: Who holds the deed/title?
- **True power**: Who actually controls what happens here?
- **Regulars**: Who knows this place intimately?
- **Interlopers**: Who doesn't belong, and how do regulars react?

**TERRITORIAL MARKERS:**
- How do you know you've entered someone's territory?
- What happens if you don't show proper respect?
- Who can grant safe passage?
</location_relationships>

<imperfections>
**IMPERFECTION EXAMPLES:**
✅ GOOD: "The tavern's roof leaks in the corner, and a bucket catches the drips. The barkeep ignores it—it's been that way for years."
✅ GOOD: "The throne room's grandeur is marred by water stains on the ceiling. No one mentions it. Everyone notices."
❌ BAD: "A beautiful, well-maintained tavern."

**GRITTY REALITY CHECK**:
- **Maintenance Issues**: Nothing is pristine. Mention the leak, the rust, the smell.
- **Bureaucracy/Mundane**: Even magical places have trash, queues, or bored guards.
- **Signs of Life**: Graffiti, worn paths, personal items left behind.
</imperfections>

<weather_mechanics>
**WEATHER AFFECTS MECHANICS:**
- **Rain**: Footprints visible, bowstrings warp, fires harder to start, conversations drowned
- **Fog**: Visibility 10 meters, sounds distorted, easy to get lost, ambush territory
- **Heat**: Exhaustion, metal too hot to touch ungloved, water precious, tempers short
- **Cold**: Breath visible, numbed fingers, ice on surfaces, need for fire
- **Storm**: Deafening thunder, lightning reveals positions, flooding risk
- **Snow**: Tracks obvious, sounds muffled, hypothermia risk, beauty masks danger
</weather_mechanics>
</game_system_context>
`,
);

/**
 * Location design primer (system-prompt safe).
 */
export const locationDesignPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/locationDesign#locationDesignPrimer",
    source: "atoms/entities/locationDesign.ts",
    exportName: "locationDesignPrimer",
  },
  () => `
<game_system_context>
**LOCATION DESIGN**: Locations are characters with memory in their walls.
- Sensory details (smell strikes memory; sound builds atmosphere; touch grounds the body)
- Environmental storytelling (objects that imply history)
- Lifecycle (dawn, noon, dusk, midnight)
- Hidden layer (visible vs hidden dangers)
- Imperfections (nothing is pristine)
- Weather affects mechanics
</game_system_context>
`,
);

export default locationDesign;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const locationDesignSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/locationDesign#locationDesignSkill",
    source: "atoms/entities/locationDesign.ts",
    exportName: "locationDesignSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(locationDesign),

    quickStart: `
1. Sensory Hierarchy: Smell (most evocative) → Sound → Touch → Sight
2. Environmental Storytelling: One detail that implies history
3. Lifecycle: How does the location change at dawn/noon/dusk/midnight?
4. Hidden Layer: Visible surface vs hidden dangers/truths
5. Imperfections: Nothing is pristine—leaks, rust, wear, smell
6. NPC Relationships: Who owns this space? Who truly controls it?
`.trim(),

    checklist: [
      "Smell described (most evocative sense)?",
      "Sound described (creates atmosphere)?",
      "At least one environmental storytelling detail?",
      "Location lifecycle considered (time of day)?",
      "Hidden layer defined (visible vs hidden)?",
      "Imperfections present (nothing pristine)?",
      "Weather effects on mechanics noted?",
      "Who 'owns' this space defined?",
    ],

    examples: [
      {
        scenario: "Sensory Description",
        wrong: `"It's a dark room."
(No sensory detail, no atmosphere.)`,
        right: `"The room smells of copper and wet stone, with an undercurrent
of something rotting in the walls. Dripping water echoes arrhythmically.
Somewhere deeper, metal scrapes on stone."
(Smell, sound, implied danger.)`,
      },
      {
        scenario: "Environmental Storytelling",
        wrong: `"There's a table and chairs."
(Objects without story.)`,
        right: `"A half-eaten meal with two chairs, one overturned.
The food is still warm. Whoever was here left in a hurry—or was taken."
(Objects imply event, create questions.)`,
      },
      {
        scenario: "Location Lifecycle",
        wrong: `"The market is busy."
(Static, no sense of time.)`,
        right: `"Dawn: Vendors arrive, fresh produce on carts.
Noon: Crowded, loud, pickpockets work the crowd.
Dusk: Vendors pack up, scavengers check discarded goods.
Midnight: Empty except patrol routes—and those avoiding them."
(Dynamic, changes with time.)`,
      },
      {
        scenario: "Hidden Layer",
        wrong: `"It's a normal tavern."
(No depth, no secrets.)`,
        right: `Visible: "Friendly tavern, good ale, warm fire."
Hidden: "The owner reports everything to the city watch.
The back room hosts illegal gambling every third night.
The cellar connects to the thieves' guild tunnel network."
(Surface hides underbelly.)`,
      },
    ],
  }),
);
