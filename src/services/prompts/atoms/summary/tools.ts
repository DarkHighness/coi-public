/**
 * ============================================================================
 * Summary Atom: Summary Tools Description
 * ============================================================================
 *
 * 摘要工具说明 - 解释摘要生成时可用的工具。
 */

import type { Atom } from "../types";

/**
 * 摘要工具说明 - 无参数
 */
export const summaryTools: Atom<void> = () => `<tools>
You have these tools available:

1. \`vfs_ls_entries\` - Get a compact catalog of entities by category (read-only)
2. \`vfs_read\` / \`vfs_read_many\` - Read specific VFS files for details
3. \`vfs_search\` / \`vfs_grep\` - Find details in the VFS (read-only)
4. \`vfs_finish_summary\` - Finish by appending a summary to \`current/summary/state.json\`

When you have enough information, call \`vfs_finish_summary\` to complete the summary.
It MUST be your LAST tool call.
</tools>`;

export default summaryTools;
