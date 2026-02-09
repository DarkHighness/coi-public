import type { CustomRule } from "@/types";
import type { RuleCategory } from "@/types";
import type { VfsFileMap } from "./types";
import { normalizeVfsPath } from "./utils";
import { canonicalToLogicalVfsPath } from "./core/pathResolver";
import {
  CUSTOM_RULE_CATEGORY_PRESETS,
  getCustomRuleCategoryDirectoryPath,
  getCustomRuleCategoryPreset,
} from "./directoryScaffolds";

const SECTION_CATEGORY = "## What This Category Is";
const SECTION_WHEN = "## When This Category Applies";
const SECTION_RULES = "## Specific Rules";

const SECTION_CATEGORY_COMPAT = [SECTION_CATEGORY, "## 这个分类是什么"];
const SECTION_WHEN_COMPAT = [SECTION_WHEN, "## 这个分类在何时应用"];
const SECTION_RULES_COMPAT = [SECTION_RULES, "## 具体规则有哪些"];

const splitSection = (content: string, headings: string[]): string => {
  const idx = headings
    .map((heading) => content.indexOf(heading))
    .filter((value) => value >= 0)
    .sort((a, b) => a - b)[0];
  if (idx < 0) return "";
  const heading = headings.find((item) => content.indexOf(item) === idx);
  if (!heading) return "";
  const start = idx + heading.length;
  const rest = content.slice(start);
  const nextHeadingIdx = rest.search(/\n##\s+/);
  const body = nextHeadingIdx >= 0 ? rest.slice(0, nextHeadingIdx) : rest;
  return body.trim();
};

const toRuleList = (rulesBlock: string): string[] => {
  if (!rulesBlock.trim()) return [];
  const lines = rulesBlock
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bullets = lines
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);

  return bullets;
};

export interface ParsedCustomRulePack {
  category: string;
  whenToApply: string;
  rules: string[];
}

export const parseCustomRulePackMarkdown = (
  content: string,
): ParsedCustomRulePack => {
  const category = splitSection(content, SECTION_CATEGORY_COMPAT);
  const whenToApply = splitSection(content, SECTION_WHEN_COMPAT);
  const rules = toRuleList(splitSection(content, SECTION_RULES_COMPAT));

  return {
    category,
    whenToApply,
    rules,
  };
};

export interface BuildCustomRulePackInput {
  category: string;
  whenToApply: string;
  rules: string[];
}

export const buildCustomRulePackMarkdown = (
  input: BuildCustomRulePackInput,
): string => {
  const category =
    input.category.trim() || "Describe what this category covers.";
  const whenToApply =
    input.whenToApply.trim() || "Describe when these rules should apply.";
  const rules =
    input.rules.length > 0
      ? input.rules.map((rule) => `- ${rule.trim()}`).join("\n")
      : "- Add a concrete rule here.";

  return [
    SECTION_CATEGORY,
    category,
    "",
    SECTION_WHEN,
    whenToApply,
    "",
    SECTION_RULES,
    rules,
    "",
  ].join("\n");
};

const inferCategoryTag = (category: string): CustomRule["category"] => {
  const normalized = category.toLowerCase();
  if (normalized.includes("image") || normalized.includes("visual")) {
    return "imageStyle";
  }
  if (normalized.includes("dialogue") || normalized.includes("conversation")) {
    return "dialogue";
  }
  if (normalized.includes("combat") || normalized.includes("battle")) {
    return "combatAction";
  }
  if (normalized.includes("writing") || normalized.includes("prose")) {
    return "writingStyle";
  }
  return "custom";
};

const inferCategoryTagFromFolder = (folderName: string): CustomRule["category"] | null => {
  const match = /^(\d{2})-/.exec(folderName);
  if (!match) {
    return null;
  }

  const byPriority = CUSTOM_RULE_CATEGORY_PRESETS.find(
    (preset) => preset.priority === Number.parseInt(match[1] ?? "-1", 10),
  );
  if (byPriority) {
    return byPriority.category;
  }

  const slug = folderName.replace(/^\d{2}-/, "");
  const bySlug = CUSTOM_RULE_CATEGORY_PRESETS.find((preset) => preset.slug === slug);
  return bySlug?.category ?? null;
};

const parsePriorityFromFolder = (folderName: string): number => {
  const match = /^(\d{2,})-/.exec(folderName);
  if (!match) return 999;
  return Number.parseInt(match[1], 10);
};

