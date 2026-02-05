/**
 * ============================================================================
 * Entity Design Atom: Item Design Context
 * ============================================================================
 *
 * Item 设计上下文 - 用于 StoryOutline Phase 6。
 * 定义创建 Item 时的设计哲学和质量要求。
 *
 * Enriched with: categories, provenance chain, condition states,
 * hidden property types, curse mechanics, sentimental vs practical value
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

/**
 * Item 设计上下文 - 完整版
 */
export const itemDesign: Atom<void> = () => `
<game_system_context>
**ITEM DESIGN FOR REALITY RENDERING ENGINE:**

Items are not just "loot"—they are pieces of the world's history.

<item_categories>
**ITEM CATEGORIES:**

**WEAPONS**: Tools of violence with personality
- Who made it? For whom? What battles has it seen?
- How does it feel in the hand? Heavy? Eager? Reluctant?
- What does owning this weapon say about you?

**ARMOR**: Protection with cost
- What has it protected against? What has it failed to stop?
- How does it smell? (Leather, oil, old sweat, blood)
- What movement does it restrict? What sounds does it make?

**CONSUMABLES**: Temporary power, permanent choice
- What does it taste/smell/feel like?
- What are the side effects?
- Is it addictive? Expensive? Forbidden?

**KEYS & TOOLS**: Access and utility
- What door does it open? Who else has a copy?
- What can it do that nothing else can?
- Who would kill to possess it?

**ARTIFACTS**: Power with price
- What makes it more than mundane?
- What is the cost of using it?
- What does it want? (All powerful items want something)

**MUNDANE**: The texture of reality
- Worn coins, old letters, dried flowers, children's toys
- Items that matter for sentimental reasons, not power
- These ground fantasy in human emotion
</item_categories>

<provenance_chain>
**PROVENANCE CHAIN** (Every item has a history):

**CREATOR** → **OWNERS** → **CURRENT HOLDER**

Each step adds to the item's story:

**CREATOR**:
- Who made it? Master craftsman or desperate amateur?
- Under what circumstances? Commission, passion, necessity?
- What did they put into it? Skill, love, blood, spite?

**OWNERS** (Track 2-3 notable owners):
- Who possessed it? For how long?
- How did they acquire it? How did they lose it?
- What did they use it for? What did it witness?
- Did they leave a mark on it? (notch, inscription, stain)

**CURRENT HOLDER**:
- How did the protagonist get it?
- What does it mean to them?
- What would they do if they lost it?

**LORE FIELD EXAMPLES:**
✅ GOOD lore: "Forged by Master Yun of the Iron Peaks in the Year of Falling Stars. The blade was quenched in wolf's blood, giving it a faint howl when swung. It passed through three owners—all died violently. The protagonist found it in his father's chest, hidden under old letters."
❌ BAD lore: "An old sword with magic power."
</provenance_chain>

<condition_states>
**CONDITION STATES:**

Items exist on a spectrum of decay:

| State | Description | Mechanical Effect |
|-------|-------------|-------------------|
| **PRISTINE** | New or meticulously maintained | Full effectiveness, noticeable |
| **WORN** | Signs of use, still functional | Full effectiveness, unremarkable |
| **WEATHERED** | Age and history visible | Slight reduction, character |
| **DAMAGED** | Specific harm, needs repair | Reduced effectiveness |
| **BROKEN** | Barely functional | Heavily impaired, may fail |
| **RUINED** | Beyond repair | Sentimental value only |

**CONDITION TELLS:**
- "The edge is chipped from blocking a sword meant for your neck"
- "The grip is worn smooth where your father's hand held it for 20 years"
- "The blade is notched—three marks, three kills"
- "The leather has cracked from the cold, but still holds"
- "The mirror is scratched. Some scratches look like fingernails."

**DEGRADATION OVER TIME:**
- Metal rusts, dulls, chips
- Leather cracks, stiffens, rots
- Cloth frays, tears, stains
- Wood warps, splinters, burns
- Magic... leaks? Corrupts? Hungers?
</condition_states>

<hidden_properties>
**HIDDEN PROPERTIES:**
Items may have secrets that reveal under conditions:

**BLOOD-ACTIVATED**:
- The blade glows when it tastes blood (any blood)
- The gem pulses when dipped in royal blood
- The bindings loosen when fed

**EMOTION-REACTIVE**:
- The amulet grows warm when someone nearby lies
- The ring tightens when its wearer feels fear
- The pendant glows brighter the more you love someone

**TIME-TRIGGERED**:
- The inscription becomes visible only under full moon
- The door opens only at midnight on the winter solstice
- The weapon is dormant until the stars align

**LOCATION-SPECIFIC**:
- The map only works within the city walls
- The key hums when near its lock
- The compass points to the place you most need to be

**DEATH-SENSITIVE**:
- The ring tightens when its wearer is about to die
- The blade sings when a worthy enemy approaches
- The mirror shows the faces of those you've killed

**HIDDEN PROPERTY QUESTIONS:**
- What triggers the reveal?
- Who knows about this property?
- How was it discovered?
- Can it be faked? Suppressed? Removed?
</hidden_properties>

<curse_mechanics>
**CURSE MECHANICS:**

Cursed items are transactions, not traps.

**THE BARGAIN**:
- What power does the item grant?
- What price does it extract?
- Can you live with the exchange?

**ESCALATION PATTERNS**:
- First use: Minor cost, major benefit
- Continued use: Costs grow, benefits feel necessary
- Addiction: Can't stop, don't want to
- Endgame: Cost becomes catastrophic

**COST TYPES**:
| Type | Example |
|------|---------|
| **Physical** | Drains vitality, causes pain, marks the body |
| **Mental** | Paranoia, obsession, memory loss |
| **Social** | Drives away friends, makes you suspicious |
| **Moral** | Demands dark deeds, erodes conscience |
| **Temporal** | Steals time, accelerates aging |
| **Spiritual** | Claims your soul, angers gods, attracts demons |

**REMOVAL CONDITIONS**:
- Can the curse be lifted?
- What does it require? (Quest, sacrifice, consent)
- What happens to the item after?
- What happens to you?

**CURSE EXAMPLES:**
✅ GOOD: "The sword grants perfect clarity in battle—you never hesitate, never doubt. But clarity follows you home. You see your wife's small deceptions, your children's innocent lies. Every imperfect thing becomes unbearable."
❌ BAD: "The sword is cursed and makes you do evil things."
</curse_mechanics>

<emotional_weight>
**EMOTIONAL WEIGHT:**

**SENTIMENTAL VS PRACTICAL VALUE:**

| Practical | Sentimental |
|-----------|-------------|
| +5 damage | Father's blade |
| Magical healing | Mother's locket |
| Lockpicks | Brother's lucky coin |
| Gold coins | Letters from the dead |

The best items are both.

**EMOTIONAL WEIGHT EXAMPLES:**
✅ GOOD emotionalWeight: "This compass belonged to your brother, who never returned from his voyage. You carry it hoping it will lead you to answers—or his grave."
❌ BAD emotionalWeight: "It's useful for navigation."

**EMOTIONAL QUESTIONS:**
- Who gave it to you?
- Who did it belong to before?
- What would losing it cost you (emotionally)?
- Would you trade it for something better (mechanically)?
- What memory does touching it invoke?
</emotional_weight>

<loss_and_recovery>
**LOSS & RECOVERY:**

What happens when items are lost?

**LOSS SCENARIOS:**
- Stolen: Who took it? Can you track them?
- Destroyed: Is it truly gone? Can it be reforged?
- Surrendered: Did you give it up? Why? To whom?
- Traded: Was it worth it? Do you regret it?
- Left behind: Where is it now? Who might find it?

**RECOVERY OPTIONS:**
- Quest to retrieve
- Pay ransom
- Steal it back
- Create a replacement (never the same)
- Accept the loss

**ITEM ECHOES:**
- Does losing the item affect you beyond mechanics?
- Do you dream about it?
- Do you see it in windows, on strangers?
- Does the loss define you?
</loss_and_recovery>
</game_system_context>
`;

