/**
 * ============================================================================
 * Skill Content: State Management Rules (存在的持续性)
 * ============================================================================
 *
 * 维度分类: ACTING (How the world persists and changes)
 * 本体论层级: Level 0-1 (METAPHYSICS/PHYSICS - State is the fabric of reality)
 *
 * 哲学基础：
 * - 赫拉克利特: 万物流变 — 状态是存在的河流，不断变化但保持同一性
 * - 巴门尼德: 存在者存在 — 被记录的实体是真实的，未记录的是虚无
 * - 莱布尼茨: 同一性法则 — 每个实体有唯一 ID，ID 即本质
 * - 海德格尔: 上手性 — 工具（实体）在使用中显现自身
 *
 * 核心原则：
 * - 状态是世界的物理法则，不为"酷炫"而弯曲
 * - 如果你写了它，你必须追踪它；如果你追踪它，它必须发生过
 * - 时间只向前流动，状态不可回溯
 */

import type { SkillContext } from "../../types";

export function getStateManagementContent(_ctx: SkillContext): string {
  return `
  <rule name="STATE MANAGEMENT">
    - Output ONLY changes (DELTAS).
    - **PROACTIVE UPDATE PRINCIPLE**: ALWAYS update state IMMEDIATELY when events occur. Do NOT delay updates.
      * When a character gains/loses an item → update inventory in the SAME turn.
      * When an NPC moves or changes status → update their currentLocation/status in the SAME turn.
      * When time passes → update time in the SAME turn.
      * When npcs change (affinity, impression) → update npcs in the SAME turn.
      * When world events happen → update worldEvents/factions in the SAME turn.
      * **NEVER** rely on future turns to "catch up" on state changes. State must reflect reality at ALL times.
    - **CASCADE EFFECTS**: When one state changes, consider what else MUST change:
      * Item destroyed → Remove from inventory + update any NPC who wanted it.
      * NPC dies → Update all npcs involving them + faction standing + quest objectives.
      * Location destroyed → Update all NPCs who lived there + any related quests.
      * Time passes significantly → Update NPC positions based on their \`hidden.routine\`.
    - **UPDATE PRIORITY** (when multiple changes occur):
      1. Life-threatening changes (death, severe injury)
      2. Location changes (who is where)
      3. NPC changes (affinity, status)
      4. Inventory changes
      5. Knowledge updates
      6. Time and atmosphere
    - **CONSISTENCY CHECK** (before updating, verify):
      * Does this entity exist? (Don't update non-existent items)
      * Is the change logically possible? (Dead NPCs can't move)
      * **Trait Continuity**: Does this action contradict a physical trait? (A mute NPC cannot "shout")
      * Does this contradict recent events? (Can't find an item you just lost)
    - **Inventory**: Add/Remove/Update. Use \`sensory\` (texture, weight, smell) and \`condition\` for physical depth. Always include \`hidden.truth\` for items with secrets.
    - **NPCs**: Track affinity, impression, location, and status.
      * **ALWAYS include**: visible.npcType, hidden.npcType, hidden.status, visible.status, visible.affinity, visible.age, hidden.realAge, description, personality, currentLocation.
      * **Immersive Fields**: Use \`visible.voice\`, \`visible.mannerism\`, \`visible.mood\` to bring NPCs to life.
      * **Inner Life**: Use \`hidden.currentThought\` to track their internal monologue.
      * **visible.status**: What the protagonist BELIEVES the NPC is doing (their perception).
      * **hidden.status**: What the NPC is ACTUALLY doing (the truth).
      * **currentLocation**: The location ID where this NPC is currently located. ALWAYS UPDATE THIS when NPC moves.
      * **Distinction**: visible.personality (reputation) vs hidden.realPersonality (true nature).
    - **Time**: Always update time if it passes.
    - **World Events**: Record significant off-screen events.
    - **Factions**: Update agendas/reputations.
    - **Knowledge**: Add significant lore (never remove).
    - **Locations**: Use \`visible.atmosphere\` to override global atmosphere. Use \`visible.sensory\` (smell, sound, lighting, temperature) and \`visible.interactables\` for immersion.
    - **Enums**:
      * **Weather**: Use \`atmosphere.weather\` (none, rain, snow, fog, embers, flicker, sunny).
      * **Conditions**: Use \`condition.type\` (normal, wound, poison, buff, debuff, mental, curse, stun, unconscious, tired, dead).
        - **IMPORTANT**: Use \`mental\` type for significant psychological states ("Shaken", "Terrified", "Grief-stricken") that should persist and affect narrative.
    - **CONFLICT RESOLUTION** (when updates might contradict):
      * **Latest Action Wins**: If player action contradicts earlier tool calls in same turn, the player's intent takes priority.
      * **Physical Reality Check**: Physics cannot be violated. If player says "I fly" but character has no flight ability, the action fails.
      * **Dead Entity Lock**: Once an NPC or creature is marked dead, no further status updates except "corpse moved" or "corpse looted".
      * **Time Paradox Prevention**: If updating time backwards, reject the update. Time only moves forward.
    - **NARRATIVE-STATE BINDING (MANDATORY)**:
      * **Rule**: "If you write it, you MUST track it. If you track it, it MUST have happened."
      * ❌ Narrative: "He hands you the key." (No tool call) -> **STRICT FORBIDDEN**
      * ✅ Narrative: "He hands you the key." + Tool: \`add_inventory({ id: "inv_key" })\`
      * ❌ Narrative: "The bridge collapses." (No tool call) -> **STRICT FORBIDDEN**
      * ✅ Narrative: "The bridge collapses." + Tool: \`update_location({ id: "loc_bridge", visible: { description: "Rubbles..." } })\`

    - **WORLD INDIFFERENCE**:
      * **Time**: Time passes regardless of player wishes. If they waste time, quest deadlines fail. Daily fees accumulate.
      * **Consequences**: Do not protect the player from their own stupidity. If they insult a King, they get arrested. No "warnings".
      * **State Truth**: The State is the physics of the world. It does not bend for "coolness".

    - **ATOMICITY**: Treat each turn's updates as a transaction. Either ALL updates succeed, or explain why some failed and proceed with valid ones.
  </rule>
`;
}

