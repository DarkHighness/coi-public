import { createError, createSuccess } from "../../../tools/toolResult";
import { getVfsSchemaHint } from "../../../providers/utils";
import {
  estimateTokensForMixedText,
  resolveVfsReadTokenBudget,
} from "../../../ai/contextUsage";
import { toCurrentPath } from "../../currentAlias";
import { normalizeVfsPath } from "../../utils";
import { getSchemaForPath } from "../../schemas";
import { vfsPathRegistry } from "../../core/pathRegistry";
import { vfsResourceRegistry } from "../../core/resourceRegistry";
import { buildVfsLayoutReport } from "../../layoutReport";
import { parseMarkdownSections } from "./markdownSections";
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

const isString = (value: unknown): value is string => typeof value === "string";

const asStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  return value.filter(isString);
};

export const handleInspectLs: VfsToolHandler = (args, ctx) =>
  runWithStructuredErrors("vfs_ls", args, () => {
    const session = getSession(ctx);
    const runtime = args as Record<string, unknown>;
    const pathArg = typeof runtime.path === "string" ? runtime.path : undefined;
    const patterns = asStringArray(runtime.patterns);
    const excludePatterns = asStringArray(runtime.excludePatterns);
    const limit = typeof runtime.limit === "number" ? runtime.limit : 200;
    const ignoreCase = Boolean(runtime.ignoreCase);
    const includeExpected = Boolean(runtime.includeExpected);
    const includeAccess = Boolean(runtime.includeAccess);
    const baseResolved = resolveCurrentPathLoose(ctx, pathArg);
    if (isPathResolveError(baseResolved)) {
      return baseResolved.error;
    }
    session.noteToolAccessScope(baseResolved.path ?? "");
    const activeForkId =
      typeof ctx.gameState?.forkId === "number"
        ? ctx.gameState.forkId
        : session.getActiveForkId();
    const readBudgetResolution = resolveVfsReadTokenBudget(ctx.settings);
    const readTokenBudget = readBudgetResolution.tokenBudget;
    const readCalibrationFactor = readBudgetResolution.calibrationFactor;
    const lsHintThresholdTokens = Math.max(1, Math.floor(readTokenBudget * 0.9));
    const lsHintLimit = 8;

    const recommendReadTool = (
      contentType: string,
      path: string,
    ): string => {
      if (contentType === "application/json") {
        return "vfs_read_json with narrow pointers";
      }
      if (contentType === "text/markdown" || path.toLowerCase().endsWith(".md")) {
        return "vfs_read_markdown by headings/indices (or vfs_read_lines windows)";
      }
      if (contentType === "text/plain" || contentType === "application/jsonl") {
        return "vfs_read_lines with bounded ranges";
      }
      return "bounded vfs_read_lines / vfs_read_chars windows";
    };

    const buildLsHints = (
      files: Array<{ path: string; contentType: string; content: string }>,
    ): string[] => {
      if (files.length === 0) {
        return [];
      }

      const candidates = files
        .map((file) => ({
          ...file,
          estimatedTokens: estimateTokensForMixedText(file.content, {
            calibrationFactor: readCalibrationFactor,
          }),
        }))
        .filter((file) => file.estimatedTokens >= lsHintThresholdTokens)
        .sort((a, b) => b.estimatedTokens - a.estimatedTokens)
        .slice(0, lsHintLimit);

      return candidates.map((file) => {
        const recommended = recommendReadTool(file.contentType, file.path);
        return `${toCurrentPath(file.path)} may exceed single-read budget (${file.estimatedTokens} tokens est / ${readTokenBudget} budget). Prefer ${recommended}.`;
      });
    };

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
      const filesForHints: Array<{
        path: string;
        contentType: string;
        content: string;
      }> = [];
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
          filesForHints.push({
            path: file.path,
            contentType: file.contentType,
            content: file.content,
          });
          return toLsStatEntryForFile(file);
        }
        return toLsStatEntryForDir(resolvedEntryPath, snapshotPaths);
      });

      const payload: Record<string, unknown> = {
        entries,
        stats,
        hints: buildLsHints(filesForHints),
      };

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
    if (excludePatterns) {
      for (const raw of excludePatterns) {
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
    const filesForHints: Array<{
      path: string;
      contentType: string;
      content: string;
    }> = [];

    const stats = selectedMatches.flatMap((path) => {
      const file = session.readFile(path);
      if (!file) return [];
      filesForHints.push({
        path: file.path,
        contentType: file.contentType,
        content: file.content,
      });
      return [toLsStatEntryForFile(file)];
    });

    const payload: Record<string, unknown> = {
      entries: matches,
      stats,
      hints: buildLsHints(filesForHints),
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
    const runtime = args as Record<string, unknown>;
    const paths = asStringArray(runtime.paths) ?? [];
    if (paths.length === 0) {
      return createError("vfs_schema: paths must include at least one path", "INVALID_DATA");
    }
    const isMarkdownContentType = (value: string | null | undefined): boolean =>
      value === "text/markdown";
    const toMarkdownSections = (content: string | null): ReturnType<
      typeof parseMarkdownSections
    >["tree"] =>
      typeof content === "string" ? parseMarkdownSections(content).tree : [];

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
      markdownSections?: ReturnType<typeof parseMarkdownSections>["tree"];
      markdownSectionsNote?: string;
    }> = [];
    const missing: Array<{ path: string; error: string }> = [];

    for (const inputPath of paths) {
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
      const markdownPath =
        isMarkdownContentType(existingFile?.contentType) ||
        isMarkdownContentType(inferredContentType) ||
        templateContentTypes.some((contentType) =>
          isMarkdownContentType(contentType),
        );
      const classificationPayload = {
        canonicalPath: classification.canonicalPath,
        templateId: classification.templateId,
        permissionClass: classification.permissionClass,
        scope: classification.scope,
        domain: classification.domain,
        resourceShape: classification.resourceShape,
        criticality: classification.criticality,
        retention: classification.retention,
        allowedWriteOps: [...classification.allowedWriteOps],
      };

      try {
        const schema = getSchemaForPath(resolved.path);
        const markdownSections = markdownPath
          ? toMarkdownSections(existingFile?.content ?? null)
          : undefined;
        schemas.push({
          path: toCurrentPath(resolved.path),
          hint: getVfsSchemaHint(schema),
          classification: classificationPayload,
          ...(markdownPath ? { markdownSections } : {}),
          ...(markdownPath && !existingFile
            ? {
                markdownSectionsNote:
                  "Markdown file not found. Section tree is empty until the file exists.",
              }
            : {}),
        });
      } catch (schemaError) {
        if (!hasSpecificTemplateDefinition(classification.templateId)) {
          if (markdownPath) {
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
              classification: classificationPayload,
              markdownSections: toMarkdownSections(existingFile?.content ?? null),
              markdownSectionsNote: existingFile
                ? undefined
                : "Markdown file not found. Section tree is empty until the file exists.",
            });
            continue;
          }
          const message =
            schemaError instanceof Error
              ? schemaError.message
              : String(schemaError);
          missing.push({ path: inputPath, error: message });
          continue;
        }

        if (!existingFile && looksLikePlainOrMarkdown && !markdownPath) {
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
          classification: classificationPayload,
          ...(markdownPath
            ? {
                markdownSections: toMarkdownSections(existingFile?.content ?? null),
                markdownSectionsNote: existingFile
                  ? undefined
                  : "Markdown file not found. Section tree is empty until the file exists.",
              }
            : {}),
        });
      }
    }

    return createSuccess({ schemas, missing }, "VFS schema described");
  });

