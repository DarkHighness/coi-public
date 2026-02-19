/**
 * Summary Context Builder
 *
 * Functions for building summary context and instructions.
 */

import type { SummaryLoopInput } from "./summary";
import {
  readConversationIndex,
  readForkTree,
  readTurnFile,
  buildTurnPath,
} from "../../../vfs/conversation";

// Atoms
import {
  gmKnowledge,
  entityDefinitions,
  styleGuide,
} from "../../../prompts/atoms/core";
import { narrativeCausality } from "../../../prompts/atoms/narrative";
import { languageEnforcement } from "../../../prompts/atoms/cultural";
import { defineAtom, runPromptWithTrace } from "../../../prompts/trace/runtime";
import { vfsToolRegistry } from "../../../vfs/tools";
import { canonicalizeLanguage } from "../../../prompts/languageCanonical";
import { formatLoopSkillBaseline } from "../../../prompts/skills/loopSkillBaseline";

// ============================================================================
// System Instruction
// ============================================================================

type SummarySystemInstructionInput = {
  language: string;
  nsfw?: boolean;
  detailedDescription?: boolean;
};

const summaryBaselineLines = formatLoopSkillBaseline("summary_query", {
  ordered: true,
});

const summaryBaselineBullets = formatLoopSkillBaseline("summary_query");

const summaryRoleAtom = defineAtom(
  {
    atomId: "atoms/summary/system#summaryRole",
    source: "ai/agentic/summary/summaryContext.ts",
    exportName: "summaryRoleAtom",
  },
  () => `<role>
You are the GM chronicler. You know everything — visible AND hidden. Your summary is the **single source of truth** that future turns rely on when the original conversation is lost.

You maintain two layers:
1. **VISIBLE**: What the PROTAGONIST directly witnessed, learned, or experienced through their own senses and actions.
2. **HIDDEN**: GM-only truth — secret NPC motives, off-screen events, unrevealed world mechanics, pending consequences the player hasn't triggered yet.

Your quality mandate:
- **Be SPECIFIC, not vague.** Name entities by ID/name. Quote key dialogue fragments. Reference exact locations, items, and conditions.
- **Trace CAUSALITY.** Don't just list events — explain WHY things happened and what consequences are pending. "The merchant refused because the player stole from him 3 turns ago" not "The merchant refused."
- **Preserve DECISION CONTEXT.** Record what choices the player faced, what they chose, and what they rejected — this reveals character and informs future choice design.
- **Track STATE DELTAS.** What changed between the start and end of the summarized range? New items, lost conditions, relationship shifts, quest progress, location moves.
- **Separate KNOWLEDGE layers ruthlessly.** The player may have seen a "kind old man" — the GM knows he's the assassin. Both facts must be recorded in their correct layers.
</role>`,
);

