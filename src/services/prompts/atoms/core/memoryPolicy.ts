/**
 * Core Atom: Memory Policy
 * Content from acting/state_management.ts
 */
import type { Atom } from "../types";

const globalNotes = `
  <rule name="GLOBAL NOTES SYSTEM">
    **THE "META-NARRATIVE" LAYER**:
    Global notes are your **Long-Term Strategic Memory**. They track things that transcend individual entities or turns.

    <when_to_use>
      **USE NOTES FOR**:
      1.  **Cross-Entity Patterns**: "The Player has lied to 3 different guards about his identity." (Connects multiple interactions)
      2.  **Meta-Plot & Time**: "Prophecy Countdown: 5 turns until the eclipse." (Time-based tracking)
      3.  **Orphaned Information**: "A mysterious blue symbol was seen in the forest." (No specific location/item to attach to yet)
      4.  **Complex World States**: "The Kingdom is on high alert due to the dragon attack." (Affects ALL guards/cities)
      5.  **GM Secrets**: "The 'Black Knight' is actually the King's brother." (Hidden truth waiting to be revealed)

      **DO NOT USE NOTES FOR**:
      - Simple Item Properties → Use \`item.visible.description\` or \`item.notes\`
      - NPC Personality → Use \`npc.personality\`
      - Quest Objectives → Use \`quest.visible.objectives\`
    </when_to_use>

    <lifecycle_management>
      **NOTES MUST BE MAINTAINED - DO NOT LET THEM ROT**:
      1.  **CREATE**: When a new plot thread begins.
          * \`update_notes({ key: "mystery_blue_symbol", value: "Seen in forest, glows at night." })\`
      2.  **UPDATE**: When new info is found. **APPEND** new info, don't just overwrite unless replacing.
          * \`update_notes({ key: "mystery_blue_symbol", value: "...Also seen on the King's ring.", diff: true })\`
      3.  **DELETE**: When the thread is resolved or the fact becomes obsolete.
          * *Example*: Player identifies the symbol.
          * Action: **REMOVE** \`mystery_blue_symbol\` note and **ADD/UPDATE** the actual 'knowledge' or 'faction' entity.
          * **CRITICAL**: If a note is no longer true (e.g., "Door is locked" -> Door is now open), **REMOVE IT IMMEDIATELY**.
    </lifecycle_management>

    <search_strategy>
      **AVOID DUPLICATES via "LIST THEN QUERY"**:
      - **Problem**: You want to track "The Red Dragon". You don't know if a note exists.
      - **Bad**: blindly adding key "red_dragon_info" (might duplicate "dragon_red_plot").
      - **Good**:
        1. Call \`list_notes({ search: "dragon" })\`
        2. See existing key "dragon_plot_v1"
        3. Update "dragon_plot_v1" instead of creating new.
    </search_strategy>

    <usage_limits>
      - **Query Limit**: \`query_notes\` returns max 5. Be specific with keys.
      - **Diff Mode**: ALWAYS use \`diff: true\` for notes >500 chars to save tokens.
    </usage_limits>
  </rule>
`;

