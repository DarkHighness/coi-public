import { normalizeVfsPath } from "./utils";

export const buildGlobalNotesPath = (): "world/notes.md" => "world/notes.md";

const stripCurrentPrefix = (path: string): string => {
  const normalized = normalizeVfsPath(path);
  if (normalized === "current") return "";
  if (normalized.startsWith("current/")) {
    return normalized.slice("current/".length);
  }
  return normalized;
};

/**
 * Build the canonical entity notes path for a given entity JSON path.
 *
 * Rules:
 * - For most JSON entity files `.../<id>.json` -> `.../<id>/notes.md`
 * - Special-case actor profile:
 *   `world/characters/<charId>/profile.json` -> `world/characters/<charId>/notes.md`
 */
export const buildEntityNotesPath = (entityJsonPath: string): string => {
  const normalized = stripCurrentPrefix(entityJsonPath);
  if (!normalized) {
    throw new Error("entityJsonPath is required");
  }

  if (
    normalized.startsWith("world/characters/") &&
    normalized.endsWith("/profile.json")
  ) {
    const parts = normalized.split("/").filter(Boolean);
    // world/characters/<charId>/profile.json
    if (parts.length === 4 && parts[0] === "world" && parts[1] === "characters") {
      return `world/characters/${parts[2]}/notes.md`;
    }
  }

  if (!normalized.endsWith(".json")) {
    throw new Error(`Expected a .json entity path, got: ${entityJsonPath}`);
  }

  const withoutExt = normalized.slice(0, -".json".length);
  return `${withoutExt}/notes.md`;
};

