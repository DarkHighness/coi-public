/**
 * Core Atom: Memory Policy
 * Content from acting/state_management.ts
 */
import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

const globalNotes = `
  <rule name="NOTES (VFS MARKDOWN) - SCRATCH PAD">
    **NOTES ARE A FLEXIBLE FALLBACK.**
    Use notes to store important information that does not fit cleanly into the structured entity JSON fields.
    Notes are markdown and may contain headings, lists, tables, TODOs, and reminders.

    <paths>
      **PATH MODEL**: canonical \`shared/**\` + \`forks/{forkId}/**\`; alias \`current/**\` is accepted.

      **GLOBAL SCRATCH PAD**:
      - \`current/world/notes.md\`

      **ENTITY NOTES (ONE PER ENTITY)**:
      - For any entity JSON file at \`current/world/<...>/<id>.json\`, the notes file is:
        - \`current/world/<...>/<id>/notes.md\`
      - Examples:
        - Quest: \`current/world/quests/quest:1.json\` → \`current/world/quests/quest:1/notes.md\`
        - Character: \`current/world/characters/char:player/profile.json\` → \`current/world/characters/char:player/notes.md\`
        - Skill: \`current/world/characters/char:player/skills/skill:1.json\` → \`current/world/characters/char:player/skills/skill:1/notes.md\`
    </paths>

    <when_to_use>
      ✅ USE NOTES FOR:
      1. **Cross-entity patterns** (relationships, repeated lies, recurring symbols)
      2. **Long-range foreshadowing** and plot threads that span many turns
      3. **GM secrets / hidden truth reminders** that must stay consistent
      4. **Style/voice constraints** that are too detailed for structured fields
      5. **TODOs** for future continuity checks

      ❌ DO NOT LEAVE CANONICAL FACTS ONLY IN NOTES:
      - If a fact is stable and can be expressed structurally, write it back into the appropriate entity JSON using
        \`vfs_write\` (\`write_file\` / \`patch_json\` / \`merge_json\`).
      - Notes are not the canonical world state; they are a scratch pad.
    </when_to_use>

    <read_write_protocol>
      **IMPORTANT (tool-seen constraints):**
      - Existing files must be read before mutation in the current session epoch.
      - Prefer \`vfs_write\` + \`append_text\` for additive updates (fast + safe, no full rewrite):
        - \`vfs_write({ ops: [{ op: "append_text", path: "current/world/notes.md", content: "...", ensureNewline: true }] })\`
        - If the file already exists, you MUST \`vfs_read\` it first (read-before-mutate).
        - \`expectedHash\` is optional; pass it only when you want extra stale-write protection.
      - For non-additive changes, use read → modify → write:
        1) \`vfs_read\` the notes file
        2) Then \`vfs_write\` with \`edit_lines\` or \`write_file\` for the updated markdown content
      - If it does not exist, you may \`vfs_write\` (\`write_file\`) to create it.
    </read_write_protocol>

    <compact_bootstrap>
      **AFTER COMPACT/SUMMARY OR ANY HISTORY REBUILD, RE-BOOTSTRAP MEMORY CONTEXT**:
      1. \`vfs_read path="forks/{activeFork}/story/summary/state.json"\` (or alias \`current/summary/state.json\`)
      2. \`vfs_read path="forks/{activeFork}/story/world/global.json"\` (or alias \`current/world/global.json\`)
      3. \`vfs_read path="current/world/notes.md"\` (if present)
      4. If more notes are needed, \`vfs_ls patterns=["current/**/notes.md"]\`, then read only relevant files.

      **CANONICAL VS NOTES**:
      - Stable facts belong in structured JSON.
      - Notes are scratch pad context, not canonical truth.
    </compact_bootstrap>

    <search_strategy>
      **AVOID FULL SCANS**:
      - Start with \`vfs_read path="current/world/notes.md"\` (if present).
      - When you need related entity notes, use:
        - \`vfs_ls patterns=["current/**/notes.md"]\`
      - Then \`vfs_read\` only the relevant notes files.
    </search_strategy>

    <hygiene>
      **KEEP NOTES SMALL AND LINK OUT**:
      - Keep \`notes.md\` as an INDEX + short bullets.
      - If notes grow too large, split into topic files (still markdown) and link them from \`notes.md\`.
      - Example:
        - \`current/world/notes.md\` (index)
        - \`current/world/notes/plot_threads.md\`
        - \`current/world/notes/unresolved_questions.md\`
    </hygiene>
  </rule>
`;