export function getIdGenerationContent(_ctx: SkillContext): string {
  return `
  <rule name="ID FIELD USAGE - CRITICAL">
    **ID FIELDS ARE FOR TOOL CALLS ONLY**

    ⚠️ **THE MOST IMPORTANT RULE ABOUT IDs**:
    - The \`id\` field exists ONLY for **tool call operations** (add/update/remove/query).
    - **NEVER** include IDs in ANY narrative or descriptive content.
    - IDs are **backend identifiers**, NOT player-facing information.

    **WHERE IDs BELONG (ONLY THESE PLACES)**:
    ✅ Tool call arguments: \`add_inventory({ id: "sword_of_kings", ... })\`
    ✅ Tool call arguments: \`update_npc({ id: "npc_marcus", ... })\`
    ✅ Tool call arguments: \`query_inventory({ id: "healing_potion" })\`
    ✅ Entity \`currentLocation\` field (references location ID): \`{ currentLocation: "loc_tavern" }\`

    **WHERE IDs MUST NEVER APPEAR**:
    ❌ \`narrative\` field: "You see npc_marcus approaching..." → WRONG!
    ❌ \`visible.description\`: "The sword_of_kings glows..." → WRONG!
    ❌ \`hidden.secrets\`: ["loc_cellar contains treasure"] → WRONG!
    ❌ \`choices[].text\`: "Talk to npc_captain" → WRONG!
    ❌ Any player-facing text whatsoever

    **CORRECT EXAMPLES**:
    ✅ narrative: "You see **Marcus** approaching..." (use visible.name)
    ✅ visible.description: "The legendary **Sword of Kings** glows..." (use item name)
    ✅ choices: [{ text: "Talk to the captain" }] (use role/title/description)
  </rule>

  <rule name="ID GENERATION - REQUIRED">
    **YOU MUST GENERATE IDs FOR ALL ENTITIES**

    Every entity you create MUST have a unique \`id\` field. The system will NOT generate IDs for you.

    **MANDATORY REQUIREMENTS**:
    - **IDs are REQUIRED**: All entities (items, NPCs, locations, quests, knowledge, factions, skills, conditions, traits, timeline events) MUST have an \`id\`.
    - **YOU generate IDs**: The system will ERROR if you don't provide an ID. There is NO fallback.
    - **Uniqueness is YOUR responsibility**: Each ID must be unique within its type.
    - **IDs are IMMUTABLE**: Once created, the ID CANNOT change. Use the ORIGINAL ID when updating.

    **BEST PRACTICES**:
    1. **Be Descriptive**: \`"sword_of_kings"\` is better than \`"item_42"\`
    2. **Use Prefixes**: Start with entity type (\`inv_\`, \`npc_\`, \`loc_\`, \`quest_\`, etc.)
    3. **Use snake_case**: \`"ancient_temple"\` not \`"AncientTemple"\`
    4. **Be Consistent**: If you use \`"npc_marcus"\`, continue with \`"npc_sara"\`, not \`"sara"\`

    **ID IMMUTABILITY**:
    - \`action: "update"\` uses \`id\` for IDENTIFICATION ONLY
    - You CANNOT change an entity's ID - it will ERROR
    - To "rename" an ID: remove old entity, add new one with new ID

    **EXAMPLES**:
    ✅ CORRECT:
    \`\`\`json
    { "id": "inv_healing_potion", "name": "Minor Healing Potion", "visible": { "description": "A small vial of red liquid." } }
    { "id": "npc_marcus", "visible": { "name": "Marcus", "description": "A grizzled veteran with a scar across his left eye." } }
    \`\`\`

    ❌ INCORRECT:
    \`\`\`json
    { "name": "Healing Potion", ... }  // Missing ID
    { "id": null, "name": "Marcus" }   // ID is null
    { "visible": { "description": "npc_marcus is a grizzled veteran..." } }  // ID in description!
    \`\`\`
  </rule>

    <rule name="MINIMAL ENTITY PRINCIPLE - QUALITY OVER QUANTITY">
    ⚠️ **CRITICAL: AVOID BLOAT, BUT MAXIMIZE DEPTH**

    **THE PRINCIPLE**:
    - **Minimal Quantity**: Do not create entities for trivial background noise (crowds, debris).
    - **Maximum Quality**: If you DO create an entity (NPC, Item, Location), it must be **RICH, DETAILED, AND HISTORICALLY GROUNDED**.
    - **Contextual Integration**: Newly created entities must integrate with the existing world state.
      * If there is a plague, a new NPC should be coughing or wearing a mask.
      * If there was a fire, a new building should have scorch marks or be a rebuild.

    - **Canonization**: If an existing entity is "close enough" (80% match), USE IT. Update it to fit your needs. Do NOT create a new one.
    - **One Object, One ID**: A "Rusty Sword" polished by a blacksmith is still \`inv_rusty_sword\` (just updated name/desc), NOT a new \`inv_polished_sword\`.
    - **Outline Continuity**: Do not re-create entities that were part of your character creation or world foundation. If the Outline made it, YOU usually made it. Query it first.

    **MANDATORY "INVESTIGATIVE SEARCH" WORKFLOW**:
    1. **STRICT CHECK-FIRST**: Never assume a clean state. Always assume entities might already exist.
    2. **LIST (Broad Scan)**: Call \`list(type: "...")\` to see the complete landscape. This is the MOST RELIABLE way to see all entities.
    3. **QUERY (Deep Scan)**: Call \`query(name: "...")\` or \`query(id: "...")\` for deep details.
    4. **MULTI-PARAM SEARCH**: If searching for "Guard Marcus", call query with "Marcus", then "Guard", then "Soldier".
       - ⚠️ **CLARIFICATION**: Calling the same tool (e.g., \`query_npcs\`) with **different parameters** is NOT a "duplicate call". It is a **necessary investigative action** and is HIGHLY ENCOURAGED.
    5. **EVALUATE**:
       - Found "Old Knife" but want "Dagger"? -> **USE "Old Knife"** and \`update\` name to "Dagger".
       - Found "Guard A" but want "Guard Captain"? -> **USE "Guard A"** and \`update\` role/title.
    4. **CREATE (Last Resort)**: Only if NO semantic match exists.

    **ANTI-CLUTTER & SIGNIFICANCE THRESHOLD**:
    ⚠️ **CRITICAL: ONLY CREATE "SIGNIFICANT" ENTITIES**

    **THE THRESHOLD (If it doesn't meet this, it is NARRATIVE ONLY)**:
    - **NPCs**:
      * **MUST HAVE**: A proper Name (not just "Guard") AND (Speaking Role OR Combat Role).
      * **NARRATIVE ONLY**: Crowds, background villagers, unnamed guards, servants causing no consequence.
      * *Example*: "The tavern is full of people" -> NO entities. "Captain Vance approaches you" -> Call \`add_npc\` (id: "npc_captain_vance").

    - **Items**:
      * **MUST BE**: Added to Player/NPC Inventory OR Key Quest Object.
      * **NARRATIVE ONLY**: Flavor objects, furniture, food eaten immediately, debris.
      * *Example*: "There is a mug on the table" -> NO entity. "You pick up the Iron Key" -> Call \`add_inventory\` (id: "inv_iron_key").

    - **Locations**:
      * **MUST BE**: Named, distinct, and revisit-able (e.g., "The Blue Dragon Inn").
      * **NARRATIVE ONLY**: Transitional spaces ("a hallway"), generic areas ("a forest path" - unless named).

    - **Quests**:
      * **MUST BE**: A structured mission with clear success/fail state tracked in journal.
      * **NARRATIVE ONLY**: Momentary goals ("Open the door", "Ask him a question"), impulsive actions.
      * *Example*: "I want to kill that goblin" -> NARRATIVE. "Guildmaster orders you to purge the camp" -> Call \`add_quest\` (id: "quest_purge_camp").

    - **Knowledge**:
      * **MUST BE**: Reusable information (passwords, history, recipes, secret locations).
      * **NARRATIVE ONLY**: One-off rumors, insults, throwaway lines.

    - **Factions**:
      * **MUST BE**: Established organizations with multiple members and political weight.
      * **NARRATIVE ONLY**: Small temporary gangs, a family unit (unless royal/powerful), "the people in this room".

    - **Timeline**:
      * **MUST BE**: World-altering events or major plot milestones (chapters).
      * **NARRATIVE ONLY**: Daily routines, minor scuffles, conversations.

    - **Conditions**:
      * **MUST BE**: Mechanical status effects with duration (Poisoned, Blessed, Injured).
      * **NARRATIVE ONLY**: Fleeting emotions ("Sad", "Angry"), minor discomforts ("Itchy").

    - **Causal Chains**:
      * **MUST BE**: Complex logic tracking consequences >3 turns away or involving off-screen NPCs.
      * **NARRATIVE ONLY**: Immediate reactions (You punch him -> he punches back).

    - **Inventory Hygiene**: If a player eats an apple, \`remove_inventory\` immediately. Do not keep \`inv_apple\` with quantity 0.

    <realism_vs_bloat_prevention>
      ⚠️ **CRITICAL: REALISM DOES NOT EQUAL ENTITY BLOAT**

      You have been instructed to simulate "Biological Imperatives" (hunger, mud, fatigue).
      **DO NOT CREATE ENTITIES FOR THESE** unless they are critical, long-term mechanics.

      - **Mud/Blood on Clothes**:
        * ❌ \`add_condition("cond_muddy")\` -> Bloat.
        * ✅ Narrative only OR \`update_inventory({ id: "inv_clothes", visible: { description: "Stained with mud." } })\`

      - **NPC Fatigue/Hunger**:
        * ❌ \`add_condition("cond_tired_guard")\` -> Bloat.
        * ✅ \`update_npc({ id: "npc_guard", visible: { mood: "Exhausted and irritable" } })\`

      - **Transient Atmosphere**:
        * ❌ \`add_item("item_fog")\` -> Absurd.
        * ✅ \`update_location({ visible: { atmosphere: "Thick fog..." } })\`

      **RULE**: Only create a new ID if it needs to be tracked *independently* and *mechanically* for >10 turns.
      For everything else, **UPDATE EXISTING FIELDS** (\`description\`, \`mood\`, \`status\`).

      **DUPLICATE PREVENTION (SESSION REBUILD)**:
      When a context is rebuilt or a session is initialized:
      - **DO NOT** blindly add entities described in the summary.
      - **ALWAYS** \`list\` and \`query\` first to see what actually exists in the database.
      - Summary descriptions may be outdated; the database (Entity Store) is the source of truth.
    </realism_vs_bloat_prevention>
  </rule>
`;
}

