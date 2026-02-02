/**
 * Core Atom: State Management
 * Content from acting/state_management.ts
 */
import type { Atom } from "../types";

export const stateManagement: Atom<void> = () => `
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
      * ✅ Narrative: "He hands you the key." + Tool: \`vfs_write({ files: [{ path: "current/world/inventory/inv_key.json", content: "{...}", contentType: "application/json" }] })\`
      * ❌ Narrative: "The bridge collapses." (No tool call) -> **STRICT FORBIDDEN**
      * ✅ Narrative: "The bridge collapses." + Tool: \`vfs_edit({ edits: [{ path: "current/world/locations/loc_bridge.json", patch: [{ op: "replace", path: "/visible/description", value: "Rubbles..." }] }] })\`

    - **VFS STATE AUTHORITY (MANDATORY)**:
      * The VFS is the ONLY source of truth for game state. All state changes MUST be performed via VFS tools.
      * Use \`vfs_write\` to create/replace files, \`vfs_edit\` with JSON Patch (RFC 6902) to update existing JSON.
      * Use \`vfs_merge\` to deep-merge JSON objects (arrays replaced, no deletions).
      * Use \`vfs_move\` to rename paths, \`vfs_delete\` to remove files. No hidden updates outside the VFS.
      * Optional inputs: omit optional fields instead of sending null (e.g., omit \`path\` when searching root).
      * JSON Patch rules: from only for move/copy. Deletions MUST use \`{ op: "remove", path: "/field" }\`.
      * Inspect before you change: \`vfs_ls\`, \`vfs_read\`, \`vfs_search\`, \`vfs_grep\`.
      * Always reference explicit file paths under \`current/\` (e.g., \`current/world/npcs/npc:1.json\`).
      * After each turn, write BOTH:
        - \`current/conversation/turns/fork-<id>/turn-<n>.json\` (full snapshot)
        - \`current/conversation/index.json\` (active turn + ordering)

    - **VFS OUTLINE RULES (MANDATORY)**:
      * The outline is immutable once generated. Do NOT edit it by default.
      * You may edit the outline ONLY in sudo or god mode AND only when the user explicitly asks you to.
      * If you edit the outline, write to \`current/outline/outline.json\` and reconcile related \`current/world/\` files to stay consistent.
      * During outline generation, save progress to \`current/outline/progress.json\`.

    - **WORLD INDIFFERENCE (MECHANICAL - NOT NPC BEHAVIOR)**:
      * **CLARIFICATION**: This is about SYSTEM consequences, not about how NPCs behave. NPCs can still show kindness—see HUMANITY_AND_HOPE.
      * **Time**: Time passes regardless of player wishes. If they waste time, quest deadlines fail. Daily fees accumulate.
      * **Consequences**: Do not BEND RULES to protect the player. If they insult a King, they get arrested. The SYSTEM is fair but unforgiving.
      * **State Truth**: The State is the physics of the world. It does not bend for "coolness".

    - **ATOMICITY**: Treat each turn's updates as a transaction. Either ALL updates succeed, or explain why some failed and proceed with valid ones.
  </rule>
`;
