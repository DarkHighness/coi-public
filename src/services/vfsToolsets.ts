/**
 * VFS Toolsets
 * ============================================================================
 *
 * Central allowlists for agentic loops (turn / cleanup / summary).
 *
 * These toolsets are used for:
 * - Filtering available tools at runtime (ALL_DEFINED_TOOLS allowlist)
 * - Printing stable tool lists in prompts
 */

export type VfsToolsetId = "turn" | "cleanup" | "summary";

export interface VfsToolset {
  tools: string[];
  finishToolName: string;
}

export const VFS_TOOLSETS: Record<VfsToolsetId, VfsToolset> = {
  turn: {
    // Full agentic loop allowlist for normal story turns.
    tools: [
      "vfs_ls",
      "vfs_stat",
      "vfs_glob",
      "vfs_schema",
      "vfs_ls_entries",
      "vfs_read",
      "vfs_read_many",
      "vfs_read_json",
      "vfs_search",
      "vfs_grep",
      "vfs_suggest_duplicates",
      "vfs_write",
      "vfs_append",
      "vfs_text_edit",
      "vfs_text_patch",
      "vfs_edit",
      "vfs_merge",
      "vfs_move",
      "vfs_delete",
      "vfs_commit_turn",
      "vfs_tx",
    ],
    finishToolName: "vfs_commit_turn",
  },
  cleanup: {
    // Cleanup is still VFS-only; allow the same tool surface to keep behavior simple/safe.
    tools: [
      "vfs_ls",
      "vfs_stat",
      "vfs_glob",
      "vfs_schema",
      "vfs_ls_entries",
      "vfs_read",
      "vfs_read_many",
      "vfs_read_json",
      "vfs_search",
      "vfs_grep",
      "vfs_suggest_duplicates",
      "vfs_write",
      "vfs_append",
      "vfs_text_edit",
      "vfs_text_patch",
      "vfs_edit",
      "vfs_merge",
      "vfs_move",
      "vfs_delete",
      "vfs_commit_turn",
      "vfs_tx",
    ],
    finishToolName: "vfs_commit_turn",
  },
  summary: {
    // Summary/compaction loops should be read-heavy, with a dedicated finish tool.
    tools: [
      "vfs_ls",
      "vfs_stat",
      "vfs_glob",
      "vfs_schema",
      "vfs_ls_entries",
      "vfs_read",
      "vfs_read_many",
      "vfs_read_json",
      "vfs_search",
      "vfs_grep",
      "vfs_finish_summary",
    ],
    finishToolName: "vfs_finish_summary",
  },
};

export function formatVfsToolsForPrompt(tools: string[]): string {
  return tools.map((t) => `- \`${t}\``).join("\n");
}
