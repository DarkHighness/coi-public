/**
 * ============================================================================
 * Worldbuilding Atom: History & Legends
 * ============================================================================
 *
 * 历史不是过去——它是渗出裂缝的残留物。死者有他们的意见，
 * 而泥土记得每一滴洒在它上面的血。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


/**
 * History Systems - 完整版
 */
export const historySystem: Atom<void> = defineAtom({ atomId: "atoms/worldbuilding/history#historySystem", source: "atoms/worldbuilding/history.ts", exportName: "historySystem" }, () => `
<worldbuilding_context>
**HISTORY & LEGENDS DESIGN:**

History is not past—it is residue. The dead have opinions, and the ground does not forget.
What happened then doesn't stay buried; it leaks through cracks in the present like groundwater through limestone.

<living_history>
**LIVING HISTORY** (The past is not behind us — it is beneath us):

**VISIBLE RESIDUE:**
| Type | Examples | Effect on Present |
|------|----------|-------------------|
| **RUINS** | Collapsed castles, dead cities | Treasure, danger, mystery — the skeleton of the old world showing through the skin of the new |
| **MONUMENTS** | Statues, obelisks, graves | Political symbols, meeting points — stone arguments that outlast the men who carved them |
| **BOUNDARIES** | Old walls, border markers | Territorial disputes, traditions — lines drawn in blood that dried centuries ago |
| **NAMES** | "Gallows Hill", "Dead Man's Crossing" | Warnings, memories — the land itself whispers what happened here |
| **INSTITUTIONS** | Ancient temples, old guilds | Power derived from age — they endure because no one remembers a time before them |

**INHERITED GRUDGES:**
- "Their grandfather killed my grandfather" — hatred is the most reliable inheritance
- Family feuds lasting generations, renewed each time a child is old enough to be told
- National enemies from old wars — borders heal faster than memory
- Debts that passed through deaths, compounding in resentment like interest on a loan that can never be repaid

**TRADITIONS FROM TRAUMA:**
- Why does everyone lock their doors at sundown? (The Night of Screams, 200 years ago)
- Why do we never speak of the old king? (The Curse of Names)
- Why do children wear iron charms? (The Faerie Raids)

**LIVING HISTORY QUESTIONS:**
- What event from the past still matters today?
- Who remembers it? Who has forgotten?
- What would happen if the truth came out?
- How do people use history as a weapon?
</living_history>

<layers_of_truth>
**LAYERS OF TRUTH:**

**HISTORY IS WRITTEN BY WINNERS — but the losers remember differently, and their memory has teeth:**
| Source | What It Says | What It Hides |
|--------|--------------|---------------|
| **OFFICIAL RECORDS** | King was hero, rebels were traitors | King burned villages |
| **FOLK MEMORY** | The people suffered under tyrants | People welcomed invaders |
| **TEMPLE ARCHIVES** | The gods decreed it | Temple got rich from it |
| **FAMILY TRADITIONS** | Ancestor was brave | Ancestor was paid traitor |
| **HIDDEN TRUTH** | What actually happened | Everything was more complicated |

**COMPETING NARRATIVES:**
- Same event, different meanings
- Each faction has their version
- New evidence changes everything
- Some truths are dangerous to know

**TRUTH DISCOVERY:**
- Finding old documents
- Talking to survivors
- Visiting sites of events
- Piecing together contradictions

**TRUTH AS WEAPON:**
- Expose hypocrisy (reveal what really happened)
- Undermine legitimacy (the dynasty is based on a lie)
- Create obligation (your family owes us)
- Threaten revelation (we know what you did)
</layers_of_truth>

<historical_hooks>
**HISTORICAL HOOKS:**

**ANCIENT WARS:**
- Who fought? (Kingdoms, races, gods)
- Why? (Resources, ideology, survival)
- How did it end? (Victory, stalemate, extinction)
- What remains? (Weapons, grudges, forbidden zones)

**LOST CIVILIZATIONS:**
- What did they know? (Magic, technology, secrets — what Ozymandias built before the sand came)
- Why did they fall? (Catastrophe, corruption, invasion — every empire believes it is the exception)
- What did they leave? (Ruins, treasures, curses)
- Could they return? (Sleeping, hidden, reborn — nothing truly dies that was once great enough to be remembered)

**FALLEN EMPIRES:**
- What was their territory? (Now divided, contested)
- What was their legacy? (Roads, laws, languages)
- Who claims to be heir? (Many, competing)
- What ended them? (And could it happen again?)

**GREAT DISASTERS:**
- What happened? (Plague, flood, magical catastrophe)
- Who survived? (And why them?)
- What was lost? (Knowledge, people, land)
- What signs remain? (Scars on the land, traditions)
</historical_hooks>

<monuments_ruins>
**MONUMENTS & RUINS:**

**WHAT MONUMENTS MEAN:**
| Type | Official Meaning | Actual Use |
|------|------------------|------------|
| **VICTORY COLUMN** | "We won gloriously" | Reminder of who conquered whom |
| **FOUNDER'S STATUE** | "Our noble origins" | Meeting place, political symbol |
| **TEMPLE RUINS** | "Ancient sanctity" | Treasure hunters' target |
| **CITY WALLS** | "Our strength" | Neighborhood boundaries |
| **MASS GRAVES** | "Honored dead" | Haunted, avoided, denied |

**RUIN MYSTERIES:**
- What was it originally?
- Why was it abandoned/destroyed?
- What's left inside?
- Who visits now, and why?

**MONUMENT QUESTIONS:**
- Who built it? (And who did the work?)
- Who maintains it? (And who vandalizes it?)
- What ceremonies happen there?
- What would destroying it mean?
</monuments_ruins>

<oral_tradition>
**ORAL TRADITION:**

**STORIES THAT ENCODE TRUTH:**
(Faulkner wrote: "The past is never dead. It's not even past." In oral cultures, this is literal — truth survives by disguising itself as entertainment.)
| Type | Surface Story | Hidden Meaning |
|------|---------------|----------------|
| **FAIRY TALES** | "Don't go into the woods" | Specific danger at specific place |
| **SONGS** | "The lord died nobly" | The lord was assassinated |
| **NURSERY RHYMES** | "Ring around the rosie" | Plague symptoms, mass death |
| **PROVERBS** | "Never trust a southerner" | Old war, old betrayal |

**WHO KEEPS THE STORIES:**
- Elders (formal, respected, limited audience)
- Bards (entertainment, wide spread, embellished)
- Parents (to children, practical warnings)
- Priests (religious interpretation, selective)
- Outcasts (forbidden knowledge, alternative history)

**ORAL TRADITION AS CLUE:**
- Why do they sing that song here?
- What does the old rhyme really mean?
- Who remembers the full version?
- What was the original warning about?

**DYING KNOWLEDGE:**
- Last speaker of old language — when she dies, a world dies with her
- Last practitioner of old craft — his hands hold a conversation with centuries
- Last witness to old event — memory made flesh, about to become silence
- What's lost when they're gone? (Not facts. The grammar of understanding.)
</oral_tradition>

<historical_trauma>
**HISTORICAL TRAUMA:**

**CULTURAL SCARS:**
| Event | Immediate Effect | Lasting Effect |
|-------|------------------|----------------|
| **PLAGUE** | Mass death | Fear of outsiders |
| **CONQUEST** | Loss of autonomy | Resistance identity |
| **FAMINE** | Starvation | Food hoarding, scarcity fear |
| **BETRAYAL** | Specific loss | Trust issues, isolation |
| **PERSECUTION** | Suffering | Hidden practices, resentment |

**TRAUMA MANIFESTATIONS:**
- Defensive architecture (walls within walls)
- Hoarding behavior (never throw anything away)
- Distrust patterns (never trust strangers)
- Ritual behaviors (ward against old evil)
- Taboos (never do what caused catastrophe)

**TRAUMA RECOVERY:**
- Denial (we don't talk about it)
- Commemoration (we remember forever)
- Revenge (we'll make them pay)
- Reconciliation (we must heal)
- Repetition (we're doing it again)
</historical_trauma>

<gm_use>
**GM USE:**

**REVEALING HISTORY AS PACING TOOL:**
- Early: Hints and fragments (mysterious ruins, old songs)
- Middle: Context and connection (this relates to that)
- Late: Full revelation (now you understand why)

**HISTORY AS MOTIVATION:**
- NPC driven by historical grievance
- Faction claims based on ancient right
- Quest to recover lost knowledge
- Need to prevent historical recurrence

**HISTORY AS CONSTRAINT:**
- Treaty from 100 years ago still binds
- Ancient curse still active
- Old alliance must be honored
- Forbidden zones from old disaster

**HISTORY AS RESOURCE:**
- Old weapons, old magic, old knowledge
- Precedent for current action
- Legitimacy from ancient claim
- Wisdom from past mistakes
</gm_use>
</worldbuilding_context>
`);

