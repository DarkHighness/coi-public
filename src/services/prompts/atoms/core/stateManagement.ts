/**
 * Core Atom: State Management
 * Content from acting/state_management.ts
 */
import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const stateManagement: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/stateManagement#stateManagement",
    source: "atoms/core/stateManagement.ts",
    exportName: "stateManagement",
  },
  () => `
  <rule name="STATE MANAGEMENT">
    - **PATH MODEL**: Canonical paths are \`shared/**\` + \`forks/{forkId}/**\`; \`current/**\` is an alias view that resolves to canonical locations.
    - Output ONLY changes (DELTAS).
    - **PROACTIVE UPDATE PRINCIPLE**: Update state in the SAME turn when events occur. Never delay to future turns.
      * Inventory gain/loss, NPC movement/status change, time passage, relationship shifts, world events/factions — all updated immediately.
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
      * \`profile.json\` is NOT a container for those collections. Do not patch \`/inventory\`, \`/skills\`, \`/conditions\`, or \`/traits\` inside profile.
      * Write sub-entities to dedicated files under their folders (e.g., \`.../conditions/<id>.json\`), then patch profile only for scalar fields like status/location/mood.
      * JSON pointer map (profile): \`/currentLocation\` is root (NOT \`/visible/currentLocation\`); status/mood are under \`/visible/*\` (e.g., \`/visible/status\`, \`/visible/mood\`).
      * **currentLocation MUST be a location.id** and updated immediately when an actor moves.
      * **Reference fields are ID-first**: \`currentLocation\`, \`knownBy[]\`, \`relations[].to.id\`, \`timeline[].involvedEntities[]\`, \`faction.visible.relations[].target\`, \`faction.hidden.relations[].target\`.
      * **Special unresolved reference protocol**: if canonical ID is not available yet, you may use a bracket alias \`[Display Name]\` in the reference field.
      * **Placeholder promotion (MANDATORY)**:
        - \`[Display Name]\` is temporary only; do not keep it once canonical identity is known.
        - Unresolved draft notes belong in \`current/world/placeholders/**/*.md\` (markdown, free-form notes).
        - Promotion triggers: explicit named mention, direct encounter, or any mechanical consequence tied to that entity.
        - Promotion workflow:
          1) Search existing canonical IDs first (\`vfs_search\` + \`vfs_ls\`).
          2) If a matching entity exists, rewrite touched references to that canonical ID in the same response.
          3) If no match exists and the entity is now mechanically significant, create a canonical entity file with a stable ID, then replace \`[Display Name]\` references with that ID.
          4) If an actor now confirms the entity exists, update canonical \`knownBy\` (add that actor id; for protagonist-facing turns this is usually \`char:player\`) and create/update the matching actor view file for world entities.
          5) Delete the corresponding placeholder draft markdown in \`current/world/placeholders/**\` only after canonical write succeeds.
          6) If canonical write fails, keep draft file, fix the error, and retry promotion (do not delete draft on failed write).
      * **Never mix ID+name in one field** (e.g., \`"loc_tavern (Silver Inn)"\`, \`"loc_tavern [Silver Inn]"\` are forbidden).
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
        - Discovery/progress/unlock/visited/status/standing → write the ACTOR VIEW (observer-specific; protagonist-facing turns usually \`char:player\`).
        - UI-only transient presentation/access metadata lives in \`ui_state:*\`; do NOT write it into VFS files.
        - World changes / new facts / real truth updates → write the CANONICAL file.
        - For existing canonical records, prefer \`vfs_patch_json\`/\`vfs_merge_json\` on targeted fields; avoid full \`vfs_write_file\` rewrites that may carry stale/forbidden keys.
        - If read context shows merged UI fields (for example world-entity \`unlocked\`), treat them as read-model only and strip them from canonical writes.
      * **knownBy is canonical**:
        - When an actor first CONFIRMS an entity exists, add that actor id to canonical \`knownBy\` and create/update the corresponding actor view file.
      * **Unlock is view-only (non-actor entities)**:
        - NEVER write \`unlocked/unlockReason\` to canonical quests/knowledge/timeline/locations/factions/causal_chains/world_info.
        - NEVER patch canonical world files at JSON pointer \`/unlocked\` or \`/unlockReason\` (including remove/replace/add).
        - For quests/knowledge/timeline/locations/factions/causal_chains, set \`views/**.unlocked=true\` + \`unlockReason\`.
        - For \`world_info\`, use \`current/world/characters/<actorId>/views/world_info.json\` fields:
          \`worldSettingUnlocked/worldSettingUnlockReason\`, \`mainGoalUnlocked/mainGoalUnlockReason\`.
      * **knownBy vs unlocked decision protocol (STRICT)**:
        - **Progression is mandatory**: first \`knownBy\`, then \`unlocked\`. Treat unlock as second-stage revelation on top of known existence.
        - Mention/encounter/verified existence ⇒ update \`knownBy\` (observer actor now knows it exists), but keep \`unlocked=false\` unless hidden truth is proven.
        - Definitive proof of hidden truth (confession/document/direct observation) ⇒ set \`unlocked=true\` + concrete \`unlockReason\` for the specific observer actor in the correct storage layer.
        - If you perform both in one turn, include both writes in sequence: establish \`knownBy\` first, then set \`unlocked=true\`.
        - Invariant: when setting \`unlocked=true\` for an observer actor, that actor MUST be present in \`knownBy\` in the same turn.
        - Suspicion/rumor/partial clues ⇒ keep \`unlocked=false\`; only update visible clues.
        - Never unlock “for drama” without proof.
        - Evaluate epistemics as a tuple \`(observerActorId, targetEntityId)\`: "A knows B's secret" is true only when A's unlock state for B is true (or relation/entity-layer unlock for actor/relation/item targets).

    - **Relations (Dual Layer, STRICT)**:
      * Relationships are stored as directed edges in \`profile.relations[]\` (on the source actor).
      * \`relations[].to.id\` MUST be canonical actor/placeholder ID; if unresolved this turn, use \`[Display Name]\` temporary alias.
      * **Player → NPC** MUST be \`kind="perception"\`: objective, evidence-based, NO affinity numbers.
      * **NPC → Player / NPC → NPC** MUST be \`kind="attitude"\`:
        - \`visible\`: ONLY observable surface signals and public stance (no numeric affinity).
        - \`hidden.affinity\` (0-100): TRUE attitude score, DEFAULT HIDDEN.
      * Two independent switches:
        - \`knownBy\`: who knows this relation/entity exists
        - \`unlocked\`: whether a specific observer actor has definitive proof of hidden truth
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
      * ✅ Narrative: "He hands you the key." + Tool: \`vfs_write_file(...)\` for \`current/world/characters/char:player/inventory/inv_key.json\`
      * ❌ Narrative: "The bridge collapses." (No tool call) -> **STRICT FORBIDDEN**
      * ✅ Narrative: "The bridge collapses." + Tool: \`vfs_patch_json({ path: "current/world/locations/loc_bridge.json", patch: [{ op: "replace", path: "/visible/description", value: "Rubble..." }] })\`

    - **CONSEQUENCE SURFACING (MANDATORY — How past choices become visible)**:
      * Past player decisions MUST surface organically in current narrative. The world REMEMBERS.
      * **Surfacing channels** (at least one per turn when relevant history exists):
        - **NPC Memory**: NPCs reference past interactions. The merchant you cheated raises prices. The guard you spared nods as you pass. Use \`hidden.memory\` and \`relations[]\` to drive these.
        - **Environment Traces**: Locations show marks of player passage. The door they broke is crudely repaired. The garden they planted has grown. The battlefield they fled still has bones.
        - **Reputation Ripple**: Third parties who weren't present know about the player's actions. Rumors travel. "Aren't you the one who...?"
        - **Resource Echo**: Resources spent or gained in past turns constrain current options. Gold spent is gold gone. Allies burned don't answer calls.
        - **Causal Chain Resolution**: Delayed consequences from \`current/world/causal_chains/\` trigger when conditions are met. Check chains each turn.
      * **Anti-pattern: Amnesia World** — If an NPC interacted with the player 3 turns ago and neither their \`relations[]\` nor narrative acknowledges it, the world has amnesia. FIX IT.
      * **Anti-pattern: Announcement** — Do NOT narrate consequences as announcements ("Because you helped the merchant, he..."). Show through BEHAVIOR: the merchant slides an extra coin across the counter without explanation.
      * **Minimum**: When the player returns to a location or re-encounters an NPC from 3+ turns ago, at least ONE detail must reflect what happened last time.

    - **VFS STATE AUTHORITY (MANDATORY)**:
      * The VFS is the ONLY source of truth for game state. All state changes MUST be performed via VFS tools.
      * Use \`vfs_write_file\` to create/replace files.
      * Use \`vfs_patch_json\` (RFC 6902) to patch existing JSON.
      * Use \`vfs_merge_json\` to deep-merge JSON objects (arrays replaced, no deletions).
      * Use \`vfs_move\` to rename paths, \`vfs_delete\` to remove files. No hidden updates outside the VFS.
      * Optional inputs: omit optional fields instead of sending null (e.g., omit \`path\` when searching root).
      * JSON Patch rules: from only for move/copy. Deletions MUST use \`{ op: "remove", path: "/field" }\`.
      * For large JSON files, inspect with \`vfs_read_json\` pointers first (or bounded \`vfs_read_lines\`); avoid broad \`vfs_read_chars\` reads by default.
      * If a patch path may not exist, verify with pointer reads first; otherwise prefer \`merge_json\` or correct file placement.
      * Inspect before you change: \`vfs_ls\`, \`vfs_schema\`, \`vfs_read_markdown/vfs_read_chars/vfs_read_lines/vfs_read_json\`, \`vfs_search\`.
      * Always reference explicit VFS paths (canonical preferred: \`forks/{activeFork}/story/world/**\`; alias \`current/world/**\` is also accepted).
      * After each turn, finish with \`vfs_finish_turn\` as the LAST tool call.
      * Once you are finishing in this response, avoid read-only tools immediately before finish unless they are directly required for writes in the same response.
      * Do NOT write finish-guarded conversation/summary paths (\`shared/narrative/conversation/*.json\`, \`forks/{activeFork}/story/conversation/**\`, \`forks/{activeFork}/story/summary/state.json\`; alias \`current/conversation/**\`, \`current/summary/state.json\`) via generic mutation tools.

    - **VFS OUTLINE RULES (MANDATORY)**:
      * Treat outline artifacts as two layers:
        - **World baseline**: \`current/outline/outline.json\` (structured canonical setup)
        - **Story plan guidance**: \`workspace/PLAN.md\` (evolving narrative guidance)
      * In normal turns, \`workspace/PLAN.md\` is writable (\`default_editable\`), not read-only.
      * **plan.md is guidance, not a hard rail**. Player experience comes first.
      * When player behavior diverges from plan.md, choose one path:
        1) **Natural recovery** to existing arcs (no forced miracles), OR
        2) **Revise \`plan.md\`** to reflect the player's chosen trajectory.
      * Before revising plan.md, read relevant sections from:
        - \`workspace/PLAN.md\` (current strategic plan)
        - \`current/outline/outline.json\` (stable world baseline)
      * Plan update mode:
        - Minor drift (pace/checklist/milestone changes): apply incremental updates.
        - Major branch fracture (new main trajectory): full rewrite of \`plan.md\` is allowed.
      * **No deus-ex-machina corrections**. Never force impossible coincidences just to restore a preset path.
      * Keep causality coherent when revising plan.md and keep \`outline.json\` as stable world baseline unless world facts truly change.
      * In \`[Player Rate]\` loops, keep soul-only scope; do NOT mutate \`workspace/PLAN.md\`.
      * During outline generation, save progress to \`shared/narrative/outline/progress.json\` (alias: \`current/outline/progress.json\`).

    - **WORLD INDIFFERENCE (MECHANICAL - NOT NPC BEHAVIOR)**:
      * **CLARIFICATION**: This is about SYSTEM consequences, not about how NPCs behave. NPCs can still show kindness—see HUMANITY_AND_HOPE.
      * **Time**: Time passes regardless of player wishes. If they waste time, quest deadlines fail. Daily fees accumulate.
      * **Consequences**: Do not BEND RULES to protect the player. If they insult a King, they get arrested. The SYSTEM is fair but unforgiving.
      * **State Truth**: The State is the physics of the world. It does not bend for "coolness".

    - **TOOL INDEPENDENCE**: Treat each tool call independently. Successful calls stand even if other calls fail. Block finish only for gate/required-retry failures (for example \`WRITE_EXISTING_TARGET_RETRY_REQUIRED\` / \`FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE\`); otherwise report failures and continue with valid updates.
  </rule>
`,
);

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const stateManagementSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/core/stateManagement#stateManagementSkill",
    source: "atoms/core/stateManagement.ts",
    exportName: "stateManagementSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(stateManagement),

    quickStart: `
1. Output ONLY deltas (changes), not full state
2. Update state IMMEDIATELY when events occur (same turn)
3. Consider CASCADE effects (death → update all related entities)
4. VFS is the ONLY source of truth - all changes via VFS tools
5. Finish every normal/cleanup response with vfs_finish_turn as the LAST tool call
6. Promote \`[Display Name]\` placeholders to canonical IDs once identity is explicit; keep \`knownBy\` vs \`unlocked\` semantics separate
`.trim(),

    checklist: [
      "Outputting only deltas (not full state)?",
      "Updating state in the SAME turn as events?",
      "Considering cascade effects (death → related updates)?",
      "Using VFS tools for ALL state changes?",
      "Finishing each normal/cleanup response with vfs_finish_turn last?",
      "Promoting placeholders to canonical IDs once identity is explicit?",
      "Checking entity existence before updates?",
      "Respecting trait continuity (mute NPC can't shout)?",
    ],

    examples: [
      {
        scenario: "Immediate Update",
        wrong: `Narrative: "She gives you the key."
(No tool call - state not updated.)`,
        right: `Narrative: "She gives you the key."
+ Tool: vfs_write_file(...) for current/world/characters/char:player/inventory/key.json
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
  }),
);
