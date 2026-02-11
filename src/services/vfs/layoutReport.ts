import { toCurrentPath } from "./currentAlias";
import { DIRECTORY_SCAFFOLD_DEFINITIONS } from "./directoryScaffolds";
import { vfsPathRegistry } from "./core/pathRegistry";
import { resolveVfsPath } from "./core/pathResolver";
import { vfsResourceTemplateRegistry } from "./core/resourceTemplateRegistry";
import type { VfsWriteOperation } from "./core/types";
import type { VfsSession } from "./vfsSession";
import { normalizeVfsPath } from "./utils";
import type { VfsContentType } from "./types";

type VfsLayoutSource = "existing" | "resource_template" | "directory_scaffold";
type VfsLayoutKind = "file" | "dir";
type VfsLayoutReadability = "read_only" | "read_write" | "finish_guarded";
type VfsLayoutUpdateTrigger =
  | "turn_commit"
  | "summary_commit"
  | "history_rewrite"
  | "direct_write"
  | "elevated_write";

interface ExpectedPathSeed {
  canonicalPath: string;
  kind: VfsLayoutKind;
  source: Exclude<VfsLayoutSource, "existing">;
}

interface MutableLayoutNode {
  canonicalPath: string;
  kind: VfsLayoutKind;
  exists: boolean;
  expected: boolean;
  sources: Set<VfsLayoutSource>;
  contentType?: VfsContentType;
  size?: number;
  updatedAt?: number;
}

export interface VfsLayoutEntry {
  path: string;
  canonicalPath: string;
  kind: VfsLayoutKind;
  exists: boolean;
  expected: boolean;
  sources: VfsLayoutSource[];
  readable: true;
  writable: boolean;
  readability: VfsLayoutReadability;
  permissionClass:
    | "immutable_readonly"
    | "default_editable"
    | "elevated_editable"
    | "finish_guarded";
  scope: "shared" | "fork";
  domain: "system" | "config" | "narrative" | "story" | "ops" | "runtime";
  templateId: string;
  allowedWriteOps: VfsWriteOperation[];
  updateTriggers: VfsLayoutUpdateTrigger[];
  contentType?: VfsContentType;
  size?: number;
  updatedAt?: number;
}

export interface BuildVfsLayoutReportOptions {
  rootPath?: string;
  activeForkId?: number;
  includeExpected?: boolean;
  includeDirectories?: boolean;
}

const FALLBACK_TEMPLATE_IDS = new Set([
  "template.fallback.shared",
  "template.fallback.fork",
]);

const DIRECT_WRITE_OPS = new Set<VfsWriteOperation>([
  "write",
  "json_patch",
  "json_merge",
  "move",
  "delete",
]);

const hasWildcard = (pattern: string): boolean => /[*?]/.test(pattern);

const isLikelyFilePath = (path: string): boolean => {
  const tail = path.split("/").pop() ?? "";
  return /\.[a-z0-9]+$/i.test(tail);
};

const parentDirectories = (path: string): string[] => {
  const normalized = normalizeVfsPath(path);
  if (!normalized) {
    return [];
  }

  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) {
    return [];
  }

  const dirs: string[] = [];
  let current = "";
  for (let i = 0; i < parts.length - 1; i += 1) {
    current = current ? `${current}/${parts[i]}` : parts[i];
    dirs.push(current);
  }
  return dirs;
};

const materializeTemplatePattern = (
  pattern: string,
  activeForkId: number,
): { canonicalPath: string; kind: VfsLayoutKind } | null => {
  let normalized = normalizeVfsPath(pattern);
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("forks/*/")) {
    normalized = `forks/${activeForkId}/${normalized.slice("forks/*/".length)}`;
  }

  if (normalized.includes("**")) {
    if (normalized.endsWith("/**")) {
      const directory = normalizeVfsPath(normalized.slice(0, -3));
      if (!directory || hasWildcard(directory)) {
        return null;
      }
      return { canonicalPath: directory, kind: "dir" };
    }
    return null;
  }

  if (hasWildcard(normalized)) {
    return null;
  }

  return {
    canonicalPath: normalized,
    kind: isLikelyFilePath(normalized) ? "file" : "dir",
  };
};

const toReadability = (
  permissionClass:
    | "immutable_readonly"
    | "default_editable"
    | "elevated_editable"
    | "finish_guarded",
): VfsLayoutReadability => {
  if (permissionClass === "immutable_readonly") {
    return "read_only";
  }
  if (permissionClass === "finish_guarded") {
    return "finish_guarded";
  }
  return "read_write";
};

const toUpdateTriggers = (
  allowedWriteOps: VfsWriteOperation[],
  permissionClass:
    | "immutable_readonly"
    | "default_editable"
    | "elevated_editable"
    | "finish_guarded",
): VfsLayoutUpdateTrigger[] => {
  const triggers: VfsLayoutUpdateTrigger[] = [];

  if (allowedWriteOps.includes("finish_commit")) {
    triggers.push("turn_commit");
  }
  if (allowedWriteOps.includes("finish_summary")) {
    triggers.push("summary_commit");
  }
  if (allowedWriteOps.includes("history_rewrite")) {
    triggers.push("history_rewrite");
  }
  if (allowedWriteOps.some((op) => DIRECT_WRITE_OPS.has(op))) {
    triggers.push("direct_write");
  }
  if (permissionClass === "elevated_editable") {
    triggers.push("elevated_write");
  }

  return triggers;
};