/**
 * History Systems - 精简版
 */
export const historySystemLite: Atom<void> = defineAtom({ atomId: "atoms/worldbuilding/history#historySystemLite", source: "atoms/worldbuilding/history.ts", exportName: "historySystemLite" }, () => `
<worldbuilding_context>
**HISTORY & LEGENDS**: History is not past—it is residue. The dead have opinions, and the ground does not forget.
- Living history (ruins, grudges, traditions from trauma)
- Layers of truth (official records vs folk memory vs hidden truth)
- Historical hooks (ancient wars, lost civilizations, fallen empires)
- Monuments & ruins (meaning, mystery, what remains)
- Oral tradition (stories that encode truth, dying knowledge)
- Historical trauma (cultural scars, manifestations, recovery)
- GM use (pacing, motivation, constraint, resource)
</worldbuilding_context>
`);

export default historySystem;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const historySystemSkill: SkillAtom<void> = defineSkillAtom({ atomId: "atoms/worldbuilding/history#historySystemSkill", source: "atoms/worldbuilding/history.ts", exportName: "historySystemSkill" }, (_input, trace): SkillOutput => ({
  main: trace.record(historySystem),

  quickStart: `
1. History is residue (past shapes present through ruins, grudges, traditions)
2. Truth has layers (official records vs folk memory vs hidden truth)
3. Oral tradition encodes warnings (fairy tales, songs, proverbs have meaning)
4. Trauma leaves scars (defensive behavior, taboos, rituals)
5. Monuments mean something (political symbols, meeting points, contested)
6. History is a weapon (legitimacy, obligation, threat of revelation)
`.trim(),

  checklist: [
    "Living history present (how past affects now)?",
    "Truth has layers (competing narratives)?",
    "Historical hooks available (wars, disasters, lost civilizations)?",
    "Monuments/ruins have meaning and mystery?",
    "Oral traditions exist (songs, stories, proverbs)?",
    "Historical trauma has behavioral effects?",
    "History usable as motivation for NPCs/factions?",
    "History reveals gradually (early hints → late revelation)?",
  ],

  examples: [
    {
      scenario: "Living History",
      wrong: `"There was a war 200 years ago."
(Dead history, no current effect.)`,
      right: `"Every household in the valley has a sword above the door.
They haven't fought in 200 years. But the sword is sharpened
each spring, the day the southerners came last time.
Just in case."
(Past event creates present behavior.)`,
    },
    {
      scenario: "Layers of Truth",
      wrong: `"The king was a hero."
(One story, no complexity.)`,
      right: `"The temples say King Aldric was a saint who united the kingdom.
The old families whisper he poisoned his brothers.
The archives burned in the fire—convenient, that.
But the gravediggers' guild keeps their own records."
(Competing narratives, hints at hidden truth.)`,
    },
    {
      scenario: "Oral Tradition as Clue",
      wrong: `"They sing old songs."
(Atmosphere, no meaning.)`,
      right: `"'Never dig where the three stones meet, never dig when the moon is sweet.'
Children sing it. No one remembers why. But the three stones are on the hill,
and the full moon is in three days. Someone buried something
they didn't want found."
(Children's rhyme encodes real warning.)`,
    },
    {
      scenario: "Historical Trauma",
      wrong: `"They survived a plague."
(Past event, no current effect.)`,
      right: `"No one shares cups in this town. Ever. Not even family.
The plague was 50 years ago. Everyone who shared cups died.
The fear was passed down with the dishes.
When the stranger drank from the shared flagon, silence fell."
(Trauma creates behavior that affects current events.)`,
    },
  ],
}));
