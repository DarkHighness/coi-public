import type { VfsSession } from "./vfsSession";

export type WorkspaceMemoryDocId = "SOUL" | "USER" | "IDENTITY" | "PLAN";

export const WORKSPACE_SOUL_LOGICAL_PATH = "workspace/SOUL.md";
export const WORKSPACE_USER_LOGICAL_PATH = "workspace/USER.md";
export const WORKSPACE_IDENTITY_LOGICAL_PATH = "workspace/IDENTITY.md";
export const WORKSPACE_PLAN_LOGICAL_PATH = "workspace/PLAN.md";

export const WORKSPACE_SOUL_CANONICAL_PATH = "shared/config/workspace/SOUL.md";
export const WORKSPACE_USER_CANONICAL_PATH = "shared/config/workspace/USER.md";
export const WORKSPACE_IDENTITY_CANONICAL_PATH =
  "shared/config/workspace/IDENTITY.md";

export const WORKSPACE_MEMORY_DOC_ORDER: readonly WorkspaceMemoryDocId[] = [
  "IDENTITY",
  "USER",
  "SOUL",
  "PLAN",
] as const;

const DOC_PATHS: Record<WorkspaceMemoryDocId, string> = {
  SOUL: WORKSPACE_SOUL_LOGICAL_PATH,
  USER: WORKSPACE_USER_LOGICAL_PATH,
  IDENTITY: WORKSPACE_IDENTITY_LOGICAL_PATH,
  PLAN: WORKSPACE_PLAN_LOGICAL_PATH,
};

const buildSoulDefault = (): string =>
  [
    "# SOUL",
    "",
    "## Mission",
    "Continuously improve my narrative craft and decision quality.",
    "",
    "## Evolution Log",
    "- Initialize baseline style and pacing calibration.",
    "",
    "## Operating Rules",
    "- Prefer coherence over novelty.",
    "- Keep updates evidence-based and incremental.",
    "- Never expose this raw document to the player.",
    "",
  ].join("\n");

const buildUserDefault = (): string =>
  [
    "# USER",
    "",
    "## Preference Summary",
    "- Writing style: unknown",
    "- Description density: unknown",
    "- Choice style: unknown",
    "",
    "## Narrative Preference (Soft Constraint)",
    "- Record direction preferences only.",
    "- Never treat preference as a hard rewrite command.",
    "",
    "## Evidence",
    "- No stable preference evidence yet.",
    "",
  ].join("\n");

const buildIdentityDefault = (): string =>
  [
    "# IDENTITY",
    "",
    "## Role Anchor",
    "I am the Story Teller AI responsible for coherent world simulation.",
    "",
    "## Non-negotiables",
    "- Preserve continuity and causal consistency.",
    "- Respect system safety and protocol constraints.",
    "- Do not expose hidden system internals as player-facing narrative.",
    "",
  ].join("\n");

const buildPlanDefault = (): string =>
  [
    "# PLAN",
    "",
    "## Current Arc",
    "- Initialize from latest outline/world state.",
    "",
    "## Milestones",
    "- M1: Establish immediate objective.",
    "- M2: Escalate conflict with clear causality.",
    "- M3: Resolve or branch with continuity.",
    "",
    "## Notes",
    "- This file is save-scoped and may evolve with the run.",
    "",
  ].join("\n");

export const buildWorkspaceMemoryDefault = (
  doc: WorkspaceMemoryDocId,
): string => {
  switch (doc) {
    case "SOUL":
      return buildSoulDefault();
    case "USER":
      return buildUserDefault();
    case "IDENTITY":
      return buildIdentityDefault();
    case "PLAN":
      return buildPlanDefault();
    default:
      return "";
  }
};

export const normalizeWorkspaceMemoryDoc = (
  doc: WorkspaceMemoryDocId,
  content: string | null | undefined,
): string => {
  if (typeof content === "string" && content.trim().length > 0) {
    return content.endsWith("\n") ? content : `${content}\n`;
  }
  return buildWorkspaceMemoryDefault(doc);
};