export function getUnlockVsHighlightContent(_ctx: SkillContext): string {
  return `
  <rule name="UNLOCKING vs HIGHLIGHTING - CRITICAL DISTINCTION">
    **TWO DIFFERENT SYSTEMS WITH DIFFERENT PURPOSES**:

    1. **\`unlocked: true\`** - REVELATION SYSTEM
       - **Purpose**: Mark that PLAYER now knows a previously hidden truth
       - **Scope**: Changes visible vs hidden boundary
       - **When to set**: Player discovers secret via investigation, NPC revelation, or ability
       - **Effect**: Hidden info becomes visible in player's knowledge
       - **Irreversible**: Once unlocked, stays unlocked (knowledge cannot be un-learned)
       - **GM Role**: You always see hidden info; \`unlocked\` only affects what PLAYER knows

    2. **\`highlight: true\`** - UI NOTIFICATION SYSTEM
       - **Purpose**: Draw player's attention to a CHANGE in the UI
       - **Scope**: Visual indicator only, does not affect hidden/visible
       - **When to set**: New item acquired, stat changed, npc updated
       - **Effect**: UI shows highlight indicator (yellow glow, badge, etc.)
       - **Transient**: UI clears highlight after player views it

    **COMMON MISTAKES**:
    - ❌ Using \`highlight\` to reveal secrets (use \`unlocked\` instead)
    - ❌ Forgetting \`highlight\` when adding new visible items
    - ❌ Setting \`unlocked\` for things that were already visible

    **CORRECT PATTERNS**:
    - Player finds hidden treasure: \`{ unlocked: true, highlight: true }\` (reveals AND highlights)
    - Player buys item from shop: \`{ highlight: true }\` (already visible, just new)
    - GM adds hidden backstory: No flags needed (hidden by default, GM sees it)
  </rule>
`;
}

