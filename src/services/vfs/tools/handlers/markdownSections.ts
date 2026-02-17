export interface MarkdownSectionNode {
  index: string;
  title: string;
  level: number;
  startLine: number;
  endLine: number;
  chars: number;
  children: MarkdownSectionNode[];
}

export interface MarkdownSectionFlatNode {
  index: string;
  title: string;
  level: number;
  startLine: number;
  endLine: number;
  chars: number;
  startOffset: number;
  endOffset: number;
}

export interface ParsedMarkdownSections {
  tree: MarkdownSectionNode[];
  flat: MarkdownSectionFlatNode[];
}

interface HeadingCandidate {
  title: string;
  level: number;
  startLine: number;
}

const HEADING_PATTERN = /^ {0,3}(#{1,6})[ \t]+(.+?)\s*#*\s*$/;
const FENCE_OPEN_PATTERN = /^ {0,3}(`{3,}|~{3,})/;

const normalizeHeadingQuery = (input: string): string => input.trim();

const splitLinesWithOffsets = (
  content: string,
): {
  lines: string[];
  lineStartOffsets: number[];
} => {
  if (content.length === 0) {
    return {
      lines: [""],
      lineStartOffsets: [0],
    };
  }

  const lines: string[] = [];
  const lineStartOffsets: number[] = [];

  let cursor = 0;
  while (cursor < content.length) {
    const start = cursor;
    while (
      cursor < content.length &&
      content[cursor] !== "\n" &&
      content[cursor] !== "\r"
    ) {
      cursor += 1;
    }

    lines.push(content.slice(start, cursor));
    lineStartOffsets.push(start);

    if (cursor >= content.length) {
      break;
    }

    if (
      content[cursor] === "\r" &&
      cursor + 1 < content.length &&
      content[cursor + 1] === "\n"
    ) {
      cursor += 2;
    } else {
      cursor += 1;
    }

    if (cursor === content.length) {
      lines.push("");
      lineStartOffsets.push(cursor);
    }
  }

  return { lines, lineStartOffsets };
};

const collectHeadingCandidates = (lines: string[]): HeadingCandidate[] => {
  const headings: HeadingCandidate[] = [];
  let inFence = false;
  let fenceChar = "";
  let fenceLength = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const fenceMatch = line.match(FENCE_OPEN_PATTERN);

    if (!inFence) {
      if (fenceMatch) {
        inFence = true;
        fenceChar = fenceMatch[1][0] ?? "";
        fenceLength = fenceMatch[1].length;
        continue;
      }

      const headingMatch = line.match(HEADING_PATTERN);
      if (!headingMatch) {
        continue;
      }

      const title = normalizeHeadingQuery(headingMatch[2] ?? "");
      if (!title) {
        continue;
      }

      headings.push({
        title,
        level: headingMatch[1].length,
        startLine: i + 1,
      });
      continue;
    }

    if (fenceChar) {
      const closePattern = new RegExp(
        `^ {0,3}${fenceChar}{${fenceLength},}\\s*$`,
      );
      if (closePattern.test(line)) {
        inFence = false;
        fenceChar = "";
        fenceLength = 0;
      }
    }
  }

  return headings;
};

const toTree = (flat: MarkdownSectionFlatNode[]): MarkdownSectionNode[] => {
  const roots: MarkdownSectionNode[] = [];
  const stack: MarkdownSectionNode[] = [];

  for (const section of flat) {
    const node: MarkdownSectionNode = {
      index: section.index,
      title: section.title,
      level: section.level,
      startLine: section.startLine,
      endLine: section.endLine,
      chars: section.chars,
      children: [],
    };

    while (
      stack.length > 0 &&
      (stack[stack.length - 1]?.level ?? Number.POSITIVE_INFINITY) >= node.level
    ) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1]?.children.push(node);
    }

    stack.push(node);
  }

  return roots;
};

export const parseMarkdownSections = (
  content: string,
): ParsedMarkdownSections => {
  const { lines, lineStartOffsets } = splitLinesWithOffsets(content);
  const headings = collectHeadingCandidates(lines);

  const counters = [0, 0, 0, 0, 0, 0];
  const flat: MarkdownSectionFlatNode[] = [];
  const totalLines = lines.length;

  for (let i = 0; i < headings.length; i += 1) {
    const current = headings[i];
    let endLine = totalLines;

    for (let j = i + 1; j < headings.length; j += 1) {
      const candidate = headings[j];
      if (candidate.level <= current.level) {
        endLine = candidate.startLine - 1;
        break;
      }
    }

    const level = current.level;
    counters[level - 1] += 1;
    for (let j = level; j < counters.length; j += 1) {
      counters[j] = 0;
    }

    const indexParts: number[] = [];
    for (let j = 0; j < level; j += 1) {
      if (counters[j] > 0) {
        indexParts.push(counters[j]);
      }
    }
    const index = indexParts.join(".");
    const startOffset = lineStartOffsets[current.startLine - 1] ?? 0;
    const endOffset =
      endLine >= totalLines
        ? content.length
        : (lineStartOffsets[endLine] ?? content.length);

    flat.push({
      index,
      title: current.title,
      level,
      startLine: current.startLine,
      endLine,
      chars: Math.max(0, endOffset - startOffset),
      startOffset,
      endOffset: Math.max(startOffset, endOffset),
    });
  }

  return {
    tree: toTree(flat),
    flat,
  };
};

export const getMarkdownSectionContent = (
  content: string,
  section: MarkdownSectionFlatNode,
): string => content.slice(section.startOffset, section.endOffset);

export interface MarkdownHeadingSelection {
  matches: MarkdownSectionFlatNode[];
  missing: string[];
  ambiguous: Array<{ heading: string; indices: string[] }>;
}

export const selectMarkdownByHeading = (
  parsed: ParsedMarkdownSections,
  headings: string[],
): MarkdownHeadingSelection => {
  const normalizedToSections = new Map<string, MarkdownSectionFlatNode[]>();
  for (const section of parsed.flat) {
    const key = normalizeHeadingQuery(section.title);
    const existing = normalizedToSections.get(key);
    if (existing) {
      existing.push(section);
    } else {
      normalizedToSections.set(key, [section]);
    }
  }

  const matches: MarkdownSectionFlatNode[] = [];
  const missing: string[] = [];
  const ambiguous: Array<{ heading: string; indices: string[] }> = [];

  for (const rawHeading of headings) {
    const heading = normalizeHeadingQuery(rawHeading);
    if (!heading) {
      continue;
    }
    const sections = normalizedToSections.get(heading) ?? [];
    if (sections.length === 0) {
      missing.push(heading);
      continue;
    }
    if (sections.length > 1) {
      ambiguous.push({
        heading,
        indices: sections.map((section) => section.index),
      });
      continue;
    }
    matches.push(sections[0]);
  }

  return { matches, missing, ambiguous };
};

export const selectMarkdownByIndex = (
  parsed: ParsedMarkdownSections,
  indices: string[],
): { matches: MarkdownSectionFlatNode[]; missing: string[] } => {
  const byIndex = new Map(
    parsed.flat.map((section) => [section.index, section]),
  );
  const matches: MarkdownSectionFlatNode[] = [];
  const missing: string[] = [];

  for (const rawIndex of indices) {
    const index = rawIndex.trim();
    if (!index) {
      continue;
    }
    const section = byIndex.get(index);
    if (!section) {
      missing.push(index);
      continue;
    }
    matches.push(section);
  }

  return { matches, missing };
};

export const dedupeMarkdownSelections = (
  sections: MarkdownSectionFlatNode[],
): MarkdownSectionFlatNode[] => {
  const seen = new Set<string>();
  const deduped: MarkdownSectionFlatNode[] = [];

  for (const section of sections) {
    const key = `${section.startLine}:${section.endLine}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(section);
  }

  deduped.sort((a, b) => a.startLine - b.startLine);
  return deduped;
};
