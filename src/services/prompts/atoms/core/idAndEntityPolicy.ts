/**
 * Core Atom: ID & Entity Policy
 * Content from acting/state_management.ts
 */
import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

const idUsage = `
  <rule name="ID FIELD USAGE - CRITICAL">
    **ID FIELDS ARE FOR FILE STORAGE AND REFERENCES ONLY**

    ⚠️ **THE MOST IMPORTANT RULE ABOUT IDs**:
    - The \`id\` field exists ONLY for **file-based storage** and entity references.
    - **NEVER** include IDs in ANY narrative or descriptive content.
    - IDs are **backend identifiers**, NOT player-facing information.

    **WHERE IDs BELONG (ONLY THESE PLACES)**:
    ✅ VFS file paths: \`vfs_write_file(...)\` at \`current/world/characters/char:player/inventory/inv_sword_of_kings.json\`
    ✅ VFS file edits: \`vfs_patch_json({ path: "current/world/characters/char:marcus/profile.json", patch: [...] })\`
    ✅ Entity \`currentLocation\` field (references location ID): \`{ currentLocation: "loc_tavern" }\`
    ✅ Timeline \`involvedEntities\` arrays (entity references): \`["char:player", "char:marcus", "loc_tavern"]\`
    ✅ Relationship references: \`relation.to.id\`, \`knownBy[]\` (actor IDs only)
    ✅ Faction relation targets: \`faction.visible.relations[].target\` / \`faction.hidden.relations[].target\` (faction ID only)

    **REFERENCE FIELD FORMAT (STRICT)**:
    - Reference fields MUST contain EITHER:
      1) ONE canonical ID string, OR
      2) ONE bracket alias in the form \`[Display Name]\` when canonical ID does not exist yet.
    - \`[Display Name]\` is a special temporary name protocol for UI fallback display.
    - Placeholder promotion is mandatory once identity is known:
      * If entity identity becomes explicit in-story (named mention, encounter, concrete interaction), resolve \`[Display Name]\` to canonical ID in the same turn whenever possible.
      * If canonical ID already exists, patch touched references to that ID immediately.
      * If canonical ID does not exist and the entity is now mechanically significant, create the entity with a stable ID and replace \`[Display Name]\`.
      * Keep unresolved notes in \`current/world/placeholder/**/*.md\` and delete the matching draft after successful promotion to canonical JSON.
      * Do not persist placeholder aliases across later turns after canonical identity is available.
    - Never return plain display names (without brackets) in reference fields.
    - Never return mixed forms such as:
      * \`"loc_tavern (Silver Inn)"\`
      * \`"char:marcus|Marcus"\`
      * \`"Silver Inn"\` in an ID field
      * \`"loc_tavern [Silver Inn]"\` (ID + bracket alias together)

    **WHERE IDs MUST NEVER APPEAR**:
    ❌ \`narrative\` field: "You see npc_marcus approaching..." → WRONG!
    ❌ \`visible.description\`: "The sword_of_kings glows..." → WRONG!
    ❌ \`hidden.secrets\`: ["loc_cellar contains treasure"] → WRONG!
    ❌ \`choices[].text\`: "Talk to npc_captain" → WRONG!
    ❌ Any player-facing text whatsoever
    ❌ \`timeline.involvedEntities\`: ["Marcus", "Tavern"] → WRONG! (must be IDs)

    **CORRECT EXAMPLES**:
    ✅ narrative: "You see **Marcus** approaching..." (use visible.name)
    ✅ visible.description: "The legendary **Sword of Kings** glows..." (use item name)
    ✅ choices: [{ text: "Talk to the captain" }] (use role/title/description)
  </rule>
`;

const idGeneration = `
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
    2. **Use Prefixes**: Start with entity type (Actors: \`char:\`, items: \`inv_\`, locations: \`loc_\`, quests: \`quest_\`, etc.)
    3. **Use snake_case**: \`"ancient_temple"\` not \`"AncientTemple"\`
    4. **Be Consistent**: If you use \`"char:marcus"\`, continue with \`"char:sara"\`, not \`"sara"\`

    **ID IMMUTABILITY**:
    - \`action: "update"\` uses \`id\` for IDENTIFICATION ONLY
    - You CANNOT change an entity's ID - it will ERROR
    - To "rename" an ID: remove old entity, add new one with new ID

    **EXAMPLES**:
    ✅ CORRECT:
    \`\`\`json
    { "id": "inv_healing_potion", "name": "Minor Healing Potion", "visible": { "description": "A small vial of red liquid." } }
    { "id": "char:marcus", "kind": "npc", "currentLocation": "loc_tavern", "visible": { "name": "Marcus", "description": "A grizzled veteran with a scar across his left eye." } }
    \`\`\`

    ❌ INCORRECT:
    \`\`\`json
    { "name": "Healing Potion", ... }  // Missing ID
    { "id": null, "name": "Marcus" }   // ID is null
    { "visible": { "description": "npc_marcus is a grizzled veteran..." } }  // ID in description!
    \`\`\`
  </rule>
`;