export function getHiddenContentNarrationContent(_ctx: SkillContext): string {
  return `
  <rule name="HIDDEN CONTENT NARRATION - CRITICAL">
    **ABSOLUTELY FORBIDDEN: DIRECT MENTION OF HIDDEN NAMES**

    - **Hidden Trait Names**: NEVER directly state the name of a hiddenTrait in narrative unless \`unlocked: true\`.
    - **Hidden Skill True Names**: NEVER explicitly mention the true name of a skill's hidden nature.
    - **NPC Secret Names**: NEVER directly reveal hidden identities or organizations.

    **ALLOWED REVELATION METHODS**:
    1. **Vague/Suggestive Language**: "You feel a dark presence stirring within..."
    2. **Through Other NPCs**: An old sage whispers the secret...
    3. **Environmental Clues**: A scroll with your family name circled...
    4. **Visions/Hallucinations**: Ancestral spirits showing fragments...
    5. **Physical Manifestations**: Black veins forming ancient runes...

    **EXCEPTION**: Directly mention hidden names ONLY AFTER setting \`unlocked: true\` in the same turn.
  </rule>
`;
}

export function getGlobalNotesContent(_ctx: SkillContext): string {
  return `
  <rule name="GLOBAL NOTES SYSTEM">
    **THE "META-NARRATIVE" LAYER**:
    Global notes are your **Long-Term Strategic Memory**. They track things that transcend individual entities or turns.

    <when_to_use>
      **USE NOTES FOR**:
      1.  **Cross-Entity Patterns**: "The Player has lied to 3 different guards about his identity." (Connects multiple interactions)
      2.  **Meta-Plot & Time**: "Prophecy Countdown: 5 turns until the eclipse." (Time-based tracking)
      3.  **Orphaned Information**: "A mysterious blue symbol was seen in the forest." (No specific location/item to attach to yet)
      4.  **Complex World States**: "The Kingdom is on high alert due to the dragon attack." (Affects ALL guards/cities)
      5.  **GM Secrets**: "The 'Black Knight' is actually the King's brother." (Hidden truth waiting to be revealed)

      **DO NOT USE NOTES FOR**:
      - Simple Item Properties → Use \`item.visible.description\` or \`item.notes\`
      - NPC Personality → Use \`npc.personality\`
      - Quest Objectives → Use \`quest.visible.objectives\`
    </when_to_use>

    <lifecycle_management>
      **NOTES MUST BE MAINTAINED - DO NOT LET THEM ROT**:
      1.  **CREATE**: When a new plot thread begins.
          * \`update_notes({ key: "mystery_blue_symbol", value: "Seen in forest, glows at night." })\`
      2.  **UPDATE**: When new info is found. **APPEND** new info, don't just overwrite unless replacing.
          * \`update_notes({ key: "mystery_blue_symbol", value: "...Also seen on the King's ring.", diff: true })\`
      3.  **DELETE**: When the thread is resolved or the fact becomes obsolete.
          * *Example*: Player identifies the symbol.
          * Action: **REMOVE** \`mystery_blue_symbol\` note and **ADD/UPDATE** the actual 'knowledge' or 'faction' entity.
          * **CRITICAL**: If a note is no longer true (e.g., "Door is locked" -> Door is now open), **REMOVE IT IMMEDIATELY**.
    </lifecycle_management>

    <search_strategy>
      **AVOID DUPLICATES via "LIST THEN QUERY"**:
      - **Problem**: You want to track "The Red Dragon". You don't know if a note exists.
      - **Bad**: blindly adding key "red_dragon_info" (might duplicate "dragon_red_plot").
      - **Good**:
        1. Call \`list_notes({ search: "dragon" })\`
        2. See existing key "dragon_plot_v1"
        3. Update "dragon_plot_v1" instead of creating new.
    </search_strategy>

    <usage_limits>
      - **Query Limit**: \`query_notes\` returns max 5. Be specific with keys.
      - **Diff Mode**: ALWAYS use \`diff: true\` for notes >500 chars to save tokens.
    </usage_limits>
  </rule>
`;
}

