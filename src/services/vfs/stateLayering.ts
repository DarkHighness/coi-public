import type { Operation } from "./jsonPatchTypes";
import { toCurrentPath } from "./currentAlias";
import { canonicalToLogicalVfsPath } from "./core/pathResolver";
import { normalizeVfsPath } from "./utils";

export type CanonicalWorldEntityCategory =
  | "quests"
  | "knowledge"
  | "timeline"
  | "locations"
  | "factions"
  | "causal_chains";

export type CanonicalWorldCategory =
  | CanonicalWorldEntityCategory
  | "world_info";

const BASE_WORLD_VIEW_ONLY_KEYS = [
  "unlocked",
  "unlockReason",
  "highlight",
  "lastAccess",
] as const;

const WORLD_INFO_VIEW_ONLY_KEYS = [
  "unlocked",
  "unlockReason",
  "worldSettingUnlocked",
  "worldSettingUnlockReason",
  "mainGoalUnlocked",
  "mainGoalUnlockReason",
  "highlight",
  "lastAccess",
] as const;

const WORLD_ENTITY_VIEW_ONLY_KEYS: Record<
  CanonicalWorldEntityCategory,
  readonly string[]
> = {
  quests: [
    ...BASE_WORLD_VIEW_ONLY_KEYS,
    "status",
    "objectiveState",
    "acceptedAtGameTime",
    "completedAtGameTime",
  ],
  knowledge: [
    ...BASE_WORLD_VIEW_ONLY_KEYS,
    "discoveredAt",
    "discoveredAtGameTime",
    "beliefSummary",
  ],
  timeline: [...BASE_WORLD_VIEW_ONLY_KEYS, "rememberedAs", "suspicions"],
  locations: [
    ...BASE_WORLD_VIEW_ONLY_KEYS,
    "isVisited",
    "visitedCount",
    "discoveredAt",
    "discoveredAtGameTime",
  ],
  factions: [...BASE_WORLD_VIEW_ONLY_KEYS, "standing", "standingTag"],
  causal_chains: [
    ...BASE_WORLD_VIEW_ONLY_KEYS,
    "investigationNotes",
    "linkedEventIds",
  ],
};

const WORLD_ENTITY_CATEGORY_PATTERN =
  /^world\/(quests|knowledge|timeline|locations|factions|causal_chains)\/[^/]+\.json$/;

const normalizeLogicalPath = (path: string): string => {
  const normalized = normalizeVfsPath(path);
  return normalizeVfsPath(
    canonicalToLogicalVfsPath(normalized, { looseFork: true }) || normalized,
  );
};

const toObjectRecord = (value: unknown): JsonObject | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonObject;
};

const decodeJsonPointerRootKey = (pointer: unknown): string | null => {
  if (typeof pointer !== "string") return null;
  const trimmed = pointer.trim();
  if (!trimmed.startsWith("/")) return null;
  const token = trimmed.slice(1).split("/")[0];
  if (!token) return null;
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
};

const warningForPath = (path: string, keys: string[]): string =>
  `Ignored canonical view/UI field(s) ${keys.join(", ")} at ${toCurrentPath(path)}.`;

const warningForPatchPath = (path: string, strippedCount: number): string =>
  `Ignored ${strippedCount} patch operation(s) targeting canonical view/UI fields at ${toCurrentPath(path)}.`;

export const resolveCanonicalWorldCategoryFromPath = (
  path: string,
): CanonicalWorldCategory | null => {
  const logical = normalizeLogicalPath(path);
  if (logical === "world/world_info.json") {
    return "world_info";
  }

  const match = WORLD_ENTITY_CATEGORY_PATTERN.exec(logical);
  if (!match || !match[1]) {
    return null;
  }

  return match[1] as CanonicalWorldEntityCategory;
};

export const isCanonicalWorldPath = (path: string): boolean =>
  resolveCanonicalWorldCategoryFromPath(path) !== null;

export const getCanonicalViewOnlyKeys = (
  category: CanonicalWorldCategory,
): readonly string[] => {
  if (category === "world_info") {
    return WORLD_INFO_VIEW_ONLY_KEYS;
  }
  return WORLD_ENTITY_VIEW_ONLY_KEYS[category];
};

