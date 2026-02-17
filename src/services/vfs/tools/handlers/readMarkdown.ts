import { createError, createSuccess } from "../../../tools/toolResult";
import { resolveVfsReadTokenBudget } from "../../../ai/contextUsage";
import { createReadTokenCounter } from "../../../ai/tokenCounter";
import { toCurrentPath } from "../../currentAlias";
import { normalizeVfsPath } from "../../utils";
import {
  buildNotFoundRecovery,
  createReadLimitError,
  getSession,
  getToolDocRef,
  isPathResolveError,
  resolveCurrentPath,
  runWithStructuredErrors,
  type VfsToolHandler,
} from "./shared";
import {
  dedupeMarkdownSelections,
  getMarkdownSectionContent,
  parseMarkdownSections,
  selectMarkdownByHeading,
  selectMarkdownByIndex,
} from "./markdownSections";

export const handleReadMarkdown: VfsToolHandler = (args, ctx) =>
  runWithStructuredErrors("vfs_read_markdown", args, () => {
    const session = getSession(ctx);
    const typedArgs = args as {
      path: string;
      headings?: string[];
      indices?: string[];
      maxChars?: number;
    };

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
      return createError(`File not found: ${typedArgs.path}`, "NOT_FOUND", {
        tool: "vfs_read_markdown",
        issues: [
          {
            path: qualifiedPath,
            code: "NOT_FOUND",
            message: "File does not exist in the VFS snapshot.",
          },
        ],
        recovery: buildNotFoundRecovery(typedArgs.path),
        refs: [getToolDocRef("vfs_read_markdown")],
      });
    }

    if (file.contentType !== "text/markdown") {
      return createError(
        `vfs_read_markdown only supports markdown files: ${typedArgs.path}`,
        "INVALID_DATA",
      );
    }

    session.noteToolSeen(resolved.path);
    session.noteToolAccessFile(resolved.path);

    const headings = Array.isArray(typedArgs.headings)
      ? typedArgs.headings
      : [];
    const indices = Array.isArray(typedArgs.indices) ? typedArgs.indices : [];
    const selectorsCount = headings.length + indices.length;
    if (selectorsCount === 0) {
      return createError(
        "vfs_read_markdown requires at least one selector: headings or indices.",
        "INVALID_PARAMS",
      );
    }

    const parsed = parseMarkdownSections(file.content);
    const headingSelection = selectMarkdownByHeading(parsed, headings);
    if (headingSelection.ambiguous.length > 0) {
      const ambiguityLines = headingSelection.ambiguous
        .map(
          (entry) =>
            `heading "${entry.heading}" matched multiple sections: ${entry.indices.join(", ")}`,
        )
        .join("; ");
      return createError(
        `vfs_read_markdown heading selector is ambiguous. ${ambiguityLines}. Use indices instead.`,
        "INVALID_DATA",
      );
    }

    const indexSelection = selectMarkdownByIndex(parsed, indices);
    const selectedSections = dedupeMarkdownSelections([
      ...headingSelection.matches,
      ...indexSelection.matches,
    ]);

    if (selectedSections.length === 0) {
      const missingReasons: string[] = [];
      if (headingSelection.missing.length > 0) {
        missingReasons.push(
          `headings: ${headingSelection.missing.map((item) => `"${item}"`).join(", ")}`,
        );
      }
      if (indexSelection.missing.length > 0) {
        missingReasons.push(
          `indices: ${indexSelection.missing.map((item) => `"${item}"`).join(", ")}`,
        );
      }
      const details =
        missingReasons.length > 0 ? ` (${missingReasons.join("; ")})` : "";
      return createError(
        `No markdown sections matched selectors for ${typedArgs.path}${details}`,
        "NOT_FOUND",
      );
    }

    const readBudgetResolution = resolveVfsReadTokenBudget(ctx.settings);
    const readTokenBudget = readBudgetResolution.tokenBudget;
    const readSafeCharsHint = readBudgetResolution.projectedSafeChars;
    const readCalibrationFactor = readBudgetResolution.calibrationFactor;
    const tokenCounter = createReadTokenCounter({
      settings: ctx.settings,
      calibrationFactor: readCalibrationFactor,
    });
    const estimateReadTokens = (content: string): number => {
      const result = tokenCounter.count(content);
      if (result instanceof Promise) {
        throw new Error("Unexpected async token counter in sync markdown path");
      }
      return result.tokens;
    };
    const countReadTokensAsync = async (content: string): Promise<number> => {
      const result = await tokenCounter.count(content);
      return result.tokens;
    };

    const maxChars =
      typeof typedArgs.maxChars === "number" ? typedArgs.maxChars : null;
    const finalizeSuccess = (
      sections: Array<{
        section: {
          index: string;
          title: string;
          level: number;
          startLine: number;
          endLine: number;
          chars: number;
        };
        content: string;
      }>,
    ) =>
      createSuccess(
        {
          mode: "markdown",
          path: toCurrentPath(file.path),
          contentType: file.contentType,
          sections: sections.map((entry) => ({
            index: entry.section.index,
            title: entry.section.title,
            level: entry.section.level,
            startLine: entry.section.startLine,
            endLine: entry.section.endLine,
            chars: entry.section.chars,
            content: entry.content,
          })),
          selection: {
            headings,
            indices,
            matched: selectedSections.map((section) => section.index),
            missing: {
              headings: headingSelection.missing,
              indices: indexSelection.missing,
            },
          },
          size: file.size,
          hash: file.hash,
          updatedAt: file.updatedAt,
        },
        "VFS markdown sections read",
      );

    if (!tokenCounter.usesProviderCountTokens) {
      let totalEstimatedTokens = 0;

      const sections = selectedSections.map((section) => {
        const content = getMarkdownSectionContent(file.content, section);
        if (typeof maxChars === "number" && content.length > maxChars) {
          return { section, content, error: "MAX_CHARS_EXCEEDED" as const };
        }

        const sectionEstimatedTokens = estimateReadTokens(content);
        totalEstimatedTokens += sectionEstimatedTokens;
        if (sectionEstimatedTokens > readTokenBudget) {
          return {
            section,
            content,
            error: "SINGLE_SECTION_TOKEN_EXCEEDED" as const,
            sectionEstimatedTokens,
          };
        }
        return { section, content, sectionEstimatedTokens, error: null };
      });

      const maxCharsFailure = sections.find(
        (entry) => entry.error === "MAX_CHARS_EXCEEDED",
      );
      if (maxCharsFailure) {
        return createReadLimitError(
          "markdown",
          `section "${maxCharsFailure.section.index}" yields ${maxCharsFailure.content.length} chars, exceeding maxChars=${maxChars}`,
          typedArgs.path,
          {
            tokenBudget: readTokenBudget,
            estimatedTokens: estimateReadTokens(maxCharsFailure.content),
            suggestedChunkChars: readSafeCharsHint,
          },
          "vfs_read_markdown",
        );
      }

      const singleSectionTokenFailure = sections.find(
        (entry) => entry.error === "SINGLE_SECTION_TOKEN_EXCEEDED",
      ) as
        | undefined
        | {
            section: { index: string };
            sectionEstimatedTokens: number;
            content: string;
            error: "SINGLE_SECTION_TOKEN_EXCEEDED";
          };

      if (singleSectionTokenFailure) {
        return createReadLimitError(
          "markdown",
          `section "${singleSectionTokenFailure.section.index}" payload token count is ${singleSectionTokenFailure.sectionEstimatedTokens}, exceeding budget ${readTokenBudget}`,
          typedArgs.path,
          {
            tokenBudget: readTokenBudget,
            estimatedTokens: singleSectionTokenFailure.sectionEstimatedTokens,
            suggestedChunkChars: readSafeCharsHint,
          },
          "vfs_read_markdown",
        );
      }

      if (totalEstimatedTokens > readTokenBudget) {
        return createReadLimitError(
          "markdown",
          `combined markdown section payload token count is ${totalEstimatedTokens}, exceeding budget ${readTokenBudget}`,
          typedArgs.path,
          {
            tokenBudget: readTokenBudget,
            estimatedTokens: totalEstimatedTokens,
            suggestedChunkChars: readSafeCharsHint,
          },
          "vfs_read_markdown",
        );
      }

      return finalizeSuccess(
        sections.map((entry) => ({
          section: entry.section,
          content: entry.content,
        })),
      );
    }

    return (async () => {
      const sections: Array<{
        section: {
          index: string;
          title: string;
          level: number;
          startLine: number;
          endLine: number;
          chars: number;
        };
        content: string;
      }> = [];
      let totalEstimatedTokens = 0;

      for (const section of selectedSections) {
        const content = getMarkdownSectionContent(file.content, section);
        if (typeof maxChars === "number" && content.length > maxChars) {
          const sectionTokens = await countReadTokensAsync(content);
          return createReadLimitError(
            "markdown",
            `section "${section.index}" yields ${content.length} chars, exceeding maxChars=${maxChars}`,
            typedArgs.path,
            {
              tokenBudget: readTokenBudget,
              estimatedTokens: sectionTokens,
              suggestedChunkChars: readSafeCharsHint,
            },
            "vfs_read_markdown",
          );
        }

        const sectionEstimatedTokens = await countReadTokensAsync(content);
        totalEstimatedTokens += sectionEstimatedTokens;
        if (sectionEstimatedTokens > readTokenBudget) {
          return createReadLimitError(
            "markdown",
            `section "${section.index}" payload token count is ${sectionEstimatedTokens}, exceeding budget ${readTokenBudget}`,
            typedArgs.path,
            {
              tokenBudget: readTokenBudget,
              estimatedTokens: sectionEstimatedTokens,
              suggestedChunkChars: readSafeCharsHint,
            },
            "vfs_read_markdown",
          );
        }

        sections.push({ section, content });
      }

      if (totalEstimatedTokens > readTokenBudget) {
        return createReadLimitError(
          "markdown",
          `combined markdown section payload token count is ${totalEstimatedTokens}, exceeding budget ${readTokenBudget}`,
          typedArgs.path,
          {
            tokenBudget: readTokenBudget,
            estimatedTokens: totalEstimatedTokens,
            suggestedChunkChars: readSafeCharsHint,
          },
          "vfs_read_markdown",
        );
      }

      return finalizeSuccess(sections);
    })();
  });
