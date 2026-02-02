/**
 * Core Atom: Memory Policy
 * Content from acting/state_management.ts
 */
import type { Atom } from "../types";

const globalNotes = `
  <rule name="GLOBAL MEMORY (VFS)">
    **THE "META-NARRATIVE" LAYER**:
    Global memory tracks facts that transcend individual entities or turns and must persist across time.

    <when_to_use>
      **STORE GLOBAL MEMORY FOR**:
      1.  **Cross-Entity Patterns**: "The Player has lied to 3 different guards about his identity."
      2.  **Meta-Plot & Time**: "Prophecy Countdown: 5 turns until the eclipse."
      3.  **Orphaned Information**: "A mysterious blue symbol was seen in the forest."
      4.  **Complex World States**: "The Kingdom is on high alert due to the dragon attack."
      5.  **GM Secrets**: "The 'Black Knight' is actually the King's brother."

      **DO NOT STORE HERE**:
      - Simple Item Properties → Use \`item.visible.description\` or \`item.notes\`
      - NPC Personality → Use \`npc.personality\`
      - Quest Objectives → Use \`quest.visible.objectives\`
    </when_to_use>

    <storage_rules>
      **STORE AS KNOWLEDGE ENTRIES**:
      - Use \`current/world/knowledge/<id>.json\` to persist global memory.
      - Write with \`vfs_write\` (create/replace) or \`vfs_edit\` (patch fields).
      - Remove obsolete entries with \`vfs_delete\`.
    </storage_rules>

    <search_strategy>
      **AVOID DUPLICATES via SCAN → SEARCH → READ**:
      - **Problem**: You want to track "The Red Dragon". You don't know if a file exists.
      - **Good**:
        1. \`vfs_ls\` on \`current/world/knowledge/\`
        2. \`vfs_search\` or \`vfs_grep\` for "dragon"
        3. \`vfs_read\` the closest match and update it instead of creating a new file
    </search_strategy>
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
    - \`vfs_search\`: Search across \`current/conversation/turns/\` for keywords.
    - \`vfs_grep\`: Regex search for precise phrases or names.
    - \`vfs_read\`: Read specific turn files or \`current/conversation/index.json\` to confirm ordering.

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
      - **Sync**: If narrative changes a key fact (e.g. injury), update the relevant file via \`vfs_edit\`.
    </consistency_hierarchy>
  </rule>
`;

export const memoryPolicy: Atom<void> = () => `
${globalNotes}
${memoryQuery}
`;

export const globalNotesAtom: Atom<void> = () => globalNotes;
export const memoryQueryAtom: Atom<void> = () => memoryQuery;
