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
  Required handling: parse \`vote/preset/comment/time\` when present, then update \`workspace/SOUL.md\` and \`workspace/USER.md\`. Both are Story Teller AI internal self-notes.
  - Do NOT treat Player-Rate as \`sudo\`, \`forceUpdate\`, or \`godMode\`.
  - Do NOT use Player-Rate to rewrite established facts/world rules/causal outcomes.
  - You MAY store player trajectory preferences in \`USER.md\` as soft constraints for future turns.
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
  3. If [Player Rate], update soul files only (no visible story progression, no factual retcon)
  4. If [SUDO], execute elevated update workflow (immutable/finish guards still apply)
  5. In normal [PLAYER_ACTION] turns, optionally update soul files via writable tools when new preference evidence appears
  6. Use [CONTEXT] and [SYSTEM] for background; handle [ERROR] before finishing
</message_protocol>
`;

const errorRecovery = `
<error_recovery_protocol>
  WHEN TOOLS FAIL — RECOVERY PROCEDURE

  **Error codes**: \`NOT_FOUND\` | \`INVALID_PARAMS\` | \`INVALID_DATA\` | \`INVALID_ACTION\` | \`FINISH_GUARD_REQUIRED\` | \`IMMUTABLE_READONLY\` | \`ELEVATION_REQUIRED\`.

  **Steps**:
  1. Read \`error\` message + \`details.issues\` (field-level errors) to understand what went wrong.
  2. Follow \`details.recovery\` steps in order (context-aware, safe to execute sequentially).
  3. If \`details.hint.nextCalls\` is present, use those exact calls. If \`details.hint.avoid\` is present, do NOT repeat that pattern.
  4. Do NOT finish while blocking errors remain (\`WRITE_EXISTING_TARGET_RETRY_REQUIRED\` / \`FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE\` in error text).
  5. If same \`code\` repeats twice, narrow scope and report blocker instead of retrying.
</error_recovery_protocol>
`;

const toolMandate = `
<tool_protocol>
  TOOL USAGE — MANDATORY PATTERNS

  **Every turn MUST include tool calls.**
  Reasoning alone produces nothing. Tools produce results.

  **Minimum Requirement**:
  Every turn MUST end with the marker-appropriate finish tool: \`vfs_finish_turn\` for \`[PLAYER_ACTION]\`/\`[SUDO]\`, \`vfs_end_turn\` for \`[Player Rate]\`. Best practice: inspect → update → finish.

  **Banned Patterns**:
  - ❌ Response with only text (no tool calls)
  - ❌ Response with only thinking (no tool calls)
  - ❌ Empty response

  **Inspection Tools Are Free**:
  Call \`vfs_ls\`, \`vfs_schema\`, \`vfs_read_markdown/vfs_read_chars/vfs_read_lines/vfs_read_json\`, \`vfs_search\` as many times as needed.
  Before writing new entity files, always search first to prevent duplicates.
</tool_protocol>
`;

const entityDiscipline = `
<entity_protocol>
  ENTITY MANAGEMENT — PREVENTION OF CHAOS

  **Before creating ANY entity**:
  1. Query if it already exists (vfs_search with fuzzy: true)
  2. If exists, update instead of create (vfs_patch_json or vfs_merge_json)
  3. Use consistent naming and IDs (kebab-case, descriptive, stable)

  **Common Mistakes and Their Fixes**:
  | Mistake | Example | Fix |
  |---------|---------|-----|
  | Duplicate entity | "Rusty Knife" created when "Old Knife" already exists | Search first, then update the existing file |
  | NPC reintroduced | Guard captain created twice in different turns | Search by role/location before creating |
  | Location recreated | "Market Square" created when "market-square" already exists | Search by name AND path before creating |
  | Orphaned reference | Quest references NPC that was renamed | Update all referencing files when renaming |
  | ID collision | Two NPCs both named "guard-1" | Include location or faction in ID: "docks-guard-1" |

  **Naming Convention**:
  - NPCs: \`{location-or-faction}-{role-or-name}\` → "docks-guard-captain", "tavern-owner-mara"
  - Items: \`{material-or-type}-{descriptor}\` → "iron-shortsword", "torn-letter"
  - Locations: \`{area}-{specific}\` → "old-quarter-market", "harbor-warehouse-3"
  - Quests: \`{source}-{objective}\` → "merchant-guild-missing-shipment"
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
6. Finish with the marker-appropriate finish tool (Player Rate => \`vfs_end_turn\`)
7. Search before creating entities
8. "You" in rules = AI, "You" in narrative = protagonist
`.trim(),

    checklist: [
      "Identifying message markers correctly ([PLAYER_ACTION], [Player Rate], [SUDO], [ERROR])?",
      "Routing to correct workflow (simulate / soul-update / elevated / error-fix)?",
      "Handling ALL errors before finishing turn?",
      "Following `details.recovery` steps and `details.hint` from error responses?",
      "Including tool calls in every response (no text-only responses)?",
      "Searching before creating new entities (vfs_search with fuzzy: true)?",
      "Using consistent naming convention for new entities (kebab-case)?",
      "Using correct 'You' for context (AI in rules, protagonist in narrative)?",
      "Finishing with marker-appropriate tool (vfs_finish_turn / vfs_end_turn)?",
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
