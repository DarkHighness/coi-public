import { createError, createSuccess } from "../../../tools/toolResult";
import {
  ensureTextFile,
  resolveTextContentType,
  validateExpectedHash,
} from "../../../tools/handlers/vfsMutationGuard";
import { toCurrentPath } from "../../currentAlias";
import {
  ensureNotFinishGuardedMutation,
  isPathResolveError,
  requireToolSeenForExistingFile,
  resolveCurrentPath,
  runWithStructuredErrors,
  withAtomicSession,
  type VfsToolHandler,
} from "./shared";
import {
  parseMarkdownSections,
  selectMarkdownByHeading,
  selectMarkdownByIndex,
} from "./markdownSections";

type MarkdownSelectorInput = { heading?: string; index?: string };

interface ParsedSelector {
  kind: "heading" | "index";
  value: string;
}

const normalizeSectionBody = (body: string): string => body.trimEnd();

const formatSectionMarkdown = (
  level: number,
  title: string,
  body: string,
): string => {
  const headingLine = `${"#".repeat(level)} ${title.trim()}`;
  const normalizedBody = normalizeSectionBody(body);
  if (!normalizedBody) {
    return `${headingLine}\n`;
  }
  return `${headingLine}\n\n${normalizedBody}\n`;
};

const ensureSingleSelector = (
  selector: MarkdownSelectorInput | undefined,
  fieldName: string,
): { ok: true; selector: ParsedSelector } | { ok: false; error: string } => {
  if (!selector) {
    return { ok: false, error: `${fieldName} is required.` };
  }

  const hasHeading =
    typeof selector.heading === "string" && selector.heading.trim().length > 0;
  const hasIndex =
    typeof selector.index === "string" && selector.index.trim().length > 0;

  if (hasHeading === hasIndex) {
    return {
      ok: false,
      error: `${fieldName} must provide exactly one of heading or index.`,
    };
  }

  if (hasHeading) {
    return {
      ok: true,
      selector: {
        kind: "heading",
        value: selector.heading!.trim(),
      },
    };
  }

  return {
    ok: true,
    selector: {
      kind: "index",
      value: selector.index!.trim(),
    },
  };
};

const normalizeMarkdownDocument = (content: string): string => {
  if (!content) {
    return "";
  }
  const compacted = content.replace(/\n{3,}/g, "\n\n");
  return compacted.endsWith("\n") ? compacted : `${compacted}\n`;
};

const resolveSectionsBySelector = (
  content: string,
  selector: ParsedSelector,
): {
  matches: ReturnType<typeof parseMarkdownSections>["flat"];
  missing: string[];
  ambiguous: Array<{ heading: string; indices: string[] }>;
} => {
  const parsed = parseMarkdownSections(content);
  if (selector.kind === "index") {
    const byIndex = selectMarkdownByIndex(parsed, [selector.value]);
    return {
      matches: byIndex.matches,
      missing: byIndex.missing,
      ambiguous: [],
    };
  }

  const byHeading = selectMarkdownByHeading(parsed, [selector.value]);
  return {
    matches: byHeading.matches,
    missing: byHeading.missing,
    ambiguous: byHeading.ambiguous,
  };
};

const resolveUniqueSectionBySelector = (
  content: string,
  selector: ParsedSelector,
  fieldName: string,
): { ok: true; section: ReturnType<typeof parseMarkdownSections>["flat"][number] } | { ok: false; error: string } => {
  const selected = resolveSectionsBySelector(content, selector);
  if (selected.ambiguous.length > 0) {
    const details = selected.ambiguous
      .map(
        (entry) =>
          `${entry.heading}: ${entry.indices.join(", ")}`,
      )
      .join("; ");
    return {
      ok: false,
      error: `${fieldName} is ambiguous. ${details}. Use index selector.`,
    };
  }

  if (selected.matches.length === 0) {
    return {
      ok: false,
      error: `${fieldName} did not match any section.`,
    };
  }

  if (selected.matches.length > 1) {
    return {
      ok: false,
      error: `${fieldName} matched multiple sections. Use a more specific selector.`,
    };
  }

  return {
    ok: true,
    section: selected.matches[0],
  };
};

const insertSection = (
  content: string,
  offset: number,
  sectionMarkdown: string,
): string => {
  const before = content.slice(0, offset);
  const after = content.slice(offset);

  let prefix = "";
  if (before.length > 0) {
    if (!before.endsWith("\n")) {
      prefix += "\n";
    }
    if (!before.endsWith("\n\n")) {
      prefix += "\n";
    }
  }

  let suffix = "";
  if (after.length > 0 && !after.startsWith("\n")) {
    suffix = "\n";
  }

  return `${before}${prefix}${sectionMarkdown.trimEnd()}${suffix}${after}`;
};