const minimalEntity = `
    <rule name="MINIMAL ENTITY PRINCIPLE - QUALITY OVER QUANTITY">
    ⚠️ **CRITICAL: AVOID BLOAT, BUT MAXIMIZE DEPTH**

    **THE PRINCIPLE**:
    - **Minimal Quantity**: Do not create entities for trivial background noise (crowds, debris).
    - **Maximum Quality**: If you DO create an entity (NPC, Item, Location), it must be **RICH, DETAILED, AND HISTORICALLY GROUNDED**.
    - **Contextual Integration**: Newly created entities must integrate with the existing world state.
      * If there is a plague, a new NPC should be coughing or wearing a mask.
      * If there was a fire, a new building should have scorch marks or be a rebuild.

    - **Canonization**: If an existing entity is "close enough" (80% match), USE IT. Update it to fit your needs. Do NOT create a new one.
    - **One Object, One ID**: A "Rusty Sword" polished by a blacksmith is still \`inv_rusty_sword\` (just updated name/desc), NOT a new \`inv_polished_sword\`.
    - **Outline Continuity**: Do not re-create entities that were part of your character creation or world foundation. If the Outline made it, YOU usually made it. Read \`current/outline/outline.json\` via \`vfs_read_json\` and \`current/outline/story_outline/plan.md\` via \`vfs_read_markdown\` (or bounded \`vfs_read_lines\`), then check existing files under \`current/world/\`.

    **MANDATORY "INVESTIGATIVE SEARCH" WORKFLOW**:
    1. **STRICT CHECK-FIRST**: Never assume a clean state. Always assume entities might already exist.
    2. **BROWSE (Directory Scan)**: Use \`vfs_ls\` on \`current/world/<type>/\` to see the full landscape.
    3. **SEARCH (Text Scan)**: Use \`vfs_search\` or \`vfs_search\` on \`current/world/<type>/\`, \`current/outline/outline.json\`, and \`current/outline/story_outline/plan.md\`.
    4. **READ (Deep Details)**: Use \`vfs_read_markdown/vfs_read_chars/vfs_read_lines/vfs_read_json\` on candidate files to confirm identity and details.
    5. **EVALUATE**:
       - Found "Old Knife" but want "Dagger"? -> **USE "Old Knife"** and update the file via split write tools (\`vfs_patch_json\`/\`vfs_merge_json\`/\`vfs_write_file\`).
       - Found "Guard A" but want "Guard Captain"? -> **USE "Guard A"** and update the file via split write tools (\`vfs_patch_json\`/\`vfs_merge_json\`/\`vfs_write_file\`).
    6. **CREATE (Last Resort)**: Only if NO semantic match exists.

    **ANTI-CLUTTER & SIGNIFICANCE THRESHOLD**:
    ⚠️ **CRITICAL: ONLY CREATE "SIGNIFICANT" ENTITIES**

    **THE THRESHOLD (If it doesn't meet this, it is NARRATIVE ONLY)**:
    - **NPCs**:
      * **MUST HAVE**: A proper Name (not just "Guard") AND (Speaking Role OR Combat Role).
      * **NARRATIVE ONLY**: Crowds, background villagers, unnamed guards, servants causing no consequence.
      * *Example*: "The tavern is full of people" -> NO entities. "Captain Vance approaches you" -> \`vfs_write_file(...)\` for \`current/world/characters/char:captain_vance/profile.json\`

    - **Items**:
      * **MUST BE**: Added to Player/NPC Inventory OR Key Quest Object.
      * **NARRATIVE ONLY**: Flavor objects, furniture, food eaten immediately, debris.
      * *Example*: "There is a mug on the table" -> NO entity. "You pick up the Iron Key" -> \`vfs_write_file(...)\` for \`current/world/characters/char:player/inventory/inv_iron_key.json\`

    - **Locations**:
      * **MUST BE**: Named, distinct, and revisit-able (e.g., "The Blue Dragon Inn").
      * **NARRATIVE ONLY**: Transitional spaces ("a hallway"), generic areas ("a forest path" - unless named).

    - **Quests**:
      * **MUST BE**: A structured mission with clear success/fail state tracked in journal.
      * **NARRATIVE ONLY**: Momentary goals ("Open the door", "Ask him a question"), impulsive actions.
      * *Example*: "I want to kill that goblin" -> NARRATIVE. "Guildmaster orders you to purge the camp" -> \`vfs_write_file(...)\` for \`current/world/quests/quest_purge_camp.json\`

    - **Knowledge**:
      * **MUST BE**: Reusable information (passwords, history, recipes, secret locations).
      * **NARRATIVE ONLY**: One-off rumors, insults, throwaway lines.

    - **Factions**:
      * **MUST BE**: Established organizations with multiple members and political weight.
      * **NARRATIVE ONLY**: Small temporary gangs, a family unit (unless royal/powerful), "the people in this room".

    - **Timeline**:
      * **MUST BE**: World-altering events or major plot milestones (chapters).
      * **NARRATIVE ONLY**: Daily routines, minor scuffles, conversations.

    - **Conditions**:
      * **MUST BE**: Mechanical status effects with duration (Poisoned, Blessed, Injured).
      * **NARRATIVE ONLY**: Fleeting emotions ("Sad", "Angry"), minor discomforts ("Itchy").

    - **Causal Chains**:
      * **MUST BE**: Complex logic tracking consequences >3 turns away or involving off-screen NPCs.
      * **NARRATIVE ONLY**: Immediate reactions (You punch him -> he punches back).

    - **Inventory Hygiene**: If a player eats an apple, delete the file immediately (e.g., \`vfs_delete({ path: "current/world/characters/char:player/inventory/inv_apple.json" })\`). Do not keep quantity 0.

    <realism_vs_bloat_prevention>
      ⚠️ **CRITICAL: REALISM DOES NOT EQUAL ENTITY BLOAT**

      You have been instructed to simulate "Biological Imperatives" (hunger, mud, fatigue).
      **DO NOT CREATE ENTITIES FOR THESE** unless they are critical, long-term mechanics.

      - **Mud/Blood on Clothes**:
        * ❌ Create a new condition entry for \`cond_muddy\` -> Bloat.
        * ✅ Narrative only OR \`vfs_patch_json({ path: "current/world/characters/char:player/inventory/inv_clothes.json", patch: [{ op: "replace", path: "/visible/description", value: "Stained with mud." }] })\`

      - **NPC Fatigue/Hunger**:
        * ❌ Create a new condition entry for \`cond_tired_guard\` -> Bloat.
        * ✅ \`vfs_patch_json({ path: "current/world/characters/char:guard/profile.json", patch: [{ op: "replace", path: "/visible/mood", value: "Exhausted and irritable" }] })\`

      - **Transient Atmosphere**:
        * ❌ Create a new item file for \`item_fog\` -> Absurd.
        * ✅ \`vfs_patch_json({ path: "current/world/locations/loc_here.json", patch: [{ op: "replace", path: "/visible/atmosphere", value: "Thick fog..." }] })\`

      **RULE**: Only create a new ID if it needs to be tracked *independently* and *mechanically* for >10 turns.
      For everything else, **UPDATE EXISTING FIELDS** (\`description\`, \`mood\`, \`status\`).

      **DUPLICATE PREVENTION (SESSION REBUILD)**:
      When a context is rebuilt or a session is initialized:
      - **DO NOT** blindly add entities described in the summary.
      - **ALWAYS** \`vfs_ls\` and \`vfs_search\` first to see what actually exists in the files.
      - Summary descriptions may be outdated; the VFS files under \`current/\` are the source of truth.
    </realism_vs_bloat_prevention>
  </rule>
`;

