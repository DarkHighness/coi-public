/**
 * VFS Tool Handlers
 */

import {
  VFS_LS_TOOL,
  VFS_READ_TOOL,
  VFS_READ_MANY_TOOL,
  VFS_SEARCH_TOOL,
  VFS_GREP_TOOL,
  VFS_WRITE_TOOL,
  VFS_EDIT_TOOL,
  VFS_MERGE_TOOL,
  VFS_MOVE_TOOL,
  VFS_DELETE_TOOL,
  VFS_COMMIT_TURN_TOOL,
  VFS_TX_TOOL,
  getTypedArgs,
} from "../../tools";
import {
  createError,
  createSuccess,
  type ToolCallResult,
} from "../toolResult";
import type { VfsFileMap } from "../../vfs/types";
import { stripCurrentPath, toCurrentPath } from "../../vfs/currentAlias";
import { normalizeVfsPath } from "../../vfs/utils";
import { VfsSession } from "../../vfs/vfsSession";
import Fuse from "fuse.js";
import { getRAGService } from "../../rag";
import {
  buildTurnId,
  type ConversationIndex,
  readConversationIndex,
  readTurnFile,
  writeConversationIndex,
  writeTurnFile,
} from "../../vfs/conversation";
import { registerToolHandler, type ToolContext } from "../toolHandlerRegistry";

interface VfsMatch {
  path: string;
  line: number;
  text: string;
}

interface FuseMatch extends VfsMatch {
  scopePath: string;
}

const cloneSession = (session: VfsSession): VfsSession => {
  const clone = new VfsSession();
  clone.restore(session.snapshot());
  return clone;
};

const commitSession = (target: VfsSession, source: VfsSession): void => {
  target.restore(source.snapshot());
};

const getSession = (ctx: ToolContext): VfsSession | null => {
  return ctx.vfsSession ?? null;
};

const TURN_ID_PATTERN = /^conversation\/turns\/fork-(\d+)\/turn-(\d+)\.json$/;

const deriveConversationIndexFromSnapshot = (
  snapshot: VfsFileMap,
): { index: ConversationIndex } => {
  const turnsByFork = new Map<number, number[]>();

  for (const file of Object.values(snapshot)) {
    const match = TURN_ID_PATTERN.exec(normalizeVfsPath(file.path));
    if (!match) {
      continue;
    }
    const forkId = Number(match[1]);
    const turnNumber = Number(match[2]);
    if (!Number.isFinite(forkId) || !Number.isFinite(turnNumber)) {
      continue;
    }
    const turns = turnsByFork.get(forkId) ?? [];
    turns.push(turnNumber);
    turnsByFork.set(forkId, turns);
  }

  if (turnsByFork.size === 0) {
    return {
      index: {
        activeForkId: 0,
        activeTurnId: "fork-0/turn-0",
        rootTurnIdByFork: { "0": "fork-0/turn-0" },
        latestTurnNumberByFork: { "0": 0 },
        turnOrderByFork: { "0": ["fork-0/turn-0"] },
      },
    };
  }

  const forkIds = Array.from(turnsByFork.keys()).sort((a, b) => a - b);
  const activeForkId = forkIds[0];

  const rootTurnIdByFork: Record<string, string> = {};
  const latestTurnNumberByFork: Record<string, number> = {};
  const turnOrderByFork: Record<string, string[]> = {};

  for (const forkId of forkIds) {
    const turns = turnsByFork.get(forkId) ?? [];
    turns.sort((a, b) => a - b);
    const forkKey = String(forkId);
    const order = turns.map((turn) => buildTurnId(forkId, turn));
    turnOrderByFork[forkKey] = order;
    rootTurnIdByFork[forkKey] = order[0];
    latestTurnNumberByFork[forkKey] = turns[turns.length - 1];
  }

  const activeForkKey = String(activeForkId);
  const activeOrder = turnOrderByFork[activeForkKey] ?? [];
  const activeTurnId =
    activeOrder.length > 0 ? activeOrder[activeOrder.length - 1] : "fork-0/turn-0";

  return {
    index: {
      activeForkId,
      activeTurnId,
      rootTurnIdByFork,
      latestTurnNumberByFork,
      turnOrderByFork,
    },
  };
};

