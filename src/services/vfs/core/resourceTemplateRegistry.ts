import { normalizeVfsPath } from "../utils";
import type { VfsResourceTemplate, VfsWriteOperation } from "./types";

interface InternalTemplate extends VfsResourceTemplate {
  matches: (canonicalPath: string) => boolean;
}

const escapeRegex = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toGlobRegExp = (pattern: string): RegExp => {
  const normalized = normalizeVfsPath(pattern);

  if (normalized === "**") {
    return /^.*$/;
  }

  let regex = "^";
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i] ?? "";

    if (char === "*") {
      const next = normalized[i + 1];
      if (next === "*") {
        const after = normalized[i + 2];
        if (after === "/") {
          regex += "(?:.*\\/)?";
          i += 2;
          continue;
        }
        regex += ".*";
        i += 1;
        continue;
      }
      regex += "[^/]*";
      continue;
    }

    if (char === "?") {
      regex += "[^/]";
      continue;
    }

    regex += escapeRegex(char);
  }

  regex += "$";
  return new RegExp(regex);
};

const compileTemplate = (template: VfsResourceTemplate): InternalTemplate => {
  const matchers = template.patterns.map((pattern) => toGlobRegExp(pattern));
  return {
    ...template,
    matches: (canonicalPath: string) =>
      matchers.some((matcher) => matcher.test(canonicalPath)),
  };
};

const DEFAULT_MUTABLE_OPS: VfsWriteOperation[] = [
  "write",
  "json_patch",
  "json_merge",
  "move",
  "delete",
];