const icons = `
  <rule name="ICONS">
    - **MANDATORY**: You MUST generate a single emoji \`icon\` for EVERY new or updated entity (Item, Location, Knowledge, Status, Skill, NPC, Faction, TimelineEvent, Attribute, Quest).
    - **Relevance**: The emoji must be visually relevant to the entity's name or nature (e.g., "Sword" -> ⚔️, "Forest" -> 🌲, "Secret" -> 🤫).
    - **Consistency**: Try to keep icons consistent for similar types of entities.
  </rule>
`;

export const idAndEntityPolicy: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/idAndEntityPolicy#idAndEntityPolicy",
    source: "atoms/core/idAndEntityPolicy.ts",
    exportName: "idAndEntityPolicy",
  },
  () => `
${idUsage}
${idGeneration}
${minimalEntity}
${icons}
`,
);

export const idUsageAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/idAndEntityPolicy#idUsageAtom",
    source: "atoms/core/idAndEntityPolicy.ts",
    exportName: "idUsageAtom",
  },
  () => idUsage,
);
export const idGenerationAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/idAndEntityPolicy#idGenerationAtom",
    source: "atoms/core/idAndEntityPolicy.ts",
    exportName: "idGenerationAtom",
  },
  () => idGeneration,
);
export const minimalEntityAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/idAndEntityPolicy#minimalEntityAtom",
    source: "atoms/core/idAndEntityPolicy.ts",
    exportName: "minimalEntityAtom",
  },
  () => minimalEntity,
);
export const iconsAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/idAndEntityPolicy#iconsAtom",
    source: "atoms/core/idAndEntityPolicy.ts",
    exportName: "iconsAtom",
  },
  () => icons,
);

export const idAndEntityPolicyPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/idAndEntityPolicy#idAndEntityPolicyPrimer",
    source: "atoms/core/idAndEntityPolicy.ts",
    exportName: "idAndEntityPolicyPrimer",
  },
  () => `
<id_and_entity_policy>
  <rule>IDs are for storage + references only. NEVER put IDs in narrative, choices, or any player-facing text.</rule>
  <rule>Persisted entities should have stable, unique IDs. Reuse existing IDs; do not rename IDs.</rule>
  <rule>Prefer depth over bloat: only create a new entity file when it must persist mechanically; otherwise keep it narrative-only or update an existing entity.</rule>
  <rule>For the full ID + entity workflow (search-before-create, minimal-entity principle), read \`current/skills/core/id-and-entities/SKILL.md\`.</rule>
</id_and_entity_policy>
`,
);
