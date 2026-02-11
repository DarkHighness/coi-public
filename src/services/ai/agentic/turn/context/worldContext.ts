/**
 * ============================================================================
 * World Context Builder (VFS-first)
 * ============================================================================
 */

import type { VfsSession } from "@/services/vfs/vfsSession";

const OUTLINE_PATH = "outline/outline.json";
const PROTAGONIST_PATH = "world/characters/char:player/profile.json";
const GLOBAL_PATH = "world/global.json";

const toBlock = (tag: string, path: string, content: string): string => {
  const trimmed = content.trim();
  if (!trimmed) {
    return "";
  }
  return `<${tag} path="${path}">\n${trimmed}\n</${tag}>`;
};

export function buildWorldFoundation(vfsSession: VfsSession): string {
  const outline = vfsSession.readFile(OUTLINE_PATH);
  if (!outline) {
    return "";
  }
  return toBlock("world_foundation", OUTLINE_PATH, outline.content);
}

export function buildProtagonist(vfsSession: VfsSession): string {
  const protagonist = vfsSession.readFile(PROTAGONIST_PATH);
  if (!protagonist) {
    return "";
  }
  return toBlock("protagonist_profile", PROTAGONIST_PATH, protagonist.content);
}

export function buildGodModeContext(vfsSession: VfsSession): string {
  const globalFile = vfsSession.readFile(GLOBAL_PATH);
  if (!globalFile) {
    return "<god_mode>GOD MODE ACTIVE</god_mode>";
  }

  const globalBlock = toBlock("global_state", GLOBAL_PATH, globalFile.content);
  return `<god_mode>\nGOD MODE ACTIVE\n${globalBlock}\n</god_mode>`;
}
