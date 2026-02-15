import {
  DEFAULT_STARTUP_ANCHORS,
  isBroadReferencePath,
  isSkillReferencePath,
  parseSessionReferencesMarkdown,
  type SessionReferencesMarkdownParseResult,
} from "./sessionReferencesMarkdown";
import { normalizeVfsPath } from "@/services/vfs/utils";

export type SessionStartupMode = "turn" | "sudo" | "cleanup" | "player-rate";

export interface SessionStartupProfile {
  mode: SessionStartupMode;
  hotStartReferencesMarkdown: string;
  recommendedReadPaths: string[];
  preloadReadPaths: string[];
  warnings: string[];
  usedFallback: boolean;
  metrics: {
    candidateCount: number;
    validCount: number;
    droppedCount: number;
    fallbackRefsUsed: number;
    overwide: boolean;
  };
  parsed: SessionReferencesMarkdownParseResult;
}

const KNOWN_RELATIVE_PREFIXES = [
  "skills/",
  "conversation/",
  "world/",
  "summary/",
] as const;

const normalizeInputPath = (path: string): string | null => {
  const trimmed = path.trim();
  if (!trimmed) return null;

  const normalized = normalizeVfsPath(trimmed.replace(/^\/+/, "").replace(/\\+/g, "/"));
  if (!normalized) return null;

  if (
    normalized.startsWith("current/") ||
    normalized.startsWith("shared/") ||
    normalized.startsWith("forks/")
  ) {
    return normalized;
  }

  for (const prefix of KNOWN_RELATIVE_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      return `current/${normalized}`;
    }
  }

  return null;
};

const dedupePaths = (paths: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const path of paths) {
    if (typeof path !== "string") continue;
    const normalized = normalizeInputPath(path);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
};

const pickOptionalRefs = (
  parsed: SessionReferencesMarkdownParseResult,
  maxOptionalRefs: number,
): string[] => {
  const specificSkillRefs = parsed.skillRefs.filter(
    (path) => !isBroadReferencePath(path),
  );
  const broadRefs = parsed.validRefs.filter((path) => isBroadReferencePath(path));

  const anchors = parsed.anchorRefs.filter(
    (path) =>
      !parsed.skillRefs.includes(path) &&
      !isBroadReferencePath(path),
  );

  const others = parsed.validRefs.filter(
    (path) =>
      !specificSkillRefs.includes(path) &&
      !anchors.includes(path) &&
      !broadRefs.includes(path),
  );

  const ordered: string[] = [
    ...specificSkillRefs,
    ...anchors,
    ...(specificSkillRefs.length === 0 ? broadRefs : []),
    ...others,
  ];

  return dedupePaths(ordered).slice(0, maxOptionalRefs);
};

export function buildSessionStartupProfile(input: {
  mode: SessionStartupMode;
  latestSummaryReferencesMarkdown?: string | null;
  mandatoryReadPaths?: string[];
  maxOptionalRefs?: number;
  maxParsedRefs?: number;
  fallbackReadPaths?: string[];
}): SessionStartupProfile {
  const mode = input.mode;
  const maxOptionalRefs = Math.max(1, input.maxOptionalRefs ?? 3);
  const parsed = parseSessionReferencesMarkdown(
    input.latestSummaryReferencesMarkdown,
    {
      maxRefs: Math.max(maxOptionalRefs + 3, input.maxParsedRefs ?? 8),
    },
  );

  const mandatoryReadPaths = dedupePaths(input.mandatoryReadPaths ?? []);
  const fallbackReadPaths = dedupePaths(
    (input.fallbackReadPaths ?? [...DEFAULT_STARTUP_ANCHORS]).slice(0, 2),
  );

  const optionalFromHandoff = pickOptionalRefs(parsed, maxOptionalRefs);

  const shouldFallback = parsed.validRefs.length === 0 || parsed.isOverwide;
  const optionalReadPaths = shouldFallback
    ? fallbackReadPaths
    : optionalFromHandoff;

  const usedFallback = shouldFallback && optionalReadPaths.length > 0;
  const warnings = [...parsed.warnings];

  if (usedFallback) {
    warnings.push(
      `Using narrow runtime fallback refs: ${optionalReadPaths.join(", ")}`,
    );
  }

  const recommendedReadPaths = dedupePaths([
    ...optionalReadPaths.filter((path) => isSkillReferencePath(path)),
    ...optionalReadPaths,
  ]);

  const preloadReadPaths = dedupePaths([
    ...mandatoryReadPaths,
    ...optionalReadPaths,
  ]);

  return {
    mode,
    hotStartReferencesMarkdown:
      typeof input.latestSummaryReferencesMarkdown === "string"
        ? input.latestSummaryReferencesMarkdown.trim()
        : "",
    recommendedReadPaths,
    preloadReadPaths,
    warnings,
    usedFallback,
    metrics: {
      candidateCount: parsed.candidateCount,
      validCount: parsed.validRefs.length,
      droppedCount: parsed.droppedRefs.length,
      fallbackRefsUsed: usedFallback ? optionalReadPaths.length : 0,
      overwide: parsed.isOverwide,
    },
    parsed,
  };
}