export function getMemoryContextQueryContent(_ctx: SkillContext): string {
  return `
  <rule name="MEMORY & CONTEXT QUERY - CRITICAL">
    **WHEN IN DOUBT, QUERY FIRST - NEVER ASSUME**

    Your memory is limited. The story may span many turns, and details from early turns may have been summarized.
    **IF YOU ARE UNCERTAIN ABOUT WHAT HAPPENED IN THE PAST, YOU MUST USE QUERY TOOLS** - especially \`query_story\` - to recall past events before writing.

    **MANDATORY QUERY SITUATIONS**:
    1. **Referencing past events**: If unsure what happened earlier, use \`query_story\` to search for relevant segments.
    2. **Character consistency**: If unsure about an NPC's previous behavior or dialogue, query before writing them.
    3. **Plot threads**: If unsure if a plot thread was resolved, query before continuing or contradicting it.
    4. **Player promises/deals**: If the player or NPCs made promises, query to verify before referencing them.
    5. **Location details**: If returning to a location, query to ensure consistency with previous descriptions.
    6. **Emotional/Relationship states**: If unsure how an NPC feels about the player or another NPC, query recent interactions.
    7. **Timeline verification**: If unsure when something happened or in what order, query to establish chronology.

    **AVAILABLE MEMORY TOOLS** (use in QUERY stage):
    - \`query_story\`: Search story history by keyword, location, turn range. Supports regex. **USE THIS FIRST FOR PAST EVENTS.**
    - \`query_turn\`: Get current fork ID and turn number.
    - \`query_summary\`: Get the current story summary (both visible and hidden layers).
    - \`query_recent_context\`: Get the last N turns of player-AI exchanges.

    <continuity_awareness>
      ⚠️ **CRITICAL: DO NOT DRAW HASTY CONCLUSIONS FROM FRAGMENTARY RESULTS**

      Stories have **continuity**. A single search result shows only a fragment of a larger narrative arc.

      **THE DANGER OF FRAGMENT-BASED REASONING**:
      - A search for "Marcus betrayed" might return: "Marcus betrayed his former guild..."
      - **WRONG CONCLUSION**: "Marcus is a traitor!" (Jumping to judgment)
      - **RIGHT APPROACH**: Query more context. Maybe the full story is: "Marcus betrayed his former guild... because they were planning genocide. He became a hero for this act."

      **CONTINUITY PROTOCOL**:
      1. **Never judge from one snippet**: A single search result is a CLUE, not a VERDICT.
      2. **Query surrounding context**: Use \`includeContext: true\` or query adjacent turns.
      3. **Check for reversals**: A character who "died" may have been "resurrected" or "faked death" later.
      4. **Consider the arc**: A "villain" in turn 5 may be a "redeemed ally" by turn 20.
      5. **When in doubt, query more**: It's better to make 3 queries and be accurate than 1 query and be wrong.

      **EXAMPLES OF CONTINUITY TRAPS**:
      - ❌ "Query shows 'Sarah stole the gem'" → YOU ASSUME: "Sarah is a thief!"
        ✅ CORRECT: Query more. Maybe "Sarah stole the gem... to prevent it from destroying the village."
      - ❌ "Query shows 'The king fell'" → YOU ASSUME: "The king is dead!"
        ✅ CORRECT: Query more. Maybe "The king fell... to his knees in prayer" or "The king fell... but was caught by his guards."
      - ❌ "Query shows 'They parted ways'" → YOU ASSUME: "They broke up forever!"
        ✅ CORRECT: Query more. Maybe they reunited 5 turns later.

      **THE RULE**: Treat search results as **LEADS TO INVESTIGATE**, not **FACTS TO ASSUME**.
    </continuity_awareness>

    **ANTI-HALLUCINATION PROTOCOL**:
    - If you cannot remember something clearly, DO NOT MAKE IT UP.
    - Query the story history FIRST, then write based on actual events.
    - If query returns no results, acknowledge the gap: "The details of that conversation have faded..."
    - If query returns ambiguous results, query with different keywords or wider turn range.
    - NEVER contradict established facts from previous turns.
    - When unsure, **ASK THE STORY** via \`query_story\`, not your own imagination.

    <consistency_hierarchy>
      **TRUTH HIERARCHY**:
      1. **Immediate Input**: Absolute reality.
      2. **Entity Notes/Hidden**: The living truth.
      3. **Full Query Context**: The actual story as it unfolded.
      4. **Summary**: Compressed memory (may be outdated or lossy).

      **PROTOCOL**:
      - **Internal Check**: Quietly verify against \`notes\` when details are crucial.
      - **Conflict**: If Notes differ from Summary, **TRUST NOTES** and narrate the correction subtly.
      - **Ambiguity**: If unsure, query the story directly rather than guessing.
      - **Sync**: If narrative changes a key fact (e.g. injury), use \`update_*\` to sync \`notes\`. Do not "spam" updates for minor flavor.
    </consistency_hierarchy>
  </rule>
`;
}

