import type { AISettings, SkillReadPolicy } from "../../types";
import { getAllSkillCatalogEntries } from "../vfs/globalSkills";
import {
  LOOP_SKILL_BASELINE,
  toCanonicalSkillPath,
} from "../prompts/skills/loopSkillBaseline";

const SKILL_PATH_REGEX = /^skills\/.+\/SKILL\.md$/;

export interface SkillCatalogOption {
  id: string;
  title: string;
  description: string;
  domain: string;
  tags: string[];
  canonicalPath: string;
  currentPath: string;
}

export interface SkillPolicySelection {
  required: string[];
  recommended: string[];
  forbidden: string[];
  invalidEntries: string[];
}

export interface SkillPolicyGateConfig {
  required: string[];
  recommended: string[];
  forbidden: string[];
  ignoredForbidden: string[];
}

export interface SkillPathDescriptor {
  canonicalPath: string;
  currentPath: string;
  title: string;
  description: string;
  domain: string;
}

const SKILL_POLICY_VALUES: SkillReadPolicy[] = [
  "default",
  "required",
  "recommended",
  "forbidden",
];

const SYSTEM_PROTECTED_SKILL_PREFIXES = [
  "skills/commands/runtime/",
  "skills/presets/runtime/",
] as const;

const SYSTEM_PROTECTED_SKILL_PATHS = new Set(
  Array.from(
    new Set(
      Object.values(LOOP_SKILL_BASELINE)
        .flat()
        .map((path) => toCanonicalSkillPath(path)),
    ),
  ),
);

const isSkillReadPolicy = (value: unknown): value is SkillReadPolicy =>
  typeof value === "string" &&
  SKILL_POLICY_VALUES.includes(value as SkillReadPolicy);

const normalizeSlashes = (value: string): string =>
  value.replace(/\\/g, "/").replace(/\/{2,}/g, "/");

const toCanonicalSkillsRoot = (value: string): string => {
  const normalized = value.replace(/^\/+/, "");

  if (normalized.startsWith("current/")) {
    return normalized.slice("current/".length);
  }
  if (normalized.startsWith("shared/system/skills/")) {
    return `skills/${normalized.slice("shared/system/skills/".length)}`;
  }

  return normalized;
};

const toTitleFromPath = (canonicalPath: string): string => {
  const withoutPrefix = canonicalPath.replace(/^skills\//, "");
  const withoutFile = withoutPrefix.replace(/\/SKILL\.md$/, "");
  return withoutFile
    .split("/")
    .map((segment) => segment.replace(/[-_]/g, " "))
    .map((segment) =>
      segment.length > 0
        ? `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`
        : segment,
    )
    .join(" / ");
};

export const normalizeSkillPolicyPath = (rawPath: string): string | null => {
  if (typeof rawPath !== "string") return null;

  const collapsed = normalizeSlashes(rawPath.trim());
  if (!collapsed) return null;

  const canonical = toCanonicalSkillsRoot(collapsed);
  if (!SKILL_PATH_REGEX.test(canonical)) return null;

  return canonical;
};

export const toCurrentSkillPolicyPath = (rawPath: string): string | null => {
  const normalized = normalizeSkillPolicyPath(rawPath);
  if (!normalized) return null;
  return `current/${normalized}`;
};

export const isSystemProtectedSkillPath = (rawPath: string): boolean => {
  const normalized = normalizeSkillPolicyPath(rawPath);
  if (!normalized) return false;

  if (SYSTEM_PROTECTED_SKILL_PATHS.has(normalized)) {
    return true;
  }

  return SYSTEM_PROTECTED_SKILL_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix),
  );
};

let cachedCatalogOptions: SkillCatalogOption[] | null = null;
let cachedCatalogByPath: Map<string, SkillCatalogOption> | null = null;

const buildCatalogCache = (): {
  options: SkillCatalogOption[];
  byPath: Map<string, SkillCatalogOption>;
} => {
  if (cachedCatalogOptions && cachedCatalogByPath) {
    return {
      options: cachedCatalogOptions,
      byPath: cachedCatalogByPath,
    };
  }

  const byPath = new Map<string, SkillCatalogOption>();

  for (const entry of getAllSkillCatalogEntries()) {
    const canonicalPath = normalizeSkillPolicyPath(entry.path);
    if (!canonicalPath) continue;
    if (byPath.has(canonicalPath)) continue;

    const domain =
      typeof entry.domain === "string" && entry.domain.trim().length > 0
        ? entry.domain
        : canonicalPath.split("/")[1] || "unknown";
    const title =
      typeof entry.title === "string" && entry.title.trim().length > 0
        ? entry.title.trim()
        : toTitleFromPath(canonicalPath);
    const description =
      typeof entry.description === "string" ? entry.description.trim() : "";
    const tags = Array.isArray(entry.tags)
      ? entry.tags.filter((tag): tag is string => typeof tag === "string")
      : [];

    byPath.set(canonicalPath, {
      id: entry.id,
      title,
      description,
      domain,
      tags,
      canonicalPath,
      currentPath: `current/${canonicalPath}`,
    });
  }

  const options = Array.from(byPath.values()).sort((a, b) => {
    if (a.domain !== b.domain) {
      return a.domain.localeCompare(b.domain);
    }
    if (a.title !== b.title) {
      return a.title.localeCompare(b.title);
    }
    return a.canonicalPath.localeCompare(b.canonicalPath);
  });

  cachedCatalogOptions = options;
  cachedCatalogByPath = byPath;

  return { options, byPath };
};

