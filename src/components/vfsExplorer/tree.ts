import type { VfsFileMap } from "../../services/vfs/types";
import { normalizeVfsPath } from "../../services/vfs/utils";

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
  "world/custom_rules",
  "conversation",
  "conversation/turns",
  "outline",
  "summary",
  "refs",
  "skills",
];

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

export const buildVfsTree = (files: VfsFileMap): VfsTreeNode => {
  const root = createFolderNode("current", "");

  for (const dir of DEFAULT_DIRECTORY_PATHS) {
    addFolderPath(root, dir);
  }

  for (const file of Object.values(files)) {
    addPath(root, file.path);
  }

  return finalizeTree(root);
};

export const isReadonlyPath = (path: string): boolean => {
  const normalized = stripCurrentPrefix(path);

  if (normalized === "skills" || normalized.startsWith("skills/")) {
    return true;
  }

  if (normalized.startsWith("conversation/")) {
    return true;
  }

  if (normalized === "outline/progress.json") {
    return true;
  }

  if (normalized === "summary/state.json") {
    return true;
  }

  return false;
};
