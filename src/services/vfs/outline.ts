import type { OutlineConversationState, StoryOutline } from "@/types";
import type { VfsFileMap } from "./types";
import { VfsSession } from "./vfsSession";
import { stripCurrentPath } from "./currentAlias";
import { normalizeVfsPath } from "./utils";

interface OutlineProgressFile {
  conversation: OutlineConversationState | null;
  savedAt: number;
}

const OUTLINE_PATH = "current/outline/outline.json";
const OUTLINE_PROGRESS_PATH = "current/outline/progress.json";
const OUTLINE_STORY_PLAN_PATH = "current/outline/story_outline/plan.md";

const resolveRelativePath = (path: string): string =>
  normalizeVfsPath(stripCurrentPath(path));

const findFile = (files: VfsFileMap, path: string) => {
  const normalized = normalizeVfsPath(path);
  const relative = resolveRelativePath(path);
  const candidates = new Set<string>([relative, normalized]);
  if (normalized.startsWith("current/")) {
    candidates.add(normalizeVfsPath(stripCurrentPath(normalized)));
  } else {
    candidates.add(normalizeVfsPath(`current/${normalized}`));
  }

  for (const candidate of candidates) {
    const file = files[candidate];
    if (file) return file;
  }
  return null;
};

const parseJson = <T>(files: VfsFileMap, path: string): T | null => {
  const file = findFile(files, path);
  if (!file || file.contentType !== "application/json") {
    return null;
  }
  try {
    return JSON.parse(file.content) as T;
  } catch (error) {
    console.warn(`[VFS] Failed to parse JSON for ${file.path}`, error);
    return null;
  }
};

export const writeOutlineFile = (
  session: VfsSession,
  outline: StoryOutline,
): void => {
  session.writeFile(
    resolveRelativePath(OUTLINE_PATH),
    JSON.stringify(outline),
    "application/json",
  );
};

export const readOutlineFile = (files: VfsFileMap): StoryOutline | null =>
  parseJson<StoryOutline>(files, OUTLINE_PATH);

export const writeOutlineStoryPlan = (
  session: VfsSession,
  storyPlanMarkdown: string,
): void => {
  session.writeFile(
    resolveRelativePath(OUTLINE_STORY_PLAN_PATH),
    storyPlanMarkdown,
    "text/markdown",
  );
};

export const readOutlineStoryPlan = (files: VfsFileMap): string | null => {
  const file = findFile(files, OUTLINE_STORY_PLAN_PATH);
  if (!file) return null;
  return file.content;
};

export const shouldRestartOutlineFromPhase1 = (
  conversation: OutlineConversationState | null | undefined,
  expectedSchemaVersion: number,
): boolean =>
  Boolean(
    conversation &&
    Number(conversation.phaseSchemaVersion ?? -1) !== expectedSchemaVersion,
  );

export const writeOutlineProgress = (
  session: VfsSession,
  conversation: OutlineConversationState | null,
): void => {
  const payload: OutlineProgressFile = {
    conversation,
    savedAt: Date.now(),
  };
  session.writeFile(
    resolveRelativePath(OUTLINE_PROGRESS_PATH),
    JSON.stringify(payload),
    "application/json",
  );
};

export const readOutlineProgress = (
  files: VfsFileMap,
): OutlineConversationState | null => {
  const payload = parseJson<OutlineProgressFile | OutlineConversationState>(
    files,
    OUTLINE_PROGRESS_PATH,
  );
  if (!payload) return null;
  if ("conversation" in payload) {
    return payload.conversation ?? null;
  }
  return payload;
};

export const clearOutlineProgress = (session: VfsSession): void => {
  const path = resolveRelativePath(OUTLINE_PROGRESS_PATH);
  if (session.readFile(path)) {
    session.deleteFile(path);
  }
};
