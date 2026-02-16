import { createError, createSuccess } from "../../../tools/toolResult";
import { resolveVfsReadHardCapChars } from "../../../ai/contextUsage";
import { getVfsSchemaHint } from "../../../providers/utils";
import { toCurrentPath } from "../../currentAlias";
import { normalizeVfsPath } from "../../utils";
import { getSchemaForPath } from "../../schemas";
import { vfsPathRegistry } from "../../core/pathRegistry";
import { vfsResourceRegistry } from "../../core/resourceRegistry";
import { buildVfsLayoutReport } from "../../layoutReport";
import {
  collectFuzzyMatches,
  collectMatches,
  createReadLimitError,
  describeJsonValueType,
  formatTemplateDefinitionHint,
  getSession,
  getToolDocRef,
  globToRegExp,
  hasSpecificTemplateDefinition,
  inferContentTypeFromPath,
  isInScope,
  isJsonPointerResolveError,
  isPathResolveError,
  isPlainOrMarkdownContentType,
  makeRegexMatcher,
  normalizeGlobInput,
  resolveCurrentPath,
  resolveCurrentPathLoose,
  resolveJsonPointer,
  runWithStructuredErrors,
  searchSemanticWithRag,
  toLsStatEntryForDir,
  toLsStatEntryForFile,
  type VfsToolHandler,
} from "./shared";

