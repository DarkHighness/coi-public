/**
 * Core Atom: Output Format
 * Content from output_format.ts
 */
import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export interface OutputFormatInput {
  language: string;
  finishToolName?: string;
}

export const outputFormat: Atom<OutputFormatInput> = defineAtom(
  {
    atomId: "atoms/core/outputFormat#outputFormat",
    source: "atoms/core/outputFormat.ts",
    exportName: "outputFormat",
  },
  ({ language, finishToolName }) => {
    const resolvedFinishToolName = finishToolName || "vfs_finish_turn";
    const isPlayerRateLoop = resolvedFinishToolName === "vfs_end_turn";

    return `
<output_format>
  <critical>**YOU MUST USE VFS TOOLS**</critical>

  <native_tool_calling>
    **CRITICAL: Use NATIVE Tool Calling**:

    1. **Do NOT write JSON text**: You have native functions available. Call them directly.
    2. **Do NOT use markdown**: Do not wrap tool calls in \`\`\`json blocks.
    3. **Do NOT hallucinate**: specific syntax like "call:default_api:..." is FORBIDDEN.

    **Simply invoke the tool.** The system handles the JSON formatting.
  </native_tool_calling>

  <turn_files>
    **TURN COMPLETION RULE**:
    - Every loop MUST end with \`${resolvedFinishToolName}\` as the LAST tool call.
    - \`vfs_vm\`: if used, it must be the ONLY top-level tool call. Inside: only allowlisted tools, no recursion, JavaScript only (no \`globalThis\`/\`window\`/\`import\`/\`eval\`/\`Function\`), and exactly one script. Runtime enforces bounded inner tool calls and script length. Finish at most once and last.
    - Do NOT place read-only tools before finish unless they directly support same-response writes.
    - Do NOT write finish-guarded paths (\`current/conversation/**\`, \`current/summary/state.json\`) via generic write tools.
    - ${
      isPlayerRateLoop
        ? "In `[Player Rate]` loops, do not mutate `workspace/PLAN.md`."
        : "In normal turns, `workspace/PLAN.md` is writable for continuity maintenance. Read before edit; use incremental updates for minor drift, and full rewrite when branch fracture is major."
    }
  </turn_files>

  <turn_file_schema>
    **Finish Payload**:
    ${
      isPlayerRateLoop
        ? "- For `[Player Rate]` loops, call `vfs_end_turn` with empty args: `{}`."
        : `- \`assistant.narrative\`: full narrative in ${language}
    - \`assistant.choices\`: 2-4 choice objects ({ text, consequence? }). **Choice Architecture**:
      * Choices emerge from the CURRENT SITUATION — what can the protagonist actually do given position, knowledge, resources, and body state?
      * Each option must carry different tradeoffs (risk/cost/time/relationship/exposure). No reworded duplicates. No strictly dominant all-upside options.
      * At least one choice should present a genuine DILEMMA — a trade-off between things the player values (safety vs loyalty, speed vs thoroughness, truth vs kindness).
      * Choices should REVEAL CHARACTER — what the player picks tells you who they are. The choice between "fight" and "negotiate" says less than the choice between "warn the village (exposing yourself)" and "escape alone (saving yourself)".
      * Include at least one option the player might not have considered — the world offers lateral possibilities. An unexpected ally, an environmental feature, a social approach to a combat problem.
      * \`consequence?\` is a brief HINT, not a spoiler. Telegraph risk level, not exact outcome: "This will be noticed" not "The guard will arrest you".
    - \`assistant.atmosphere\`: optional { envTheme, ambience, weather? }
    - \`assistant.narrativeTone\`, \`assistant.ending\`, \`assistant.forceEnd\`: optional`
    }
  </turn_file_schema>

  <rules>
    <rule>Do NOT output markdown text outside of tool arguments.</rule>
    <rule>Inspect with read tools before edits.</rule>
    <rule>${
      isPlayerRateLoop
        ? "In `[Player Rate]` loops, only mutate `workspace/SOUL.md` and `workspace/USER.md`, and do not advance visible plot."
        : "Use appropriate write tools for world updates under `current/world/**`, and maintain `workspace/PLAN.md` continuity (minor drift: incremental update; major fracture: full rewrite allowed)."
    }</rule>
    <rule>${
      isPlayerRateLoop
        ? "Skip choice generation in `[Player Rate]` loops."
        : "For `assistant.choices`, avoid strictly dominant all-upside options. Render proportional cost for best-of-both-worlds attempts."
    }</rule>
    <rule>Field deletions use JSON Patch \`remove\` via \`vfs_patch_json\`.</rule>
    <rule>\`${resolvedFinishToolName}\` MUST be your LAST tool call.</rule>
    <rule>Double-check JSON syntax before calling any tool.</rule>
  </rules>

  <pre_finish_validation>
    **BEFORE CALLING ${resolvedFinishToolName}** — verify:
    ${
      isPlayerRateLoop
        ? `- No visible plot advancement in this loop
    - If you update memory, only SOUL/USER are touched
    - Player-rate is applied as preference learning, not fact rewriting`
        : `- narrative is grounded in protagonist's body and senses (not omniscient summary)
    - choices are 2-4 genuine options with DIFFERENT cost profiles
    - at least one choice presents a real dilemma (values in tension)
    - consequence hints telegraph risk level, not exact outcomes
    - world state files updated to reflect what changed this turn
    - no entity created without prior search (vfs_search)
    - injured/exhausted/hungry protagonist conditions reflected in narrative`
    }
  </pre_finish_validation>
</output_format>
`;
  },
);
