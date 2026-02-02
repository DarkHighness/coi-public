/**
 * VFS Tool Handlers
 */

import {
  VFS_LS_TOOL,
  VFS_READ_TOOL,
  VFS_SEARCH_TOOL,
  VFS_GREP_TOOL,
  VFS_WRITE_TOOL,
  VFS_EDIT_TOOL,
  VFS_MERGE_TOOL,
  VFS_MOVE_TOOL,
  VFS_DELETE_TOOL,
  getTypedArgs,
} from "../../tools";
import {
  createError,
  createSuccess,
  type ToolCallResult,
} from "../../gameDatabase";
import type { VfsFileMap } from "../../vfs/types";
import { stripCurrentPath, toCurrentPath } from "../../vfs/currentAlias";
import { normalizeVfsPath } from "../../vfs/utils";
import { VfsSession } from "../../vfs/vfsSession";
import { registerToolHandler, type ToolContext } from "../toolHandlerRegistry";

interface VfsMatch {
  path: string;
  line: number;
  text: string;
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

registerToolHandler(VFS_SEARCH_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  if (!session) {
    return createError("VFS session is not available", "INVALID_DATA");
  }

  const typedArgs = getTypedArgs("vfs_search", args);
  const files = session.snapshot();
  const limit = typedArgs.limit ?? 20;
  const resolvedPath = typedArgs.path
    ? resolveCurrentPath(typedArgs.path)
    : null;
  if (resolvedPath && !resolvedPath.ok) {
    return resolvedPath.error;
  }
  const rootPath = resolvedPath?.ok ? resolvedPath.path : undefined;

  if (typedArgs.regex) {
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

  const results = collectMatches(
    files,
    rootPath,
    (line) => line.includes(typedArgs.query),
    limit,
  ).map((match) => ({ ...match, path: toCurrentPath(match.path) }));

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
