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
      .map(
        (i) =>
          `    <item id="${i.id}" path="current/world/inventory/${i.id}.json" unlocked="${!!i.unlocked}">${i.name}</item>`,
      )
      .join("\n");
    sections.push(`<inventory count="${state.inventory.length}" dir="current/world/inventory">
${items}
  </inventory>`);
  }

  // Relationships (NPCs)
  if (state.npcs && state.npcs.length > 0) {
    const npcs = state.npcs
      .map(
        (r) =>
          `    <npc id="${r.id}" path="current/world/npcs/${r.id}.json" unlocked="${!!r.unlocked}">${r.visible?.name || "Unknown"}</npc>`,
      )
      .join("\n");
    sections.push(`<npcs count="${state.npcs.length}" dir="current/world/npcs">
${npcs}
  </npcs>`);
  }

  // Locations
  if (state.locations && state.locations.length > 0) {
    const locs = state.locations
      .map(
        (l) =>
          `    <location id="${l.id}" path="current/world/locations/${l.id}.json" unlocked="${!!l.unlocked}">${l.name}</location>`,
      )
      .join("\n");
    sections.push(`<locations count="${state.locations.length}" dir="current/world/locations">
${locs}
  </locations>`);
  }

  // Quests
  if (state.quests && state.quests.length > 0) {
    const quests = state.quests
      .map(
        (q) =>
          `    <quest id="${q.id}" path="current/world/quests/${q.id}.json" status="${q.status}" unlocked="${!!q.unlocked}">${q.title}</quest>`,
      )
      .join("\n");
    sections.push(`<quests count="${state.quests.length}" dir="current/world/quests">
${quests}
  </quests>`);
  }

  // Knowledge
  if (state.knowledge && state.knowledge.length > 0) {
    const knows = state.knowledge
      .map(
        (k) =>
          `    <entry id="${k.id}" path="current/world/knowledge/${k.id}.json" unlocked="${!!k.unlocked}">${k.title}</entry>`,
      )
      .join("\n");
    sections.push(`<knowledge count="${state.knowledge.length}" dir="current/world/knowledge">
${knows}
  </knowledge>`);
  }
  // Character Attributes
  if (state.character?.attributes && state.character.attributes.length > 0) {
    const attrs = state.character.attributes
      .map(
        (a: any) =>
          `    <attribute id="${a.id || a.name}" value="${a.value}">${a.name}</attribute>`,
      )
      .join("\n");
    sections.push(`<character_attributes count="${state.character.attributes.length}" file="current/world/character.json">
${attrs}
  </character_attributes>`);
  }
  // Character Skills
  if (state.character?.skills && state.character.skills.length > 0) {
    const skills = state.character.skills
      .map((s: any) => `    <skill id="${s.id || s.name}">${s.name}</skill>`)
      .join("\n");
    sections.push(`<character_skills count="${state.character.skills.length}" file="current/world/character.json">
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
    sections.push(`<character_conditions count="${state.character.conditions.length}" file="current/world/character.json">
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
    sections.push(`<hidden_traits count="${state.character.hiddenTraits.length}" file="current/world/character.json">
${traits}
  </hidden_traits>`);
  }

  // Factions
  if (state.factions && state.factions.length > 0) {
    const facs = state.factions
      .map(
        (f: any) =>
          `    <faction id="${f.id}" path="current/world/factions/${f.id}.json" unlocked="${!!f.unlocked}">${f.name}</faction>`,
      )
      .join("\n");
    sections.push(`<factions count="${state.factions.length}" dir="current/world/factions">
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
    sections.push(`<timeline count="${state.timeline.length}" dir="current/world/timeline">
${events}
  </timeline>`);
  }

  // Causal Chains
  if (state.causalChains && state.causalChains.length > 0) {
    const chains = state.causalChains
      .map(
        (c: any) => {
          const chainId = c.chainId ?? c.chain_id ?? c.id ?? "no-id";
          return `    <chain id="${chainId}" path="current/world/causal_chains/${chainId}.json" cause="${c.cause || ""}" effect="${c.effect || ""}"/>`;
        },
      )
      .join("\n");
    sections.push(`<causal_chains count="${state.causalChains.length}" dir="current/world/causal_chains">
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

<current_entities HINT="Each section shows the current entity files. Use vfs_read/vfs_edit/vfs_write/vfs_delete to merge duplicates.">
  ${entityXml}
</current_entities>

<task>
Identify and merge duplicate or redundant entities. Prefer keeping the most complete/accurate entity file and removing redundant files.
</task>

<deduplication_examples>
  <example type="inventory">
    <duplicates>Two inventory item files that represent the same item</duplicates>
    <action>
      1. vfs_ls({ path: "current/world/inventory" }) to list candidates
      2. vfs_read({ path: "current/world/inventory/<id>.json" }) to compare details
      3. vfs_write(...) or vfs_edit(...) to merge details into the kept file
      4. vfs_delete({ paths: ["current/world/inventory/<duplicate>.json"] }) to delete the redundant file
    </action>
  </example>

  <example type="npc">
    <duplicates>Two NPC files that represent the same person</duplicates>
    <action>
      1. vfs_ls({ path: "current/world/npcs" }) to list candidates
      2. vfs_read({ path: "current/world/npcs/<id>.json" }) to compare details
      3. vfs_write(...) or vfs_edit(...) to merge details into the kept file
      4. vfs_delete({ paths: ["current/world/npcs/<duplicate>.json"] }) to delete the redundant file
    </action>
  </example>

  <example type="location">
    <duplicates>Two location files that refer to the same place</duplicates>
    <action>
      1. vfs_ls({ path: "current/world/locations" }) to list candidates
      2. vfs_read({ path: "current/world/locations/<id>.json" }) to compare details
      3. vfs_write(...) or vfs_edit(...) to merge details into the kept file
      4. vfs_delete({ paths: ["current/world/locations/<duplicate>.json"] }) to delete the redundant file
    </action>
  </example>

  <example type="quest">
    <duplicates>Two quest files that represent the same quest</duplicates>
    <action>
      1. vfs_ls({ path: "current/world/quests" }) to list candidates
      2. vfs_read({ path: "current/world/quests/<id>.json" }) to compare details
      3. vfs_write(...) or vfs_edit(...) to merge details into the kept file
      4. vfs_delete({ paths: ["current/world/quests/<duplicate>.json"] }) to delete the redundant file
    </action>
  </example>

  <example type="knowledge">
    <duplicates>Two knowledge files that represent the same knowledge</duplicates>
    <action>
      1. vfs_ls({ path: "current/world/knowledge" }) to list candidates
      2. vfs_read({ path: "current/world/knowledge/<id>.json" }) to compare details
      3. vfs_write(...) or vfs_edit(...) to merge details into the kept file
      4. vfs_delete({ paths: ["current/world/knowledge/<duplicate>.json"] }) to delete the redundant file
    </action>
  </example>

  <example type="character_skills">
    <duplicates>Two skills inside current/world/character.json that represent the same skill</duplicates>
    <action>
      1. vfs_read({ path: "current/world/character.json" }) to inspect the current skills list
      2. vfs_edit(...) or vfs_write(...) to merge data and remove the duplicate entry from the skills array
    </action>
  </example>

  <example type="faction">
    <duplicates>Two faction files that represent the same faction</duplicates>
    <action>
      1. vfs_ls({ path: "current/world/factions" }) to list candidates
      2. vfs_read({ path: "current/world/factions/<id>.json" }) to compare details
      3. vfs_write(...) or vfs_edit(...) to merge details into the kept file
      4. vfs_delete({ paths: ["current/world/factions/<duplicate>.json"] }) to delete the redundant file
    </action>
  </example>

  <example type="timeline">
    <duplicates>Two timeline event files that represent the same event</duplicates>
    <action>
      1. vfs_ls({ path: "current/world/timeline" }) to list candidates
      2. vfs_read({ path: "current/world/timeline/<id>.json" }) to compare details
      3. vfs_delete({ paths: ["current/world/timeline/<duplicate>.json"] }) to delete the redundant file
    </action>
  </example>

  <example type="dual_layer_merge">
    <duplicates>1. "old_man" (Unlocked: true, Visible: "Just an old man") AND 2. "gandalf" (Unlocked: false, Hidden: "Powerful Wizard")</duplicates>
    <action>
      1. PREFER keeping "gandalf" (The Truth).
      2. vfs_read both NPC files, then vfs_write(...) or vfs_edit(...) to merge visible info into the kept file and set unlocked=true if needed.
      3. vfs_delete({ paths: ["current/world/npcs/old_man.json"] }) to remove the fragment.
    </action>
  </example>
</deduplication_examples>

<rules>
- Be CONSERVATIVE: only merge if you're CONFIDENT they represent the SAME entity
- PRESERVE all important information when merging (combine descriptions, notes)
- ALWAYS update the kept file BEFORE deleting the redundant file
- **DUAL LAYER RULE**: If merging duplicates where one is Unlocked (known) and one is Locked (hidden):
    1. PREFER keeping the Locked entity (it often contains full GM truth).
    2. MUST merge the Unlocked entity's visible info into the Kept entity's separate 'visible' layer.
    3. MUST set the Kept entity to 'unlocked: true' if the player knew the removed one.
    4. NEVER lose player knowledge (unlocked status) during a merge.
- If no duplicates found, still write a minimal narrative like "No duplicates found"
</rules>

<output>
After cleanup, end the turn using the standard VFS workflow (write the new turn file + update index).
**CRITICAL NARRATIVE PRIVACY RULE**:
- The 'narrative' MUST be a purely OBJECTIVE, META-LEVEL summary of your actions.
- **ABSOLUTELY FORBIDDEN**: Do NOT mention names of hidden entities, secret identities, or specific plot details in the narrative.
- **FORBIDDEN**: "Merged Old Man with Gandalf the Wizard."
- **ALLOWED**: "Merged 1 duplicate NPC and updated character skills."
- **ALLOWED**: "Consolidated 2 inventory items and optimized quest log."
- The narrative is for the player's UI log, so it must not spoil hidden truths you just organized.

Required fields:
- narrative: Summary of cleanup actions (e.g., "Merged 2 duplicate items, consolidated 1 NPC")
- choices: ["Continue your adventure"]
</output>`;
}

/**
 * 生成实体清理 (Entity Cleanup)
 *
 * Design: Entity Cleanup is a normal turn with:
 * 1. User action prefixed with [CLEANUP] to signal cleanup mode
 * 2. All entity IDs/names embedded in XML format with VFS file hints
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
