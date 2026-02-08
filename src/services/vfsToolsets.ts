/**
 * VFS Toolsets
 * ============================================================================
 *
 * Central allowlists for agentic loops (turn / cleanup / summary).
 *
 * Tool names are validated against the centralized VFS capability registry to
 * ensure allowlists and permissions stay in sync.
 */

import { vfsToolCapabilityRegistry } from "./vfs/core/toolCapabilityRegistry";

export type VfsToolsetId = "turn" | "cleanup" | "summary" | "outline";

export interface VfsToolset {
  tools: string[];
  finishToolName: string;
}

const TURN_TOOL_ORDER = [
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
] as const;

const CLEANUP_TOOL_ORDER = [...TURN_TOOL_ORDER] as const;

const SUMMARY_TOOL_ORDER = [
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
] as const;

const OUTLINE_TOOL_ORDER = [
  "vfs_ls",
  "vfs_stat",
  "vfs_glob",
  "vfs_read",
  "vfs_read_many",
  "vfs_read_json",
  "vfs_search",
  "vfs_grep",
  "vfs_submit_outline_phase_0",
  "vfs_submit_outline_phase_1",
  "vfs_submit_outline_phase_2",
  "vfs_submit_outline_phase_3",
  "vfs_submit_outline_phase_4",
  "vfs_submit_outline_phase_5",
  "vfs_submit_outline_phase_6",
  "vfs_submit_outline_phase_7",
  "vfs_submit_outline_phase_8",
  "vfs_submit_outline_phase_9",
] as const;

const ensureRegisteredTool = (toolName: string): string => {
  if (!vfsToolCapabilityRegistry.get(toolName)) {
    throw new Error(`Missing VFS capability registration for tool: ${toolName}`);
  }
  return toolName;
};

export const VFS_TOOLSETS: Record<VfsToolsetId, VfsToolset> = {
  turn: {
    tools: TURN_TOOL_ORDER.map(ensureRegisteredTool),
    finishToolName: "vfs_commit_turn",
  },
  cleanup: {
    tools: CLEANUP_TOOL_ORDER.map(ensureRegisteredTool),
    finishToolName: "vfs_commit_turn",
  },
  summary: {
    tools: SUMMARY_TOOL_ORDER.map(ensureRegisteredTool),
    finishToolName: "vfs_finish_summary",
  },
  outline: {
    tools: OUTLINE_TOOL_ORDER.map(ensureRegisteredTool),
    finishToolName: "vfs_submit_outline_phase_0",
  },
};

export function formatVfsToolsForPrompt(tools: string[]): string {
  return tools.map((t) => `- \`${t}\``).join("\n");
}

export function formatVfsToolCapabilitiesForPrompt(tools: string[]): string {
  return tools
    .map((toolName) => vfsToolCapabilityRegistry.describeForPrompt(toolName))
    .join("\n");
}
