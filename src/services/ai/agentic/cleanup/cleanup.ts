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
    const items = state.inventory.map((i) => `    <item id="${i.id}">${i.name}</item>`).join("\n");
    sections.push(`<inventory count="${state.inventory.length}" query="query_inventory" update="update_inventory" remove="remove_inventory">
${items}
  </inventory>`);
  }

  // Relationships (NPCs)
  if (state.relationships && state.relationships.length > 0) {
    const npcs = state.relationships.map((r) => `    <npc id="${r.id}">${r.visible?.name || 'Unknown'}</npc>`).join("\n");
    sections.push(`<relationships count="${state.relationships.length}" query="query_relationship" update="update_relationship" remove="remove_relationship">
${npcs}
  </relationships>`);
  }

  // Locations
  if (state.locations && state.locations.length > 0) {
    const locs = state.locations.map((l) => `    <location id="${l.id}">${l.name}</location>`).join("\n");
    sections.push(`<locations count="${state.locations.length}" query="query_location" update="update_location" remove="remove_location">
${locs}
  </locations>`);
  }

  // Quests
  if (state.quests && state.quests.length > 0) {
    const quests = state.quests.map((q) => `    <quest id="${q.id}" status="${q.status}">${q.title}</quest>`).join("\n");
    sections.push(`<quests count="${state.quests.length}" query="query_quest" update="update_quest" remove="remove_quest">
${quests}
  </quests>`);
  }

  // Knowledge
  if (state.knowledge && state.knowledge.length > 0) {
    const knows = state.knowledge.map((k) => `    <entry id="${k.id}">${k.title}</entry>`).join("\n");
    sections.push(`<knowledge count="${state.knowledge.length}" query="query_knowledge" update="update_knowledge" remove="remove_knowledge">
${knows}
  </knowledge>`);
  }

  // Character Skills
  if (state.character?.skills && state.character.skills.length > 0) {
    const skills = state.character.skills.map((s: any) => `    <skill id="${s.id || s.name}">${s.name}</skill>`).join("\n");
    sections.push(`<character_skills count="${state.character.skills.length}" update="update_character" note="Use update_character with skills array">
${skills}
  </character_skills>`);
  }

  // Character Conditions
  if (state.character?.conditions && state.character.conditions.length > 0) {
    const conds = state.character.conditions.map((c: any) => `    <condition id="${c.id || c.name}">${c.name}</condition>`).join("\n");
    sections.push(`<character_conditions count="${state.character.conditions.length}" update="update_character" note="Use update_character with conditions array">
${conds}
  </character_conditions>`);
  }

  // Character Hidden Traits
  if (state.character?.hiddenTraits && state.character.hiddenTraits.length > 0) {
    const traits = state.character.hiddenTraits.map((t: any) => `    <trait id="${t.id || t.name}">${t.name}</trait>`).join("\n");
    sections.push(`<hidden_traits count="${state.character.hiddenTraits.length}" update="update_character" note="Use update_character with hiddenTraits array">
${traits}
  </hidden_traits>`);
  }

  // Factions
  if (state.factions && state.factions.length > 0) {
    const facs = state.factions.map((f: any) => `    <faction id="${f.id}">${f.name}</faction>`).join("\n");
    sections.push(`<factions count="${state.factions.length}" update="update_faction" remove="remove_faction">
${facs}
  </factions>`);
  }

  // Timeline Events
  if (state.timeline && state.timeline.length > 0) {
    const events = state.timeline.map((e: any) => `    <event id="${e.id || 'no-id'}" time="${e.time || ''}">${e.event || e.description || ''}</event>`).join("\n");
    sections.push(`<timeline count="${state.timeline.length}" update="update_timeline" remove="remove_timeline">
${events}
  </timeline>`);
  }

  // Causal Chains
  if (state.causalChains && state.causalChains.length > 0) {
    const chains = state.causalChains.map((c: any) => `    <chain id="${c.id || 'no-id'}" cause="${c.cause || ''}" effect="${c.effect || ''}"/>`).join("\n");
    sections.push(`<causal_chains count="${state.causalChains.length}" update="update_causal_chain" remove="remove_causal_chain">
${chains}
  </causal_chains>`);
  }

  return sections.length > 0 ? sections.join("\n\n  ") : "<empty>No entities found.</empty>";
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
    <duplicates>inv:3 "Iron Sword" and inv:7 "Rusty Iron Sword"</duplicates>
    <action>
      1. query_inventory(id: "inv:3") and query_inventory(id: "inv:7") to compare details
      2. update_inventory(id: "inv:3", visible: {description: "A well-used iron sword, showing signs of rust"}) to merge info
      3. remove_inventory(id: "inv:7") to delete the duplicate
    </action>
  </example>

  <example type="relationship">
    <duplicates>npc:2 "Town Guard" and npc:5 "Guard at Gate"</duplicates>
    <action>
      1. query_relationship(id: "npc:2") and query_relationship(id: "npc:5") to compare
      2. update_relationship(id: "npc:2", notes: "Also guards the main gate") to add info
      3. remove_relationship(id: "npc:5") to delete duplicate
    </action>
  </example>

  <example type="location">
    <duplicates>loc:1 "Market Square" and loc:4 "The Market"</duplicates>
    <action>
      1. query_location(id: "loc:1") and query_location(id: "loc:4") to compare
      2. update_location(id: "loc:1", visible: {description: "The central market square..."}) to merge
      3. remove_location(id: "loc:4") to delete duplicate
    </action>
  </example>

  <example type="quest">
    <duplicates>quest:1 "Find the Merchant" and quest:3 "Locate Missing Trader"</duplicates>
    <action>
      1. query_quest(id: "quest:1") and query_quest(id: "quest:3") to compare
      2. update_quest(id: "quest:1", description: "Find the missing merchant/trader...") to merge
      3. remove_quest(id: "quest:3") to delete duplicate
    </action>
  </example>

  <example type="knowledge">
    <duplicates>know:2 "History of the Kingdom" and know:5 "Kingdom's Past"</duplicates>
    <action>
      1. query_knowledge(id: "know:2") and query_knowledge(id: "know:5") to compare
      2. update_knowledge(id: "know:2", content: "Combined history...") to merge
      3. remove_knowledge(id: "know:5") to delete duplicate
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
    <duplicates>fac:1 "Merchants Guild" and fac:3 "Trader's Guild"</duplicates>
    <action>
      1. Compare faction details
      2. update_faction(id: "fac:1", description: "Combined info...") to merge
      3. remove_faction(id: "fac:3") to delete duplicate
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