export const getSkillCatalogOptions = (): SkillCatalogOption[] =>
  buildCatalogCache().options;

const toSortedUnique = (values: string[]): string[] =>
  Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

export const resolveSkillPolicySelection = (
  settings: AISettings | null | undefined,
): SkillPolicySelection => {
  const configured = settings?.extra?.skillReadPolicies;
  if (!configured || typeof configured !== "object") {
    return {
      required: [],
      recommended: [],
      forbidden: [],
      invalidEntries: [],
    };
  }

  const selected = new Map<string, Exclude<SkillReadPolicy, "default">>();
  const invalidEntries: string[] = [];

  for (const [rawPath, rawPolicy] of Object.entries(configured)) {
    const path = normalizeSkillPolicyPath(rawPath);
    if (!path) {
      invalidEntries.push(rawPath);
      continue;
    }

    const policy = isSkillReadPolicy(rawPolicy) ? rawPolicy : "default";
    if (policy === "default") {
      selected.delete(path);
      continue;
    }

    selected.set(path, policy);
  }

  const required: string[] = [];
  const recommended: string[] = [];
  const forbidden: string[] = [];

  for (const [path, policy] of selected.entries()) {
    if (policy === "required") {
      required.push(path);
      continue;
    }
    if (policy === "recommended") {
      recommended.push(path);
      continue;
    }
    forbidden.push(path);
  }

  return {
    required: toSortedUnique(required),
    recommended: toSortedUnique(recommended),
    forbidden: toSortedUnique(forbidden),
    invalidEntries: toSortedUnique(invalidEntries),
  };
};

const normalizePathSet = (paths: string[]): Set<string> => {
  const set = new Set<string>();
  for (const rawPath of paths) {
    const normalized = normalizeSkillPolicyPath(rawPath);
    if (normalized) {
      set.add(normalized);
    }
  }
  return set;
};

export const resolveSkillPolicyGateConfig = (params: {
  settings: AISettings | null | undefined;
  hardRequiredPaths?: string[];
  hardPresetRequiredPaths?: string[];
}): SkillPolicyGateConfig => {
  const { required, recommended, forbidden } = resolveSkillPolicySelection(
    params.settings,
  );

  const hardRequiredSet = normalizePathSet(params.hardRequiredPaths || []);
  for (const path of normalizePathSet(params.hardPresetRequiredPaths || [])) {
    hardRequiredSet.add(path);
  }

  const requiredSet = new Set<string>();
  const recommendedSet = new Set<string>();
  const forbiddenSet = new Set<string>();
  const ignoredForbidden = new Set<string>();
  const systemProtectedSet = new Set(
    [...required, ...recommended, ...forbidden].filter((path) =>
      isSystemProtectedSkillPath(path),
    ),
  );

  for (const path of required) {
    if (!hardRequiredSet.has(path)) {
      requiredSet.add(path);
    }
  }

  for (const path of recommended) {
    if (hardRequiredSet.has(path) || requiredSet.has(path)) {
      continue;
    }
    recommendedSet.add(path);
  }

  for (const path of forbidden) {
    if (
      hardRequiredSet.has(path) ||
      requiredSet.has(path) ||
      systemProtectedSet.has(path)
    ) {
      ignoredForbidden.add(path);
      continue;
    }
    forbiddenSet.add(path);
  }

  return {
    required: toSortedUnique(Array.from(requiredSet)),
    recommended: toSortedUnique(Array.from(recommendedSet)),
    forbidden: toSortedUnique(Array.from(forbiddenSet)),
    ignoredForbidden: toSortedUnique(Array.from(ignoredForbidden)),
  };
};

export const describeSkillPolicyPaths = (
  rawPaths: string[],
): SkillPathDescriptor[] => {
  if (!Array.isArray(rawPaths) || rawPaths.length === 0) {
    return [];
  }

  const { byPath } = buildCatalogCache();
  const result: SkillPathDescriptor[] = [];

  for (const rawPath of rawPaths) {
    const canonicalPath = normalizeSkillPolicyPath(rawPath);
    if (!canonicalPath) continue;

    const catalogEntry = byPath.get(canonicalPath);
    if (catalogEntry) {
      result.push({
        canonicalPath,
        currentPath: catalogEntry.currentPath,
        title: catalogEntry.title,
        description: catalogEntry.description,
        domain: catalogEntry.domain,
      });
      continue;
    }

    result.push({
      canonicalPath,
      currentPath: `current/${canonicalPath}`,
      title: toTitleFromPath(canonicalPath),
      description: "",
      domain: canonicalPath.split("/")[1] || "unknown",
    });
  }

  return result.sort((a, b) => a.canonicalPath.localeCompare(b.canonicalPath));
};