export const handleInspectLs: VfsToolHandler = (args, ctx) =>
  runWithStructuredErrors("vfs_ls", args, () => {
    const session = getSession(ctx);
    const typedArgs = args as any;
    const baseResolved = resolveCurrentPathLoose(ctx, typedArgs.path);
    if (isPathResolveError(baseResolved)) {
      return baseResolved.error;
    }
    session.noteToolAccessScope(baseResolved.path ?? "");

    const patterns = typedArgs.patterns ?? null;
    const stat = Boolean(typedArgs.stat);
    const limit = typedArgs.limit ?? 200;
    const ignoreCase = Boolean(typedArgs.ignoreCase);
    const includeExpected = Boolean(typedArgs.includeExpected);
    const includeAccess = Boolean(typedArgs.includeAccess);
    const activeForkId =
      typeof ctx.gameState?.forkId === "number"
        ? ctx.gameState.forkId
        : session.getActiveForkId();

    const buildLayoutPayload = (
      rootPath: string | undefined,
    ): {
      layout: ReturnType<typeof buildVfsLayoutReport>;
      layoutTotal: number;
      layoutTruncated: boolean;
    } => {
      const fullLayout = buildVfsLayoutReport(session, {
        rootPath: rootPath || undefined,
        includeExpected,
        activeForkId,
        includeDirectories: true,
      });
      const layoutTruncated = fullLayout.length > limit;
      const layout = layoutTruncated ? fullLayout.slice(0, limit) : fullLayout;
      return {
        layout,
        layoutTotal: fullLayout.length,
        layoutTruncated,
      };
    };

    const toReadabilityLabel = (
      permissionClass:
        | "immutable_readonly"
        | "default_editable"
        | "elevated_editable"
        | "finish_guarded",
    ): "read_only" | "read_write" | "finish_guarded" => {
      if (permissionClass === "immutable_readonly") {
        return "read_only";
      }
      if (permissionClass === "finish_guarded") {
        return "finish_guarded";
      }
      return "read_write";
    };

    const toUpdateTriggers = (
      allowedWriteOps: Array<
        | "write"
        | "json_patch"
        | "json_merge"
        | "move"
        | "delete"
        | "finish_commit"
        | "finish_summary"
        | "history_rewrite"
      >,
      permissionClass:
        | "immutable_readonly"
        | "default_editable"
        | "elevated_editable"
        | "finish_guarded",
    ): string[] => {
      const triggers: string[] = [];
      if (allowedWriteOps.includes("finish_commit")) triggers.push("turn_commit");
      if (allowedWriteOps.includes("finish_summary"))
        triggers.push("summary_commit");
      if (allowedWriteOps.includes("history_rewrite"))
        triggers.push("history_rewrite");
      if (
        allowedWriteOps.some((op) =>
          ["write", "json_patch", "json_merge", "move", "delete"].includes(op),
        )
      ) {
        triggers.push("direct_write");
      }
      if (permissionClass === "elevated_editable") {
        triggers.push("elevated_write");
      }
      return triggers;
    };

    const toAccessMeta = (path: string) => {
      const classification = vfsPathRegistry.classify(normalizeVfsPath(path), {
        activeForkId,
      });
      return {
        path: toCurrentPath(path),
        canonicalPath: classification.canonicalPath,
        templateId: classification.templateId,
        permissionClass: classification.permissionClass,
        scope: classification.scope,
        domain: classification.domain,
        allowedWriteOps: [...classification.allowedWriteOps],
        readability: toReadabilityLabel(classification.permissionClass),
        updateTriggers: toUpdateTriggers(
          classification.allowedWriteOps,
          classification.permissionClass,
        ),
      };
    };

    if (!patterns || patterns.length === 0) {
      const entries = session.list(baseResolved.path);
      if (!stat && !includeExpected && !includeAccess) {
        return createSuccess({ entries }, "VFS entries listed");
      }

      const payload: Record<string, unknown> = { entries };
      if (stat) {
        const snapshot = session.snapshotAll();
        const snapshotPaths = Object.keys(snapshot);
        const meta = entries.map((entryPath) => {
          const normalized = normalizeVfsPath(entryPath);
          const file = session.readFile(normalized);
          if (file) {
            return toLsStatEntryForFile(file);
          }
          return toLsStatEntryForDir(normalized, snapshotPaths);
        });
        payload.stats = meta;
      }

      if (includeExpected || includeAccess) {
        const layoutPayload = buildLayoutPayload(baseResolved.path);
        payload.layout = includeAccess
          ? layoutPayload.layout
          : layoutPayload.layout.map((entry) => ({
              path: entry.path,
              canonicalPath: entry.canonicalPath,
              kind: entry.kind,
              exists: entry.exists,
              expected: entry.expected,
              sources: entry.sources,
            }));
        payload.layoutTotal = layoutPayload.layoutTotal;
        payload.layoutTruncated = layoutPayload.layoutTruncated;
      }

      return createSuccess(
        payload,
        stat ? "VFS entries listed with metadata" : "VFS entries listed",
      );
    }

    if (includeExpected) {
      return createError(
        "vfs_ls: includeExpected is only supported when patterns are omitted.",
        "INVALID_DATA",
      );
    }

    const regexes: RegExp[] = [];
    for (const raw of patterns) {
      const resolvedPattern = normalizeGlobInput(raw, baseResolved.path);
      try {
        regexes.push(globToRegExp(resolvedPattern, { ignoreCase }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return createError(`Invalid glob: ${message}`, "INVALID_DATA");
      }
    }

    const excludeRegexes: RegExp[] = [];
    if (typedArgs.excludePatterns) {
      for (const raw of typedArgs.excludePatterns) {
        const resolvedPattern = normalizeGlobInput(raw, baseResolved.path);
        try {
          excludeRegexes.push(globToRegExp(resolvedPattern, { ignoreCase }));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return createError(`Invalid exclude glob: ${message}`, "INVALID_DATA");
        }
      }
    }

    const snapshot = session.snapshotAll();
    const snapshotPaths = Object.keys(snapshot);
    const matched = new Set<string>();

    for (const path of snapshotPaths) {
      if (excludeRegexes.some((re) => re.test(path))) {
        continue;
      }
      if (!isInScope(path, baseResolved.path)) {
        continue;
      }
      for (const regex of regexes) {
        if (regex.test(path)) {
          matched.add(path);
          break;
        }
      }
    }

    const allMatches = Array.from(matched).sort();
    const truncated = allMatches.length > limit;
    const selectedMatches = truncated ? allMatches.slice(0, limit) : allMatches;
    for (const path of selectedMatches) {
      session.noteToolAccessFile(path);
    }
    const matches = selectedMatches.map((p) => toCurrentPath(p));

    if (!stat) {
      const payload: Record<string, unknown> = {
        entries: matches,
        truncated,
        totalMatches: allMatches.length,
      };
      if (includeAccess) {
        payload.access = selectedMatches.map(toAccessMeta);
      }
      return createSuccess(payload, "VFS glob listing complete");
    }

    const stats = selectedMatches.flatMap((path) => {
      const file = session.readFile(path);
      if (!file) return [];
      return [toLsStatEntryForFile(file)];
    });

    const payload: Record<string, unknown> = {
      entries: matches,
      stats,
      truncated,
      totalMatches: allMatches.length,
    };
    if (includeAccess) {
      payload.access = selectedMatches.map(toAccessMeta);
    }

    return createSuccess(payload, "VFS glob listing complete");
  });

export const handleInspectRead: VfsToolHandler = (args, ctx) =>
  runWithStructuredErrors("vfs_read", args, () => {
    const session = getSession(ctx);
    const typedArgs = args as any;
    const resolved = resolveCurrentPath(ctx, typedArgs.path);
    if (isPathResolveError(resolved)) {
      return resolved.error;
    }

    const file = session.readFile(resolved.path);
    if (!file) {
      const normalizedInput = normalizeVfsPath(typedArgs.path);
      const qualifiedPath =
        normalizedInput === "" ||
        normalizedInput === "current" ||
        normalizedInput.startsWith("current/") ||
        normalizedInput.startsWith("shared/") ||
        normalizedInput.startsWith("forks/")
          ? normalizedInput || "current"
          : `current/${normalizedInput}`;
      const qualifiedWithoutTrailingSlash = qualifiedPath.replace(/\/$/, "");
      const lastSlash = qualifiedWithoutTrailingSlash.lastIndexOf("/");
      const parentDir =
        lastSlash > 0
          ? qualifiedWithoutTrailingSlash.slice(0, lastSlash)
          : "current";
      const fileName =
        lastSlash >= 0
          ? qualifiedWithoutTrailingSlash.slice(lastSlash + 1)
          : qualifiedWithoutTrailingSlash;

      return createError(`File not found: ${typedArgs.path}`, "NOT_FOUND", {
        tool: "vfs_read",
        issues: [
          {
            path: qualifiedPath,
            code: "NOT_FOUND",
            message: "File does not exist in the VFS snapshot.",
          },
        ],
        recovery: [
          `Try: vfs_ls({ path: "${parentDir}" })`,
          `Then: vfs_search({ path: "${parentDir}", query: "${fileName}", fuzzy: true })`,
          `If you need expected JSON fields: vfs_schema({ paths: ["${qualifiedPath}"] })`,
        ],
        refs: [getToolDocRef("vfs_read")],
      });
    }
    session.noteToolSeen(resolved.path);
    session.noteToolAccessFile(resolved.path);
    const readCapResolution = resolveVfsReadHardCapChars(ctx.settings);
    const readHardCapChars = readCapResolution.hardCapChars;

    const mode =
      typedArgs.mode ??
      (typedArgs.pointers && typedArgs.pointers.length > 0
        ? "json"
        : typedArgs.startLine || typedArgs.endLine || typedArgs.lineCount
          ? "lines"
          : "chars");

    if (mode === "json") {
      if (file.contentType !== "application/json") {
        return createError(`File is not JSON: ${typedArgs.path}`, "INVALID_DATA");
      }

      let document: unknown;
      try {
        document = JSON.parse(file.content);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return createError(`Invalid JSON: ${message}`, "INVALID_DATA");
      }

      const pointers = typedArgs.pointers ?? [];
      if (pointers.length === 0) {
        return createError(
          "vfs_read(json): pointers must be provided",
          "INVALID_DATA",
        );
      }

      if (
        typeof typedArgs.maxChars === "number" &&
        typedArgs.maxChars > readHardCapChars
      ) {
        return createReadLimitError(
          "json",
          `maxChars=${typedArgs.maxChars} exceeds allowed per-pointer read size`,
          typedArgs.path,
          readHardCapChars,
        );
      }
      const maxChars = typedArgs.maxChars ?? readHardCapChars;
      const extracts: Array<{
        pointer: string;
        type: string;
        json: string;
        truncated: boolean;
        jsonChars: number;
      }> = [];
      const missing: Array<{ pointer: string; error: string }> = [];
      let totalJsonChars = 0;

      for (const pointer of pointers) {
        const resolvedPointer = resolveJsonPointer(document, pointer);
        if (isJsonPointerResolveError(resolvedPointer)) {
          missing.push({ pointer, error: resolvedPointer.error });
          continue;
        }

        const valueType = describeJsonValueType(resolvedPointer.value);
        const jsonString = JSON.stringify(resolvedPointer.value);
        const fullJson = typeof jsonString === "string" ? jsonString : "null";
        if (fullJson.length > maxChars) {
          return createReadLimitError(
            "json",
            `pointer "${pointer}" yields ${fullJson.length} chars, exceeding limit ${maxChars}`,
            typedArgs.path,
            readHardCapChars,
          );
        }
        totalJsonChars += fullJson.length;
        if (totalJsonChars > readHardCapChars) {
          return createReadLimitError(
            "json",
            `combined pointer payload exceeds ${readHardCapChars} chars`,
            typedArgs.path,
            readHardCapChars,
          );
        }
        const json = fullJson;

        extracts.push({
          pointer,
          type: valueType,
          json,
          truncated: false,
          jsonChars: fullJson.length,
        });
      }

      return createSuccess(
        {
          mode,
          path: toCurrentPath(file.path),
          contentType: file.contentType,
          extracts,
          missing,
          size: file.size,
          hash: file.hash,
          updatedAt: file.updatedAt,
        },
        "VFS JSON subpaths read",
      );
    }

    if (mode === "lines") {
      const lines = file.content.split(/\r?\n/);
      const totalLines = lines.length;
      const startLine = typedArgs.startLine ?? 1;

      if (startLine < 1 || startLine > Math.max(totalLines, 1)) {
        return createError(
          `vfs_read(lines): startLine out of range (${startLine})`,
          "INVALID_DATA",
        );
      }

      let endLine: number;
      if (typeof typedArgs.endLine === "number") {
        endLine = typedArgs.endLine;
      } else if (typeof typedArgs.lineCount === "number") {
        endLine = startLine + typedArgs.lineCount - 1;
      } else {
        endLine = totalLines;
      }

      if (endLine < startLine) {
        return createError(
          "vfs_read(lines): endLine must be >= startLine",
          "INVALID_DATA",
        );
      }

      if (endLine > totalLines) {
        return createError(
          `vfs_read(lines): endLine out of range (${endLine})`,
          "INVALID_DATA",
        );
      }

      const startIndex = startLine - 1;
      const endIndexExclusive = endLine;
      const content = lines.slice(startIndex, endIndexExclusive).join("\n");
      if (content.length > readHardCapChars) {
        return createReadLimitError(
          "lines",
          `requested line range returns ${content.length} chars`,
          typedArgs.path,
          readHardCapChars,
        );
      }

      return createSuccess(
        {
          mode,
          path: toCurrentPath(file.path),
          contentType: file.contentType,
          content,
          lineStart: startLine,
          lineEnd: endLine,
          totalLines,
          truncated: startLine !== 1 || endLine !== totalLines,
          size: file.size,
          hash: file.hash,
          updatedAt: file.updatedAt,
        },
        "VFS file lines read",
      );
    }

    const startRaw = typedArgs.start;
    const offsetRaw = typedArgs.offset;
    const maxChars = typedArgs.maxChars;

    const start = typeof startRaw === "number" ? startRaw : 0;
    const hasOffset = typeof offsetRaw === "number";
    const hasMaxChars = typeof maxChars === "number";

    if (start > 0 && !hasOffset && !hasMaxChars) {
      return createError(
        "vfs_read(chars): when providing start, also provide offset (preferred) or maxChars",
        "INVALID_DATA",
      );
    }

    if (hasOffset && offsetRaw > readHardCapChars) {
      return createReadLimitError(
        "chars",
        `offset=${offsetRaw} exceeds allowed chunk size`,
        typedArgs.path,
        readHardCapChars,
      );
    }
    if (hasMaxChars && maxChars > readHardCapChars) {
      return createReadLimitError(
        "chars",
        `maxChars=${maxChars} exceeds allowed chunk size`,
        typedArgs.path,
        readHardCapChars,
      );
    }

    const length = hasOffset ? offsetRaw : hasMaxChars ? maxChars : undefined;
    const totalChars = file.content.length;
    const sliceStart = Math.min(Math.max(start, 0), totalChars);
    const sliceEndExclusive =
      typeof length === "number"
        ? Math.min(sliceStart + Math.max(length, 0), totalChars)
        : totalChars;

    const content = file.content.slice(sliceStart, sliceEndExclusive);
    if (content.length > readHardCapChars) {
      return createReadLimitError(
        "chars",
        `requested char range returns ${content.length} chars`,
        typedArgs.path,
        readHardCapChars,
      );
    }
    const truncated = sliceStart !== 0 || sliceEndExclusive !== totalChars;

    return createSuccess(
      {
        mode: "chars",
        path: toCurrentPath(file.path),
        contentType: file.contentType,
        content,
        truncated,
        sliceStart,
        sliceEndExclusive,
        totalChars,
        size: file.size,
        hash: file.hash,
        updatedAt: file.updatedAt,
      },
      "VFS file read",
    );
  });

export const handleInspectSchema: VfsToolHandler = (args, ctx) =>
  runWithStructuredErrors("vfs_schema", args, () => {
    const session = getSession(ctx);
    const typedArgs = args as any;

    const schemas: Array<{
      path: string;
      hint: string;
      classification: {
        canonicalPath: string;
        templateId: string;
        permissionClass: string;
        scope: string;
        domain: string;
        resourceShape: string;
        criticality: string;
        retention: string;
        allowedWriteOps: string[];
      };
    }> = [];
    const missing: Array<{ path: string; error: string }> = [];

    for (const inputPath of typedArgs.paths as string[]) {
      const resolved = resolveCurrentPathLoose(ctx, inputPath);
      if (isPathResolveError(resolved)) {
        return resolved.error;
      }

      const activeForkId =
        typeof ctx.gameState?.forkId === "number"
          ? ctx.gameState.forkId
          : session.getActiveForkId();
      const classification = vfsPathRegistry.classify(resolved.path, {
        activeForkId,
      });
      const resourceMatch = vfsResourceRegistry.match(resolved.path, {
        activeForkId,
      });
      const existingFile = session.readFile(resolved.path);

      try {
        const schema = getSchemaForPath(resolved.path);
        schemas.push({
          path: toCurrentPath(resolved.path),
          hint: getVfsSchemaHint(schema),
          classification: {
            canonicalPath: classification.canonicalPath,
            templateId: classification.templateId,
            permissionClass: classification.permissionClass,
            scope: classification.scope,
            domain: classification.domain,
            resourceShape: classification.resourceShape,
            criticality: classification.criticality,
            retention: classification.retention,
            allowedWriteOps: [...classification.allowedWriteOps],
          },
        });
      } catch (schemaError) {
        if (!hasSpecificTemplateDefinition(classification.templateId)) {
          const message =
            schemaError instanceof Error
              ? schemaError.message
              : String(schemaError);
          missing.push({ path: inputPath, error: message });
          continue;
        }

        const templateContentTypes = resourceMatch.descriptor.contentTypes ?? [];
        const inferredContentType =
          existingFile?.contentType ??
          inferContentTypeFromPath(resolved.path) ??
          (templateContentTypes.length === 1 ? templateContentTypes[0] : null);
        const looksLikePlainOrMarkdown =
          inferredContentType !== null
            ? isPlainOrMarkdownContentType(inferredContentType)
            : templateContentTypes.length > 0 &&
              templateContentTypes.every(isPlainOrMarkdownContentType);

        if (!existingFile && looksLikePlainOrMarkdown) {
          missing.push({
            path: inputPath,
            error: `File not found for plain/markdown path: ${toCurrentPath(resolved.path)}`,
          });
          continue;
        }

        schemas.push({
          path: toCurrentPath(resolved.path),
          hint: formatTemplateDefinitionHint({
            templateId: classification.templateId,
            description: classification.description,
            shape: classification.resourceShape,
            scope: classification.scope,
            domain: classification.domain,
            permissionClass: classification.permissionClass,
            contentTypes: templateContentTypes,
            resolvedContentType: inferredContentType,
          }),
          classification: {
            canonicalPath: classification.canonicalPath,
            templateId: classification.templateId,
            permissionClass: classification.permissionClass,
            scope: classification.scope,
            domain: classification.domain,
            resourceShape: classification.resourceShape,
            criticality: classification.criticality,
            retention: classification.retention,
            allowedWriteOps: [...classification.allowedWriteOps],
          },
        });
      }
    }

    return createSuccess({ schemas, missing }, "VFS schema described");
  });

export const handleInspectSearch: VfsToolHandler = (args, ctx) =>
  runWithStructuredErrors("vfs_search", args, async () => {
    const session = getSession(ctx);
    const typedArgs = args as any;
    const limit = typedArgs.limit ?? 20;
    if (limit <= 0) {
      return createSuccess({ results: [] }, "VFS search complete");
    }

    const resolvedPath = typedArgs.path
      ? resolveCurrentPath(ctx, typedArgs.path)
      : null;
    if (resolvedPath && isPathResolveError(resolvedPath)) {
      return resolvedPath.error;
    }
    const rootPath = resolvedPath?.ok ? resolvedPath.path : undefined;
    const files = session.snapshotAll();
    const regex = Boolean(typedArgs.regex);
    const fuzzy = Boolean(typedArgs.fuzzy);
    const semantic = Boolean(typedArgs.semantic);

    if (regex) {
      let regexObj: RegExp;
      try {
        regexObj = new RegExp(typedArgs.query);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return createError(`Invalid regex: ${message}`, "INVALID_DATA", {
          recovery: [
            "Fix the regex pattern (escape special characters) and retry.",
            "Or retry with regex=false to use plain text / fuzzy search.",
          ],
        });
      }

      const rawResults = collectMatches(
        files,
        rootPath,
        makeRegexMatcher(regexObj),
        limit,
      );
      const results = rawResults.map((match) => ({
        ...match,
        path: toCurrentPath(match.path),
      }));
      return createSuccess({ results }, "VFS search complete");
    }

    if (semantic) {
      if (!ctx.embeddingEnabled) {
        return createError(
          "Semantic search is disabled because RAG/embedding is currently off.",
          "RAG_DISABLED",
        );
      }

      const forkId =
        typeof ctx.gameState?.forkId === "number"
          ? ctx.gameState.forkId
          : undefined;
      const beforeTurn =
        typeof ctx.gameState?.turnNumber === "number"
          ? ctx.gameState.turnNumber
          : undefined;

      const ragMatches = await searchSemanticWithRag(session, typedArgs.query, {
        rootPath,
        limit,
        forkId,
        beforeTurn,
      });

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