const DEFAULT_RESOURCE_TEMPLATES: VfsResourceTemplate[] = [
  {
    id: "template.system.skills",
    description: "Global skills library (immutable)",
    patterns: ["shared/system/skills", "shared/system/skills/**"],
    domain: "system",
    shape: "markdown_doc",
    criticality: "core",
    retention: "archival",
    permissionClass: "immutable_readonly",
    allowedWriteOps: [],
    scope: "shared",
    contentTypes: ["text/markdown", "application/json", "text/plain"],
  },
  {
    id: "template.system.refs",
    description: "Reference library (immutable)",
    patterns: ["shared/system/refs", "shared/system/refs/**"],
    domain: "system",
    shape: "markdown_doc",
    criticality: "core",
    retention: "archival",
    permissionClass: "immutable_readonly",
    allowedWriteOps: [],
    scope: "shared",
    contentTypes: ["text/markdown", "application/json", "text/plain"],
  },
  {
    id: "template.config.readme_lock",
    description: "Config README files (editable, but cannot move/delete)",
    patterns: ["shared/config/custom_rules/**/README.md"],
    domain: "config",
    shape: "markdown_doc",
    criticality: "secondary",
    retention: "save",
    permissionClass: "default_editable",
    allowedWriteOps: ["write"],
    scope: "shared",
    contentTypes: ["text/markdown"],
  },
  {
    id: "template.story.readme_lock",
    description: "Story README files (editable, but cannot move/delete)",
    patterns: ["forks/*/story/world/**/README.md"],
    domain: "story",
    shape: "markdown_doc",
    criticality: "secondary",
    retention: "save",
    permissionClass: "default_editable",
    allowedWriteOps: ["write"],
    scope: "fork",
    contentTypes: ["text/markdown"],
  },
  {
    id: "template.config.custom_rules",
    description: "Custom rule packs",
    patterns: ["shared/config/custom_rules", "shared/config/custom_rules/**"],
    domain: "config",
    shape: "markdown_doc",
    criticality: "core",
    retention: "save",
    permissionClass: "default_editable",
    allowedWriteOps: [...DEFAULT_MUTABLE_OPS],
    scope: "shared",
  },
  {
    id: "template.config.theme",
    description: "Theme configuration",
    patterns: ["shared/config/theme/theme_config.json"],
    domain: "config",
    shape: "singleton_json",
    criticality: "core",
    retention: "save",
    permissionClass: "default_editable",
    allowedWriteOps: [...DEFAULT_MUTABLE_OPS],
    scope: "shared",
    contentTypes: ["application/json"],
  },
  {
    id: "template.config.custom_rules_ack",
    description: "Shared custom rule acknowledgement state",
    patterns: ["shared/config/runtime/custom_rules_ack_state.json"],
    domain: "config",
    shape: "singleton_json",
    criticality: "secondary",
    retention: "save",
    permissionClass: "default_editable",
    allowedWriteOps: [...DEFAULT_MUTABLE_OPS],
    scope: "shared",
    contentTypes: ["application/json"],
  },
  {
    id: "template.narrative.outline.main",
    description: "Main outline artifact",
    patterns: ["shared/narrative/outline/outline.json"],
    domain: "narrative",
    shape: "singleton_json",
    criticality: "core",
    retention: "save",
    permissionClass: "elevated_editable",
    allowedWriteOps: [...DEFAULT_MUTABLE_OPS],
    scope: "shared",
    contentTypes: ["application/json"],
  },
  {
    id: "template.narrative.outline.phases",
    description: "Outline phase artifacts",
    patterns: ["shared/narrative/outline/phases/**"],
    domain: "narrative",
    shape: "json_collection",
    criticality: "core",
    retention: "save",
    permissionClass: "elevated_editable",
    allowedWriteOps: [...DEFAULT_MUTABLE_OPS],
    scope: "shared",
    contentTypes: ["application/json"],
  },
  {
    id: "template.narrative.outline.story_plan",
    description: "Outline story plan markdown",
    patterns: ["shared/narrative/outline/story_outline/**"],
    domain: "narrative",
    shape: "markdown_doc",
    criticality: "core",
    retention: "save",
    permissionClass: "default_editable",
    allowedWriteOps: [...DEFAULT_MUTABLE_OPS],
    scope: "shared",
    contentTypes: ["text/markdown", "text/plain"],
  },
  {
    id: "template.narrative.outline.progress",
    description: "Outline progress tracker",
    patterns: ["shared/narrative/outline/progress.json"],
    domain: "narrative",
    shape: "singleton_json",
    criticality: "secondary",
    retention: "save",
    permissionClass: "default_editable",
    allowedWriteOps: [...DEFAULT_MUTABLE_OPS],
    scope: "shared",
    contentTypes: ["application/json"],
  },
  {
    id: "template.narrative.conversation.index",
    description: "Shared conversation index",
    patterns: ["shared/narrative/conversation/index.json"],
    domain: "narrative",
    shape: "singleton_json",
    criticality: "core",
    retention: "save",
    permissionClass: "finish_guarded",
    allowedWriteOps: ["finish_commit", "history_rewrite"],
    scope: "shared",
    contentTypes: ["application/json"],
  },
  {
    id: "template.narrative.conversation.fork_tree",
    description: "Shared conversation fork tree",
    patterns: ["shared/narrative/conversation/fork_tree.json"],
    domain: "narrative",
    shape: "singleton_json",
    criticality: "core",
    retention: "save",
    permissionClass: "finish_guarded",
    allowedWriteOps: ["finish_commit", "history_rewrite"],
    scope: "shared",
    contentTypes: ["application/json"],
  },
  {
    id: "template.story.conversation.session_jsonl",
    description: "Fork provider-native session history mirror",
    patterns: ["forks/*/story/conversation/session.jsonl"],
    domain: "story",
    shape: "append_log",
    criticality: "secondary",
    retention: "session",
    permissionClass: "finish_guarded",
    allowedWriteOps: ["finish_commit"],
    scope: "fork",
    contentTypes: ["application/jsonl"],
  },
  {
    id: "template.story.conversation",
    description: "Fork conversation turn data",
    patterns: ["forks/*/story/conversation", "forks/*/story/conversation/**"],
    domain: "story",
    shape: "turn_store",
    criticality: "core",
    retention: "save",
    permissionClass: "finish_guarded",
    allowedWriteOps: ["finish_commit", "history_rewrite"],
    scope: "fork",
    contentTypes: ["application/json"],
  },
  {
    id: "template.story.summary",
    description: "Fork summary state",
    patterns: ["forks/*/story/summary/state.json"],
    domain: "story",
    shape: "singleton_json",
    criticality: "secondary",
    retention: "save",
    permissionClass: "finish_guarded",
    allowedWriteOps: ["finish_summary"],
    scope: "fork",
    contentTypes: ["application/json"],
  },
  {
    id: "template.ops.history_rewrites",
    description: "Fork history rewrite workspace",
    patterns: [
      "forks/*/ops/history_rewrites",
      "forks/*/ops/history_rewrites/**",
    ],
    domain: "ops",
    shape: "append_log",
    criticality: "core",
    retention: "archival",
    permissionClass: "elevated_editable",
    allowedWriteOps: ["write", "history_rewrite", "delete"],
    scope: "fork",
    contentTypes: ["application/json"],
  },
  {
    id: "template.story.world",
    description: "Fork world state",
    patterns: ["forks/*/story/world", "forks/*/story/world/**"],
    domain: "story",
    shape: "json_collection",
    criticality: "core",
    retention: "save",
    permissionClass: "default_editable",
    allowedWriteOps: [...DEFAULT_MUTABLE_OPS],
    scope: "fork",
  },
  {
    id: "template.runtime.fork",
    description: "Fork runtime workspace",
    patterns: ["forks/*/runtime", "forks/*/runtime/**"],
    domain: "runtime",
    shape: "text_blob",
    criticality: "ephemeral",
    retention: "session",
    permissionClass: "default_editable",
    allowedWriteOps: [...DEFAULT_MUTABLE_OPS],
    scope: "fork",
  },
  {
    id: "template.fallback.shared",
    description:
      "Shared fallback resources (read-only until explicitly registered)",
    patterns: ["shared/**"],
    domain: "runtime",
    shape: "text_blob",
    criticality: "secondary",
    retention: "save",
    permissionClass: "immutable_readonly",
    allowedWriteOps: [],
    scope: "shared",
  },
  {
    id: "template.fallback.fork",
    description:
      "Fork fallback resources (read-only until explicitly registered)",
    patterns: ["forks/*/**", "**"],
    domain: "runtime",
    shape: "text_blob",
    criticality: "ephemeral",
    retention: "session",
    permissionClass: "immutable_readonly",
    allowedWriteOps: [],
    scope: "fork",
  },
];

export class VfsResourceTemplateRegistry {
  private readonly templates: InternalTemplate[];

  constructor(templates: VfsResourceTemplate[] = DEFAULT_RESOURCE_TEMPLATES) {
    this.templates = templates.map(compileTemplate);
  }

  public list(): VfsResourceTemplate[] {
    return this.templates.map(({ matches: _matches, ...rest }) => ({
      ...rest,
    }));
  }

  /**
   * Returns exactly one template for every canonical path.
   * Ordering of templates is intentional: specific templates before fallbacks.
   */
  public match(canonicalPath: string): VfsResourceTemplate {
    const normalized = normalizeVfsPath(canonicalPath);
    const matched =
      this.templates.find((template) => template.matches(normalized)) ??
      this.templates[this.templates.length - 1];

    const { matches: _matches, ...template } = matched;
    return { ...template };
  }
}

export const vfsResourceTemplateRegistry = new VfsResourceTemplateRegistry();
