import {
  TokenUsage,
  GameState,
  TurnContext,
  GameResponse,
  LogEntry,
} from "../../../../types";

import { generateAdventureTurn, AgenticLoopResult } from "../turn/adventure";

// ============================================================================
// Entity Cleanup Logic - Thin wrapper over generateAdventureTurn
// ============================================================================

/**
 * Result of entity cleanup (same as AgenticLoopResult)
 */
export interface CleanupResult {
  response: GameResponse;
  logs: LogEntry[];
  usage: TokenUsage;
  changedEntities: Array<{ id: string; type: string }>;
}

/**
 * Build XML entity section with tool hints
 */
function buildEntityXml(state: GameState): string {
  const sections: string[] = [];

  // Inventory
  if (state.inventory && state.inventory.length > 0) {
    const items = state.inventory
      .map((i) => `    <item id="${i.id}">${i.name}</item>`)
      .join("\n");
    sections.push(`<inventory count="${state.inventory.length}" query="query_inventory" update="update_inventory" remove="remove_inventory">
${items}
  </inventory>`);
  }

  // Relationships (NPCs)
  if (state.npcs && state.npcs.length > 0) {
    const npcs = state.npcs
      .map((r) => `    <npc id="${r.id}">${r.visible?.name || "Unknown"}</npc>`)
      .join("\n");
    sections.push(`<npcs count="${state.npcs.length}" query="query_npcs" update="update_npcs" remove="remove_npcs">
${npcs}
  </npcs>`);
  }

  // Locations
  if (state.locations && state.locations.length > 0) {
    const locs = state.locations
      .map((l) => `    <location id="${l.id}">${l.name}</location>`)
      .join("\n");
    sections.push(`<locations count="${state.locations.length}" query="query_location" update="update_location" remove="remove_location">
${locs}
  </locations>`);
  }

  // Quests
  if (state.quests && state.quests.length > 0) {
    const quests = state.quests
      .map(
        (q) =>
          `    <quest id="${q.id}" status="${q.status}">${q.title}</quest>`,
      )
      .join("\n");
    sections.push(`<quests count="${state.quests.length}" query="query_quest" update="update_quest" remove="remove_quest">
${quests}
  </quests>`);
  }

  // Knowledge
  if (state.knowledge && state.knowledge.length > 0) {
    const knows = state.knowledge
      .map((k) => `    <entry id="${k.id}">${k.title}</entry>`)
      .join("\n");
    sections.push(`<knowledge count="${state.knowledge.length}" query="query_knowledge" update="update_knowledge" remove="remove_knowledge">
${knows}
  </knowledge>`);
  }

  // Character Skills
  if (state.character?.skills && state.character.skills.length > 0) {
    const skills = state.character.skills
      .map((s: any) => `    <skill id="${s.id || s.name}">${s.name}</skill>`)
      .join("\n");
    sections.push(`<character_skills count="${state.character.skills.length}" update="update_character" note="Use update_character with skills array">
${skills}
  </character_skills>`);
  }

  // Character Conditions
  if (state.character?.conditions && state.character.conditions.length > 0) {
    const conds = state.character.conditions
      .map(
        (c: any) =>
          `    <condition id="${c.id || c.name}">${c.name}</condition>`,
      )
      .join("\n");
    sections.push(`<character_conditions count="${state.character.conditions.length}" update="update_character" note="Use update_character with conditions array">
${conds}
  </character_conditions>`);
  }

  // Character Hidden Traits
  if (
    state.character?.hiddenTraits &&
    state.character.hiddenTraits.length > 0
  ) {
    const traits = state.character.hiddenTraits
      .map((t: any) => `    <trait id="${t.id || t.name}">${t.name}</trait>`)
      .join("\n");
    sections.push(`<hidden_traits count="${state.character.hiddenTraits.length}" update="update_character" note="Use update_character with hiddenTraits array">
${traits}
  </hidden_traits>`);
  }

  // Factions
  if (state.factions && state.factions.length > 0) {
    const facs = state.factions
      .map((f: any) => `    <faction id="${f.id}">${f.name}</faction>`)
      .join("\n");
    sections.push(`<factions count="${state.factions.length}" update="update_faction" remove="remove_faction">
${facs}
  </factions>`);
  }

  // Timeline Events
  if (state.timeline && state.timeline.length > 0) {
    const events = state.timeline
      .map(
        (e: any) =>
          `    <event id="${e.id || "no-id"}" time="${e.time || ""}">${e.event || e.description || ""}</event>`,
      )
      .join("\n");
    sections.push(`<timeline count="${state.timeline.length}" update="update_timeline" remove="remove_timeline">
${events}
  </timeline>`);
  }

  // Causal Chains
  if (state.causalChains && state.causalChains.length > 0) {
    const chains = state.causalChains
      .map(
        (c: any) =>
          `    <chain id="${c.id || "no-id"}" cause="${c.cause || ""}" effect="${c.effect || ""}"/>`,
      )
      .join("\n");
    sections.push(`<causal_chains count="${state.causalChains.length}" update="update_causal_chain" remove="remove_causal_chain">
${chains}
  </causal_chains>`);
  }

  return sections.length > 0
    ? sections.join("\n\n  ")
    : "<empty>No entities found.</empty>";
}

