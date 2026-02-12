export type SkillPriority = "high" | "medium" | "low";

export type SkillCatalogEntry = {
  id: string;
  title: string;
  tags: string[];
  path: string;
  domain: string;
  priority: SkillPriority;
  description: string;
  whenToLoad: string;
  seeAlso: string[];
};

type ParsedFrontmatter = {
  name?: string;
  description?: string;
  tags: string[];
  domain?: string;
  priority?: string;
};

function stripYamlScalar(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizePriority(value: string | undefined): SkillPriority {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "low";
}

function parseYamlList(value: string): string[] {
  const trimmed = value.trim();
  if (!(trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    return [];
  }

  return trimmed
    .slice(1, -1)
    .split(",")
    .map((item) => stripYamlScalar(item))
    .filter(Boolean);
}

function parseFrontmatter(markdown: string): ParsedFrontmatter {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { tags: [] };
  }

  const result: ParsedFrontmatter = { tags: [] };
  const lines = match[1].split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const keyMatch = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!keyMatch) continue;

    const key = keyMatch[1];
    const value = keyMatch[2];

    if (value.trim() === "|") {
      const blockLines: string[] = [];
      i += 1;
      for (; i < lines.length; i += 1) {
        const blockLine = lines[i];
        if (/^[a-zA-Z_]+:\s*/.test(blockLine)) {
          i -= 1;
          break;
        }
        blockLines.push(blockLine.replace(/^\s{2}/, ""));
      }
      if (key === "description") {
        result.description = blockLines.join("\n").trim();
      }
      continue;
    }

    if (key === "name") {
      result.name = stripYamlScalar(value);
      continue;
    }
    if (key === "tags") {
      result.tags = parseYamlList(value);
      continue;
    }
    if (key === "domain") {
      result.domain = stripYamlScalar(value);
      continue;
    }
    if (key === "priority") {
      result.priority = stripYamlScalar(value);
      continue;
    }
  }

  return result;
}

function extractHeading(markdown: string): string {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading?.[1]?.trim() ?? "Untitled Skill";
}

function extractSection(markdown: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headingRegex = new RegExp(`^##\\s+${escaped}\\s*$`, "m");
  const headingMatch = headingRegex.exec(markdown);
  if (!headingMatch) return "";

  const start = headingMatch.index + headingMatch[0].length;
  const rest = markdown.slice(start);
  const nextHeading = rest.search(/\n##\s+/);
  const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
  return section.trim();
}

function extractWhenToUse(markdown: string): string {
  const section = extractSection(markdown, "When to Use");
  if (!section) return "";

  const bullets = [...section.matchAll(/^\s*-\s+(.+)$/gm)]
    .map((match) => match[1].trim())
    .filter(Boolean);

  if (bullets.length > 0) {
    return bullets.join("; ");
  }

  return section.split("\n").map((line) => line.trim()).filter(Boolean).join(" ");
}

function extractSeeAlso(markdown: string): string[] {
  const section = extractSection(markdown, "See Also");
  if (!section) return [];

  return [...section.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function toCurrentSkillPath(seedPath: string): string | null {
  if (!seedPath.startsWith("skills/")) return null;
  if (!seedPath.endsWith("/SKILL.md")) return null;
  return `current/${seedPath}`;
}

function deriveDomainFromSeedPath(seedPath: string): string {
  const parts = seedPath.split("/");
  return parts[1] ?? "core";
}

function defaultIdFromPath(seedPath: string): string {
  return seedPath.replace(/^skills\//, "").replace(/\/SKILL\.md$/, "").replace(/\//g, "-");
}

export function buildSkillCatalogEntryFromMarkdown(
  seedPath: string,
  markdown: string,
): SkillCatalogEntry | null {
  const path = toCurrentSkillPath(seedPath);
  if (!path) return null;

  const frontmatter = parseFrontmatter(markdown);
  const description =
    frontmatter.description?.trim() || extractSection(markdown, "Overview") || extractHeading(markdown);
  const whenToLoad = extractWhenToUse(markdown);

  return {
    id: frontmatter.name || defaultIdFromPath(seedPath),
    title: extractHeading(markdown),
    tags: frontmatter.tags,
    path,
    domain: frontmatter.domain || deriveDomainFromSeedPath(seedPath),
    priority: normalizePriority(frontmatter.priority),
    description,
    whenToLoad,
    seeAlso: extractSeeAlso(markdown),
  };
}
