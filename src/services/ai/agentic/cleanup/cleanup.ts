import {
  TokenUsage,
  GameState,
  TurnContext,
  GameResponse,
  LogEntry,
  TurnRecoveryTrace,
} from "../../../../types";

import { generateAdventureTurn, AgenticLoopResult } from "../turn/adventure";
import { defineAtom, runPromptWithTrace } from "../../../prompts/trace/runtime";

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
  recovery?: TurnRecoveryTrace;
}

type CleanupPromptInput = {
  state: GameState;
};

const cleanupPromptAtom = defineAtom(
  {
    atomId: "atoms/cleanup/system#buildCleanupPrompt",
    source: "ai/agentic/cleanup/cleanup.ts",
    exportName: "cleanupPromptAtom",
  },
  ({ state }: CleanupPromptInput) => {
    const targetForkId =
      typeof (state as any)?.forkId === "number"
        ? (state as any).forkId
        : "unknown";
    const targetTurnNumber =
      typeof (state as any)?.turnNumber === "number"
        ? (state as any).turnNumber
        : "unknown";

    return `[CLEANUP] Analyze the current VFS state and perform entity cleanup (deduplication + consolidation).

<cleanup_anchor>
  <target_fork_id>${targetForkId}</target_fork_id>
  <target_turn_number>${targetTurnNumber}</target_turn_number>
  <required_first_read>current/conversation/index.json</required_first_read>
  <scope_rule>Operate only on current fork data. Never read/mutate other forks during cleanup.</scope_rule>
</cleanup_anchor>

<workflow>
  0) Before any cleanup mutation, read command protocol:
     - \`current/skills/commands/cleanup/SKILL.md\`

  1) Use \`vfs_ls_entries\` to get a COMPLETE catalog by category (IDs + names + status).
     This is more reliable than guessing IDs, and avoids missing "extra" objects.

  2) Use \`vfs_suggest_duplicates\` per category to get candidate duplicate groups.
     Then VERIFY candidates with \`vfs_read_many\` before merging.

  3) Merge conservatively:
     - Prefer keeping the most complete file.
     - Update the kept file FIRST (\`vfs_merge\` / \`vfs_edit\`) before deleting duplicates (\`vfs_delete\`).
     - If one copy is unlocked and the other is locked (hidden truth), prefer keeping the locked one,
       but preserve player knowledge by merging visible info and ensuring unlocked=true when appropriate.

  4) Re-run \`vfs_ls_entries\` to sanity-check counts after cleanup.

  5) Finish with \`vfs_commit_turn\` (or \`vfs_tx\` with commit_turn as the LAST op). The finish tool must be LAST.
</workflow>

<recommended_categories>
inventory, location_items, npcs, placeholders, locations, quests, knowledge, factions, timeline, causal_chains,
character_profile, character_skills, character_conditions, character_traits
</recommended_categories>

<task>
Identify and merge duplicate or redundant entities. Prefer keeping the most complete/accurate entity file and removing redundant files.
</task>

<deduplication_examples>
  <example type="inventory">
    <duplicates>Two inventory item files that represent the same item</duplicates>
    <action>
      1. vfs_ls_entries({ categories: ["inventory"] })
      2. vfs_suggest_duplicates({ category: "inventory" })
      3. vfs_read({ path: "current/world/characters/char:player/inventory/<id>.json" }) to compare details
      4. vfs_write(...) or vfs_edit(...) to merge details into the kept file
      5. vfs_delete({ paths: ["current/world/characters/char:player/inventory/<duplicate>.json"] }) to delete the redundant file
    </action>
  </example>

  <example type="npc">
    <duplicates>Two NPC files that represent the same person</duplicates>
    <action>
      1. vfs_ls_entries({ categories: ["npcs"] })
      2. vfs_suggest_duplicates({ category: "npcs" })
      3. vfs_read_many([...]) to verify
      4. vfs_merge / vfs_edit to consolidate, then vfs_delete to remove duplicates
    </action>
  </example>

  <example type="location">
    <duplicates>Two location files that refer to the same place</duplicates>
    <action>
      1. vfs_ls_entries({ categories: ["locations"] })
      2. vfs_suggest_duplicates({ category: "locations" })
      3. vfs_read_many([...]) to verify
      4. vfs_merge / vfs_edit to consolidate, then vfs_delete to remove duplicates
    </action>
  </example>

  <example type="quest">
    <duplicates>Two quest files that represent the same quest</duplicates>
    <action>
      1. vfs_ls_entries({ categories: ["quests"] })
      2. vfs_suggest_duplicates({ category: "quests" })
      3. vfs_read_many([...]) to verify
      4. vfs_merge / vfs_edit to consolidate, then vfs_delete to remove duplicates
    </action>
  </example>

  <example type="knowledge">
    <duplicates>Two knowledge files that represent the same knowledge</duplicates>
    <action>
      1. vfs_ls_entries({ categories: ["knowledge"] })
      2. vfs_suggest_duplicates({ category: "knowledge" })
      3. vfs_read_many([...]) to verify
      4. vfs_merge / vfs_edit to consolidate, then vfs_delete to remove duplicates
    </action>
  </example>

  <example type="character_skills">
    <duplicates>Two character skill files that represent the same skill</duplicates>
    <action>
      1. vfs_ls_entries({ categories: ["character_skills"] })
      2. vfs_suggest_duplicates({ category: "character_skills" })
      3. vfs_read_many(["current/world/characters/char:player/skills/<id>.json", ...]) to verify
      4. vfs_merge / vfs_edit to consolidate, then vfs_delete to remove duplicates
    </action>
  </example>

  <example type="faction">
    <duplicates>Two faction files that represent the same faction</duplicates>
    <action>
      1. vfs_ls_entries({ categories: ["factions"] })
      2. vfs_suggest_duplicates({ category: "factions" })
      3. vfs_read_many([...]) to verify
      4. vfs_merge / vfs_edit to consolidate, then vfs_delete to remove duplicates
    </action>
  </example>

  <example type="timeline">
    <duplicates>Two timeline event files that represent the same event</duplicates>
    <action>
      1. vfs_ls_entries({ categories: ["timeline"] })
      2. vfs_suggest_duplicates({ category: "timeline" })
      3. vfs_read_many([...]) to verify
      4. vfs_delete({ paths: ["current/world/timeline/<duplicate>.json"] }) to delete the redundant file
    </action>
  </example>

  <example type="dual_layer_merge">
    <duplicates>1. "old_man" (Unlocked: true, Visible: "Just an old man") AND 2. "gandalf" (Unlocked: false, Hidden: "Powerful Wizard")</duplicates>
    <action>
      1. PREFER keeping "gandalf" (The Truth).
      2. vfs_read both NPC files, then vfs_merge(...) or vfs_edit(...) to merge visible info into the kept file and set unlocked=true if needed.
      3. vfs_delete({ paths: ["current/world/characters/char:old_man/profile.json"] }) to remove the fragment.
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
    3. MUST preserve player knowledge (unlock state) when deleting the duplicate:
       - World entities (quests/knowledge/timeline/locations/factions/causal_chains/world_info) → ensure \`current/world/characters/char:player/views/**.unlocked=true\` on the kept entity.
       - Actors/relations/items/traits → ensure the kept entity itself has \`unlocked: true\` if the player knew the removed one.
    4. NEVER lose player knowledge during a merge.
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
- choices: Provide 2-4 safe player choices (e.g., "Continue", "Travel", "Rest", "Inspect inventory")
</output>`;
  },
);

/**
 * Build the cleanup prompt with XML entity context and examples
 */
function buildCleanupPrompt(state: GameState): string {
  return runPromptWithTrace("cleanup.system", () =>
    cleanupPromptAtom({ state }),
  );
}

/**
 * 生成实体清理 (Entity Cleanup)
 *
 * Design: Entity Cleanup is a normal turn with:
 * 1. User action prefixed with [CLEANUP] to signal cleanup mode
 * 2. VFS-only + tool-driven discovery (no entity XML enumeration)
 * 3. Deduplication recipes that start from vfs_ls_entries/vfs_suggest_duplicates
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
    vfsMode: context.vfsMode ?? "normal",
    vfsElevationToken: context.vfsElevationToken ?? null,
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
    ...(result.recovery ? { recovery: result.recovery } : {}),
  };
};
