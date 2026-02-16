import {
  TokenUsage,
  GameState,
  TurnContext,
  GameResponse,
  LogEntry,
  TurnRecoveryTrace,
} from "../../../../types";

import type { AgenticLoopResult } from "../turn/adventure";
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
  <required_first_read>\`current/conversation/index.json\`</required_first_read>
  <scope_rule>Operate only on current fork data. Never read/mutate other forks during cleanup.</scope_rule>
</cleanup_anchor>

<loop_quickstart>
  1) Use \`vfs_read\` on \`current/skills/commands/runtime/SKILL.md\` (hub).
  2) Use \`vfs_read\` on \`current/skills/commands/runtime/cleanup/SKILL.md\` (cleanup protocol).
  3) Build candidate list with \`vfs_ls\` + \`vfs_search\`.
  4) Verify with \`vfs_read\`, then mutate/verify/finish.
</loop_quickstart>

<workflow>
  0) Before any cleanup mutation, use \`vfs_read\` to load command protocol (hub first):
     - \`current/skills/commands/runtime/SKILL.md\`
     - \`current/skills/commands/runtime/cleanup/SKILL.md\`

  1) Use \`vfs_ls\` + \`vfs_search\` to build a COMPLETE candidate catalog by category path.
     This is more reliable than guessing IDs.

  2) Use \`vfs_search\` to identify likely duplicate names/aliases.
     Then VERIFY candidates with \`vfs_read\` before merging.

  3) Merge conservatively:
     - Prefer keeping the most complete file.
     - Update the kept file FIRST (\`vfs_mutate\` with \`patch_json\` / \`merge_json\`) before deleting duplicates (\`vfs_mutate\`).
     - If one copy is unlocked and the other is locked (hidden truth), prefer keeping the locked one,
       but preserve player knowledge by merging visible info and ensuring unlocked=true when appropriate.

  4) After merges/deletes, do a targeted verification read *only if needed*:
     - Re-run \`vfs_ls\` / \`vfs_search\` to confirm duplicates were removed and references still resolve.
     - Avoid read-only "sanity checks" right before finish just to look thorough.

  5) Finish with \`vfs_finish_turn\` as the LAST tool call.
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
    <duplicates>Two inventory item files represent the same item</duplicates>
    <action>
      1. vfs_ls({ path: "current/world/characters/char:player/inventory", stat: true })
      2. vfs_search({ query: "iron key|rusty key", path: "current/world/characters/char:player/inventory", regex: true })
      3. vfs_read({ path: "current/world/characters/char:player/inventory/<id>.json", mode: "json", pointers: ["/visible", "/hidden", "/unlocked"] })
      4. vfs_mutate({ ops: [{ op: "merge_json", path: "current/world/characters/char:player/inventory/<kept>.json", content: { ... } }] })
      5. vfs_mutate({ paths: ["current/world/characters/char:player/inventory/<duplicate>.json"] })
    </action>
  </example>

  <example type="npc">
    <duplicates>Two NPC files represent the same person under different aliases</duplicates>
    <action>
      1. vfs_ls({ path: "current/world/characters", patterns: ["current/world/characters/**/profile.json"], stat: true })
      2. vfs_search({ query: "Harlen|Captain Harlen", path: "current/world/characters", regex: true })
      3. vfs_read({ path: "current/world/characters/<candidate>/profile.json", mode: "json", pointers: ["/visible", "/hidden", "/relations", "/unlocked"] })
      4. vfs_mutate({ ops: [{ op: "merge_json", path: "current/world/characters/<kept>/profile.json", content: { ... } }] })
      5. vfs_mutate({ paths: ["current/world/characters/<duplicate>/profile.json"] })
    </action>
  </example>

  <example type="location">
    <duplicates>Two location files refer to the same place</duplicates>
    <action>
      1. vfs_ls({ path: "current/world/locations", stat: true })
      2. vfs_search({ query: "abandoned chapel|old chapel", path: "current/world/locations", regex: true })
      3. vfs_read({ path: "current/world/locations/<id>.json", mode: "json", pointers: ["/id", "/name", "/visible", "/hidden"] })
      4. vfs_read({ path: "current/world/characters/char:player/views/locations/<id>.json", mode: "json", pointers: ["/entityId", "/unlocked", "/unlockReason"] })
      5. vfs_mutate({ ops: [{ op: "merge_json", path: "current/world/locations/<kept>.json", content: { ... } }] })
      6. vfs_mutate({ paths: ["current/world/locations/<duplicate>.json"] })
    </action>
  </example>

  <example type="quest">
    <duplicates>Two quest files represent the same quest thread</duplicates>
    <action>
      1. vfs_ls({ path: "current/world/quests", stat: true })
      2. vfs_search({ query: "missing caravan|lost caravan", path: "current/world/quests", regex: true })
      3. vfs_read({ path: "current/world/quests/<id>.json", mode: "json", pointers: ["/id", "/title", "/visible", "/hidden"] })
      4. vfs_read({ path: "current/world/characters/char:player/views/quests/<id>.json", mode: "json", pointers: ["/entityId", "/status", "/unlocked", "/unlockReason"] })
      5. vfs_mutate({ ops: [{ op: "merge_json", path: "current/world/quests/<kept>.json", content: { ... } }] })
      6. vfs_mutate({ paths: ["current/world/quests/<duplicate>.json"] })
    </action>
  </example>

  <example type="knowledge">
    <duplicates>Two knowledge entries represent the same fact</duplicates>
    <action>
      1. vfs_ls({ path: "current/world/knowledge", stat: true })
      2. vfs_search({ query: "sigil|glyph", path: "current/world/knowledge", regex: true })
      3. vfs_read({ path: "current/world/knowledge/<id>.json", mode: "json", pointers: ["/id", "/title", "/visible", "/hidden"] })
      4. vfs_read({ path: "current/world/characters/char:player/views/knowledge/<id>.json", mode: "json", pointers: ["/entityId", "/unlocked", "/unlockReason"] })
      5. vfs_mutate({ ops: [{ op: "merge_json", path: "current/world/knowledge/<kept>.json", content: { ... } }] })
      6. vfs_mutate({ paths: ["current/world/knowledge/<duplicate>.json"] })
    </action>
  </example>

  <example type="character_skills">
    <duplicates>Two skill files represent the same player skill</duplicates>
    <action>
      1. vfs_ls({ path: "current/world/characters/char:player/skills", stat: true })
      2. vfs_search({ query: "shadow step|shadow-step", path: "current/world/characters/char:player/skills", regex: true })
      3. vfs_read({ path: "current/world/characters/char:player/skills/<id>.json", mode: "json", pointers: ["/visible", "/hidden", "/level", "/unlocked"] })
      4. vfs_mutate({ ops: [{ op: "merge_json", path: "current/world/characters/char:player/skills/<kept>.json", content: { ... } }] })
      5. vfs_mutate({ paths: ["current/world/characters/char:player/skills/<duplicate>.json"] })
    </action>
  </example>

  <example type="faction">
    <duplicates>Two faction files represent the same faction</duplicates>
    <action>
      1. vfs_ls({ path: "current/world/factions", stat: true })
      2. vfs_search({ query: "Order of Ash|Ash Order", path: "current/world/factions", regex: true })
      3. vfs_read({ path: "current/world/factions/<id>.json", mode: "json", pointers: ["/id", "/name", "/visible", "/hidden"] })
      4. vfs_read({ path: "current/world/characters/char:player/views/factions/<id>.json", mode: "json", pointers: ["/entityId", "/standing", "/unlocked", "/unlockReason"] })
      5. vfs_mutate({ ops: [{ op: "merge_json", path: "current/world/factions/<kept>.json", content: { ... } }] })
      6. vfs_mutate({ paths: ["current/world/factions/<duplicate>.json"] })
    </action>
  </example>

  <example type="timeline">
    <duplicates>Two timeline events represent the same incident</duplicates>
    <action>
      1. vfs_ls({ path: "current/world/timeline", stat: true })
      2. vfs_search({ query: "eclipse|black sun", path: "current/world/timeline", regex: true })
      3. vfs_read({ path: "current/world/timeline/<id>.json", mode: "json", pointers: ["/id", "/name", "/gameTime", "/visible", "/hidden"] })
      4. vfs_read({ path: "current/world/characters/char:player/views/timeline/<id>.json", mode: "json", pointers: ["/entityId", "/unlocked", "/unlockReason"] })
      5. vfs_mutate({ ops: [{ op: "merge_json", path: "current/world/timeline/<kept>.json", content: { ... } }] })
      6. vfs_mutate({ paths: ["current/world/timeline/<duplicate>.json"] })
    </action>
  </example>

  <example type="dual_layer_merge">
    <duplicates>Unlocked surface entity + locked truth entity are actually the same target</duplicates>
    <action>
      1. Prefer keeping the locked/truth-rich file.
      2. vfs_read canonical files with pointers ["/visible", "/hidden"].
      3. For world entities, vfs_read corresponding \`char:player/views/**\` files for unlock state.
      4. vfs_mutate merge_json on kept canonical file to preserve visible+hidden layers.
      5. Ensure player-known state is preserved (\`unlocked=true\` on kept side or corresponding player view).
      6. vfs_mutate redundant fragment file.
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
       - Quests/knowledge/timeline/locations/factions/causal_chains → ensure \`current/world/characters/char:player/views/**.unlocked=true\` on the kept entity.
       - \`world_info\` → ensure \`current/world/characters/char:player/views/world_info.json\` keeps \`worldSettingUnlocked/mainGoalUnlocked\` state.
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

export function getCleanupLoopSystemPrompt(
  state: Pick<GameState, "forkId" | "turnNumber">,
): string {
  return buildCleanupPrompt(state as GameState);
}

/**
 * 生成实体清理 (Entity Cleanup)
 *
 * Design: Entity Cleanup is a normal turn with:
 * 1. User action prefixed with [CLEANUP] to signal cleanup mode
 * 2. VFS-only + tool-driven discovery (no entity XML enumeration)
 * 3. Deduplication recipes that start from vfs_ls/vfs_search
 *
 * This ensures the same KV cache, same agentic loop, same tools system.
 */
export const generateEntityCleanup = async (
  inputState: GameState,
  context: TurnContext,
): Promise<CleanupResult> => {
  const { generateAdventureTurn } = await import("../turn/adventure");

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