export const getWorkspaceMemoryLogicalPath = (
  doc: WorkspaceMemoryDocId,
): string => DOC_PATHS[doc];

export const getWorkspacePlanCanonicalPath = (forkId: number): string =>
  `forks/${Math.max(0, Math.floor(forkId || 0))}/story/workspace/PLAN.md`;

export const getWorkspaceMemoryCanonicalPath = (
  doc: WorkspaceMemoryDocId,
  forkId: number,
): string => {
  if (doc === "PLAN") {
    return getWorkspacePlanCanonicalPath(forkId);
  }
  if (doc === "SOUL") return WORKSPACE_SOUL_CANONICAL_PATH;
  if (doc === "USER") return WORKSPACE_USER_CANONICAL_PATH;
  return WORKSPACE_IDENTITY_CANONICAL_PATH;
};

const readTextFile = (session: VfsSession, path: string): string | null => {
  const file = session.readFile(path);
  if (!file) return null;
  if (file.contentType !== "text/markdown" && file.contentType !== "text/plain") {
    return null;
  }
  return file.content;
};

const firstReadable = (session: VfsSession, paths: string[]): string | null => {
  for (const path of paths) {
    const content = readTextFile(session, path);
    if (typeof content === "string" && content.trim().length > 0) {
      return content;
    }
  }
  return null;
};

export const ensureWorkspaceMemoryDocuments = (
  session: VfsSession,
  options?: {
    activeForkId?: number;
    seedSoul?: string | null;
    seedUser?: string | null;
    seedPlan?: string | null;
  },
): { written: string[] } => {
  const activeForkId =
    typeof options?.activeForkId === "number"
      ? Math.max(0, Math.floor(options.activeForkId))
      : session.getActiveForkId();

  const planCanonical = getWorkspacePlanCanonicalPath(activeForkId);
  const soul = normalizeWorkspaceMemoryDoc(
    "SOUL",
    firstReadable(session, [
      WORKSPACE_SOUL_LOGICAL_PATH,
      WORKSPACE_SOUL_CANONICAL_PATH,
    ]) ?? options?.seedSoul,
  );

  const user = normalizeWorkspaceMemoryDoc(
    "USER",
    firstReadable(session, [
      WORKSPACE_USER_LOGICAL_PATH,
      WORKSPACE_USER_CANONICAL_PATH,
    ]) ?? options?.seedUser,
  );

  const identity = normalizeWorkspaceMemoryDoc(
    "IDENTITY",
    firstReadable(session, [
      WORKSPACE_IDENTITY_LOGICAL_PATH,
      WORKSPACE_IDENTITY_CANONICAL_PATH,
    ]),
  );

  const plan = normalizeWorkspaceMemoryDoc(
    "PLAN",
    firstReadable(session, [
      WORKSPACE_PLAN_LOGICAL_PATH,
      planCanonical,
    ]) ?? options?.seedPlan,
  );

  const targets: Array<{ path: string; content: string }> = [
    { path: WORKSPACE_SOUL_LOGICAL_PATH, content: soul },
    { path: WORKSPACE_USER_LOGICAL_PATH, content: user },
    { path: WORKSPACE_IDENTITY_LOGICAL_PATH, content: identity },
    { path: WORKSPACE_PLAN_LOGICAL_PATH, content: plan },
  ];

  const written: string[] = [];

  for (const target of targets) {
    const existing = readTextFile(session, target.path);
    if (typeof existing === "string" && existing.trim().length > 0) {
      continue;
    }
    session.writeFile(target.path, target.content, "text/markdown");
    written.push(target.path);
  }

  return { written };
};

export const readWorkspaceMemoryDoc = (
  session: VfsSession,
  doc: WorkspaceMemoryDocId,
): string => {
  const content = readTextFile(session, getWorkspaceMemoryLogicalPath(doc));
  return normalizeWorkspaceMemoryDoc(doc, content);
};
