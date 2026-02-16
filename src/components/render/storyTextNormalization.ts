/**
 * Fallback normalizer for narrative text that accidentally keeps escaped
 * line-break markers (e.g. "\\n\\n") as plain text.
 */
export const normalizeNarrativeMarkdown = (content: string): string => {
  if (!content || !content.includes("\\n")) {
    return content;
  }

  const escapedBreakCount = content.match(/\\n/g)?.length ?? 0;
  const realBreakCount = content.match(/\n/g)?.length ?? 0;
  const hasQuotedEscapedBreaks = /(["'])\s*((?:\\r\\n|\\n){1,})\s*\1/.test(
    content,
  );

  const shouldNormalize =
    escapedBreakCount >= 2 &&
    (content.includes("\\n\\n") ||
      realBreakCount === 0 ||
      hasQuotedEscapedBreaks);

  if (!shouldNormalize) {
    return content;
  }

  // Handle double-escaped cases first, then decode to real control chars.
  const deescaped = content
    .replace(/\\\\r\\\\n/g, "\\r\\n")
    .replace(/\\\\n/g, "\\n")
    .replace(/\\\\t/g, "\\t")
    // Sometimes model output inserts quote-wrapped paragraph separators: "...\"\\n\\n\"..."
    .replace(/(["'])\s*((?:\\r\\n|\\n){1,})\s*\1/g, "$2");

  return deescaped
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
};