export const extractPackFolderFromPath = (path: string): string | null => {
  const normalized = normalizeVfsPath(path);
  const modernMatch = /^custom_rules\/([^/]+)\/RULES\.md$/.exec(normalized);
  if (modernMatch) {
    return modernMatch[1];
  }
  return null;
};

const toCustomRuleFromPack = (
  folder: string,
  content: string,
  updatedAt: number,
): CustomRule | null => {
  const parsed = parseCustomRulePackMarkdown(content);
  if (
    !parsed.category.trim() &&
    !parsed.whenToApply.trim() &&
    parsed.rules.length === 0
  ) {
    return null;
  }

  const categoryFromFolder = inferCategoryTagFromFolder(folder);
  const fallbackTitleFromFolder = folder.replace(/^\d{2}-/, "").replace(/-/g, " ");

  return {
    id: `pack:${folder}`,
    category: categoryFromFolder ?? inferCategoryTag(parsed.category),
    title: parsed.category.trim() || fallbackTitleFromFolder || folder,
    content: parsed.rules.join("\n"),
    enabled: true,
    priority: parsePriorityFromFolder(folder),
    createdAt: updatedAt || Date.now(),
  };
};

export const deriveCustomRulesFromVfs = (files: VfsFileMap): CustomRule[] => {
  const rules: CustomRule[] = [];

  for (const file of Object.values(files)) {
    const normalizedPath = normalizeVfsPath(file.path);
    const logicalPath = canonicalToLogicalVfsPath(normalizedPath, {
      looseFork: true,
    });

    if (logicalPath.startsWith("world/custom_rules/") && logicalPath.endsWith(".json")) {
      try {
        const parsed = JSON.parse(file.content) as CustomRule;
        rules.push(parsed);
      } catch {
        // ignore invalid legacy rule file
      }
      continue;
    }

    const folder = extractPackFolderFromPath(logicalPath);
    if (!folder) {
      continue;
    }

    const rule = toCustomRuleFromPack(folder, file.content, file.updatedAt);
    if (rule) {
      rules.push(rule);
    }
  }

  return rules.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "rule";

export const toCustomRulePackPath = (
  priority: number,
  titleOrId: string,
): string => {
  const pref = String(Math.max(0, Math.floor(priority))).padStart(2, "0");
  const slug = slugify(titleOrId);
  return `custom_rules/${pref}-${slug}/RULES.md`;
};

export const CUSTOM_RULES_README_PATH = "custom_rules/README.md";

export const CUSTOM_RULES_README_CONTENT = [
  "# Custom Rules",
  "",
  "- Folder format: `custom_rules/00-xxx/RULES.md`",
  "- Lower numeric prefix means higher priority.",
  "- Each `RULES.md` should keep these sections:",
  `  - \`${SECTION_CATEGORY}\``,
  `  - \`${SECTION_WHEN}\``,
  `  - \`${SECTION_RULES}\` (use bullet list)`,
  "",
  "Tip: put your most stable world constraints in `00-` or `01-`.",
  "",
].join("\n");

export const getCustomRulePackTemplatePath = (
  existingPaths: string[],
  suggestedTitle: string,
): string => {
  const existingPrefixes = existingPaths
    .map((path) => extractPackFolderFromPath(path))
    .filter((folder): folder is string => Boolean(folder))
    .map((folder) => parsePriorityFromFolder(folder));

  const maxPrefix =
    existingPrefixes.length > 0
      ? Math.max(...existingPrefixes.filter((value) => Number.isFinite(value)))
      : -1;

  return toCustomRulePackPath(maxPrefix + 1, suggestedTitle);
};

export const toCustomRulePackPathForCategory = (category: RuleCategory): string => {
  const directoryPath = getCustomRuleCategoryDirectoryPath(category);
  return `${directoryPath}/RULES.md`;
};

export const buildCustomRulePackMarkdownForCategory = (
  category: RuleCategory,
): string => {
  const preset = getCustomRuleCategoryPreset(category);
  if (!preset) {
    return buildCustomRulePackMarkdown({
      category: "Custom",
      whenToApply: "When this category becomes relevant to the current scene.",
      rules: [],
    });
  }

  return buildCustomRulePackMarkdown({
    category: preset.title,
    whenToApply: preset.whenToApply,
    rules: preset.starterRules,
  });
};
