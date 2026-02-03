/**
 * Core Atom: Output Format
 * Content from output_format.ts
 */
import type { Atom } from "../types";

export interface OutputFormatInput {
  language: string;
  finishToolName?: string;
}

export const outputFormat: Atom<OutputFormatInput> = ({
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
    - Every turn MUST end by writing:
      • \`current/conversation/turns/fork-<id>/turn-<n>.json\`
      • \`current/conversation/index.json\`
    - Prefer \`vfs_commit_turn\` (fast path).
    - If you need to bundle state updates + turn commit in one call, use \`vfs_tx\` with \`commit_turn\` as the LAST op.
    - Otherwise write both files via \`vfs_write\`/\`vfs_edit\`.
    - This write MUST be your LAST tool call of the turn.
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
    <rule>Use \`vfs_write\`/\`vfs_merge\`/\`vfs_edit\` for all state updates under \`current/world/\`.</rule>
    <rule>Deletions use JSON Patch \`remove\` via \`vfs_edit\` (never \`vfs_merge\`).</rule>
    <rule>\`vfs_commit_turn\` (or conversation writes) MUST be your LAST tool call.</rule>
    <rule>Double-check JSON syntax before calling any tool.</rule>
  </rules>
</output_format>
`;
};
