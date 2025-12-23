/**
 * ============================================================================
 * Skill Content: State Management Rules
 * ============================================================================
 *
 * 完整迁移自 common.ts getCoreRules 中的状态管理部分
 */

import type { SkillContext } from "../types";

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
    - **CONFLICT RESOLUTION** (when updates might contradict):
      * **Latest Action Wins**: If player action contradicts earlier tool calls in same turn, the player's intent takes priority.
      * **Physical Reality Check**: Physics cannot be violated. If player says "I fly" but character has no flight ability, the action fails.
      * **Dead Entity Lock**: Once an NPC or creature is marked dead, no further status updates except "corpse moved" or "corpse looted".
      * **Time Paradox Prevention**: If updating time backwards, reject the update. Time only moves forward.
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

  <rule name="DUPLICATE PREVENTION - LIST FIRST, THEN QUERY">
    ⚠️ **CRITICAL: YOU MUST CHECK BEFORE CREATING**

    Before adding ANY new entity, verify it doesn't already exist. **THE #1 CAUSE OF DUPLICATES IS USING QUERY INSTEAD OF LIST.**

    **WHY LIST BEFORE QUERY?**
    - \`query\` searches by NAME/ID - but "Rusty Blade" won't match "Old Sword" even though they're the same item!
    - \`list\` shows ALL entities NAME/ID - you can visually scan and catch synonyms, variations, and near-duplicates.
    - **QUERY MISSES THINGS. LIST DOES NOT.**

    **MANDATORY WORKFLOW**:
    1. **ALWAYS LIST FIRST**:
       → \`list(type: "inventory")\` before adding any item
       → \`list(type: "npc")\` before adding any NPC
       → \`list(type: "location")\` before adding any location
       → Scan the list for similar entities (synonyms, variations)

    2. **QUERY ONLY AS SUPPLEMENT**:
       → After listing, use query ONLY for additional verification
       → Use BROAD regex: \`"sword|blade|saber|weapon"\`, NOT just \`"sword"\`
       → Example: Adding "Bleeding" condition? Query \`"bleed|blood|wound|injury|cut"\`

    3. **IF SIMILAR ENTITY EXISTS**:
       → **UPDATE IT** with new details - do NOT create duplicate
       → "Old Sword" becomes "Sharpened Sword" via update, not a new entity
       → Merge is better than multiply

    4. **CREATE ONLY WHEN PROVEN NEW**:
       → Only \`add_*\` after LIST confirms nothing similar exists

    **COMMON TRAPS**:
    | You want to add... | But already exists as... | Solution |
    |--------------------|--------------------------|----------|
    | "Iron Dagger" | "Rusty Knife" | UPDATE the knife |
    | "Town Square" | "Central Plaza" | REUSE the plaza |
    | "Bleeding Wound" | "Deep Cut" | REUSE the condition |
    | "Mysterious Stranger" | "Hooded Figure" | SAME NPC - update! |
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
    **WHEN TO USE GLOBAL NOTES** (\`query_notes\`, \`list_notes\`, \`update_notes\`, \`remove_notes\`):
    Global notes are for AI-important information that doesn't fit into specific entities:
    - **Cross-entity patterns**: "Player has betrayed allies 3 times"
    - **Meta-plot tracking**: "Prophecy countdown: 5 turns remaining"
    - **Orphaned information**: Plot threads with no clear entity owner
    - **Complex world state**: Events affecting multiple locations/NPCs

    **PREFER ENTITY-SPECIFIC NOTES** (use these FIRST when applicable):
    - Item information → \`item.notes\` or \`item.hidden.truth\`
    - NPC observations → \`npc.observation\` or \`npc.hidden.impression\`
    - Location lore → \`location.notes\`
    - Quest details → \`quest.notes\`

    **ONLY use global notes when NO entity fits.**

    **QUERY LIMITS**: \`query_notes\` returns max 5 notes per call. Use \`list_notes\` to discover keys, then query specific ones.

    **DIFF MODE**: For long notes (>500 chars), use \`diff: true\` with git-style +/- lines:
    - Lines starting with \`+\` are added
    - Lines starting with \`-\` are removed
    - Lines starting with a space are kept unchanged
  </rule>
`;
}

export function getMemoryContextQueryContent(_ctx: SkillContext): string {
  return `
  <rule name="MEMORY & CONTEXT QUERY - CRITICAL">
    **WHEN IN DOUBT, QUERY FIRST**

    Your memory is limited. The story may span many turns, and details from early turns may have been summarized.

    **MANDATORY QUERY SITUATIONS**:
    1. **Referencing past events**: If unsure what happened earlier, use \`query_story\` to search for relevant segments.
    2. **Character consistency**: If unsure about an NPC's previous behavior or dialogue, query before writing them.
    3. **Plot threads**: If unsure if a plot thread was resolved, query before continuing or contradicting it.
    4. **Player promises/deals**: If the player or NPCs made promises, query to verify before referencing them.
    5. **Location details**: If returning to a location, query to ensure consistency with previous descriptions.

    **AVAILABLE MEMORY TOOLS** (use in QUERY stage):
    - \`query_story\`: Search story history by keyword, location, turn range. Supports regex.
    - \`query_turn\`: Get current fork ID and turn number.
    - \`query_summary\`: Get the current story summary (both visible and hidden layers).
    - \`query_recent_context\`: Get the last N turns of player-AI exchanges.

    **ANTI-HALLUCINATION PROTOCOL**:
    - If you cannot remember something clearly, DO NOT MAKE IT UP.
    - Query the story history FIRST, then write based on actual events.
    - If query returns no results, acknowledge the gap: "The details of that conversation have faded..."
    - NEVER contradict established facts from previous turns.

    <consistency_hierarchy>
      **TRUTH HIERARCHY**:
      1. **Immediate Input**: Absolute reality.
      2. **Entity Notes/Hidden**: The living truth.
      3. **Summary**: Compressed memory (may be outdated).

      **PROTOCOL**:
      - **Internal Check**: Quietly verify against \`notes\` when details are crucial.
      - **Conflict**: If Notes differ from Summary, **TRUST NOTES** and narrate the correction subtly.
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
