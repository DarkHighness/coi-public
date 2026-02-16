/**
 * @deprecated Use vfsToolRegistry.getToolset(...) from ./vfs/tools/registry.
 */

import { vfsToolRegistry } from "./vfs/tools/registry";

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

const TOOLSET_IDS: VfsToolsetId[] = [
  "turn",
  "playerRate",
  "cleanup",
  "summary",
  "outline",
];

export const getVfsToolset = (id: VfsToolsetId): VfsToolset =>
  vfsToolRegistry.getToolset(id);

export const listVfsToolsets = (): Record<VfsToolsetId, VfsToolset> =>
  Object.fromEntries(
    TOOLSET_IDS.map((id) => [id, vfsToolRegistry.getToolset(id)]),
  ) as Record<VfsToolsetId, VfsToolset>;

export function formatVfsToolsForPrompt(tools: string[]): string {
  return tools.map((t) => `- \`${t}\``).join("\n");
}

export function formatVfsToolCapabilitiesForPrompt(tools: string[]): string {
  return tools
    .map((toolName) => {
      if (!vfsToolRegistry.has(toolName)) {
        return `- \`${toolName}\`: capability metadata missing.`;
      }
      return vfsToolRegistry.describeForPrompt(toolName as any);
    })
    .join("\n");
}