export const handleInspectSearch: VfsToolHandler = (args, ctx) =>
  runWithStructuredErrors("vfs_search", args, async () => {
    const session = getSession(ctx);
    const runtime = args as Record<string, unknown>;
    const query = typeof runtime.query === "string" ? runtime.query : null;
    if (!query) {
      return createError("vfs_search: query must be a non-empty string", "INVALID_DATA");
    }
    const limit = typeof runtime.limit === "number" ? runtime.limit : 20;
    if (limit <= 0) {
      return createSuccess({ results: [] }, "VFS search complete");
    }

    const pathArg = typeof runtime.path === "string" ? runtime.path : undefined;
    const resolvedPath = pathArg
      ? resolveCurrentPath(ctx, pathArg)
      : null;
    if (resolvedPath && isPathResolveError(resolvedPath)) {
      return resolvedPath.error;
    }
    const rootPath = resolvedPath?.ok ? resolvedPath.path : undefined;
    const files = session.snapshotAll();
    const regex = Boolean(runtime.regex);
    const fuzzy = Boolean(runtime.fuzzy);
    const semantic = Boolean(runtime.semantic);

    if (regex) {
      let regexObj: RegExp;
      try {
        regexObj = new RegExp(query);
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

      const ragMatches = await searchSemanticWithRag(session, query, {
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

      const semanticMatches = session.searchSemantic(query, {
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
      ? collectFuzzyMatches(files, rootPath, query, limit)
      : collectMatches(
          files,
          rootPath,
          (line) => line.includes(query),
          limit,
        );

    const results = rawResults.map((match) => ({
      ...match,
      path: toCurrentPath(match.path),
    }));

    return createSuccess({ results }, "VFS search complete");
  });