const summaryToolsAtom = defineAtom(
  {
    atomId: "atoms/summary/system#summaryTools",
    source: "ai/agentic/summary/summaryContext.ts",
    exportName: "summaryToolsAtom",
  },
  () => {
    const summaryToolset = vfsToolRegistry.getToolset("summary");
    const toolList = summaryToolset.tools
      .map((toolName) => `- \`${toolName}\``)
      .join("\n");
    return `<tools>
Tool allowlist for this loop:
${toolList}

Read-only tools:
1. \`vfs_ls\` - Locate files and pattern-match with \`patterns\`
2. \`vfs_schema\` - Inspect expected JSON fields for a path
3. \`vfs_read_chars/vfs_read_lines/vfs_read_json\` - Read VFS files by chars, lines, or JSON pointers
4. \`vfs_search\` - Find details in the VFS

Write tools (for memory docs):
5. \`vfs_write_markdown\` / \`vfs_write_file\` - Update \`workspace/SOUL.md\`, \`workspace/USER.md\`, \`workspace/PLAN.md\`

Finish tool:
6. \`vfs_finish_summary\` - Append summary to \`current/summary/state.json\` — MUST be LAST tool call

Loop pipeline (execute in order):
${summaryBaselineLines.join("\n")}
5) Read fork anchors (\`current/conversation/index.json\`, turn files, summary state).
6) Read turn content thoroughly — do NOT skim. Extract specific names, dialogue, items, conditions, locations.
7) **Update memory docs** (MANDATORY when evidence warrants):
   - \`workspace/SOUL.md\`: Append GM strategic notes — what narrative techniques worked, what to watch for, tool-usage learnings.
   - \`workspace/USER.md\`: Append player behavior observations — choice patterns, preferences, psychology evidence.
   - \`workspace/PLAN.md\`: Update story trajectory if player actions diverged from the plan. Incremental for drift, full rewrite for major fracture.
   - Read each doc first (or use injected context); write only meaningful deltas, not boilerplate.
8) Finish with \`vfs_finish_summary\` as the LAST tool call.

Memory doc update guidance:
- Memory docs (\`workspace/IDENTITY.md\`, \`workspace/USER.md\`, \`workspace/SOUL.md\`, \`workspace/PLAN.md\`) are injected in context.
- VFS re-read is optional unless you need sections not in the injected snapshot.
- **You MUST update SOUL.md/USER.md/PLAN.md when the summarized turns contain actionable evidence.** This is NOT optional.
- Skip updates ONLY when the summarized range is purely mechanical (movement, inventory check) with no meaningful player behavior or narrative development.
- \`current/world/notes.md\` is optional context only.

Session history queries:
- When continuity is unclear, query \`current/session/<session_uid>.jsonl\` in bounded windows.
- Use \`vfs_read_lines\` with bounded ranges or \`vfs_search\`. Do NOT full-read large session.jsonl files.

Next-session handoff (\`nextSessionReferencesMarkdown\`):
This field serves TWO purposes — provide BOTH:
1. **VFS path references** for warm-start: useful SKILL docs (\`current/skills/**/SKILL.md\`), session anchors.
2. **GM strategic notes** for the next session: concrete, actionable observations about the story state and what needs attention.

Format:
\`\`\`
## Paths
- \`current/skills/commands/runtime/turn/SKILL.md\`
- \`current/session/<session_uid>.jsonl\`

## GM Notes
- [Specific observation about story state, pending consequences, or player patterns]
- [What the next turn should watch for or set up]
- [Any narrative threads that need resolution or advancement]
\`\`\`

Requirements:
- Keep path references to 2-5 total (1-3 skills + 1-2 anchors).
- GM Notes must be CONCRETE and ACTIONABLE — not "the story is progressing well" but "the merchant's grudge from turn 3 should surface when the player returns to the market district; the guard captain's investigation reaches conclusion in ~2 turns."
- Avoid broad catalog-only references like \`current/skills/index.json\`.

Structured error recovery flow (if a tool returns \`{ success:false, code, error }\`):
1. Do NOT finish while a blocking error code is unresolved.
2. Use \`code\` to choose fix path:
   - \`INVALID_ACTION\` / \`FINISH_NOT_LAST\` / \`MULTIPLE_FINISH_CALLS\`: reorder tool calls; keep exactly one finish call and make it last.
   - \`*_CROSS_FORK_BLOCKED\`: re-anchor to target fork and retry with target-fork paths only.
   - \`*_RUNTIME_FIELDS_FORBIDDEN\`: remove runtime-managed fields (\`nodeRange\`, \`lastSummarizedIndex\`, \`id\`, \`createdAt\`) from tool args.
   - \`SUMMARY_FORBIDDEN_TOKENS\`: rewrite to story facts only (no tools/retries/errors/budgets), then retry finish.
3. If the same \`code\` repeats twice, reduce scope and re-read only missing sections/anchors (or when \`[SYSTEM: EXTERNAL_FILE_CHANGES]\` is present) before retrying.
</tools>`;
  },
);