export const handleWriteMarkdown: VfsToolHandler = (args, ctx) =>
  runWithStructuredErrors("vfs_write_markdown", args, () => {
    const typedArgs = args as {
      path: string;
      action: "add_section" | "replace_section" | "delete_section";
      target?: MarkdownSelectorInput;
      parent?: MarkdownSelectorInput;
      section?: { title: string; level?: number; content?: string };
      content?: string;
      expectedHash?: string;
    };

    return withAtomicSession(ctx, (draft) => {
      const resolved = resolveCurrentPath(ctx, typedArgs.path);
      if (isPathResolveError(resolved)) {
        return resolved.error;
      }

      const finishGuardError = ensureNotFinishGuardedMutation(
        resolved.path,
        "vfs_write_markdown",
      );
      if (finishGuardError) {
        return finishGuardError;
      }

      const existing = draft.readFile(resolved.path);
      if (existing) {
        const seenError = requireToolSeenForExistingFile(
          draft,
          resolved.path,
          "text_edit",
        );
        if (seenError) {
          return seenError;
        }
      }

      const hashError = validateExpectedHash(
        existing,
        typedArgs.expectedHash,
        typedArgs.path,
      );
      if (hashError) {
        return hashError;
      }

      const textTypeError = ensureTextFile(existing, typedArgs.path);
      if (textTypeError) {
        return textTypeError;
      }

      if (existing && existing.contentType !== "text/markdown") {
        return createError(
          `vfs_write_markdown requires markdown file target: ${typedArgs.path}`,
          "INVALID_DATA",
        );
      }
      if (!existing && !resolved.path.toLowerCase().endsWith(".md")) {
        return createError(
          "vfs_write_markdown can only create .md targets.",
          "INVALID_DATA",
        );
      }

      const currentContent = existing ? existing.content : "";
      const action = typedArgs.action;
      let nextContent = currentContent;

      if (action === "add_section") {
        const sectionInput = typedArgs.section;
        if (
          !sectionInput ||
          typeof sectionInput.title !== "string" ||
          sectionInput.title.trim().length === 0
        ) {
          return createError(
            "add_section requires section.title.",
            "INVALID_PARAMS",
          );
        }

        let insertionOffset = currentContent.length;
        let level =
          typeof sectionInput.level === "number"
            ? Math.max(1, Math.min(6, Math.floor(sectionInput.level)))
            : 1;

        if (typedArgs.parent) {
          const parentSelector = ensureSingleSelector(typedArgs.parent, "parent");
          if (parentSelector.ok === false) {
            return createError(parentSelector.error, "INVALID_PARAMS");
          }

          const parentResolved = resolveUniqueSectionBySelector(
            currentContent,
            parentSelector.selector,
            "parent",
          );
          if (parentResolved.ok) {
            insertionOffset = parentResolved.section.endOffset;
            if (typeof sectionInput.level !== "number") {
              level = Math.min(parentResolved.section.level + 1, 6);
            }
          }
        }

        const sectionMarkdown = formatSectionMarkdown(
          level,
          sectionInput.title,
          typeof sectionInput.content === "string" ? sectionInput.content : "",
        );
        nextContent = insertSection(currentContent, insertionOffset, sectionMarkdown);
      } else if (action === "replace_section") {
        const targetSelector = ensureSingleSelector(typedArgs.target, "target");
        if (targetSelector.ok === false) {
          return createError(targetSelector.error, "INVALID_PARAMS");
        }

        if (typeof typedArgs.content !== "string") {
          return createError(
            "replace_section requires content.",
            "INVALID_PARAMS",
          );
        }

        const targetResolved = resolveUniqueSectionBySelector(
          currentContent,
          targetSelector.selector,
          "target",
        );
        if (targetResolved.ok === false) {
          return createError(targetResolved.error, "INVALID_DATA");
        }

        const replacement = formatSectionMarkdown(
          targetResolved.section.level,
          targetResolved.section.title,
          typedArgs.content,
        );
        nextContent =
          currentContent.slice(0, targetResolved.section.startOffset) +
          replacement +
          currentContent.slice(targetResolved.section.endOffset);
      } else if (action === "delete_section") {
        const targetSelector = ensureSingleSelector(typedArgs.target, "target");
        if (targetSelector.ok === false) {
          return createError(targetSelector.error, "INVALID_PARAMS");
        }

        const targetResolved = resolveUniqueSectionBySelector(
          currentContent,
          targetSelector.selector,
          "target",
        );
        if (targetResolved.ok === false) {
          return createError(targetResolved.error, "INVALID_DATA");
        }

        nextContent =
          currentContent.slice(0, targetResolved.section.startOffset) +
          currentContent.slice(targetResolved.section.endOffset);
      } else {
        return createError(`Unsupported action: ${action}`, "INVALID_PARAMS");
      }

      nextContent = normalizeMarkdownDocument(nextContent);
      draft.writeFile(
        resolved.path,
        nextContent,
        resolveTextContentType(resolved.path, existing ?? null),
      );
      draft.noteToolAccessFile(resolved.path);

      const parsedNext = parseMarkdownSections(nextContent);
      return createSuccess(
        {
          path: toCurrentPath(resolved.path),
          action,
          sections: parsedNext.tree,
          sectionCount: parsedNext.flat.length,
          chars: nextContent.length,
        },
        "VFS markdown section mutation applied",
      );
    });
  });
