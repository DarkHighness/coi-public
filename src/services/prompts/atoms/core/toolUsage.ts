/**
 * Core Atom: Tool Usage (Dynamic Tool Loading & Instructions)
 * Content from output_format.ts
 */
import type { Atom } from "../types";
import { vfsToolRegistry } from "../../../vfs/tools";
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
    const finishToolName = input?.finishToolName || "vfs_finish_turn";
    const toolsetId =
      finishToolName === "vfs_finish_soul" ? "playerRate" : "turn";
    const ragEnabled = input?.ragEnabled ?? true;

    const capabilityText = gateSemanticCapabilityText(
      vfsToolRegistry.formatCapabilitiesForPrompt(toolsetId),
      ragEnabled,
    );
    const searchModes = ragEnabled
      ? "text/regex/fuzzy/semantic"
      : "text/regex/fuzzy";

    return `
<tool_usage>
  **FILE-ONLY TOOLING (VFS)**:
  ${capabilityText}
  - Path model: canonical \`shared/**\` + \`forks/{forkId}/**\`; alias \`current/**\` resolves to active-fork canonical paths.
  - Permission classes: \`immutable_readonly\` (never writable), \`default_editable\` (AI writable), \`elevated_editable\` (requires user-confirmed token via \`/god\` or \`/sudo\`), \`finish_guarded\` (write only via finish tools).
  - Immutable zones: \`shared/system/skills/**\`, \`shared/system/refs/**\` (alias \`skills/**\`, \`refs/**\`).

  **READ TOOLS** (always inspect before writing):
  - \`vfs_ls\`: list directory contents and discover paths.
  - \`vfs_schema\`: check expected JSON structure before writing.
  - \`vfs_read_json\`: read JSON by pointer paths — preferred for JSON.
  - \`vfs_read_markdown\`: read by heading/index selectors — preferred for markdown.
  - \`vfs_read_lines\`: read by line range — fallback when selectors are unknown.
  - \`vfs_read_chars\`: read by character range.
  - \`vfs_search\` (${searchModes}): find content across files.

  **WRITE TOOLS** (${
    toolsetId === "playerRate"
      ? "soul-note updates under `current/world/**` only"
      : "state mutations under `current/world/**` plus plan continuity updates under `current/outline/story_outline/plan.md`"
  }):
  - \`vfs_write_file\`: create or overwrite. \`vfs_append_text\`: append to text/markdown.
  - \`vfs_edit_lines\`: line-based insert/replace. \`vfs_write_markdown\`: section-level markdown edits.
  - \`vfs_patch_json\`: RFC 6902 JSON Patch. \`vfs_merge_json\`: deep-merge (arrays replaced, no deletions).
  - \`vfs_move\`: rename/move. \`vfs_delete\`: remove files.

  **VFS_VM** (multi-step scripting):
  - Use when one response needs multiple dependent tool calls.
  - MUST be the ONLY top-level tool call in that response.
  - Scripts: JavaScript only. Forbidden globals: \`globalThis\`/\`window\`/\`import\`/\`eval\`/\`Function\`. No recursion.
  - Inside: only current-loop allowlisted tools; finish at most once and must be last.
  - Prefer omitting optional fields; \`null\` means "use defaults".

  **STATE = FILES**:
  - Shared config: \`shared/config/**\` (alias: \`current/custom_rules/**\`, \`current/world/theme_config.json\`).
  - \`notes.md\`, \`soul.md\`, \`global/soul.md\` under \`current/world/\` are AI-to-AI self-notes (not player-facing).
  - ${
    toolsetId === "playerRate"
      ? "In `[Player Rate]` loops, write scope is soul-only: `current/world/soul.md` and `current/world/global/soul.md`."
      : "Fork runtime state includes `current/world/**` plus `current/outline/story_outline/plan.md` (writable strategic guidance, `default_editable`). Soul docs are `default_editable` — update proactively when evidence emerges."
  }
  - ${
    toolsetId === "playerRate"
      ? "Do not mutate `current/outline/story_outline/plan.md` in `[Player Rate]` loops."
      : "Plan continuity policy in normal turns: read `current/outline/story_outline/plan.md` first; use incremental edits for minor drift (checklists/progress/milestones), and full-file rewrite when branch fracture is major."
  }
  ${
    toolsetId === "playerRate"
      ? ""
      : "- Keep any `plan.md` revision causally aligned with `current/outline/outline.json` and already-committed world facts."
  }
  - Conversation/summary paths are finish-guarded — write only via finish tools.

  **CUSTOM RULE PACKS**:
  - Under \`current/custom_rules/NN-*/RULES.md\` (lower \`NN\` = higher priority).
  - Read relevant packs when turn intent matches a rule category. Not a hard gate.

  **TURN COMPLETION**:
  - LAST tool call must be \`${finishToolName}\`.
  ${
    finishToolName === "vfs_finish_turn"
      ? "- Args: `{ assistant: { narrative, choices }, retconAck?: { summary } }`."
      : ""
  }
  - **Blocking errors** (\`WRITE_EXISTING_TARGET_RETRY_REQUIRED\`, \`FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE\`): MUST fix before finish.
  - **Non-blocking errors** (missing target, permission denied, immutable writes): may proceed to finish.
  - Do not spam finish while blocking errors remain. Change strategy if same error repeats.
  - Do NOT write finish-guarded paths via generic write tools.
  - ${
    toolsetId === "playerRate"
      ? "Do not advance visible story in `[Player Rate]` loops."
      : "Normal turns must produce coherent narrative + choices in finish payload."
  }
</tool_usage>
`;
  },
);
