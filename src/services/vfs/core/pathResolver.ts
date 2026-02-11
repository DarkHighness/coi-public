import { normalizeVfsPath } from "../utils";
import type { VfsResolvedPath } from "./types";

export interface VfsPathResolveOptions {
  activeForkId?: number;
}

export interface VfsLogicalPathOptions {
  activeForkId?: number;
  looseFork?: boolean;
}

const CURRENT_ROOT = "current";
const SHARED_ROOT = "shared";
const FORKS_ROOT = "forks";

const normalizeForkId = (forkId?: number): number => {
  if (!Number.isFinite(forkId) || (forkId ?? 0) < 0) {
    return 0;
  }
  return Math.floor(forkId ?? 0);
};

const startsWithSegment = (value: string, prefix: string): boolean =>
  value === prefix || value.startsWith(`${prefix}/`);

const withSharedPrefix = (suffix: string): string =>
  normalizeVfsPath(`${SHARED_ROOT}/${suffix}`);

const withForkPrefix = (forkId: number, suffix: string): string =>
  normalizeVfsPath(`${FORKS_ROOT}/${forkId}/${suffix}`);

const mapLogicalToCanonical = (logicalPath: string, forkId: number): string => {
  const logical = normalizeVfsPath(logicalPath);

  if (!logical) {
    return withForkPrefix(forkId, "story");
  }

  if (startsWithSegment(logical, "skills")) {
    return withSharedPrefix(`system/${logical}`);
  }

  if (startsWithSegment(logical, "refs")) {
    return withSharedPrefix(`system/${logical}`);
  }

  if (startsWithSegment(logical, "custom_rules")) {
    return withSharedPrefix(`config/${logical}`);
  }

  if (logical === "world/theme_config.json") {
    return withSharedPrefix("config/theme/theme_config.json");
  }

  if (logical === "world/runtime/custom_rules_ack_state.json") {
    return withSharedPrefix("config/runtime/custom_rules_ack_state.json");
  }

  if (logical === "conversation/index.json") {
    return withSharedPrefix("narrative/conversation/index.json");
  }

  if (logical === "conversation/fork_tree.json") {
    return withSharedPrefix("narrative/conversation/fork_tree.json");
  }

  if (startsWithSegment(logical, "conversation/history_rewrites")) {
    const suffix = logical.slice("conversation/history_rewrites".length).replace(/^\//, "");
    return withForkPrefix(
      forkId,
      suffix ? `ops/history_rewrites/${suffix}` : "ops/history_rewrites",
    );
  }

  if (startsWithSegment(logical, "conversation")) {
    return withForkPrefix(forkId, `story/${logical}`);
  }

  if (logical === "summary/state.json") {
    return withForkPrefix(forkId, "story/summary/state.json");
  }

  if (startsWithSegment(logical, "outline")) {
    return withSharedPrefix(`narrative/${logical}`);
  }

  if (startsWithSegment(logical, "world")) {
    return withForkPrefix(forkId, `story/${logical}`);
  }

  if (startsWithSegment(logical, "runtime")) {
    return withForkPrefix(forkId, logical);
  }

  return withForkPrefix(forkId, `runtime/${logical}`);
};

const mapCanonicalToLogical = (
  canonicalPath: string,
  options?: VfsLogicalPathOptions,
): string => {
  const canonical = normalizeVfsPath(canonicalPath);
  const activeForkId = normalizeForkId(options?.activeForkId);
  const looseFork = options?.looseFork === true;

  if (!canonical) {
    return "";
  }

  if (startsWithSegment(canonical, "shared/system/skills")) {
    return canonical.slice("shared/system/".length);
  }

  if (startsWithSegment(canonical, "shared/system/refs")) {
    return canonical.slice("shared/system/".length);
  }

  if (startsWithSegment(canonical, "shared/config/custom_rules")) {
    return canonical.slice("shared/config/".length);
  }

  if (canonical === "shared/config/theme/theme_config.json") {
    return "world/theme_config.json";
  }

  if (canonical === "shared/config/runtime/custom_rules_ack_state.json") {
    return "world/runtime/custom_rules_ack_state.json";
  }

  if (canonical === "shared/narrative/outline") {
    return "outline";
  }

  if (startsWithSegment(canonical, "shared/narrative/outline")) {
    return canonical.slice("shared/narrative/".length);
  }

  if (canonical === "shared/narrative/conversation/index.json") {
    return "conversation/index.json";
  }

  if (canonical === "shared/narrative/conversation/fork_tree.json") {
    return "conversation/fork_tree.json";
  }

  const forkMatch = /^forks\/(\d+)\/(.+)$/.exec(canonical);
  if (!forkMatch) {
    return canonical;
  }

  const forkId = Number.parseInt(forkMatch[1] ?? "0", 10);
  const rest = forkMatch[2] ?? "";

  if (startsWithSegment(rest, "ops/history_rewrites")) {
    if (!looseFork && forkId !== activeForkId) {
      return canonical;
    }
    const suffix = rest.slice("ops/history_rewrites".length).replace(/^\//, "");
    return suffix
      ? `conversation/history_rewrites/${suffix}`
      : "conversation/history_rewrites";
  }

  if (startsWithSegment(rest, "story/conversation")) {
    return rest.slice("story/".length);
  }

  if (rest === "story/summary/state.json") {
    if (!looseFork && forkId !== activeForkId) {
      return canonical;
    }
    return "summary/state.json";
  }

  if (startsWithSegment(rest, "story/world")) {
    if (!looseFork && forkId !== activeForkId) {
      return canonical;
    }
    return rest.slice("story/".length);
  }

  if (startsWithSegment(rest, "runtime")) {
    if (!looseFork && forkId !== activeForkId) {
      return canonical;
    }
    return rest.slice("runtime/".length);
  }

  return canonical;
};

const normalizeInputPath = (path: string): string =>
  normalizeVfsPath(path || CURRENT_ROOT);

export const resolveVfsPath = (
  path: string,
  options?: VfsPathResolveOptions,
): VfsResolvedPath => {
  const activeForkId = normalizeForkId(options?.activeForkId);
  const normalizedInputPath = normalizeInputPath(path);

  if (normalizedInputPath === CURRENT_ROOT) {
    return {
      inputPath: path,
      normalizedInputPath,
      canonicalPath: withForkPrefix(activeForkId, "story"),
      logicalPath: "",
      displayPath: CURRENT_ROOT,
      mountKind: "alias_current",
      activeForkId,
    };
  }

  if (startsWithSegment(normalizedInputPath, CURRENT_ROOT)) {
    const logicalPath = normalizedInputPath.slice(CURRENT_ROOT.length + 1);
    const canonicalPath = mapLogicalToCanonical(logicalPath, activeForkId);
    return {
      inputPath: path,
      normalizedInputPath,
      canonicalPath,
      logicalPath,
      displayPath: `current/${logicalPath}`,
      mountKind: "alias_current",
      activeForkId,
    };
  }

  if (
    startsWithSegment(normalizedInputPath, SHARED_ROOT) ||
    startsWithSegment(normalizedInputPath, FORKS_ROOT)
  ) {
    const logicalPath = mapCanonicalToLogical(normalizedInputPath, {
      activeForkId,
    });
    return {
      inputPath: path,
      normalizedInputPath,
      canonicalPath: normalizedInputPath,
      logicalPath,
      displayPath: logicalPath ? `current/${logicalPath}` : CURRENT_ROOT,
      mountKind: "canonical",
      activeForkId,
    };
  }

  const logicalPath = normalizedInputPath;
  const canonicalPath = mapLogicalToCanonical(logicalPath, activeForkId);
  return {
    inputPath: path,
    normalizedInputPath,
    canonicalPath,
    logicalPath,
    displayPath: `current/${logicalPath}`,
    mountKind: "alias_current",
    activeForkId,
  };
};

export const toCanonicalVfsPath = (
  path: string,
  options?: VfsPathResolveOptions,
): string => resolveVfsPath(path, options).canonicalPath;

export const toLogicalVfsPath = (
  path: string,
  options?: VfsPathResolveOptions,
): string => resolveVfsPath(path, options).logicalPath;

export const toCurrentDisplayPath = (
  path: string,
  options?: VfsPathResolveOptions,
): string => resolveVfsPath(path, options).displayPath;

export const canonicalToLogicalVfsPath = (
  canonicalPath: string,
  options?: VfsLogicalPathOptions,
): string => mapCanonicalToLogical(canonicalPath, options);
