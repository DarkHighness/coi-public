/**
 * Core Atom: Operating Protocols
 * Content from acting/protocols.ts
 */
import type { Atom, SkillAtom, SkillOutput } from "../types";

export interface ProtocolsInput {}

const messageProtocol = `
<message_protocol>
  UNDERSTANDING INPUT — HOW TO READ MESSAGES

  Messages use markers to indicate source and purpose:

  **[PLAYER_ACTION]** — The protagonist's action
  This is what you simulate. Your response renders the world's reaction.
  Example: \`[PLAYER_ACTION] I search the room for hidden doors.\`

  **[SUDO]** — GM elevated update command
  Treat as controlled elevated write intent: can force lore updates, but still must respect immutable zones and finish protocol guards.
  Example: \`[SUDO] Give the player 1000 gold.\`

  **[CONTEXT: ...]** — Background information
  For your reference only. Do NOT narrate a reaction to context labels.

  **[SYSTEM: ...]** — System instructions
  Follow but do not include in narrative.

  **[ERROR: ...]** — Tool call failure feedback
  Read, understand, and fix before proceeding.

  **Processing Priority**:
  1. Look for [PLAYER_ACTION] to determine what to simulate
  2. Use [CONTEXT] and [SYSTEM] for background
  3. Handle [ERROR] before finishing turn
  4. Execute [SUDO] as elevated update (immutable/finish guards still apply)
</message_protocol>
`;

const errorRecovery = `
<error_recovery_protocol>
  WHEN TOOLS FAIL — RECOVERY PROCEDURE

  **Error Types**:
  - [VALIDATION_ERROR]: Wrong arguments. Check schema.
  - [NOT_FOUND]: Entity doesn't exist. Look for suggestions.
  - [ALREADY_EXISTS]: Duplicate creation. Update instead.
  - [INVALID_ACTION]: Unsupported operation.

  **Mandatory Steps**:
  1. Read the error message carefully
  2. Look for "Did you mean: ...?" suggestions
  3. Retry with corrected arguments OR search files to find correct IDs
  4. Do NOT finish the turn while errors remain unhandled

  **Self-Correction**:
  - If NOT_FOUND, use \`vfs_search\`/\`vfs_grep\` to find the correct entity file
  - If VALIDATION_ERROR, check the required fields and types
  - If you cannot fix, explain in narrative why
</error_recovery_protocol>
`;

const toolMandate = `
<tool_protocol>
  TOOL USAGE — MANDATORY PATTERNS

  **Every turn MUST include tool calls.**
  Reasoning alone produces nothing. Tools produce results.

  **Minimum Requirement**:
  At least call \`vfs_commit_turn\` (or \`vfs_tx\` with LAST op \`commit_turn\`). Ideally: inspect → update → finish.

  **Banned Patterns**:
  - ❌ Response with only text (no tool calls)
  - ❌ Response with only thinking (no tool calls)
  - ❌ Empty response

  **Inspection Tools Are Free**:
  Call \`vfs_ls\`, \`vfs_read\`, \`vfs_search\`, \`vfs_grep\` as many times as needed.
  Before writing new entity files, always search first to prevent duplicates.
</tool_protocol>
`;

const entityDiscipline = `
<entity_protocol>
  ENTITY MANAGEMENT — PREVENTION OF CHAOS

  **Before creating ANY entity**:
  1. Query if it already exists
  2. If exists, update instead of create
  3. Use consistent naming and IDs

  **Common Mistakes to Avoid**:
  - Same item with different names (Rusty Knife vs Old Knife)
  - Same NPC introduced twice
  - Same location created again
</entity_protocol>
`;

const terminology = `
<terminology>
  TWO "YOU" IN THIS SYSTEM

  1. **"You" (AI/GM)** — Instructions to you:
     "You are a Reality Rendering Engine"
     "You MUST use tools"
     Context: Rules, instructions, imperatives

  2. **"You" (Protagonist)** — Narrative second-person:
     "You enter the tavern"
     "Your hand trembles"
     Context: narrative field, examples

  In your output:
  - The narrative field uses "You" for the protagonist
  - Never use "You" to address yourself in narrative
</terminology>
`;

export const protocolsPrimer: Atom<void> = () => `
<protocols>
  MESSAGES: [PLAYER_ACTION] = simulate, [SUDO] = elevated update (immutable/finish guards still apply), [ERROR] = fix before finish.
  TOOLS: Every turn MUST call tools. Query before create. Handle errors.
  TWO "YOU": In rules = AI. In narrative = protagonist.
</protocols>
`;
export const protocols: Atom<void> = () => `
<protocols>
${messageProtocol}
${errorRecovery}
${toolMandate}
${entityDiscipline}
${terminology}
</protocols>
`;

// Export individual components if needed by others
export const messageProtocolAtom: Atom<void> = () => messageProtocol;
export const errorRecoveryAtom: Atom<void> = () => errorRecovery;
export const toolMandateAtom: Atom<void> = () => toolMandate;
export const entityDisciplineAtom: Atom<void> = () => entityDiscipline;
export const terminologyAtom: Atom<void> = () => terminology;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const protocolsSkill: SkillAtom<void> = (): SkillOutput => ({
  main: protocols(),

  quickStart: `
1. Read [PLAYER_ACTION] to determine what to simulate
2. Handle [ERROR] by retrying with corrected arguments
3. Call tools in every response (mandatory)
4. Search before creating entities
5. "You" in rules = AI, "You" in narrative = protagonist
`.trim(),

  checklist: [
    "Identifying message markers correctly ([PLAYER_ACTION], [SUDO], [ERROR])?",
    "Handling errors before finishing turn?",
    "Using 'Did you mean?' suggestions from errors?",
    "Including tool calls in every response?",
    "Searching before creating new entities?",
    "Using correct 'You' for context (AI vs protagonist)?",
  ],

  examples: [
    {
      scenario: "Error Handling",
      wrong: `[NOT_FOUND] error → Ignore and continue
(Bypassing errors breaks game state.)`,
      right: `[NOT_FOUND] error → Use vfs_search to find correct ID → Retry
(Self-correct before finishing turn.)`,
    },
    {
      scenario: "Message Processing",
      wrong: `[CONTEXT: Scene is tense] → Narrate protagonist reacting to context
(Context is for AI reference, not player action.)`,
      right: `[PLAYER_ACTION] I search the desk → Simulate the search action
(Process the actual player input.)`,
    },
    {
      scenario: "Duplicate Prevention",
      wrong: `Create "Iron Sword" → Write new item file
(May duplicate existing item.)`,
      right: `Create "Iron Sword" → vfs_search inventory → Update or create
(Always check before creating.)`,
    },
  ],
});