const memoryQuery = `
  <rule name="MEMORY & CONTEXT SEARCH - CRITICAL">
    **WHEN IN DOUBT, SEARCH FIRST - NEVER ASSUME**

    Your memory is limited. The story may span many turns, and details from early turns may have been summarized.
    **IF YOU ARE UNCERTAIN ABOUT WHAT HAPPENED IN THE PAST, YOU MUST SEARCH THE FILES** before writing.

    **MANDATORY SEARCH SITUATIONS**:
    1. **Referencing past events**: If unsure what happened earlier, search the conversation turns.
    2. **Character consistency**: If unsure about an NPC's previous behavior or dialogue, verify by reading past turns.
    3. **Plot threads**: If unsure if a plot thread was resolved, search before continuing or contradicting it.
    4. **Player promises/deals**: If the player or NPCs made promises, verify before referencing them.
    5. **Location details**: If returning to a location, confirm prior descriptions.
    6. **Emotional/Relationship states**: If unsure how an NPC feels about the player or another NPC, check recent interactions.
    7. **Timeline verification**: If unsure when something happened or in what order, confirm chronology from files.

    **AVAILABLE VFS TOOLS** (use in the SEARCH stage):
    - \`vfs_search\`: Search across \`forks/{activeFork}/story/conversation/turns/\` (alias: \`current/conversation/turns/\`) for keywords.
    - \`vfs_search\`: Regex search for precise phrases or names.
    - \`vfs_read\`: Read specific turn files or \`shared/narrative/conversation/index.json\` (alias: \`current/conversation/index.json\`) to confirm ordering.

    <continuity_awareness>
      ⚠️ **CRITICAL: DO NOT DRAW HASTY CONCLUSIONS FROM FRAGMENTARY RESULTS**

      Stories have **continuity**. A single search result shows only a fragment of a larger narrative arc.

      **THE DANGER OF FRAGMENT-BASED REASONING**:
      - A search for "Marcus betrayed" might return: "Marcus betrayed his former guild..."
      - **WRONG CONCLUSION**: "Marcus is a traitor!" (Jumping to judgment)
      - **RIGHT APPROACH**: Search more context. Maybe the full story is: "Marcus betrayed his former guild... because they were planning genocide. He became a hero for this act."

      **CONTINUITY PROTOCOL**:
      1. **Never judge from one snippet**: A single search result is a CLUE, not a VERDICT.
      2. **Search surrounding context**: Read adjacent turns for continuity.
      3. **Check for reversals**: A character who "died" may have been "resurrected" or "faked death" later.
      4. **Consider the arc**: A "villain" in turn 5 may be a "redeemed ally" by turn 20.
      5. **When in doubt, search more**: It's better to make 3 searches and be accurate than 1 search and be wrong.

      **EXAMPLES OF CONTINUITY TRAPS**:
      - ❌ "Search shows 'Sarah stole the gem'" → YOU ASSUME: "Sarah is a thief!"
        ✅ CORRECT: Search more. Maybe "Sarah stole the gem... to prevent it from destroying the village."
      - ❌ "Search shows 'The king fell'" → YOU ASSUME: "The king is dead!"
        ✅ CORRECT: Search more. Maybe "The king fell... to his knees in prayer" or "The king fell... but was caught by his guards."
      - ❌ "Search shows 'They parted ways'" → YOU ASSUME: "They broke up forever!"
        ✅ CORRECT: Search more. Maybe they reunited 5 turns later.

      **THE RULE**: Treat search results as **LEADS TO INVESTIGATE**, not **FACTS TO ASSUME**.
    </continuity_awareness>

    **ANTI-HALLUCINATION PROTOCOL**:
    - If you cannot remember something clearly, DO NOT MAKE IT UP.
    - Search the story history FIRST, then write based on actual events.
    - If search returns no results, acknowledge the gap: "The details of that conversation have faded..."
    - If search returns ambiguous results, search with different keywords or wider range.
    - NEVER contradict established facts from previous turns.
    - When unsure, **ASK THE STORY** by searching the files, not your own imagination.

    <consistency_hierarchy>
      **TRUTH HIERARCHY**:
      1. **Immediate Input**: Absolute reality.
      2. **Entity Notes/Hidden**: The living truth.
      3. **Full Conversation Context**: The actual story as it unfolded.
      4. **Summary**: Compressed memory (may be outdated or lossy).

      **PROTOCOL**:
      - **Internal Check**: Quietly verify against entity files when details are crucial.
      - **Conflict**: If files differ from summary, **TRUST FILES** and narrate the correction subtly.
      - **Ambiguity**: If unsure, search the story directly rather than guessing.
      - **Sync**: If narrative changes a key fact (e.g. injury), update the relevant file via \`vfs_write\`.
    </consistency_hierarchy>
  </rule>
`;

export const memoryPolicy: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/memoryPolicy#memoryPolicy",
    source: "atoms/core/memoryPolicy.ts",
    exportName: "memoryPolicy",
  },
  () => `
${globalNotes}
${memoryQuery}
`,
);

export const globalNotesAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/memoryPolicy#globalNotesAtom",
    source: "atoms/core/memoryPolicy.ts",
    exportName: "globalNotesAtom",
  },
  () => globalNotes,
);
export const memoryQueryAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/memoryPolicy#memoryQueryAtom",
    source: "atoms/core/memoryPolicy.ts",
    exportName: "memoryQueryAtom",
  },
  () => memoryQuery,
);