/**
 * Item 设计上下文 - 精简版
 */
export const itemDesignPrimer: Atom<void> = () => `
<game_system_context>
**ITEM DESIGN**: Items are history pieces, not loot.
- Categories (weapons, armor, consumables, keys, artifacts, mundane)
- Provenance chain (creator → owners → current holder)
- Condition states (pristine → worn → damaged → ruined)
- Hidden properties (blood, emotion, time, location, death triggers)
- Curse mechanics (bargain, escalation, cost types, removal)
- Emotional weight (sentimental vs practical value)
</game_system_context>
`;

export default itemDesign;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const itemDesignSkill: SkillAtom<void> = (): SkillOutput => ({
  main: itemDesign(),

  quickStart: `
1. Provenance: Creator → Owners → Current holder (each step adds story)
2. Condition: Where on pristine → ruined spectrum? Show wear, don't tell.
3. Hidden Properties: What secrets reveal under conditions?
4. Emotional Weight: What does losing it cost beyond mechanics?
5. Curse Bargain: Power granted vs price extracted (escalating)
6. Lore: Specific history (not "old sword with magic power")
`.trim(),

  checklist: [
    "Provenance chain defined (creator, notable owners)?",
    "Condition shown through specific details (not just 'damaged')?",
    "Hidden properties have specific trigger conditions?",
    "Emotional weight defined (who gave it, what it means)?",
    "If cursed: bargain clear (power vs price)?",
    "If cursed: escalation pattern defined?",
    "Lore is specific (not generic 'magical item')?",
    "Loss consequences considered?",
  ],

  examples: [
    {
      scenario: "Provenance Chain",
      wrong: `lore: "An old sword with magic power."
(No history, no character.)`,
      right: `lore: "Forged by Master Yun in the Year of Falling Stars.
Quenched in wolf's blood—faint howl when swung.
Three owners, all died violently.
Found in father's chest, hidden under old letters."
(Creator, method, owners, acquisition.)`,
    },
    {
      scenario: "Condition Details",
      wrong: `"The sword is damaged."
(Tells, doesn't show.)`,
      right: `"The edge is chipped from blocking a sword meant for your neck.
The grip worn smooth where your father's hand held it for 20 years.
Three notches on the blade—three kills you remember."
(Specific damage tells stories.)`,
    },
    {
      scenario: "Emotional Weight",
      wrong: `emotionalWeight: "It's useful for navigation."
(Practical, not emotional.)`,
      right: `emotionalWeight: "This compass belonged to your brother,
who never returned from his voyage. You carry it hoping
it will lead you to answers—or his grave."
(Specific person, specific loss, specific hope.)`,
    },
    {
      scenario: "Curse Bargain",
      wrong: `"The sword is cursed and makes you do evil things."
(Vague, no agency.)`,
      right: `"The sword grants perfect clarity in battle—you never hesitate.
But clarity follows you home. You see your wife's small deceptions,
your children's innocent lies. Every imperfect thing becomes unbearable."
(Clear power, clear cost, player must choose.)`,
    },
  ],
});
