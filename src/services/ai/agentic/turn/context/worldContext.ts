/**
 * ============================================================================
 * World Context Builder (VFS-first)
 * ============================================================================
 */

import type { VfsSession } from "@/services/vfs/vfsSession";

const OUTLINE_PATH = "outline/outline.json";
const PROTAGONIST_PATH = "world/characters/char:player/profile.json";
const GLOBAL_PATH = "world/global.json";
const WORLD_ENTITY_COLLECTION_KEYS = [
  "quests",
  "knowledge",
  "timeline",
  "locations",
  "factions",
  "causal_chains",
  "causalChains",
] as const;
const WORLD_ENTITY_VIEW_ONLY_KEYS = [
  "unlocked",
  "unlockReason",
  "highlight",
  "lastAccess",
  "status",
  "isVisited",
  "visitedCount",
  "discoveredAtGameTime",
  "standing",
  "standingTag",
] as const;
const WORLD_INFO_VIEW_ONLY_KEYS = [
  "worldSettingUnlocked",
  "worldSettingUnlockReason",
  "mainGoalUnlocked",
  "mainGoalUnlockReason",
] as const;

const toBlock = (tag: string, path: string, content: string): string => {
  const trimmed = content.trim();
  if (!trimmed) {
    return "";
  }
  return `<${tag} path="${path}">\n${trimmed}\n</${tag}>`;
};

const toObjectRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const sanitizeOutlineForRuntimeContext = (payload: unknown): unknown => {
  const root = toObjectRecord(payload);
  if (!root) return payload;

  const sanitizedRoot: Record<string, unknown> = { ...root };

  for (const key of WORLD_INFO_VIEW_ONLY_KEYS) {
    if (key in sanitizedRoot) {
      delete sanitizedRoot[key];
    }
  }

  for (const collectionKey of WORLD_ENTITY_COLLECTION_KEYS) {
    const collection = sanitizedRoot[collectionKey];
    if (!Array.isArray(collection)) continue;
    sanitizedRoot[collectionKey] = collection.map((entry) => {
      const entryRecord = toObjectRecord(entry);
      if (!entryRecord) return entry;
      const sanitizedEntry: Record<string, unknown> = { ...entryRecord };
      for (const key of WORLD_ENTITY_VIEW_ONLY_KEYS) {
        if (key in sanitizedEntry) {
          delete sanitizedEntry[key];
        }
      }
      return sanitizedEntry;
    });
  }

  return sanitizedRoot;
};

export function buildWorldFoundation(vfsSession: VfsSession): string {
  const outline = vfsSession.readFile(OUTLINE_PATH);
  if (!outline) {
    return "";
  }
  try {
    const parsed = JSON.parse(outline.content) as unknown;
    const sanitized = sanitizeOutlineForRuntimeContext(parsed);
    return toBlock(
      "world_foundation",
      OUTLINE_PATH,
      JSON.stringify(sanitized),
    );
  } catch {
    return toBlock("world_foundation", OUTLINE_PATH, outline.content);
  }
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