export const sanitizeCanonicalWorldRecord = (
  category: CanonicalWorldCategory,
  value: unknown,
  sourcePathForWarning?: string,
): {
  sanitized: unknown;
  strippedKeys: string[];
  warnings: string[];
} => {
  const record = toObjectRecord(value);
  if (!record) {
    return { sanitized: value, strippedKeys: [], warnings: [] };
  }

  const blocked = new Set(getCanonicalViewOnlyKeys(category));
  const strippedKeys = Object.keys(record).filter((key) => blocked.has(key));
  if (strippedKeys.length === 0) {
    return { sanitized: value, strippedKeys: [], warnings: [] };
  }

  const sanitizedRecord: JsonObject = { ...record };
  for (const key of strippedKeys) {
    delete sanitizedRecord[key];
  }

  const warnings = sourcePathForWarning
    ? [warningForPath(sourcePathForWarning, strippedKeys)]
    : [];

  return {
    sanitized: sanitizedRecord,
    strippedKeys,
    warnings,
  };
};

export const sanitizeCanonicalWorldRecordByPath = (
  path: string,
  value: unknown,
): {
  sanitized: unknown;
  strippedKeys: string[];
  warnings: string[];
} => {
  const category = resolveCanonicalWorldCategoryFromPath(path);
  if (!category) {
    return { sanitized: value, strippedKeys: [], warnings: [] };
  }
  return sanitizeCanonicalWorldRecord(category, value, path);
};

export const filterCanonicalWorldPatchOpsByPath = (
  path: string,
  patchOps: Operation[],
): {
  patch: Operation[];
  strippedCount: number;
  warnings: string[];
} => {
  const category = resolveCanonicalWorldCategoryFromPath(path);
  if (!category || patchOps.length === 0) {
    return {
      patch: patchOps,
      strippedCount: 0,
      warnings: [],
    };
  }

  const blocked = new Set(getCanonicalViewOnlyKeys(category));
  const kept: Operation[] = [];
  let strippedCount = 0;

  for (const op of patchOps) {
    const opRecord = op as JsonObject;
    const pathKey = decodeJsonPointerRootKey(opRecord.path);
    const fromKey = decodeJsonPointerRootKey(opRecord.from);
    if (
      (pathKey && blocked.has(pathKey)) ||
      (fromKey && blocked.has(fromKey))
    ) {
      strippedCount += 1;
      continue;
    }
    kept.push(op);
  }

  if (strippedCount === 0) {
    return {
      patch: patchOps,
      strippedCount: 0,
      warnings: [],
    };
  }

  return {
    patch: kept,
    strippedCount,
    warnings: [warningForPatchPath(path, strippedCount)],
  };
};

const OUTLINE_COLLECTION_TO_CATEGORY: Record<
  string,
  CanonicalWorldEntityCategory
> = {
  quests: "quests",
  knowledge: "knowledge",
  timeline: "timeline",
  locations: "locations",
  factions: "factions",
  causal_chains: "causal_chains",
  causalChains: "causal_chains",
};

export const sanitizeOutlineWorldCollections = (
  payload: unknown,
): {
  sanitized: unknown;
  warnings: string[];
} => {
  const root = toObjectRecord(payload);
  if (!root) {
    return {
      sanitized: payload,
      warnings: [],
    };
  }

  let nextRoot: JsonObject = { ...root };
  const warnings: string[] = [];

  const worldInfoSanitized = sanitizeCanonicalWorldRecord(
    "world_info",
    nextRoot,
  );
  if (worldInfoSanitized.strippedKeys.length > 0) {
    warnings.push(
      `Ignored outline-level world_info view/UI field(s): ${worldInfoSanitized.strippedKeys.join(", ")}.`,
    );
    const sanitizedRoot = toObjectRecord(worldInfoSanitized.sanitized);
    if (sanitizedRoot) {
      nextRoot = { ...sanitizedRoot };
    }
  }

  for (const [key, category] of Object.entries(
    OUTLINE_COLLECTION_TO_CATEGORY,
  )) {
    const collection = nextRoot[key];
    if (!Array.isArray(collection)) {
      continue;
    }

    nextRoot[key] = collection.map((entry, index) => {
      const sanitized = sanitizeCanonicalWorldRecord(category, entry);
      if (sanitized.strippedKeys.length > 0) {
        warnings.push(
          `Ignored outline ${key}[${index}] view/UI field(s): ${sanitized.strippedKeys.join(", ")}.`,
        );
      }
      return sanitized.sanitized;
    });
  }

  return {
    sanitized: nextRoot,
    warnings,
  };
};
