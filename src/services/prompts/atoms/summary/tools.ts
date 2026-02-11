/**
 * ============================================================================
 * Summary Atom: Summary Tools Description
 * ============================================================================
 *
 * 摘要工具说明 - 解释摘要生成时可用的工具。
 */

import type { Atom } from "../types";
import {
  VFS_TOOLSETS,
  formatVfsToolCapabilitiesForPrompt,
  formatVfsToolsForPrompt,
} from "../../../vfsToolsets";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


/**
 * 摘要工具说明 - 无参数
 */
export const summaryTools: Atom<void> = defineAtom({ atomId: "atoms/summary/tools#summaryTools", source: "atoms/summary/tools.ts", exportName: "summaryTools" }, () => `<tools>
You have these tools available:

Tool allowlist for this loop:
${formatVfsToolsForPrompt(VFS_TOOLSETS.summary.tools)}

Tool capability contract:
${formatVfsToolCapabilitiesForPrompt(VFS_TOOLSETS.summary.tools)}

1. \`vfs_ls\` - Locate files (optionally with \`patterns\` and \`stat=true\`)
2. \`vfs_schema\` - Inspect expected JSON fields for a path (read-only)
3. \`vfs_read\` - Read specific VFS files/fields for details (chars/lines/json mode)
4. \`vfs_search\` - Find details in the VFS (read-only)
5. \`vfs_commit_summary\` - Finish by appending a summary and updating \`forks/{activeFork}/story/summary/state.json\` (alias: \`current/summary/state.json\`; template requires \`finish_summary\` operation)

When you have enough information, call \`vfs_commit_summary\` to complete the summary.
It MUST be your LAST tool call.
</tools>`);

export default summaryTools;