const ensureConversationIndex = (
  draft: VfsSession,
): ConversationIndex => {
  const snapshot = draft.snapshot();
  const existing = readConversationIndex(snapshot);
  if (existing) {
    return existing;
  }

  const { index } = deriveConversationIndexFromSnapshot(snapshot);
  writeConversationIndex(draft, index);

  // Ensure the active turn file exists (best-effort). This keeps downstream
  // consumers robust when migrating from older snapshots.
  const match = /fork-(\d+)\/turn-(\d+)/.exec(index.activeTurnId);
  if (match) {
    const forkId = Number(match[1]);
    const turnNumber = Number(match[2]);
    const existingTurn = readTurnFile(snapshot, forkId, turnNumber);
    if (!existingTurn) {
      writeTurnFile(draft, forkId, turnNumber, {
        turnId: index.activeTurnId,
        forkId,
        turnNumber,
        parentTurnId: null,
        createdAt: Date.now(),
        userAction: "",
        assistant: { narrative: "", choices: [] },
      });
    }
  }

  return index;
};

const resolveCurrentPath = (
  path?: string,
): { ok: true; path: string } | { ok: false; error: ToolCallResult } => {
  try {
    return { ok: true, path: stripCurrentPath(path ?? "current") };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: createError(message, "INVALID_DATA") };
  }
};

const withAtomicSession = <T>(
  ctx: ToolContext,
  action: (draft: VfsSession) => ToolCallResult<T>,
): ToolCallResult<T> => {
  const session = getSession(ctx);
  if (!session) {
    return createError("VFS session is not available", "INVALID_DATA");
  }

  const draft = cloneSession(session);

  try {
    const result = action(draft);
    if (!result.success) {
      return result;
    }
    commitSession(session, draft);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createError(message, "UNKNOWN");
  }
};

const isInScope = (filePath: string, rootPath?: string): boolean => {
  if (!rootPath) {
    return true;
  }
  const normalized = normalizeVfsPath(rootPath);
  if (!normalized) {
    return true;
  }
  return filePath === normalized || filePath.startsWith(`${normalized}/`);
};

const makeRegexMatcher = (regex: RegExp) => {
  return (line: string): boolean => {
    const matches = regex.test(line);
    if (regex.global || regex.sticky) {
      regex.lastIndex = 0;
    }
    return matches;
  };
};

const collectMatches = (
  files: VfsFileMap,
  rootPath: string | undefined,
  matcher: (line: string) => boolean,
  limit: number,
): VfsMatch[] => {
  const matches: VfsMatch[] = [];

  for (const file of Object.values(files)) {
    if (!isInScope(file.path, rootPath)) {
      continue;
    }

    const lines = file.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (matcher(line)) {
        matches.push({ path: file.path, line: i + 1, text: line });
        if (matches.length >= limit) {
          return matches;
        }
      }
    }
  }

  return matches;
};

const collectFuzzyMatches = (
  files: VfsFileMap,
  rootPath: string | undefined,
  query: string,
  limit: number,
): VfsMatch[] => {
  if (limit <= 0) {
    return [];
  }

  const candidates: FuseMatch[] = [];

  for (const file of Object.values(files)) {
    if (!isInScope(file.path, rootPath)) {
      continue;
    }

    const lines = file.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const text = lines[i];
      candidates.push({
        path: file.path,
        line: i + 1,
        text,
        scopePath: file.path,
      });
    }
  }

  const fuse = new Fuse(candidates, {
    includeScore: true,
    shouldSort: true,
    ignoreLocation: true,
    threshold: 0.4,
    minMatchCharLength: Math.min(2, query.length),
    keys: [
      { name: "text", weight: 0.8 },
      { name: "scopePath", weight: 0.2 },
    ],
  });

  return fuse.search(query, { limit }).map((result) => ({
    path: result.item.path,
    line: result.item.line,
    text: result.item.text,
  }));
};

