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

export const outputFormat: Atom<OutputFormatInput> = defineAtom({ atomId: "atoms/core/outputFormat#outputFormat", source: "atoms/core/outputFormat.ts", exportName: "outputFormat" }, ({
  language,
  finishToolName,
}) => {
  void finishToolName;

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
    - Every turn MUST end with \`vfs_commit_turn\` (preferred), or \`vfs_tx\` with \`commit_turn\` as the LAST op.
    - Do NOT write finish-guarded conversation/summary paths (\`shared/narrative/conversation/*.json\`, \`forks/{activeFork}/story/conversation/**\`, \`forks/{activeFork}/story/summary/state.json\`; alias \`current/conversation/**\`, \`current/summary/state.json\`) via generic mutation tools.
    - This finish call MUST be your LAST tool call of the turn.
  </vfs_turn_files>

  <turn_file_schema>
    **Assistant Payload (inside the turn file)**:
    - \`assistant.narrative\`: full narrative in ${language}
    - \`assistant.choices\`: 2-4 choice objects ({ text, consequence? })
    - \`assistant.atmosphere\`: optional { envTheme, ambience, weather? }
    - \`assistant.narrativeTone\`, \`assistant.ending\`, \`assistant.forceEnd\`: optional
  </turn_file_schema>

  <rules>
    <rule>Do NOT output markdown text outside of tool arguments.</rule>
    <rule>Inspect with \`vfs_ls\`/\`vfs_read\` before edits.</rule>
    <rule>Use \`vfs_write\`/\`vfs_merge\`/\`vfs_edit\` for state updates under \`forks/{activeFork}/story/world/**\` (alias: \`current/world/**\`).</rule>
    <rule>Deletions use JSON Patch \`remove\` via \`vfs_edit\` (never \`vfs_merge\`).</rule>
    <rule>\`vfs_commit_turn\` (or \`vfs_tx\` with LAST op \`commit_turn\`) MUST be your LAST tool call.</rule>
    <rule>Double-check JSON syntax before calling any tool.</rule>
  </rules>
</output_format>
`;
});