const buildExpectedPathSeeds = (activeForkId: number): ExpectedPathSeed[] => {
  const seeds: ExpectedPathSeed[] = [];

  for (const template of vfsResourceTemplateRegistry.list()) {
    if (FALLBACK_TEMPLATE_IDS.has(template.id)) {
      continue;
    }
    for (const pattern of template.patterns) {
      const materialized = materializeTemplatePattern(pattern, activeForkId);
      if (!materialized) {
        continue;
      }
      seeds.push({
        canonicalPath: materialized.canonicalPath,
        kind: materialized.kind,
        source: "resource_template",
      });
    }
  }

  for (const scaffold of DIRECTORY_SCAFFOLD_DEFINITIONS) {
    const readmeLogicalPath = `${scaffold.path}/README.md`;
    const resolved = resolveVfsPath(readmeLogicalPath, { activeForkId });
    seeds.push({
      canonicalPath: resolved.canonicalPath,
      kind: "file",
      source: "directory_scaffold",
    });
  }

  return seeds;
};

const shouldIncludeByRoot = (
  canonicalPath: string,
  rootCanonicalPath: string | null,
): boolean => {
  if (!rootCanonicalPath) {
    return true;
  }
  return (
    canonicalPath === rootCanonicalPath ||
    canonicalPath.startsWith(`${rootCanonicalPath}/`)
  );
};

const getWritableFlag = (
  permissionClass:
    | "immutable_readonly"
    | "default_editable"
    | "elevated_editable"
    | "finish_guarded",
  allowedWriteOps: VfsWriteOperation[],
): boolean => {
  if (permissionClass === "immutable_readonly") {
    return false;
  }
  return allowedWriteOps.some((op) => DIRECT_WRITE_OPS.has(op));
};

export const buildVfsLayoutReport = (
  session: VfsSession,
  options: BuildVfsLayoutReportOptions = {},
): VfsLayoutEntry[] => {
  const activeForkId = options.activeForkId ?? session.getActiveForkId();
  const includeExpected = options.includeExpected !== false;
  const includeDirectories = options.includeDirectories !== false;

  const rootCanonicalPath = (() => {
    if (!options.rootPath || options.rootPath.trim().length === 0) {
      return null;
    }
    return resolveVfsPath(options.rootPath, { activeForkId }).canonicalPath;
  })();

  const nodes = new Map<string, MutableLayoutNode>();
  const upsert = (
    canonicalPathInput: string,
    kind: VfsLayoutKind,
    patch: {
      exists?: boolean;
      expected?: boolean;
      source?: VfsLayoutSource;
      contentType?: VfsContentType;
      size?: number;
      updatedAt?: number;
    } = {},
  ) => {
    const canonicalPath = normalizeVfsPath(canonicalPathInput);
    if (!canonicalPath) {
      return;
    }

    const current = nodes.get(canonicalPath);
    const next: MutableLayoutNode = current ?? {
      canonicalPath,
      kind,
      exists: false,
      expected: false,
      sources: new Set<VfsLayoutSource>(),
    };

    if (kind === "file") {
      next.kind = "file";
    }
    if (patch.exists) {
      next.exists = true;
    }
    if (patch.expected) {
      next.expected = true;
    }
    if (patch.source) {
      next.sources.add(patch.source);
    }
    if (patch.contentType) {
      next.contentType = patch.contentType;
    }
    if (typeof patch.size === "number") {
      next.size = patch.size;
    }
    if (typeof patch.updatedAt === "number") {
      next.updatedAt = patch.updatedAt;
    }

    nodes.set(canonicalPath, next);
  };

  const snapshot = session.snapshotAllCanonical();
  for (const file of Object.values(snapshot)) {
    upsert(file.path, "file", {
      exists: true,
      source: "existing",
      contentType: file.contentType,
      size: file.size,
      updatedAt: file.updatedAt,
    });
    if (includeDirectories) {
      for (const dir of parentDirectories(file.path)) {
        upsert(dir, "dir", { exists: true, source: "existing" });
      }
    }
  }

  if (includeExpected) {
    for (const seed of buildExpectedPathSeeds(activeForkId)) {
      upsert(seed.canonicalPath, seed.kind, {
        expected: true,
        source: seed.source,
      });
      if (includeDirectories) {
        for (const dir of parentDirectories(seed.canonicalPath)) {
          upsert(dir, "dir", {
            expected: true,
            source: seed.source,
          });
        }
      }
    }
  }

  const entries = Array.from(nodes.values())
    .filter((node) =>
      shouldIncludeByRoot(node.canonicalPath, rootCanonicalPath),
    )
    .filter((node) => includeDirectories || node.kind === "file")
    .sort((a, b) => a.canonicalPath.localeCompare(b.canonicalPath))
    .map((node): VfsLayoutEntry => {
      const classification = vfsPathRegistry.classify(node.canonicalPath, {
        activeForkId,
      });
      const readable = true as const;
      const writable = getWritableFlag(
        classification.permissionClass,
        classification.allowedWriteOps,
      );

      return {
        path: toCurrentPath(node.canonicalPath, { activeForkId }),
        canonicalPath: node.canonicalPath,
        kind: node.kind,
        exists: node.exists,
        expected: node.expected,
        sources: Array.from(node.sources).sort(),
        readable,
        writable,
        readability: toReadability(classification.permissionClass),
        permissionClass: classification.permissionClass,
        scope: classification.scope,
        domain: classification.domain,
        templateId: classification.templateId,
        allowedWriteOps: [...classification.allowedWriteOps],
        updateTriggers: toUpdateTriggers(
          classification.allowedWriteOps,
          classification.permissionClass,
        ),
        contentType: node.contentType,
        size: node.size,
        updatedAt: node.updatedAt,
      };
    });

  return entries;
};