const mapEntityIdToVfsPath = (entityId: string): string | null => {
  const normalized = normalizeVfsPath(entityId);
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("story:")) {
    const nodeId = normalized.slice("story:".length);
    if (!nodeId) {
      return null;
    }
    return `conversation/turns/${nodeId}.json`;
  }

  if (normalized.startsWith("npc:")) {
    return `world/npcs/${normalized}.json`;
  }

  if (normalized.startsWith("loc:") || normalized.startsWith("location:")) {
    return `world/locations/${normalized}.json`;
  }

  if (normalized.startsWith("inv:") || normalized.startsWith("item:")) {
    return `world/inventory/${normalized}.json`;
  }

  if (normalized.startsWith("quest:")) {
    return `world/quests/${normalized}.json`;
  }

  if (normalized.startsWith("knowledge:") || normalized.startsWith("know:")) {
    return `world/knowledge/${normalized}.json`;
  }

  if (normalized.startsWith("faction:") || normalized.startsWith("fac:")) {
    return `world/factions/${normalized}.json`;
  }

  if (normalized.startsWith("timeline:") || normalized.startsWith("event:")) {
    return `world/timeline/${normalized}.json`;
  }

  if (
    normalized.startsWith("skill:") ||
    normalized.startsWith("condition:") ||
    normalized.startsWith("trait:") ||
    normalized.startsWith("attr:") ||
    normalized.startsWith("attribute:")
  ) {
    return "world/character.json";
  }

  if (normalized.startsWith("outline:")) {
    return "outline/outline.json";
  }

  if (normalized.startsWith("chain:") || normalized.startsWith("causal_chain:")) {
    return `world/causal_chains/${normalized}.json`;
  }

  return null;
};

const formatRagPreview = (content: unknown): string => {
  if (typeof content !== "string") {
    return "";
  }
  const firstLine = content.split(/\r?\n/).find((line) => line.trim().length > 0);
  const preview = (firstLine ?? content).trim();
  if (preview.length <= 240) {
    return preview;
  }
  return `${preview.slice(0, 240)}…`;
};

const searchSemanticWithRag = async (
  session: VfsSession,
  query: string,
  options: {
    rootPath?: string;
    limit: number;
    forkId?: number;
    beforeTurn?: number;
  },
): Promise<VfsMatch[]> => {
  const ragService = getRAGService();
  if (!ragService || !ragService.initialized) {
    return [];
  }

  const { rootPath, limit, forkId, beforeTurn } = options;
  const requestedTopK = Math.min(Math.max(limit * 4, limit), 50);

  try {
    const results = await ragService.search(query, {
      topK: requestedTopK,
      threshold: 0.2,
      forkId,
      beforeTurn,
      currentForkOnly: true,
    });

    const mapped: VfsMatch[] = [];

    for (const result of results) {
      const path = mapEntityIdToVfsPath(result.document.entityId);
      if (!path) {
        continue;
      }
      if (rootPath && !isInScope(path, rootPath)) {
        continue;
      }
      if (!session.readFile(path)) {
        continue;
      }
      mapped.push({
        path,
        line: 1,
        text: formatRagPreview(result.document.content),
      });
      if (mapped.length >= limit) {
        break;
      }
    }

    return mapped;
  } catch (error) {
    console.warn("[VFS] Semantic search via RAG failed, falling back to text.", error);
    return [];
  }
};

// ============================================================================
// VFS Handlers
// ============================================================================

registerToolHandler(VFS_LS_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  if (!session) {
    return createError("VFS session is not available", "INVALID_DATA");
  }

  const typedArgs = getTypedArgs("vfs_ls", args);
  const resolved = resolveCurrentPath(typedArgs.path);
  if (!resolved.ok) {
    return resolved.error;
  }
  const entries = session.list(resolved.path);
  return createSuccess({ entries }, "VFS entries listed");
});

