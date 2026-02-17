/**
 * ============================================================================
 * Summary Atom: Summary Tools Description
 * ============================================================================
 *
 * 摘要工具说明 - 解释摘要生成时可用的工具。
 */

import type { Atom } from "../types";
import { vfsToolRegistry } from "../../../vfs/tools";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * 摘要工具说明 - 无参数
 */
export const summaryTools: Atom<void> = defineAtom(
  {
    atomId: "atoms/summary/tools#summaryTools",
    source: "atoms/summary/tools.ts",
    exportName: "summaryTools",
  },
  () => {
    const toolset = vfsToolRegistry.getToolset("summary");
    const toolList = toolset.tools.map((name) => `- \`${name}\``).join("\n");
    const capabilityText =
      vfsToolRegistry.formatCapabilitiesForPrompt("summary");
    return `<tools>
You have these tools available:

Tool allowlist for this loop:
${toolList}

Tool capability contract:
${capabilityText}

1. \`vfs_ls\` - Locate files (optional \`patterns\`; stats metadata is always included)
2. \`vfs_schema\` - Inspect expected JSON fields for a path (read-only)
3. \`vfs_read_markdown/vfs_read_chars/vfs_read_lines/vfs_read_json\` - Read specific VFS files/fields for details (markdown/chars/lines/json)
4. \`vfs_search\` - Find details in the VFS (read-only)
5. \`vfs_finish_summary\` - Finish by appending a summary and updating \`forks/{activeFork}/story/summary/state.json\` (alias: \`current/summary/state.json\`; template requires \`finish_summary\` operation)

When you have enough information, call \`vfs_finish_summary\` to complete the summary.
It MUST be your LAST tool call.
</tools>`;
  },
);

export default summaryTools;