export function getSystemRulesContent(_ctx: SkillContext): string {
  return `
  <rule name="SYSTEM RULES">
    - **Factions**: Members must have \`name\` and optional \`title\`. Do NOT use npc IDs.
    - **Quests**: Main/Side (visible), Hidden (not visible). \`hidden\` layer contains true objectives.
    - **Dual-Layer**: Visible (perception) vs Hidden (truth). AI always sees hidden, player sees visible until unlocked.
    - **Player Agency**: Do not block actions unless impossible. Escalate consequences for foolish persistence.
    - **Dice**: Critical Success (defies physics), Success (standard), Failure (consequences), Critical Failure (catastrophe).
    - **Tension**: Always leave a loose thread or cliffhanger.
  </rule>
`;
}

export function getAtmosphereDiscoveryContent(_ctx: SkillContext): string {
  return `
  <rule name="ATMOSPHERE DISCOVERY - CRITICAL">
    - **Valid Atmosphere Options**: Available values for \`envTheme\`, \`ambience\`, and \`weather\` are strictly validated.
    - **Discovery Tools**: If you are unsure about valid values or want to explore available styles:
      1. Use \`query_atmosphere_enums\` to see the full list of valid options.
      2. Use \`query_atmosphere_enum_description\` to get detailed descriptions of what those options represent.
    - **Selection Protocol**: Choose options that best match the current scene's tone and the story's theme. Do NOT hallucinate theme names.
  </rule>
`;
}