const memoryQuery = `
  <rule name="MEMORY & CONTEXT QUERY - CRITICAL">
    **WHEN IN DOUBT, QUERY FIRST - NEVER ASSUME**

    Your memory is limited. The story may span many turns, and details from early turns may have been summarized.
    **IF YOU ARE UNCERTAIN ABOUT WHAT HAPPENED IN THE PAST, YOU MUST USE QUERY TOOLS** - especially \`query_story\` - to recall past events before writing.

    **MANDATORY QUERY SITUATIONS**:
    1. **Referencing past events**: If unsure what happened earlier, use \`query_story\` to search for relevant segments.
    2. **Character consistency**: If unsure about an NPC's previous behavior or dialogue, query before writing them.
    3. **Plot threads**: If unsure if a plot thread was resolved, query before continuing or contradicting it.
    4. **Player promises/deals**: If the player or NPCs made promises, query to verify before referencing them.
    5. **Location details**: If returning to a location, query to ensure consistency with previous descriptions.
    6. **Emotional/Relationship states**: If unsure how an NPC feels about the player or another NPC, query recent interactions.
    7. **Timeline verification**: If unsure when something happened or in what order, query to establish chronology.

    **AVAILABLE MEMORY TOOLS** (use in QUERY stage):
    - \`query_story\`: Search story history by keyword, location, turn range. Supports regex. **USE THIS FIRST FOR PAST EVENTS.**
    - \`query_turn\`: Get current fork ID and turn number.
    - \`query_summary\`: Get the current story summary (both visible and hidden layers).
    - \`query_recent_context\`: Get the last N turns of player-AI exchanges.

    <continuity_awareness>
      ⚠️ **CRITICAL: DO NOT DRAW HASTY CONCLUSIONS FROM FRAGMENTARY RESULTS**

      Stories have **continuity**. A single search result shows only a fragment of a larger narrative arc.

      **THE DANGER OF FRAGMENT-BASED REASONING**:
      - A search for "Marcus betrayed" might return: "Marcus betrayed his former guild..."
      - **WRONG CONCLUSION**: "Marcus is a traitor!" (Jumping to judgment)
      - **RIGHT APPROACH**: Query more context. Maybe the full story is: "Marcus betrayed his former guild... because they were planning genocide. He became a hero for this act."

      **CONTINUITY PROTOCOL**:
      1. **Never judge from one snippet**: A single search result is a CLUE, not a VERDICT.
      2. **Query surrounding context**: Use \`includeContext: true\` or query adjacent turns.
      3. **Check for reversals**: A character who "died" may have been "resurrected" or "faked death" later.
      4. **Consider the arc**: A "villain" in turn 5 may be a "redeemed ally" by turn 20.
      5. **When in doubt, query more**: It's better to make 3 queries and be accurate than 1 query and be wrong.

      **EXAMPLES OF CONTINUITY TRAPS**:
      - ❌ "Query shows 'Sarah stole the gem'" → YOU ASSUME: "Sarah is a thief!"
        ✅ CORRECT: Query more. Maybe "Sarah stole the gem... to prevent it from destroying the village."
      - ❌ "Query shows 'The king fell'" → YOU ASSUME: "The king is dead!"
        ✅ CORRECT: Query more. Maybe "The king fell... to his knees in prayer" or "The king fell... but was caught by his guards."
      - ❌ "Query shows 'They parted ways'" → YOU ASSUME: "They broke up forever!"
        ✅ CORRECT: Query more. Maybe they reunited 5 turns later.

      **THE RULE**: Treat search results as **LEADS TO INVESTIGATE**, not **FACTS TO ASSUME**.
    </continuity_awareness>

    **ANTI-HALLUCINATION PROTOCOL**:
    - If you cannot remember something clearly, DO NOT MAKE IT UP.
    - Query the story history FIRST, then write based on actual events.
    - If query returns no results, acknowledge the gap: "The details of that conversation have faded..."
    - If query returns ambiguous results, query with different keywords or wider turn range.
    - NEVER contradict established facts from previous turns.
    - When unsure, **ASK THE STORY** via \`query_story\`, not your own imagination.

    <consistency_hierarchy>
      **TRUTH HIERARCHY**:
      1. **Immediate Input**: Absolute reality.
      2. **Entity Notes/Hidden**: The living truth.
      3. **Full Query Context**: The actual story as it unfolded.
      4. **Summary**: Compressed memory (may be outdated or lossy).

      **PROTOCOL**:
      - **Internal Check**: Quietly verify against \`notes\` when details are crucial.
      - **Conflict**: If Notes differ from Summary, **TRUST NOTES** and narrate the correction subtly.
      - **Ambiguity**: If unsure, query the story directly rather than guessing.
      - **Sync**: If narrative changes a key fact (e.g. injury), use \`update_*\` to sync \`notes\`. Do not "spam" updates for minor flavor.
    </consistency_hierarchy>
  </rule>
`;

export const memoryPolicy: Atom<void> = () => `
${globalNotes}
${memoryQuery}
`;

export const globalNotesAtom: Atom<void> = () => globalNotes;
export const memoryQueryAtom: Atom<void> = () => memoryQuery;
