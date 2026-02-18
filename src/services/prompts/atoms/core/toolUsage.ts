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
    const toolsetId = finishToolName === "vfs_end_turn" ? "playerRate" : "turn";
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
  - Permission classes: \`immutable_readonly\`, \`default_editable\`, \`elevated_editable\`, \`finish_guarded\`.
  - Immutable zones: \`shared/system/skills/**\`, \`shared/system/refs/**\` (alias \`skills/**\`, \`refs/**\`).

  **READ TOOLS**:
  - \`vfs_ls\`: discover paths.
  - \`vfs_schema\`: check JSON structure.
  - \`vfs_read_json\`: pointer-based JSON read.
  - \`vfs_read_markdown\`: heading/index markdown read.
  - \`vfs_read_lines\`: bounded line reads.
  - \`vfs_read_chars\`: bounded char reads.
  - \`vfs_search\` (${searchModes}): content lookup.

  **WRITE TOOLS**:
  ${
    toolsetId === "playerRate"
      ? [
          "- Allowed mutation scope is markdown memory only:",
          "  - `workspace/SOUL.md`",
          "  - `workspace/USER.md`",
          "- Typical tools: `vfs_write_file`, `vfs_edit_lines`, `vfs_write_markdown`.",
          "- `vfs_vm` / JSON patch / move / delete are NOT available in this loop.",
        ].join("\n")
      : [
          "- Runtime state writes: `current/world/**`.",
          "- Plan continuity writes: `workspace/PLAN.md` (save-scoped).",
          "- Generic write/edit tools may include text + JSON mutations and file move/delete when allowlisted.",
          "- If `vfs_vm` is available in this loop, it must be the ONLY top-level tool call.",
          "- Inside `vfs_vm` scripts, call injected `vfs_*` helpers directly (e.g. `await vfs_read_chars({...})`), not `VFS.read(...)` or `VFS.*`.",
        ].join("\n")
  }

  **STATE = FILES**:
  - Memory docs:
    - \`workspace/IDENTITY.md\`: identity anchor (AI read-only).
    - \`workspace/USER.md\`: player preference portrait (global, soft constraints).
    - \`workspace/SOUL.md\`: AI self-evolution memo (global).
    - \`workspace/PLAN.md\`: save-scoped outline trajectory guidance.
  - ${
    toolsetId === "playerRate"
      ? "In `[Player Rate]`, do NOT mutate `workspace/PLAN.md` or any `current/world/**` file."
      : "In normal turns, keep `workspace/PLAN.md` aligned with established facts and `current/outline/outline.json`."
  }
  - Conversation/summary paths are finish-guarded — only finish tools can write them.

  **PLAYER-RATE CONTRACT**:
  - \`[Player Rate]\` is preference ingestion only.
  - Not \`sudo\` / \`forceUpdate\` / \`godMode\`.
  - May record trajectory preference as a soft constraint; must NOT rewrite established facts/world rules.
  - Must NOT advance visible plot or emit new choices in this loop.

  **TURN COMPLETION**:
  - LAST tool call must be \`${finishToolName}\`.
  ${
    finishToolName === "vfs_finish_turn"
      ? "- Args: `{ assistant: { narrative, choices }, retconAck?: { summary } }`."
      : "- Args: `{}` (empty object)."
  }
  - Blocking write failures must be repaired before finish.
</tool_usage>
`;
  },
);