registerToolHandler(VFS_READ_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  if (!session) {
    return createError("VFS session is not available", "INVALID_DATA");
  }

  const typedArgs = getTypedArgs("vfs_read", args);
  const resolved = resolveCurrentPath(typedArgs.path);
  if (!resolved.ok) {
    return resolved.error;
  }
  const file = session.readFile(resolved.path);
  if (!file) {
    return createError(`File not found: ${typedArgs.path}`, "NOT_FOUND");
  }

  return createSuccess(
    { ...file, path: toCurrentPath(file.path) },
    "VFS file read",
  );
});

registerToolHandler(VFS_READ_MANY_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  if (!session) {
    return createError("VFS session is not available", "INVALID_DATA");
  }

  const typedArgs = getTypedArgs("vfs_read_many", args);
  const maxChars = typedArgs.maxChars;

  const files: Array<{
    path: string;
    contentType: string;
    content: string;
    truncated: boolean;
    size: number;
    hash: string;
    updatedAt: number;
  }> = [];
  const missing: string[] = [];

  for (const inputPath of typedArgs.paths) {
    const resolved = resolveCurrentPath(inputPath);
    if (!resolved.ok) {
      return resolved.error;
    }
    const file = session.readFile(resolved.path);
    if (!file) {
      missing.push(inputPath);
      continue;
    }

    let content = file.content;
    let truncated = false;
    if (typeof maxChars === "number" && content.length > maxChars) {
      content = content.slice(0, maxChars);
      truncated = true;
    }

    files.push({
      path: toCurrentPath(file.path),
      contentType: file.contentType,
      content,
      truncated,
      size: file.size,
      hash: file.hash,
      updatedAt: file.updatedAt,
    });
  }

  return createSuccess({ files, missing }, "VFS files read");
});

registerToolHandler(VFS_SEARCH_TOOL, async (args, ctx) => {
  const session = getSession(ctx);
  if (!session) {
    return createError("VFS session is not available", "INVALID_DATA");
  }

  const typedArgs = getTypedArgs("vfs_search", args);
  const files = session.snapshot();
  const limit = typedArgs.limit ?? 20;
  if (limit <= 0) {
    return createSuccess({ results: [] }, "VFS search complete");
  }
  const resolvedPath = typedArgs.path
    ? resolveCurrentPath(typedArgs.path)
    : null;
  if (resolvedPath && !resolvedPath.ok) {
    return resolvedPath.error;
  }
  const rootPath = resolvedPath?.ok ? resolvedPath.path : undefined;
  const regex = Boolean(typedArgs.regex);
  const fuzzy = Boolean(typedArgs.fuzzy);
  const semantic = Boolean(typedArgs.semantic);

  if (regex) {
    let regex: RegExp;
    try {
      regex = new RegExp(typedArgs.query);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createError(`Invalid regex: ${message}`, "INVALID_DATA");
    }

    const results = collectMatches(
      files,
      rootPath,
      makeRegexMatcher(regex),
      limit,
    ).map((match) => ({ ...match, path: toCurrentPath(match.path) }));
    return createSuccess({ results }, "VFS search complete");
  }

  if (semantic) {
    const forkId =
      typeof ctx.gameState?.forkId === "number" ? ctx.gameState?.forkId : undefined;
    const beforeTurn =
      typeof ctx.gameState?.turnNumber === "number"
        ? ctx.gameState?.turnNumber
        : undefined;

    const ragMatches =
      ctx.settings?.embedding?.enabled ?? false
        ? await searchSemanticWithRag(session, typedArgs.query, {
            rootPath,
            limit,
            forkId,
            beforeTurn,
          })
        : [];

    if (ragMatches.length > 0) {
      const results = ragMatches.map((match) => ({
        ...match,
        path: toCurrentPath(match.path),
      }));
      return createSuccess({ results }, "VFS search complete");
    }

    const semanticMatches = session.searchSemantic(typedArgs.query, {
      path: rootPath,
      limit,
    });
    if (semanticMatches.length > 0) {
      const results = semanticMatches
        .slice(0, limit)
        .map((match) => ({ ...match, path: toCurrentPath(match.path) }));
      return createSuccess({ results }, "VFS search complete");
    }
  }

  const rawResults = fuzzy
    ? collectFuzzyMatches(files, rootPath, typedArgs.query, limit)
    : collectMatches(
        files,
        rootPath,
        (line) => line.includes(typedArgs.query),
        limit,
      );

  const results = rawResults.map((match) => ({
    ...match,
    path: toCurrentPath(match.path),
  }));

  return createSuccess({ results }, "VFS search complete");
});

