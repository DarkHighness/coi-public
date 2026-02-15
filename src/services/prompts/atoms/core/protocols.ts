/**
 * Core Atom: Operating Protocols
 * Content from acting/protocols.ts
 */
import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

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

  **[Player Rate]** — Player feedback on this turn output
  Treat as feedback ingestion for soul updates. Do NOT treat it as a protagonist action or advance story events.
  Example: \`[Player Rate] {"turnId":"fork-0/turn-12","vote":"down","preset":"AI flavor too strong"}\`
  Required handling: parse \`vote/preset/comment/time\` when present, then update \`current/world/soul.md\` and \`current/world/global/soul.md\`. Both are Story Teller AI internal self-notes.
  This does NOT mean soul updates are exclusive to \`[Player Rate]\`: in normal \`[PLAYER_ACTION]\` turns, you may proactively refine soul docs when multi-turn evidence warrants it.

  **[CONTEXT: ...]** — Background information
  For your reference only. Do NOT narrate a reaction to context labels.

  **[SYSTEM: ...]** — System instructions
  Follow but do not include in narrative.

  **[ERROR: ...]** — Tool call failure feedback
  Read, understand, and fix before proceeding.

  **Routing Matrix**:
  - \`[PLAYER_ACTION]\` => normal simulation turn (world reaction + state updates; proactive soul updates allowed when evidence is strong)
  - \`[Player Rate]\` => soul update loop only (no visible story progression)
  - \`[SUDO]\` => elevated update workflow with coverage discipline
  - Route by the leading marker of the active user message; do not mix two marker workflows in one loop.

  **Processing Priority**:
  1. Determine the leading marker of the active user message
  2. If [PLAYER_ACTION], simulate world consequences
  3. If [Player Rate], update soul files only (no visible story progression)
  4. If [SUDO], execute elevated update workflow (immutable/finish guards still apply)
  5. In normal [PLAYER_ACTION] turns, optionally update soul files via writable tools when new preference evidence appears
  6. Use [CONTEXT] and [SYSTEM] for background; handle [ERROR] before finishing
</message_protocol>
`;

const errorRecovery = `
<error_recovery_protocol>
  WHEN TOOLS FAIL — RECOVERY PROCEDURE

  **Error Types (by \`code\`)**:
  - \`INVALID_PARAMS\` / \`INVALID_DATA\`: Wrong arguments or invalid payload/structure.
  - \`NOT_FOUND\`: Path/ID missing in VFS (under \`current/**\` alias or canonical \`shared/**\` / \`forks/{id}/**\`).
  - \`ALREADY_EXISTS\`: Duplicate creation attempt.
  - \`INVALID_ACTION\`: Unsupported operation or protocol violation (read-before-mutate / finish-last / finish-guarded).
  - \`FINISH_GUARD_REQUIRED\`: Tried to mutate finish-guarded conversation/summary state.

  **Mandatory Steps**:
  1. Read the error message carefully
  2. If present, follow \`details.recovery\` and open \`details.refs\`
  3. Look for "Did you mean: ...?" suggestions
  4. Retry with corrected arguments OR search files to find correct IDs
  5. Do NOT finish the turn while errors remain unhandled

  **Self-Correction**:
  - If \`NOT_FOUND\`, use \`vfs_ls\` on the parent dir, then \`vfs_search\` with \`fuzzy: true\` to locate the correct path/ID
  - If \`INVALID_PARAMS\`/\`INVALID_DATA\`, \`vfs_read({ path: "current/refs/tools/<tool>.md" })\` and (for JSON targets) \`vfs_schema({ paths: ["<targetPath>"] })\`
  - If \`ALREADY_EXISTS\`, \`vfs_read({ path: "<targetPath>" })\` then update via \`vfs_write\` (\`patch_json\` / \`merge_json\`)
  - If \`FINISH_GUARD_REQUIRED\`, use the loop's finish tool (never generic mutation tools on guarded paths)
  - If you cannot fix, explain in narrative why
</error_recovery_protocol>
`;

const toolMandate = `
<tool_protocol>
  TOOL USAGE — MANDATORY PATTERNS

  **Every turn MUST include tool calls.**
  Reasoning alone produces nothing. Tools produce results.

  **Minimum Requirement**:
  At least call the loop finish tool (\`vfs_commit_turn\` for normal/\`[SUDO]\`, \`vfs_commit_soul\` for \`[Player Rate]\`). Ideally: inspect → update → finish.

  **Banned Patterns**:
  - ❌ Response with only text (no tool calls)
  - ❌ Response with only thinking (no tool calls)
  - ❌ Empty response

  **Inspection Tools Are Free**:
  Call \`vfs_ls\`, \`vfs_schema\`, \`vfs_read\`, \`vfs_search\` as many times as needed.
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

export const protocolsPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/protocols#protocolsPrimer",
    source: "atoms/core/protocols.ts",
    exportName: "protocolsPrimer",
  },
  () => `
<protocols>
  MESSAGES: [PLAYER_ACTION] = simulate (+ optional proactive soul updates), [Player Rate] = dedicated soul-ingestion loop, [SUDO] = elevated update (immutable/finish guards still apply), [ERROR] = fix before finish.
  TOOLS: Every turn MUST call tools. Query before create. Handle errors.
  TWO "YOU": In rules = AI. In narrative = protagonist.
</protocols>
`,
);
export const protocols: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/protocols#protocols",
    source: "atoms/core/protocols.ts",
    exportName: "protocols",
  },
  () => `
<protocols>
${messageProtocol}
${errorRecovery}
${toolMandate}
${entityDiscipline}
${terminology}
</protocols>
`,
);

// Export individual components if needed by others
export const messageProtocolAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/protocols#messageProtocolAtom",
    source: "atoms/core/protocols.ts",
    exportName: "messageProtocolAtom",
  },
  () => messageProtocol,
);
export const errorRecoveryAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/protocols#errorRecoveryAtom",
    source: "atoms/core/protocols.ts",
    exportName: "errorRecoveryAtom",
  },
  () => errorRecovery,
);
export const toolMandateAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/protocols#toolMandateAtom",
    source: "atoms/core/protocols.ts",
    exportName: "toolMandateAtom",
  },
  () => toolMandate,
);
export const entityDisciplineAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/protocols#entityDisciplineAtom",
    source: "atoms/core/protocols.ts",
    exportName: "entityDisciplineAtom",
  },
  () => entityDiscipline,
);
export const terminologyAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/protocols#terminologyAtom",
    source: "atoms/core/protocols.ts",
    exportName: "terminologyAtom",
  },
  () => terminology,
);

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const protocolsSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/core/protocols#protocolsSkill",
    source: "atoms/core/protocols.ts",
    exportName: "protocolsSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(protocols),

    quickStart: `
1. Read [PLAYER_ACTION] to determine what to simulate
2. Route [Player Rate] to soul-only updates (do not advance visible plot)
3. In normal [PLAYER_ACTION] turns, proactively refine soul files when strong evidence emerges
4. Route [SUDO] to elevated update workflow
5. Handle [ERROR] by retrying with corrected arguments
6. Finish with the marker-appropriate finish tool (Player Rate => \`vfs_commit_soul\`)
7. Search before creating entities
8. "You" in rules = AI, "You" in narrative = protagonist
`.trim(),

    checklist: [
      "Identifying message markers correctly ([PLAYER_ACTION], [Player Rate], [SUDO], [ERROR])?",
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
  }),
);
