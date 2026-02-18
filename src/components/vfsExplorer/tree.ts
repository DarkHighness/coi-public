import type { VfsFileMap } from "../../services/vfs/types";
import { normalizeVfsPath } from "../../services/vfs/utils";
import { vfsPolicyEngine } from "../../services/vfs/core/policyEngine";

export type VfsTreeNode = {
  name: string;
  path: string;
  kind: "folder" | "file";
  children?: VfsTreeNode[];
};

const stripCurrentPrefix = (path: string): string => {
  const normalized = normalizeVfsPath(path);
  if (normalized === "current") {
    return "";
  }
  if (normalized.startsWith("current/")) {
    return normalized.slice("current/".length);
  }
  return normalized;
};

type TreeMap = {
  node: VfsTreeNode;
  children: Map<string, TreeMap>;
};

const DEFAULT_DIRECTORY_PATHS = [
  "world",
  "world/characters",
  "world/characters/char:player",
  "world/locations",
  "world/quests",
  "world/knowledge",
  "world/factions",
  "world/timeline",
  "world/causal_chains",
  "custom_rules",
  "conversation",
  "conversation/turns",
  "outline",
  "outline/story_outline",
  "summary",
  "refs",
  "skills",
];

const VIEW_DIRECTORY_PATHS = [
  "quests",
  "knowledge",
  "timeline",
  "locations",
  "factions",
  "causal_chains",
] as const;

const ACTOR_PATH_PATTERN = /^world\/characters\/([^/]+)(?:\/|$)/;

const createFolderNode = (name: string, path: string): TreeMap => ({
  node: {
    name,
    path,
    kind: "folder",
    children: [],
  },
  children: new Map(),
});

const addPath = (root: TreeMap, path: string) => {
  const normalized = stripCurrentPrefix(path);
  if (!normalized) return;

  const parts = normalized.split("/").filter(Boolean);
  let current = root;
  let currentPath = "";

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
    currentPath = currentPath ? `${currentPath}/${part}` : part;

    if (isLast) {
      if (!current.children.has(part)) {
        current.children.set(part, {
          node: {
            name: part,
            path: currentPath,
            kind: "file",
          },
          children: new Map(),
        });
      }
      continue;
    }

    let next = current.children.get(part);
    if (!next) {
      next = createFolderNode(part, currentPath);
      current.children.set(part, next);
    }
    current = next;
  }
};

const addFolderPath = (root: TreeMap, path: string) => {
  const normalized = stripCurrentPrefix(path);
  if (!normalized) return;

  const parts = normalized.split("/").filter(Boolean);
  let current = root;
  let currentPath = "";

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    currentPath = currentPath ? `${currentPath}/${part}` : part;

    let next = current.children.get(part);
    if (!next) {
      next = createFolderNode(part, currentPath);
      current.children.set(part, next);
    } else if (next.node.kind === "file") {
      next = createFolderNode(part, currentPath);
      current.children.set(part, next);
    }
    current = next;
  }
};

const sortNodes = (nodes: VfsTreeNode[]): VfsTreeNode[] =>
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

const finalizeTree = (tree: TreeMap): VfsTreeNode => {
  const children = Array.from(tree.children.values()).map((entry) =>
    finalizeTree(entry),
  );
  return {
    ...tree.node,
    children: tree.node.kind === "folder" ? sortNodes(children) : undefined,
  };
};

const collectActorIdsFromFiles = (files: VfsFileMap): string[] => {
  const actorIds = new Set<string>(["char:player"]);
  for (const file of Object.values(files)) {
    const normalizedPath = stripCurrentPrefix(file.path);
    const match = ACTOR_PATH_PATTERN.exec(normalizedPath);
    if (!match?.[1]) {
      continue;
    }
    actorIds.add(match[1]);
  }
  return Array.from(actorIds).sort((a, b) => a.localeCompare(b));
};

export const buildVfsTree = (files: VfsFileMap): VfsTreeNode => {
  const root = createFolderNode("current", "");

  for (const dir of DEFAULT_DIRECTORY_PATHS) {
    addFolderPath(root, dir);
  }

  for (const actorId of collectActorIdsFromFiles(files)) {
    addFolderPath(root, `world/characters/${actorId}`);
    addFolderPath(root, `world/characters/${actorId}/views`);
    for (const viewPath of VIEW_DIRECTORY_PATHS) {
      addFolderPath(root, `world/characters/${actorId}/views/${viewPath}`);
    }
  }

  for (const file of Object.values(files)) {
    addPath(root, file.path);
  }

  return finalizeTree(root);
};

export const isReadonlyPath = (
  path: string,
  options?: { editorSessionToken?: string | null; activeForkId?: number },
): boolean => {
  const normalized = stripCurrentPrefix(path);
  if (!normalized) {
    return false;
  }

  if (options?.editorSessionToken === undefined) {
    const classification = vfsPolicyEngine.canRead(normalized, {
      actor: "ai",
      mode: "normal",
      activeForkId: options?.activeForkId,
    }).classification;
    return (
      classification.permissionClass === "immutable_readonly" ||
      classification.permissionClass === "finish_guarded"
    );
  }

  const decision = vfsPolicyEngine.canWrite(normalized, {
    actor: "user_editor",
    mode: "normal",
    editorSessionToken: options.editorSessionToken ?? null,
    allowFinishGuardedWrite: false,
    activeForkId: options?.activeForkId,
  });

  return !decision.allowed;
};