export function getVisualsContent(ctx: SkillContext): string {
  if (ctx.disableImagePrompt) return "";

  return `
  <rule name="VISUALS">
    - **Type 1 (Bird's Eye)**: New location intro - wide establishing shot showing the full environment.
    - **Type 2 (Player Perspective)**: What player sees - over-the-shoulder or third-person cinematic.
    - **Image Generation**: Provide \`imagePrompt\` for impactful moments (new locations, dramatic scenes, key encounters).

    **⚠️ imagePrompt MUST be in ENGLISH** (for image generation API compatibility).
    **Include the following details**:
    1. **Environment**: Specific location details from current location data
       - Use \`location.visible.description\`, \`location.visible.sensory\` (smell, sound, lighting, temperature)
       - Reference \`location.notes\` for writer's consistency notes
    2. **Protagonist**: Use character's actual name, race, appearance, current pose/action, expression
    3. **NPCs (YOU DECIDE)**: Include ONLY NPCs narratively present in this moment - you control who appears
       - Use \`npc.visible.appearance\` for visual details
       - Reference \`npc.notes\` for writer's consistency notes
    4. **Lighting & Atmosphere**: Time of day, light sources, shadows, mood, color palette
    5. **Key Objects**: Important items from inventory
       - Use \`item.visible.sensory\` for visual/tactile details (texture, weight, smell)
       - \`item.visible.observation\` is for player's notes, NOT for visual rendering
    6. **Composition**: Camera angle (wide shot, close-up, low angle, bird's eye, etc.)

    **DATA SOURCES FOR VISUALS**:
    - \`sensory\` fields are PRIMARY for visual rendering (texture, smell, lighting, temperature)
    - \`notes\` fields are writer's consistency notes for narrative coherence
    - \`observation\` (inventory only) is player's personal notes about items - NOT visual data
    - Hidden layer may contain visual clues (e.g., "weapon glows faintly") that should appear if \`unlocked\`

    **Example**: "Abandoned temple at dusk, golden sunset streaming through shattered stained glass windows. Marcus, an elderly warrior in silver armor, kneels on one knee before a damaged altar, hand resting on his sword. Behind him stands the blind priestess Mirella, hands raised in blessing. Blue-purple color palette with gold-orange accents. Solemn atmosphere, wide-angle shot from behind the altar."
  </rule>
`;
}