/**
 * Build the cleanup prompt with XML entity context and examples
 */
function buildCleanupPrompt(state: GameState): string {
  const entityXml = buildEntityXml(state);

  return `[CLEANUP] Analyze the current game state and perform entity cleanup.

<current_entities HINT="Each section shows: query/update/remove tools to use">
  ${entityXml}
</current_entities>

<task>
Identify and merge duplicate or redundant entities. For each entity type, the XML attributes show which tools to use.
</task>

<deduplication_examples>
  <example type="inventory">
    <duplicates>"iron_sword" "Iron Sword" and "rusty_sword" "Rusty Iron Sword"</duplicates>
    <action>
      1. query_inventory(query: "sword") to list all swords and identify potential duplicates
      2. query_inventory(id: "iron_sword") and query_inventory(id: "rusty_sword") to compare details
      3. update_inventory(id: "iron_sword", visible: {description: "A well-used iron sword, showing signs of rust"}) to merge info
      4. remove_inventory(id: "rusty_sword") to delete the duplicate
    </action>
  </example>

  <example type="npc">
    <duplicates>"guard_town" "Town Guard" and "guard_gate" "Guard at Gate"</duplicates>
    <action>
      1. query_npcs(query: "guard") to find all guard-related NPCs
      2. query_npcs(id: "guard_town") and query_npcs(id: "guard_gate") to compare
      3. update_npc(id: "guard_town", notes: "Also guards the main gate") to add info
      4. remove_npcs(id: "guard_gate") to delete duplicate
    </action>
  </example>

  <example type="location">
    <duplicates>"market_square" "Market Square" and "the_market" "The Market"</duplicates>
    <action>
      1. query_location(query: "market") to see similarly named locations
      2. query_location(id: "market_square") and query_location(id: "the_market") to compare
      3. update_location(id: "market_square", visible: {description: "The central market square..."}) to merge
      4. remove_location(id: "the_market") to delete duplicate
    </action>
  </example>

  <example type="quest">
    <duplicates>"quest_merchant" "Find the Merchant" and "quest_trader" "Locate Missing Trader"</duplicates>
    <action>
      1. query_quest(id: "quest_merchant") and query_quest(id: "quest_trader") to compare
      2. update_quest(id: "quest_merchant", description: "Find the missing merchant/trader...") to merge
      3. remove_quest(id: "quest_trader") to delete duplicate
    </action>
  </example>

  <example type="knowledge">
    <duplicates>"history_kingdom" "History of the Kingdom" and "past_kingdom" "Kingdom's Past"</duplicates>
    <action>
      1. query_knowledge(id: "history_kingdom") and query_knowledge(id: "past_kingdom") to compare
      2. update_knowledge(id: "history_kingdom", content: "Combined history...") to merge
      3. remove_knowledge(id: "past_kingdom") to delete duplicate
    </action>
  </example>

  <example type="character_skills">
    <duplicates>"Swordsmanship" and "Sword Fighting"</duplicates>
    <action>
      1. Use update_character with skills array containing only unique skills
      2. Remove the duplicate skill from the array
    </action>
  </example>

  <example type="faction">
    <duplicates>"guild_merchants" "Merchants Guild" and "guild_traders" "Trader's Guild"</duplicates>
    <action>
      1. Compare faction details
      2. update_faction(id: "guild_merchants", description: "Combined info...") to merge
      3. remove_faction(id: "guild_traders") to delete duplicate
    </action>
  </example>

  <example type="timeline">
    <duplicates>Two events both describing "Met the blacksmith"</duplicates>
    <action>
      1. Keep the more detailed event
      2. remove_timeline(id: "duplicate_event_id") to delete the redundant one
    </action>
  </example>
</deduplication_examples>

<rules>
- Be CONSERVATIVE: only merge if you're CONFIDENT they represent the SAME entity
- PRESERVE all important information when merging (combine descriptions, notes)
- ALWAYS use update_* to add merged details BEFORE using remove_*
- If no duplicates found, call finish_turn with narrative "No duplicates found"
</rules>

<output>
After cleanup, call finish_turn with:
- narrative: Summary of cleanup actions (e.g., "Merged 2 duplicate items, consolidated 1 NPC")
- choices: ["Continue your adventure"]
</output>`;
}

/**
 * 生成实体清理 (Entity Cleanup)
 *
 * Design: Entity Cleanup is a normal turn with:
 * 1. User action prefixed with [CLEANUP] to signal cleanup mode
 * 2. All entity IDs/names embedded in XML format with tool hints
 * 3. Deduplication examples for each entity type
 *
 * This ensures the same KV cache, same agentic loop, same tools system.
 */
export const generateEntityCleanup = async (
  inputState: GameState,
  context: TurnContext,
): Promise<CleanupResult> => {
  // Build cleanup prompt with entity context embedded
  const cleanupPrompt = buildCleanupPrompt(inputState);

  // Create a modified context for CLEANUP mode
  const cleanupContext: TurnContext = {
    ...context,
    userAction: cleanupPrompt,
  };

  // Use the same adventure turn generation
  const result: AgenticLoopResult = await generateAdventureTurn(
    inputState,
    cleanupContext,
  );

  return {
    response: result.response,
    logs: result.logs,
    usage: result.usage,
    changedEntities: result.changedEntities,
  };
};
