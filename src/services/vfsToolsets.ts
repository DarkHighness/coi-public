/**
 * VFS Toolsets
 * ============================================================================
 *
 * Central allowlists for agentic loops (turn / playerRate / cleanup / summary / outline).
 *
 * Tool names are validated against the centralized VFS capability registry to
 * ensure allowlists and permissions stay in sync.
 */

import { vfsToolCapabilityRegistry } from "./vfs/core/toolCapabilityRegistry";

export type VfsToolsetId =
  | "turn"
  | "playerRate"
  | "cleanup"
  | "summary"
  | "outline";

export interface VfsToolset {
  tools: string[];
  finishToolName: string;
}

const TURN_TOOL_ORDER = [
  "vfs_ls",
  "vfs_schema",
  "vfs_read",
  "vfs_search",
  "vfs_write",
  "vfs_move",
  "vfs_delete",
  "vfs_commit_turn",
] as const;

const CLEANUP_TOOL_ORDER = [...TURN_TOOL_ORDER] as const;

const PLAYER_RATE_TOOL_ORDER = [
  "vfs_ls",
  "vfs_schema",
  "vfs_read",
  "vfs_search",
  "vfs_commit_soul",
] as const;

const SUMMARY_TOOL_ORDER = [
  "vfs_ls",
  "vfs_schema",
  "vfs_read",
  "vfs_search",
  "vfs_commit_summary",
] as const;

const OUTLINE_TOOL_ORDER = [
  "vfs_ls",
  "vfs_schema",
  "vfs_read",
  "vfs_search",
  "vfs_commit_outline_phase_0",
  "vfs_commit_outline_phase_1",
  "vfs_commit_outline_phase_2",
  "vfs_commit_outline_phase_3",
  "vfs_commit_outline_phase_4",
  "vfs_commit_outline_phase_5",
  "vfs_commit_outline_phase_6",
  "vfs_commit_outline_phase_7",
  "vfs_commit_outline_phase_8",
  "vfs_commit_outline_phase_9",
] as const;

const ensureRegisteredTool = (toolName: string): string => {
  if (!vfsToolCapabilityRegistry.get(toolName)) {
    throw new Error(
      `Missing VFS capability registration for tool: ${toolName}`,
    );
  }
  return toolName;
};

export const VFS_TOOLSETS: Record<VfsToolsetId, VfsToolset> = {
  turn: {
    tools: TURN_TOOL_ORDER.map(ensureRegisteredTool),
    finishToolName: "vfs_commit_turn",
  },
  playerRate: {
    tools: PLAYER_RATE_TOOL_ORDER.map(ensureRegisteredTool),
    finishToolName: "vfs_commit_soul",
  },
  cleanup: {
    tools: CLEANUP_TOOL_ORDER.map(ensureRegisteredTool),
    finishToolName: "vfs_commit_turn",
  },
  summary: {
    tools: SUMMARY_TOOL_ORDER.map(ensureRegisteredTool),
    finishToolName: "vfs_commit_summary",
  },
  outline: {
    tools: OUTLINE_TOOL_ORDER.map(ensureRegisteredTool),
    finishToolName: "vfs_commit_outline_phase_0",
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