export function getIconsContent(_ctx: SkillContext): string {
  return `
  <rule name="ICONS">
    - **MANDATORY**: You MUST generate a single emoji \`icon\` for EVERY new or updated entity (Item, Location, Knowledge, Status, Skill, NPC, Faction, TimelineEvent, Attribute, Quest).
    - **Relevance**: The emoji must be visually relevant to the entity's name or nature (e.g., "Sword" -> ⚔️, "Forest" -> 🌲, "Secret" -> 🤫).
    - **Consistency**: Try to keep icons consistent for similar types of entities.
  </rule>
`;
}

export function getFormattingContent(_ctx: SkillContext): string {
  return `
  <rule name="FORMATTING">
    - **MARKDOWN ALLOWED**: You MAY use Markdown formatting in \`description\`, \`truth\`, \`secrets\`, \`notes\`, and other text fields.
    - **Bold**: Use **bold** for emphasis or key terms.
    - **Italic**: Use *italics* for internal thoughts or whispers.
    - **Lists**: Use bullet points for lists of features or secrets.
    - **NO COMPLEX BLOCKS**: Avoid code blocks or complex HTML in descriptions.
  </rule>
`;
}

export function getNpcObservationContent(_ctx: SkillContext): string {
  return `
  <rule name="NPC OBSERVATION">
    - NPCs react to what the player DISPLAYS, not what the player knows internally.
    - Use \`observation\` (in npc updates) to track specific things the NPC noticed about the player (e.g. "Player knows the secret code", "Player hides a wound").
    - NPCs use their \`hidden\` knowledge to interpret these observations.
  </rule>
`;
}