registerToolHandler(VFS_GREP_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  if (!session) {
    return createError("VFS session is not available", "INVALID_DATA");
  }

  const typedArgs = getTypedArgs("vfs_grep", args);
  const files = session.snapshot();
  const limit = typedArgs.limit ?? 20;
  const resolvedPath = typedArgs.path
    ? resolveCurrentPath(typedArgs.path)
    : null;
  if (resolvedPath && !resolvedPath.ok) {
    return resolvedPath.error;
  }
  const rootPath = resolvedPath?.ok ? resolvedPath.path : undefined;

  let regex: RegExp;
  try {
    regex = new RegExp(typedArgs.pattern, typedArgs.flags);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createError(`Invalid regex: ${message}`, "INVALID_DATA");
  }

  const results = collectMatches(
    files,
    rootPath,
    makeRegexMatcher(regex),
    limit,
  ).map((match) => ({ ...match, path: toCurrentPath(match.path) }));

  return createSuccess({ results }, "VFS grep complete");
});

registerToolHandler(VFS_WRITE_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_write", args);

  return withAtomicSession(ctx, (draft) => {
    const written: string[] = [];

    for (const file of typedArgs.files) {
      const resolved = resolveCurrentPath(file.path);
      if (!resolved.ok) {
        return resolved.error;
      }
      draft.writeFile(resolved.path, file.content, file.contentType);
      written.push(toCurrentPath(resolved.path));
    }

    return createSuccess({ written }, "VFS files written");
  });
});

registerToolHandler(VFS_EDIT_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_edit", args);

  return withAtomicSession(ctx, (draft) => {
    const edited: string[] = [];

    for (const edit of typedArgs.edits) {
      const resolved = resolveCurrentPath(edit.path);
      if (!resolved.ok) {
        return resolved.error;
      }
      draft.applyJsonPatch(resolved.path, edit.patch);
      edited.push(toCurrentPath(resolved.path));
    }

    return createSuccess({ edited }, "VFS files edited");
  });
});

registerToolHandler(VFS_MERGE_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_merge", args);

  return withAtomicSession(ctx, (draft) => {
    const merged: string[] = [];

    for (const file of typedArgs.files) {
      const resolved = resolveCurrentPath(file.path);
      if (!resolved.ok) {
        return resolved.error;
      }
      draft.mergeJson(resolved.path, file.content);
      merged.push(toCurrentPath(resolved.path));
    }

    return createSuccess({ merged }, "VFS files merged");
  });
});

registerToolHandler(VFS_MOVE_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_move", args);

  return withAtomicSession(ctx, (draft) => {
    const moved: Array<{ from: string; to: string }> = [];

    for (const move of typedArgs.moves) {
      const resolvedFrom = resolveCurrentPath(move.from);
      if (!resolvedFrom.ok) {
        return resolvedFrom.error;
      }
      const resolvedTo = resolveCurrentPath(move.to);
      if (!resolvedTo.ok) {
        return resolvedTo.error;
      }
      const from = normalizeVfsPath(resolvedFrom.path);
      const to = normalizeVfsPath(resolvedTo.path);
      try {
        draft.renameFile(from, to);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return createError(message, "NOT_FOUND");
      }
      moved.push({ from: toCurrentPath(from), to: toCurrentPath(to) });
    }

    return createSuccess({ moved }, "VFS files moved");
  });
});