const summaryCriticalRulesAtom = defineAtom(
  {
    atomId: "atoms/summary/system#summaryCriticalRules",
    source: "ai/agentic/summary/summaryContext.ts",
    exportName: "summaryCriticalRulesAtom",
  },
  ({ languageCode }: { languageCode: string }) => `<critical_rules>
## Layer Separation (ENFORCED)
- **VISIBLE**: Only what the protagonist directly witnessed through their own senses, was told by NPCs, or deduced from available evidence. If the player didn't see/hear/learn it, it does NOT go in visible.
- **HIDDEN**: Everything else — secret NPC agendas, off-screen events, unrevealed world mechanics, pending consequences, GM-only truth. This layer is your chronicle of the REAL state of affairs.

## Field Quality Standards

### displayText (${languageCode}, 2-3 sentences)
- UI-facing summary from the player's perspective only.
- Must capture the EMOTIONAL ARC, not just a plot summary. What did the player FEEL?
- ❌ BAD: "The player explored a cave and found an item."
- ✅ GOOD: "在幽暗的矿洞深处，一把被遗忘的古剑改变了旅程的方向——但矿洞外的追兵已经不远了。"

### visible.narrative
- Detailed, specific account from the protagonist's perspective. Include:
  - Exact entity names and IDs when available
  - Key dialogue fragments (quoted)
  - Sensory details that establish atmosphere
  - The player's CHOICES and their immediate visible consequences
- ❌ BAD: "The player talked to an NPC and learned information."
- ✅ GOOD: "The player confronted Harlen (npc:harlen_blacksmith) at his forge. Harlen initially deflected questions about the missing shipment, but when shown the torn manifest, his demeanor shifted — 'That seal... where did you find that?' He revealed that the Silver Company has been diverting iron to a hidden forge east of Millhaven."

### visible.majorEvents (array)
- Each entry must be a SPECIFIC, self-contained fact — not a vague reference.
- ❌ BAD: ["Met an NPC", "Found an item", "Quest updated"]
- ✅ GOOD: ["Discovered the Silver Company's hidden forge location (east of Millhaven) from Harlen", "Acquired the torn manifest (item:torn_manifest) as evidence", "Quest 'Iron Trail' (quest:iron_trail) advanced to stage: 'confront the forgemaster'"]

### visible.characterDevelopment
- Track relationship shifts WITH DIRECTION AND CAUSE. Track condition changes.
- ❌ BAD: "Character relationships evolved."
- ✅ GOOD: "Trust with Harlen (npc:harlen_blacksmith) increased after showing the manifest — he now sees the player as an ally against the Silver Company. Player gained condition 'Determined' after learning the conspiracy's scope. Reputation in Millhaven shifted from 'outsider' to 'involved.'"

### visible.worldState
- Concrete environmental and political state FROM THE PLAYER'S KNOWLEDGE.
- ❌ BAD: "The world continues to change."
- ✅ GOOD: "Millhaven's iron shortage is now understood to be deliberate. The east road is rumored dangerous. The town guard has increased patrols near the docks since the theft was reported."

### hidden.truthNarrative
- The FULL truth of what happened, including things the player doesn't know.
- Must include NPC true motivations, off-screen movements, and the real state of affairs.

### hidden.hiddenPlots (array)
- Active plot threads the player hasn't discovered yet. Each entry self-contained.

### hidden.npcActions (array)
- What NPCs did OFF-SCREEN during these turns. Specific actions with motivations.
- ❌ BAD: ["NPCs did things"]
- ✅ GOOD: ["Harlen (npc:harlen_blacksmith) sent a coded message to the resistance cell after the player left", "Captain Voss (npc:captain_voss) moved a patrol to the east road to intercept anyone heading to the hidden forge"]

### hidden.worldTruth
- The real state of the world behind the curtain.

### hidden.unrevealed (array)
- Secrets not yet revealed to the player. Each a concrete fact.

## Anti-Patterns (NEVER DO THESE)
- Never write vague summaries like "events progressed" or "the story continued."
- Never omit entity names/IDs when they exist in the source material.
- Never flatten player choices into passive events — preserve the decision structure.
- Never mention tools, retries, errors, budgets, or workflow terms in ANY field.
- Never copy narrative prose verbatim — summarize with precision, not padding.
</critical_rules>`,
);

