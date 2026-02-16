import { createError, createSuccess } from "../../../tools/toolResult";
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
  formatTemplateDefinitionHint,
  getSession,
  globToRegExp,
  hasSpecificTemplateDefinition,
  inferContentTypeFromPath,
  isInScope,
  isPathResolveError,
  isPlainOrMarkdownContentType,
  makeRegexMatcher,
  normalizeGlobInput,
  resolveCurrentPath,
  resolveCurrentPathLoose,
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
      const snapshot = session.snapshotAll();
      const snapshotPaths = Object.keys(snapshot);
      const resolveEntryPath = (entryPath: string): string => {
        const normalizedEntry = normalizeVfsPath(entryPath);
        if (!baseResolved.path) {
          return normalizedEntry;
        }
        return normalizeVfsPath(`${baseResolved.path}/${normalizedEntry}`);
      };
      const stats = entries.map((entryPath) => {
        const resolvedEntryPath = resolveEntryPath(entryPath);
        const file = session.readFile(resolvedEntryPath);
        if (file) {
          return toLsStatEntryForFile(file);
        }
        return toLsStatEntryForDir(resolvedEntryPath, snapshotPaths);
      });

      const payload: Record<string, unknown> = { entries, stats };

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

      return createSuccess(payload, "VFS entries listed with metadata");
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

    return createSuccess(payload, "VFS glob listing complete with metadata");
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