registerToolHandler(VFS_DELETE_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_delete", args);

  return withAtomicSession(ctx, (draft) => {
    const deleted: string[] = [];

    for (const path of typedArgs.paths) {
      const resolved = resolveCurrentPath(path);
      if (!resolved.ok) {
        return resolved.error;
      }
      const normalized = normalizeVfsPath(resolved.path);
      try {
        draft.deleteFile(normalized);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return createError(message, "NOT_FOUND");
      }
      deleted.push(toCurrentPath(normalized));
    }

    return createSuccess({ deleted }, "VFS files deleted");
  });
});

registerToolHandler(VFS_COMMIT_TURN_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_commit_turn", args);

  return withAtomicSession(ctx, (draft) => {
    const existingIndex = ensureConversationIndex(draft);

    const forkId = existingIndex.activeForkId ?? 0;
    const forkKey = String(forkId);
    const order = existingIndex.turnOrderByFork?.[forkKey] ?? [];
    const latestFromIndex = existingIndex.latestTurnNumberByFork?.[forkKey];
    const latestFromOrder = order.reduce((max, id) => {
      const match = /fork-(\d+)\/turn-(\d+)/.exec(id);
      if (!match) return max;
      const turn = Number(match[2]);
      return Number.isFinite(turn) ? Math.max(max, turn) : max;
    }, -1);
    const latest =
      typeof latestFromIndex === "number" ? latestFromIndex : latestFromOrder;

    const turnNumber = latest + 1;
    const turnId = buildTurnId(forkId, turnNumber);

    const parentTurnId =
      typeof existingIndex.activeTurnId === "string" &&
      existingIndex.activeTurnId.length > 0
        ? existingIndex.activeTurnId
        : order.length > 0
          ? order[order.length - 1]
          : null;

    writeTurnFile(draft, forkId, turnNumber, {
      turnId,
      forkId,
      turnNumber,
      parentTurnId,
      createdAt: typedArgs.createdAt ?? Date.now(),
      userAction: typedArgs.userAction,
      assistant: typedArgs.assistant,
    });

    const nextOrder = order.includes(turnId) ? order : [...order, turnId];

    writeConversationIndex(draft, {
      ...existingIndex,
      activeForkId: forkId,
      activeTurnId: turnId,
      rootTurnIdByFork:
        existingIndex.rootTurnIdByFork?.[forkKey] != null
          ? existingIndex.rootTurnIdByFork
          : { ...existingIndex.rootTurnIdByFork, [forkKey]: turnId },
      latestTurnNumberByFork: {
        ...existingIndex.latestTurnNumberByFork,
        [forkKey]: turnNumber,
      },
      turnOrderByFork: {
        ...existingIndex.turnOrderByFork,
        [forkKey]: nextOrder,
      },
    });

    return createSuccess(
      { turnId, forkId, turnNumber },
      "Turn committed to conversation",
    );
  });
});

