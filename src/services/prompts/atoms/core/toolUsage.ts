/**
 * Core Atom: Tool Usage (Dynamic Tool Loading & Instructions)
 * Content from output_format.ts
 */
import type { Atom } from "../types";
import {
  VFS_TOOLSETS,
  formatVfsToolCapabilitiesForPrompt,
} from "../../../vfsToolsets";
import { defineAtom } from "../../trace/runtime";

const gateSemanticCapabilityText = (
  capabilityText: string,
  ragEnabled: boolean,
): string => {
  if (ragEnabled) return capabilityText;

  return capabilityText
    .replaceAll("text/fuzzy/regex/semantic", "text/fuzzy/regex")
    .replaceAll("(optionally semantic)", "")
    .replaceAll("/semantic", "")
    .replaceAll("semantic, when available", "");
};

export interface ToolUsageInput {
  finishToolName?: string;
  ragEnabled?: boolean;
}

export const toolUsage: Atom<ToolUsageInput> = defineAtom(
  {
    atomId: "atoms/core/toolUsage#toolUsage",
    source: "atoms/core/toolUsage.ts",
    exportName: "toolUsage",
  },
  (input) => {
    const finishToolName = input?.finishToolName || "vfs_commit_turn";
    const toolsetId =
      finishToolName === "vfs_commit_soul" ? "playerRate" : "turn";
    const ragEnabled = input?.ragEnabled ?? true;

    const capabilityText = gateSemanticCapabilityText(
      formatVfsToolCapabilitiesForPrompt(VFS_TOOLSETS[toolsetId].tools),
      ragEnabled,
    );
    const searchModes = ragEnabled
      ? "text/regex/fuzzy/semantic"
      : "text/regex/fuzzy";

    return `
<tool_usage>
  **FILE-ONLY TOOLING (VFS)**:
  ${capabilityText}
  - Path model: canonical \`shared/**\` + \`forks/{forkId}/**\`; alias \`current/**\` is accepted and resolves to active-fork canonical paths.
  - Permission classes: \`immutable_readonly\` (never writable), \`default_editable\` (AI default writable), \`elevated_editable\` (requires one-time user-confirmed token in \`/god\` or \`/sudo\`), \`finish_guarded\` (write only via finish tools).
  - Immutable zones are always blocked: \`shared/system/skills/**\`, \`shared/system/refs/**\` (plus alias views \`skills/**\`, \`refs/**\`).
  - Resource templates enforce operation-level contracts (e.g. conversation expects \`finish_commit\`, summary expects \`finish_summary\`, rewrite flows use \`history_rewrite\`).
  - Use \`vfs_ls\`, \`vfs_schema\`, \`vfs_read\`, \`vfs_search\` (${searchModes}) to inspect.
  - Use \`vfs_write\` to create/replace files.
  - Use \`vfs_write\` with JSON Patch (RFC 6902) to update JSON.
  - Use \`vfs_write\` to deep-merge JSON objects (arrays replaced, no deletions).
  - Use \`vfs_move\` to rename paths, \`vfs_delete\` to remove files.
  - Use \`vfs_write\` with multiple \`ops\` to batch related state updates atomically.
  - Prefer omitting optional fields; use \`null\` only if you must, and treat it as “use defaults”.

  **STATE = FILES**:
  - Shared config lives under \`shared/config/**\` (alias: \`current/custom_rules/**\`, \`current/world/theme_config.json\`).
  - ${
    toolsetId === "playerRate"
      ? "In `[Player Rate]` loops, write scope is soul-only: `current/world/soul.md` and `current/world/global/soul.md`."
      : "Fork world state lives under `forks/{activeFork}/story/world/**` (alias: `current/world/**`). Soul docs (`current/world/soul.md`, `current/world/global/soul.md`) are `default_editable` and may be proactively updated via `vfs_write` when evidence emerges."
  }
  - Conversation/summary are finish-guarded under \`shared/narrative/conversation/*.json\`, \`forks/{activeFork}/story/conversation/**\`, \`forks/{activeFork}/story/summary/state.json\`.

  **CUSTOM RULE PACKS (SHARED LAYER)**:
  - User-defined rule packs live under \`shared/config/custom_rules/NN-*/RULES.md\` (alias: \`current/custom_rules/NN-*/RULES.md\`; lower \`NN\` = higher priority).
  - Strong reminder: when turn intent matches a rule category, read relevant low-\`NN\` packs first via \`vfs_read\`.
  - This is not a hard gate; if no pack is relevant, proceed with normal inspection flow.

  **TURN COMPLETION**:
  - Your LAST tool call must be \`${finishToolName}\`.
  - If a write to existing writable target(s) fails, enter repair mode: next calls must inspect/retry those failed targets until they succeed.
  - Missing-target write failures are non-blocking: finish may proceed, but retry if creating that target is still required.
  - Policy/permission-denied write failures are non-blocking for finish: switch to an allowed path/operation or report blocker.
  - Do not spam \`${finishToolName}\` while failed writable targets remain unresolved.
  - If the same write error repeats, change strategy first (inspect schema/pointers/path), then retry.
  - Immutable/read-only write failures (skills/refs etc.) are exempt from the retry-before-finish requirement.
  - For large JSON files, prefer \`vfs_read\` with \`mode: "json"\` + narrow \`pointers\`, or \`mode: "lines"\`; avoid full-file char reads by default.
  - Do NOT write finish-guarded conversation/summary paths via generic mutation tools.
  - ${
    toolsetId === "playerRate"
      ? "Do not advance visible story nodes in `[Player Rate]` loops."
      : "Normal turn loops should still produce coherent narrative + choices in finish payload."
  }
</tool_usage>
`;
  },
);