const summaryStyleInjectionAtom = defineAtom(
  {
    atomId: "atoms/summary/system#summaryStyleInjection",
    source: "ai/agentic/summary/summaryContext.ts",
    exportName: "summaryStyleInjectionAtom",
  },
  (_: void, trace) => `<style_injection>
  You must capture the TONE of the story, not just the facts.
  ${trace.record(styleGuide, {})}
</style_injection>`,
);

const summarySystemInstructionAtom = defineAtom(
  {
    atomId: "atoms/summary/system#getSummarySystemInstruction",
    source: "ai/agentic/summary/summaryContext.ts",
    exportName: "summarySystemInstructionAtom",
  },
  (
    { language, nsfw, detailedDescription }: SummarySystemInstructionInput,
    trace,
  ) => {
    const { code: canonicalLanguage } = canonicalizeLanguage(language);
    const header = [
      "You are a diligent chronicler tasked with summarizing story events in a world simulation.",
      nsfw
        ? "Maintain neutrality even when summarizing mature or violent content."
        : "",
      detailedDescription
        ? "Ensure key sensory details and character emotional shifts are captured in the summary."
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    return [
      header,
      trace.record(summaryRoleAtom),
      trace.record(summaryToolsAtom),
      trace.record(summaryCriticalRulesAtom, {
        languageCode: canonicalLanguage,
      }),
      trace.record(gmKnowledge),
      trace.record(entityDefinitions),
      trace.record(summaryStyleInjectionAtom),
      trace.record(narrativeCausality),
      trace.record(languageEnforcement, { language: canonicalLanguage }),
    ]
      .filter(Boolean)
      .join("\n\n");
  },
);

export function getSummarySystemInstruction(
  language: string,
  nsfw?: boolean,
  detailedDescription?: boolean,
): string {
  return runPromptWithTrace("summary.system", () =>
    summarySystemInstructionAtom({ language, nsfw, detailedDescription }),
  );
}

// ============================================================================
// Initial Context
// ============================================================================

/**
 * Build minimal initial context for summary generation
 * Lists ALL segments with clear turn markers so AI doesn't need to query them
 */
export function buildSummaryInitialContext(input: SummaryLoopInput): string {
  const {
    baseSummaries,
    baseIndex,
    nodeRange,
    pendingPlayerAction,
    vfsSession,
  } = input;
  const parts: string[] = [];

  const previousSummary =
    baseSummaries.length > 0 ? baseSummaries[baseSummaries.length - 1] : null;

  const snapshot = vfsSession.snapshot();
  const index = readConversationIndex(snapshot);
  const forkTree = readForkTree(snapshot);

  const activeForkId =
    typeof index?.activeForkId === "number" ? index.activeForkId : null;
  const forkCount =
    typeof forkTree?.nextForkId === "number"
      ? Math.max(forkTree.nextForkId - 1, 0)
      : null;
  const activeTurnNumber =
    activeForkId !== null
      ? (index?.latestTurnNumberByFork?.[String(activeForkId)] ?? null)
      : null;

  const targetLastSummarizedIndex = nodeRange.toIndex + 1;

  parts.push(`<runtime_meta
  active_fork_id="${activeForkId ?? "unknown"}"
  fork_count="${forkCount ?? "unknown"}"
  active_turn_number="${activeTurnNumber ?? "unknown"}"
  node_range="${nodeRange.fromIndex}-${nodeRange.toIndex}"
  base_last_summarized_index="${baseIndex}"
  target_last_summarized_index="${targetLastSummarizedIndex}"
/>`);

  // Previous summary
  if (previousSummary) {
    parts.push(`<previous_summary>
<display_text>${previousSummary.displayText}</display_text>
<visible>
  <narrative>${previousSummary.visible.narrative}</narrative>
  <major_events>${JSON.stringify(previousSummary.visible.majorEvents)}</major_events>
  <character_development>${previousSummary.visible.characterDevelopment}</character_development>
  <world_state>${previousSummary.visible.worldState}</world_state>
</visible>
<hidden>
  <truth_narrative>${previousSummary.hidden.truthNarrative}</truth_narrative>
  <hidden_plots>${JSON.stringify(previousSummary.hidden.hiddenPlots)}</hidden_plots>
  <npc_actions>${JSON.stringify(previousSummary.hidden.npcActions)}</npc_actions>
  <world_truth>${previousSummary.hidden.worldTruth}</world_truth>
  <unrevealed>${JSON.stringify(previousSummary.hidden.unrevealed)}</unrevealed>
</hidden>
${previousSummary.timeRange ? `<time_range from="${previousSummary.timeRange.from}" to="${previousSummary.timeRange.to}" />` : ""}
${previousSummary.nodeRange ? `<node_range from="${previousSummary.nodeRange.fromIndex}" to="${previousSummary.nodeRange.toIndex}" />` : ""}
</previous_summary>`);
  } else {
    parts.push(
      `<previous_summary>None - this is the first summary</previous_summary>`,
    );
  }

  const xmlEscapeAttr = (value: string): string =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/\r?\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const excerpt = (value: unknown, maxChars: number): string => {
    if (typeof value !== "string") return "";
    const normalized = value.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
    if (normalized.length <= maxChars) return normalized;
    return `${normalized.slice(0, maxChars)}…`;
  };

  const turnItems: string[] = [];
  const order =
    activeForkId !== null
      ? (index?.turnOrderByFork?.[String(activeForkId)] ?? [])
      : [];

  let segmentIdx = 0;
  for (const turnId of order) {
    const match = /fork-(\d+)\/turn-(\d+)/.exec(turnId);
    if (!match) continue;
    const forkId = Number(match[1]);
    const turnNumber = Number(match[2]);
    if (!Number.isFinite(forkId) || !Number.isFinite(turnNumber)) continue;
    const turn = readTurnFile(snapshot, forkId, turnNumber);
    if (!turn) continue;

    const hasUserAction =
      typeof turn.userAction === "string" && turn.userAction.trim().length > 0;

    const rangeStart = segmentIdx;
    if (hasUserAction) {
      segmentIdx += 1;
    }
    segmentIdx += 1; // model node always exists
    const rangeEnd = segmentIdx - 1;

    const intersects =
      rangeEnd >= nodeRange.fromIndex && rangeStart <= nodeRange.toIndex;
    if (!intersects) {
      continue;
    }

    const userExcerpt = excerpt(turn.userAction, 220);
    const assistantExcerpt = excerpt(turn.assistant?.narrative, 260);
    turnItems.push(
      `  <turn path="${buildTurnPath(forkId, turnNumber)}" segment_range="${rangeStart}-${rangeEnd}" user_excerpt="${xmlEscapeAttr(userExcerpt)}" assistant_excerpt="${xmlEscapeAttr(assistantExcerpt)}" />`,
    );
  }

  parts.push(`<turn_files count="${turnItems.length}">
${turnItems.join("\n")}
</turn_files>`);

  if (pendingPlayerAction && typeof pendingPlayerAction.text === "string") {
    parts.push(`<pending_player_action segmentIdx="${pendingPlayerAction.segmentIdx}">
${pendingPlayerAction.text}
</pending_player_action>`);
  }

  parts.push(`<finish_rule>
When ready, call vfs_finish_summary(...).
It MUST be your LAST tool call.
</finish_rule>`);

  return parts.join("\n\n");
}
