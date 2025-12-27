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

1. \`summary_query_segments\` - Examine specific turns in detail (use sparingly, segments already provided in context)
2. \`summary_query_state\` - Check current entity states (inventory, npcs, etc.)
3. \`finish_summary\` - Complete the summary with your results

When you have enough information, call \`finish_summary\` to complete the summary.
</tools>`;

export default summaryTools;
