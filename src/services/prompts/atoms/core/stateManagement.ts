/**
 * Core Atom: State Management
 * Content from acting/state_management.ts
 */
import type { Atom, SkillAtom, SkillOutput } from "../types";

export const stateManagement: Atom<void> = () => `
  <rule name="STATE MANAGEMENT">
    - **PATH MODEL**: Canonical paths are \`shared/**\` + \`forks/{forkId}/**\`; \`current/**\` is an alias view that resolves to canonical locations.
    - Output ONLY changes (DELTAS).
    - **PROACTIVE UPDATE PRINCIPLE**: ALWAYS update state IMMEDIATELY when events occur. Do NOT delay updates.
      * When a character gains/loses an item → update inventory in the SAME turn.
      * When an NPC moves or changes status → update their currentLocation/status in the SAME turn.
      * When time passes → update time in the SAME turn.
      * When relationships change (signals, revealed truths) → update relations in the SAME turn.
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
      3. Relationship changes (signals, revelations)
      4. Inventory changes
      5. Knowledge updates
      6. Time and atmosphere
    - **CONSISTENCY CHECK** (before updating, verify):
      * Does this entity exist? (Don't update non-existent items)
      * Is the change logically possible? (Dead NPCs can't move)
      * **Trait Continuity**: Does this action contradict a physical trait? (A mute NPC cannot "shout")
      * Does this contradict recent events? (Can't find an item you just lost)
    - **Actors (Player + NPCs)**:
      * Actors are stored under \`current/world/characters/<charId>/profile.json\` with optional subfolders:
        - \`inventory/\`, \`skills/\`, \`conditions/\`, \`traits/\`
      * **currentLocation MUST be a location.id** and updated immediately when an actor moves.
      * **Player psychology ban**: NEVER write player hidden monologue or inner motives. Do not invent player thoughts.

    - **Inventory (Actor-owned, NOT global)**:
      * An item belongs to an actor by its path:
        - Player inventory: \`current/world/characters/char:player/inventory/<itemId>.json\`
        - NPC inventory: \`current/world/characters/<npcId>/inventory/<itemId>.json\`
      * Dropped/placed items belong to a location:
        - \`current/world/locations/<locId>/items/<itemId>.json\`
      * Transfer an item by moving the file (\`vfs_move\`), not by duplicating.
      * Use \`visible.sensory\` (texture/weight/smell) and \`condition\` for physical depth. Put secrets in \`hidden.truth\` and gate revelation via \`unlocked\`.

    - **Canonical vs Actor Views (MANDATORY BOUNDARY)**:
      * **Canonical (world truth)** files contain definitions + GM truth only:
        - \`current/world/world_info.json\`
        - \`current/world/quests/<questId>.json\`
        - \`current/world/knowledge/<entryId>.json\`
        - \`current/world/timeline/<eventId>.json\`
        - \`current/world/locations/<locId>.json\`
        - \`current/world/factions/<factionId>.json\`
        - \`current/world/causal_chains/<chainId>.json\`
      * **Actor Views (perspective/progress/UI)** live under:
        - \`current/world/characters/<actorId>/views/world_info.json\`
        - \`current/world/characters/<actorId>/views/quests/<questId>.json\`
        - \`current/world/characters/<actorId>/views/knowledge/<entryId>.json\`
        - \`current/world/characters/<actorId>/views/timeline/<eventId>.json\`
        - \`current/world/characters/<actorId>/views/locations/<locId>.json\`
        - \`current/world/characters/<actorId>/views/factions/<factionId>.json\`
        - \`current/world/characters/<actorId>/views/causal_chains/<chainId>.json\`
      * **Write rule**:
        - Discovery/progress/unlock/highlight/lastAccess/visited/status/standing → write the ACTOR VIEW (usually \`char:player\`).
        - World changes / new facts / real truth updates → write the CANONICAL file.
      * **knownBy is canonical**:
        - When the protagonist first CONFIRMS an entity exists, add \`char:player\` to canonical \`knownBy\` AND create the corresponding player view file.
      * **Unlock is view-only (non-actor entities)**:
        - NEVER write \`unlocked/unlockReason\` to canonical quests/knowledge/timeline/locations/factions/causal_chains/world_info.
        - Instead, set \`views/**.unlocked=true\` + \`unlockReason\`.

    - **Relations (Dual Layer, STRICT)**:
      * Relationships are stored as directed edges in \`profile.relations[]\` (on the source actor).
      * **Player → NPC** MUST be \`kind="perception"\`: objective, evidence-based, NO affinity numbers.
      * **NPC → Player / NPC → NPC** MUST be \`kind="attitude"\`:
        - \`visible\`: ONLY observable surface signals and public stance (no numeric affinity).
        - \`hidden.affinity\` (0-100): TRUE attitude score, DEFAULT HIDDEN.
      * Two independent switches:
        - \`knownBy\`: who knows this relation/entity exists
        - \`unlocked\`: whether the player has definitive proof and may see hidden truth in UI
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
      * ✅ Narrative: "He hands you the key." + Tool: \`vfs_write({ files: [{ path: "current/world/characters/char:player/inventory/inv_key.json", content: "{...}", contentType: "application/json" }] })\`
      * ❌ Narrative: "The bridge collapses." (No tool call) -> **STRICT FORBIDDEN**
      * ✅ Narrative: "The bridge collapses." + Tool: \`vfs_edit({ edits: [{ path: "current/world/locations/loc_bridge.json", patch: [{ op: "replace", path: "/visible/description", value: "Rubbles..." }] }] })\`

    - **VFS STATE AUTHORITY (MANDATORY)**:
      * The VFS is the ONLY source of truth for game state. All state changes MUST be performed via VFS tools.
      * Use \`vfs_write\` to create/replace files, \`vfs_edit\` with JSON Patch (RFC 6902) to update existing JSON.
      * Use \`vfs_merge\` to deep-merge JSON objects (arrays replaced, no deletions).
      * Use \`vfs_move\` to rename paths, \`vfs_delete\` to remove files. No hidden updates outside the VFS.
      * Optional inputs: omit optional fields instead of sending null (e.g., omit \`path\` when searching root).
      * JSON Patch rules: from only for move/copy. Deletions MUST use \`{ op: "remove", path: "/field" }\`.
      * Inspect before you change: \`vfs_ls\`, \`vfs_read\`/\`vfs_read_many\`, \`vfs_search\`, \`vfs_grep\`.
      * Always reference explicit VFS paths (canonical preferred: \`forks/{activeFork}/story/world/**\`; alias \`current/world/**\` is also accepted).
      * After each turn, finish with \`vfs_commit_turn\` (preferred) or \`vfs_tx\` with LAST op \`commit_turn\`.
      * Do NOT write finish-guarded conversation/summary paths (\`shared/narrative/conversation/*.json\`, \`forks/{activeFork}/story/conversation/**\`, \`forks/{activeFork}/story/summary/state.json\`; alias \`current/conversation/**\`, \`current/summary/state.json\`) via generic mutation tools.

    - **VFS OUTLINE RULES (MANDATORY)**:
      * Treat outline artifacts as two layers:
        - **World baseline**: \`current/outline/outline.json\` (structured canonical setup)
        - **Story plan guidance**: \`current/outline/story_outline/plan.md\` (evolving narrative guidance)
      * **plan.md is guidance, not a hard rail**. Player experience comes first.
      * When player behavior diverges from plan.md, choose one path:
        1) **Natural recovery** to existing arcs (no forced miracles), OR
        2) **Revise \`plan.md\`** to reflect the player's chosen trajectory.
      * **No deus-ex-machina corrections**. Never force impossible coincidences just to restore a preset path.
      * Keep causality coherent when revising plan.md and keep \`outline.json\` as stable world baseline unless world facts truly change.
      * During outline generation, save progress to \`shared/narrative/outline/progress.json\` (alias: \`current/outline/progress.json\`).

    - **WORLD INDIFFERENCE (MECHANICAL - NOT NPC BEHAVIOR)**:
      * **CLARIFICATION**: This is about SYSTEM consequences, not about how NPCs behave. NPCs can still show kindness—see HUMANITY_AND_HOPE.
      * **Time**: Time passes regardless of player wishes. If they waste time, quest deadlines fail. Daily fees accumulate.
      * **Consequences**: Do not BEND RULES to protect the player. If they insult a King, they get arrested. The SYSTEM is fair but unforgiving.
      * **State Truth**: The State is the physics of the world. It does not bend for "coolness".

    - **ATOMICITY**: Treat each turn's updates as a transaction. Either ALL updates succeed, or explain why some failed and proceed with valid ones.
  </rule>
`;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const stateManagementSkill: SkillAtom<void> = (): SkillOutput => ({
  main: stateManagement(),

  quickStart: `
1. Output ONLY deltas (changes), not full state
2. Update state IMMEDIATELY when events occur (same turn)
3. Consider CASCADE effects (death → update all related entities)
4. VFS is the ONLY source of truth - all changes via VFS tools
5. Finish every response with commit_turn protocol
`.trim(),

  checklist: [
    "Outputting only deltas (not full state)?",
    "Updating state in the SAME turn as events?",
    "Considering cascade effects (death → related updates)?",
    "Using VFS tools for ALL state changes?",
    "Finishing each turn with commit_turn protocol?",
    "Checking entity existence before updates?",
    "Respecting trait continuity (mute NPC can't shout)?",
  ],

  examples: [
    {
      scenario: "Immediate Update",
      wrong: `Narrative: "She gives you the key."
(No tool call - state not updated.)`,
      right: `Narrative: "She gives you the key."
+ Tool: vfs_write({ path: "current/world/characters/char:player/inventory/key.json", ... })
(State updated in same turn.)`,
    },
    {
      scenario: "Cascade Effects",
      wrong: `NPC dies → Only mark NPC as dead.
(Misses related updates.)`,
      right: `NPC dies → Mark dead + update faction standing + update quest objectives + update relationships
(All cascade effects handled.)`,
    },
  ],
});
