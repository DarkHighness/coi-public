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
import { normalizeVfsPath } from "../../vfs/utils";
import { VfsSession } from "../../vfs/vfsSession";
import { registerToolHandler, type ToolContext } from "../toolHandlerRegistry";

interface VfsMatch {
  path: string;
  line: number;
  text: string;
}

type VfsSessionInternal = { files: VfsFileMap };

const getInternalFiles = (session: VfsSession): VfsFileMap =>
  (session as unknown as VfsSessionInternal).files;

const setInternalFiles = (session: VfsSession, files: VfsFileMap): void => {
  (session as unknown as VfsSessionInternal).files = files;
};

const cloneFiles = (files: VfsFileMap): VfsFileMap => {
  const cloned: VfsFileMap = {};
  for (const [path, file] of Object.entries(files)) {
    cloned[path] = { ...file };
  }
  return cloned;
};

const cloneSession = (session: VfsSession): VfsSession => {
  const clone = new VfsSession();
  setInternalFiles(clone, cloneFiles(getInternalFiles(session)));
  return clone;
};

const commitSession = (target: VfsSession, source: VfsSession): void => {
  setInternalFiles(target, cloneFiles(getInternalFiles(source)));
};

const getSession = (ctx: ToolContext): VfsSession | null => {
  return ctx.vfsSession ?? null;
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
  const entries = session.list(typedArgs.path ?? "");
  return createSuccess({ entries }, "VFS entries listed");
});

registerToolHandler(VFS_READ_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  if (!session) {
    return createError("VFS session is not available", "INVALID_DATA");
  }

  const typedArgs = getTypedArgs("vfs_read", args);
  const file = session.readFile(typedArgs.path);
  if (!file) {
    return createError(`File not found: ${typedArgs.path}`, "NOT_FOUND");
  }

  return createSuccess(file, "VFS file read");
});

registerToolHandler(VFS_SEARCH_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  if (!session) {
    return createError("VFS session is not available", "INVALID_DATA");
  }

  const typedArgs = getTypedArgs("vfs_search", args);
  const files = getInternalFiles(session);
  const limit = typedArgs.limit ?? 20;

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
      typedArgs.path,
      makeRegexMatcher(regex),
      limit,
    );
    return createSuccess({ results }, "VFS search complete");
  }

  const results = collectMatches(
    files,
    typedArgs.path,
    (line) => line.includes(typedArgs.query),
    limit,
  );

  return createSuccess({ results }, "VFS search complete");
});

registerToolHandler(VFS_GREP_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  if (!session) {
    return createError("VFS session is not available", "INVALID_DATA");
  }

  const typedArgs = getTypedArgs("vfs_grep", args);
  const files = getInternalFiles(session);
  const limit = typedArgs.limit ?? 20;

  let regex: RegExp;
  try {
    regex = new RegExp(typedArgs.pattern, typedArgs.flags);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createError(`Invalid regex: ${message}`, "INVALID_DATA");
  }

  const results = collectMatches(
    files,
    typedArgs.path,
    makeRegexMatcher(regex),
    limit,
  );

  return createSuccess({ results }, "VFS grep complete");
});

registerToolHandler(VFS_WRITE_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_write", args);

  return withAtomicSession(ctx, (draft) => {
    for (const file of typedArgs.files) {
      draft.writeFile(file.path, file.content, file.contentType);
    }

    return createSuccess(
      { written: typedArgs.files.map((file) => normalizeVfsPath(file.path)) },
      "VFS files written",
    );
  });
});

registerToolHandler(VFS_EDIT_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_edit", args);

  return withAtomicSession(ctx, (draft) => {
    for (const edit of typedArgs.edits) {
      draft.applyJsonPatch(edit.path, edit.patch);
    }

    return createSuccess(
      { edited: typedArgs.edits.map((edit) => normalizeVfsPath(edit.path)) },
      "VFS files edited",
    );
  });
});

registerToolHandler(VFS_MOVE_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_move", args);

  return withAtomicSession(ctx, (draft) => {
    const files = getInternalFiles(draft);
    const moved: Array<{ from: string; to: string }> = [];

    for (const move of typedArgs.moves) {
      const from = normalizeVfsPath(move.from);
      const to = normalizeVfsPath(move.to);
      const file = files[from];

      if (!file) {
        return createError(`File not found: ${from}`, "NOT_FOUND");
      }

      files[to] = { ...file, path: to, updatedAt: Date.now() };
      delete files[from];
      moved.push({ from, to });
    }

    return createSuccess({ moved }, "VFS files moved");
  });
});

registerToolHandler(VFS_DELETE_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_delete", args);

  return withAtomicSession(ctx, (draft) => {
    const files = getInternalFiles(draft);
    const deleted: string[] = [];

    for (const path of typedArgs.paths) {
      const normalized = normalizeVfsPath(path);
      if (!files[normalized]) {
        return createError(`File not found: ${normalized}`, "NOT_FOUND");
      }

      delete files[normalized];
      deleted.push(normalized);
    }

    return createSuccess({ deleted }, "VFS files deleted");
  });
});
