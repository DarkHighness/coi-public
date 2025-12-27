/**
 * Core Atom: Tool Usage (Dynamic Tool Loading & Instructions)
 * Content from output_format.ts
 */
import type { Atom } from "../types";

export interface ToolUsageInput {
  finishToolName?: string;
}

export const toolUsage: Atom<ToolUsageInput> = (input) => {
  const finishTool = input?.finishToolName || "finish_turn";

  return `
<tool_loading_instruction>
  **SYSTEM TOOL: search_tool - DYNAMIC TOOL LOADING**

  You operate in an AGENTIC environment with **dynamic tool loading**. You start with only minimal tools (\`search_tool\`, \`${finishTool}\`). To perform specific actions, you must first LOAD the required tools using \`search_tool\`.

  <why_dynamic_loading>
    - **Efficiency**: Loading all 50+ tools is wasteful; load only what you need.
    - **Context Conservation**: Fewer tools = more room for narrative context.
    - **Precision**: You explicitly declare intent before acting.
  </why_dynamic_loading>

  <master_guide_by_tool_type>
    **1. QUERY TOOLS (Information Gathering)**
    *Goal: "I need to know X before I can write Y."*
    - **The "Check-First" Rule**: Never assume. If you are about to write "You see a sword," CHECK if a sword exists first.
    - **Regex Power**: Use regex for smart searches.
      * \`query_inventory({ query: "^rusty.*sword" })\` -> Finds "Rusty Iron Sword"
      * \`query_npcs({ query: "guard|soldier" })\` -> Finds any guard or soldier
    - **Broad vs Specific**:
      * \`list(type: "npc")\` -> See ALL NPCs (good for "who is in this room?").
      * \`query_npcs({ query: "Captain" })\` -> Get details on a specific person.

    **2. STATE TOOLS (Add, Update, Remove)**
    *Goal: "The world has changed."*
    - **The "Check-then-Act" Workflow**:
      1. **Search**: \`search_tool({ queries: [{ "operation": "query", "entity": "inventory" }, { "operation": "add", "entity": "inventory" }] })\`
      2. **Check**: \`query_inventory({ query: "Apple" })\` (Does he already have one?)
      3. **Act**:
         * If exists: \`update_inventory({ id: "inv_apple_1", ... })\`
         * If new: \`add_inventory({ id: "inv_apple_2", ... })\`
    - **Atomic Updates**: Update ALL related things in one turn. (See "Maximum Density Principle").

    **3. ACTIVATE_SKILL (Specialized Capabilities)**
    *Goal: "I need expert knowledge for this specific scene."*
    - **When to use**:
      - **Combat**: \`activate_skill({ skillIds: ["combat"] })\` -> Loads injury tables, weapon reaches, pain descriptions.
      - **Social Logic**: \`activate_skill({ skillIds: ["npc_logic"] })\` -> Loads gossip rules, social networks, psychology.
      - **Mystery**: \`activate_skill({ skillIds: ["mystery"] })\` -> Loads foreshadowing techniques, clue planting rules.
    - **How it works**: Calling this ADDS the specialized skill prompt to your context for the rest of the turn (and future usage).

    **4. NOTES TOOLS (Long-Term Memory)**
    *Goal: "I need to remember this plot thread for later."*
    - **Use for**: Prophecies, faction agendas, complex schemes, things not attached to one item/NPC.
    - **Workflow**: \`list_notes\` (check existence) -> \`query_notes\` (read content) -> \`update_notes\` (append/modify).
  </master_guide_by_tool_type>

  <how_to_use>
    **Step 1: Identify What You Need**
    - Want to give player an item? → Need \`add_inventory\`
    - Want to update NPC status? → Need \`update_npc\`
    - Want to check quest status? → Need \`query_quests\`
    - Want to trigger a consequence? → Need \`trigger_causal_chain\`
    - Need combat rules? → Need \`activate_skill\`
    - Want to observe/record player psychology? → Need \`update_player_profile\`
    - Need to recall player behavior patterns? → Need \`query_player_profile\`

    **Step 2: Call search_tool**
    Invoke the \`search_tool\` function with the required \`queries\`.
    Example: \`search_tool({ queries: [{ "operation": "add", "entity": "inventory" }] })\`

    **Step 3: Use the Loaded Tools**
    In the SAME turn or next turn, the requested tools become available. Call them directly.
  </how_to_use>

  <operation_reference>
    **OPERATIONS** (what action to perform):

    | Operation   | Description                                        | Example Use                          |
    |-------------|---------------------------------------------------|--------------------------------------|
    | add         | Create new entity                                  | add_inventory, add_quest             |
    | update      | Modify existing entity                             | update_npc, update_location          |
    | remove      | Delete entity                                      | remove_inventory, remove_condition   |
    | query       | Get detailed info about one entity                 | query_inventory, query_factions      |
    | list        | Get paginated list of all entities of a type       | list (generic tool)                  |
    | unlock      | Reveal hidden info to player                       | unlock_entity                        |
    | trigger     | Trigger pending causal chain consequence           | trigger_causal_chain                 |
    | resolve     | Mark causal chain as resolved                      | resolve_causal_chain                 |
    | interrupt   | Cancel causal chain before triggering              | interrupt_causal_chain               |
    | complete    | Mark quest as completed                            | complete_quest                       |
    | fail        | Mark quest as failed                               | fail_quest                           |
  </operation_reference>

  <entity_reference>
    **ENTITIES** (what type of game data):

    | Entity        | Description                               | Common Operations         | Canonical Query Tool |
    |---------------|-------------------------------------------|--------------------------|----------------------|
    | inventory     | Items player carries                      | add, update, remove, query | query_inventory      |
    | npc           | NPCs and their role to player             | add, update, remove, query | query_npcs           |
    | location      | Places in the game world                  | add, update, remove, query | query_locations      |
    | quest         | Active/completed missions                 | add, update, query, complete, fail | query_quests |
    | knowledge     | Information/lore player knows             | add, update, query       | query_knowledge      |
    | timeline      | Historical events                         | add, update, query       | query_timeline       |
    | faction       | Organizations and groups                  | add, update, remove, query | query_factions       |
    | causal_chain  | Cause-effect narrative logic              | add, update, query, trigger, resolve, interrupt | query_causal_chain |
    | attribute     | Character stats (HP, STR, etc.)           | add, update, remove, query | query_character_attributes |
    | skill         | Character abilities                       | add, update, remove, query | query_character_skills |
    | condition     | Temporary status effects                  | add, update, remove, query | query_character_conditions |
    | trait         | Hidden character traits                   | add, update, remove, query | query_character_traits |
    | profile       | Character profile info                    | update, query            | query_character_profile |
    | global        | World state (time, atmosphere)            | update, query            | query_global         |
    | story         | Story/narrative queries                   | query                    | query_story          |
    | turn          | Turn info                                 | query                    | query_turn           |
    | rag           | Semantic search in lore                   | query                    | rag_search           |
    | atmosphere    | Atmosphere enums                          | query                    | query_atmosphere_enums |
    | notes         | Global notes for AI memory                | query, list, update, remove | query_notes, update_notes |
    | world         | World state (alias for global)            | update                   | update_world_info    |
    | character     | All character aspects (aggregate)         | query, update            | (loads profile+attribute+skill+condition+trait tools) |
    | player_profile | Player psychology profiling (cross-save + per-save) | query, update | query_player_profile, update_player_profile |
  </entity_reference>

  <common_patterns>
    **COMMON WORKFLOW PATTERNS**:

    1. **Give Item to Player**:
       → \`search_tool\` with \`add:inventory\` → \`add_inventory\` with item details

    2. **Update NPC After Conversation**:
       → \`search_tool\` with \`update:npc\` → \`update_npc\` with new info

    3. **Check Then Act** (prevent duplicates):
       → \`search_tool\` with \`query:inventory\` → \`query_inventory\` to check → then \`add_inventory\` or \`update_inventory\`

    4. **Trigger Pending Consequence**:
       → \`search_tool\` with \`trigger:causal_chain\` → \`trigger_causal_chain\` with chain and consequence IDs

    5. **Complete Quest**:
       → \`search_tool\` with \`complete:quest\` → \`complete_quest\` with quest ID

    6. **Bulk Operations** (load multiple at once):
       → \`search_tool\` with \`queries: [{"operation": "add", "entity": "inventory"}, {"operation": "update", "entity": "npc"}, {"operation": "add", "entity": "knowledge"}]\`

    7. **Load Specialist Logic**:
       → \`activate_skill({ skillIds: ["combat", "npc_logic"] })\` -> Enables advanced rules for fight/social.

    8. **Update Player Psychology** (observe player behavior):
       → \`search_tool\` with \`update:player_profile\` → \`update_player_profile({ crossSave: "...", perSave: "..." })\`
       Use when: Player makes a defining choice that reveals their values, play style, or psychology.

    9. **Query Player Profile** (recall player patterns):
       → \`search_tool\` with \`query:player_profile\` → \`query_player_profile()\`
       Use when: Need to adapt narrative voice, choice generation, or NPC reactions based on player behavior.
  </common_patterns>

  <important_rules>
    ⚠️ **RULES**:
    - **Load Before Use**: You CANNOT call a tool that hasn't been loaded. If you need \`add_quest\`, you MUST first call \`search_tool\` with \`add:quest\`.
    - **Batch Loading**: Load multiple tool types in ONE \`search_tool\` call to be efficient.
    - **Tools Persist**: Once loaded, tools stay available for the rest of the turn and subsequent turns.
    - **finish_turn is Always Available**: You don't need to load \`${finishTool}\`.
  </important_rules>
</tool_loading_instruction>

<guidelines>
  - **MAXIMIZE TOOL USE**: Use as many tools as possible in a single turn to minimize round trips.
  - **PARALLEL CALLS**: Supported. Order matters (causal).
  - **BATCH UPDATES**: Modify multiple fields in ONE call. Do not call update twice for the same entity.
  - **LIST FIRST, THEN ADD**: ⚠️ Before adding ANY entity, call \`list(type: "...")\` FIRST to see ALL existing entities. Query searches by name and MISSES synonyms ("Blade" won't find "Sword"). List catches everything.
  - **NO REDUNDANT QUERIES**: Do not query if IDs are known from previous context. However, **Investigative Queries** (different params) are REQUIRED when verifying uniqueness.
  - **${finishTool.toUpperCase()} LAST**: Must be the LAST tool call. When ready to end, call it DIRECTLY.
</guidelines>
`;
};
