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
    const isPlayerRateLoop = resolvedFinishToolName === "vfs_finish_soul";

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

  <vfs_turn_files>
    **TURN COMPLETION RULE**:
    - Every loop MUST end with \`${resolvedFinishToolName}\`, and it must be the LAST tool call.
    - If you already decided to finish in this response, do NOT place read-only tools (\`vfs_ls\`/\`vfs_schema\`/\`vfs_read_chars/vfs_read_lines/vfs_read_json\`/\`vfs_search\`) before finish unless they are directly needed for same-response writes.
    - Do NOT write finish-guarded conversation/summary paths (\`shared/narrative/conversation/*.json\`, \`forks/{activeFork}/story/conversation/**\`, \`forks/{activeFork}/story/summary/state.json\`; alias \`current/conversation/**\`, \`current/summary/state.json\`) via generic mutation tools.
    - This finish call MUST be your LAST tool call of the turn.
  </vfs_turn_files>

  <turn_file_schema>
    **Finish Payload**:
    ${
      isPlayerRateLoop
        ? "- For `[Player Rate]` loops, call `vfs_finish_soul` with `{ currentSoul?, globalSoul? }` and provide at least one target."
        : `- \`assistant.narrative\`: full narrative in ${language}
    - \`assistant.choices\`: 2-4 choice objects ({ text, consequence? }); options must be meaningfully distinct and carry different tradeoffs (risk/cost/time/relationship/exposure), not reworded duplicates
    - \`assistant.atmosphere\`: optional { envTheme, ambience, weather? }
    - \`assistant.narrativeTone\`, \`assistant.ending\`, \`assistant.forceEnd\`: optional`
    }
  </turn_file_schema>

  <rules>
    <rule>Do NOT output markdown text outside of tool arguments.</rule>
    <rule>Inspect with \`vfs_ls\`/\`vfs_read_chars/vfs_read_lines/vfs_read_json\` before edits.</rule>
    <rule>${
      isPlayerRateLoop
        ? "In `[Player Rate]` loops, only mutate soul markdown (`current/world/soul.md`, `current/world/global/soul.md`) and do not advance visible plot."
        : "Use `vfs_write_file/vfs_append_text/vfs_edit_lines/vfs_patch_json/vfs_merge_json/vfs_move/vfs_delete` for world state updates under `forks/{activeFork}/story/world/**` (alias: `current/world/**`): `write_file` / `patch_json` / `merge_json`."
    }</rule>
    <rule>${
      isPlayerRateLoop
        ? "Skip choice generation in `[Player Rate]` loops."
        : "For `assistant.choices`, avoid strictly dominant all-upside options. If player input attempts a best-of-both-worlds move, allow the attempt but render proportional cost or degraded outcomes."
    }</rule>
    <rule>Field deletions use JSON Patch \`remove\` via \`vfs_write_file/vfs_append_text/vfs_edit_lines/vfs_patch_json/vfs_merge_json/vfs_move/vfs_delete\` + \`patch_json\`.</rule>
    <rule>\`${resolvedFinishToolName}\` MUST be your LAST tool call.</rule>
    <rule>Double-check JSON syntax before calling any tool.</rule>
  </rules>
</output_format>
`;
  },
);