registerToolHandler(VFS_TX_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_tx", args);

  return withAtomicSession(ctx, (draft) => {
    const commitIndices = typedArgs.ops
      .map((op, index) => ({ index, op }))
      .filter((entry) => entry.op.op === "commit_turn")
      .map((entry) => entry.index);

    if (commitIndices.length > 1) {
      return createError("vfs_tx: commit_turn may appear at most once", "INVALID_DATA");
    }

    if (commitIndices.length === 1 && commitIndices[0] !== typedArgs.ops.length - 1) {
      return createError(
        "vfs_tx: commit_turn must be the last operation in the batch",
        "INVALID_DATA",
      );
    }

    const written: string[] = [];
    const edited: string[] = [];
    const merged: string[] = [];
    const moved: Array<{ from: string; to: string }> = [];
    const deleted: string[] = [];
    let committed: { turnId: string; forkId: number; turnNumber: number } | null = null;

    for (const op of typedArgs.ops) {
      if (op.op === "write") {
        const resolved = resolveCurrentPath(op.path);
        if (!resolved.ok) {
          return resolved.error;
        }
        draft.writeFile(resolved.path, op.content, op.contentType);
        written.push(toCurrentPath(resolved.path));
        continue;
      }

      if (op.op === "edit") {
        const resolved = resolveCurrentPath(op.path);
        if (!resolved.ok) {
          return resolved.error;
        }
        draft.applyJsonPatch(resolved.path, op.patch);
        edited.push(toCurrentPath(resolved.path));
        continue;
      }

      if (op.op === "merge") {
        const resolved = resolveCurrentPath(op.path);
        if (!resolved.ok) {
          return resolved.error;
        }
        draft.mergeJson(resolved.path, op.content);
        merged.push(toCurrentPath(resolved.path));
        continue;
      }

      if (op.op === "move") {
        const resolvedFrom = resolveCurrentPath(op.from);
        if (!resolvedFrom.ok) {
          return resolvedFrom.error;
        }
        const resolvedTo = resolveCurrentPath(op.to);
        if (!resolvedTo.ok) {
          return resolvedTo.error;
        }
        const from = normalizeVfsPath(resolvedFrom.path);
        const to = normalizeVfsPath(resolvedTo.path);
        try {
          draft.renameFile(from, to);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return createError(message, "NOT_FOUND");
        }
        moved.push({ from: toCurrentPath(from), to: toCurrentPath(to) });
        continue;
      }

      if (op.op === "delete") {
        const resolved = resolveCurrentPath(op.path);
        if (!resolved.ok) {
          return resolved.error;
        }
        const normalized = normalizeVfsPath(resolved.path);
        try {
          draft.deleteFile(normalized);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return createError(message, "NOT_FOUND");
        }
        deleted.push(toCurrentPath(normalized));
        continue;
      }

      if (op.op === "commit_turn") {
        const existingIndex = ensureConversationIndex(draft);

        const forkId = existingIndex.activeForkId ?? 0;
        const forkKey = String(forkId);
        const order = existingIndex.turnOrderByFork?.[forkKey] ?? [];
        const latestFromIndex = existingIndex.latestTurnNumberByFork?.[forkKey];
        const latestFromOrder = order.reduce((max, id) => {
          const match = /fork-(\d+)\/turn-(\d+)/.exec(id);
          if (!match) return max;
          const turn = Number(match[2]);
          return Number.isFinite(turn) ? Math.max(max, turn) : max;
        }, -1);
        const latest =
          typeof latestFromIndex === "number" ? latestFromIndex : latestFromOrder;

        const turnNumber = latest + 1;
        const turnId = buildTurnId(forkId, turnNumber);

        const parentTurnId =
          typeof existingIndex.activeTurnId === "string" &&
          existingIndex.activeTurnId.length > 0
            ? existingIndex.activeTurnId
            : order.length > 0
              ? order[order.length - 1]
              : null;

        writeTurnFile(draft, forkId, turnNumber, {
          turnId,
          forkId,
          turnNumber,
          parentTurnId,
          createdAt: op.createdAt ?? Date.now(),
          userAction: op.userAction,
          assistant: op.assistant,
        });

        const nextOrder = order.includes(turnId) ? order : [...order, turnId];

        writeConversationIndex(draft, {
          ...existingIndex,
          activeForkId: forkId,
          activeTurnId: turnId,
          rootTurnIdByFork:
            existingIndex.rootTurnIdByFork?.[forkKey] != null
              ? existingIndex.rootTurnIdByFork
              : { ...existingIndex.rootTurnIdByFork, [forkKey]: turnId },
          latestTurnNumberByFork: {
            ...existingIndex.latestTurnNumberByFork,
            [forkKey]: turnNumber,
          },
          turnOrderByFork: {
            ...existingIndex.turnOrderByFork,
            [forkKey]: nextOrder,
          },
        });

        committed = { turnId, forkId, turnNumber };
        continue;
      }

      return createError(`vfs_tx: unknown op: ${(op as any).op}`, "INVALID_DATA");
    }

    return createSuccess(
      { written, edited, merged, moved, deleted, committed },
      "VFS transaction applied",
    );
  });
});
