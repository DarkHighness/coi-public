import type { GameState } from "@/types";
import { normalizeVfsPath } from "@/services/vfs/utils";

const PATH_TOKEN_RE =
  /(?:^|[\s(])((?:current|shared|forks|skills|conversation|world|summary)\/[A-Za-z0-9._\-/]+(?:\.[A-Za-z0-9]+)?)/g;
const MARKDOWN_LINK_RE = /\[[^\]]+\]\(([^)]+)\)/g;
const INLINE_CODE_RE = /`([^`]+)`/g;
const LIST_ITEM_RE = /^\s*[-*+]\s+(.*)$/;

const KNOWN_RELATIVE_PREFIXES = [
  "skills/",
  "conversation/",
  "world/",
  "summary/",
] as const;

const BROAD_REFERENCE_SET = new Set(["current/skills/index.json"]);

export const DEFAULT_STARTUP_ANCHORS = [
  "current/conversation/session.jsonl",
] as const;

export interface SessionReferencesMarkdownParseResult {
  rawMarkdown: string;
  candidateCount: number;
  validRefs: string[];
  droppedRefs: string[];
  warnings: string[];
  skillRefs: string[];
  anchorRefs: string[];
  broadRefs: string[];
  isOverwide: boolean;
}

const stripEnclosure = (value: string): string =>
  value
    .trim()
    .replace(/^[-*+\d\.)\s]+/, "")
    .replace(/^[`'"([{<]+/, "")
    .replace(/[`'"\])}>.,;:!?]+$/, "")
    .trim();

const toCurrentPath = (candidate: string): string | null => {
  const normalizedRaw = normalizeVfsPath(candidate.trim().replace(/\\+/g, "/"));
  if (!normalizedRaw) return null;

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(normalizedRaw)) {
    return null;
  }

  if (/\s/.test(normalizedRaw)) {
    return null;
  }

  if (normalizedRaw.includes("*") || normalizedRaw.includes("<") || normalizedRaw.includes(">")) {
    return null;
  }

  if (
    normalizedRaw.startsWith("current/") ||
    normalizedRaw.startsWith("shared/") ||
    normalizedRaw.startsWith("forks/")
  ) {
    return normalizedRaw;
  }

  for (const prefix of KNOWN_RELATIVE_PREFIXES) {
    if (normalizedRaw.startsWith(prefix)) {
      return `current/${normalizedRaw}`;
    }
  }

  return null;
};

const collectPathTokens = (text: string): string[] => {
  if (!text) return [];
  const out: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = PATH_TOKEN_RE.exec(text)) !== null) {
    if (match[1]) {
      out.push(match[1]);
    }
  }
  return out;
};

const extractCandidatesFromMarkdown = (markdown: string): string[] => {
  const candidates: string[] = [];

  const pushNormalized = (raw: string) => {
    const stripped = stripEnclosure(raw);
    if (!stripped) return;
    candidates.push(stripped);
  };

  let match: RegExpExecArray | null = null;
  while ((match = MARKDOWN_LINK_RE.exec(markdown)) !== null) {
    if (match[1]) {
      pushNormalized(match[1]);
    }
  }

  while ((match = INLINE_CODE_RE.exec(markdown)) !== null) {
    if (match[1]) {
      pushNormalized(match[1]);
    }
  }

  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const listMatch = trimmed.match(LIST_ITEM_RE);
    if (listMatch?.[1]) {
      pushNormalized(listMatch[1]);
      for (const token of collectPathTokens(listMatch[1])) {
        pushNormalized(token);
      }
      continue;
    }

    for (const token of collectPathTokens(trimmed)) {
      pushNormalized(token);
    }
  }

  return candidates;
};

export const isSkillReferencePath = (path: string): boolean =>
  /^current\/skills\/.+\/SKILL\.md$/i.test(path);

export const isAnchorReferencePath = (path: string): boolean =>
  path === "current/conversation/session.jsonl" ||
  path === "current/conversation/index.json" ||
  path === "current/world/soul.md" ||
  path === "current/world/global/soul.md" ||
  path === "current/summary/state.json";

export const isBroadReferencePath = (path: string): boolean =>
  BROAD_REFERENCE_SET.has(path);

export function getLatestSummaryReferencesMarkdown(
  gameState: GameState,
): string | null {
  const summaries = gameState.summaries;

  if (!Array.isArray(summaries) || summaries.length === 0) {
    return null;
  }

  const latest = summaries[summaries.length - 1];
  const markdown = latest?.nextSessionReferencesMarkdown;
  if (typeof markdown !== "string") {
    return null;
  }

  const trimmed = markdown.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseSessionReferencesMarkdown(
  markdown: string | null | undefined,
  options?: {
    maxRefs?: number;
  },
): SessionReferencesMarkdownParseResult {
  const rawMarkdown = typeof markdown === "string" ? markdown : "";
  const text = rawMarkdown.trim();
  const maxRefs = Math.max(1, options?.maxRefs ?? 8);

  if (!text) {
    return {
      rawMarkdown,
      candidateCount: 0,
      validRefs: [],
      droppedRefs: [],
      warnings: [],
      skillRefs: [],
      anchorRefs: [],
      broadRefs: [],
      isOverwide: false,
    };
  }

  const candidates = extractCandidatesFromMarkdown(text);
  const dedupedValid: string[] = [];
  const dedupedDropped: string[] = [];
  const seenValid = new Set<string>();
  const seenDropped = new Set<string>();

  for (const candidate of candidates) {
    const normalized = toCurrentPath(candidate);
    if (!normalized) {
      if (!seenDropped.has(candidate)) {
        seenDropped.add(candidate);
        dedupedDropped.push(candidate);
      }
      continue;
    }

    if (!seenValid.has(normalized)) {
      seenValid.add(normalized);
      dedupedValid.push(normalized);
    }
  }

  const skillRefs = dedupedValid.filter((path) => isSkillReferencePath(path));
  const anchorRefs = dedupedValid.filter((path) => isAnchorReferencePath(path));
  const broadRefs = dedupedValid.filter((path) => isBroadReferencePath(path));

  const warnings: string[] = [];
  if (dedupedValid.length === 0) {
    warnings.push(
      "No usable VFS paths were parsed from nextSessionReferencesMarkdown.",
    );
  }
  if (dedupedDropped.length > 0) {
    warnings.push(
      `Dropped ${dedupedDropped.length} unparseable reference entr${dedupedDropped.length === 1 ? "y" : "ies"}.`,
    );
  }
  if (broadRefs.length > 0) {
    warnings.push(
      "Handoff contains broad catalog paths (for example current/skills/index.json).",
    );
  }

  const isOverwide = dedupedValid.length > maxRefs;
  if (isOverwide) {
    warnings.push(
      `Handoff contains ${dedupedValid.length} refs (max ${maxRefs}); runtime will use narrow fallback refs.`,
    );
  }

  return {
    rawMarkdown,
    candidateCount: candidates.length,
    validRefs: dedupedValid,
    droppedRefs: dedupedDropped,
    warnings,
    skillRefs,
    anchorRefs,
    broadRefs,
    isOverwide,
  };
}
