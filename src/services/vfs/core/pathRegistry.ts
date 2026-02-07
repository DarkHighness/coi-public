import { normalizeVfsPath } from "../utils";
import type {
  VfsPathClassification,
  VfsPermissionClass,
  VfsScope,
} from "./types";

interface VfsPathRuleDefinition {
  id: string;
  description: string;
  pattern: string;
  permissionClass: VfsPermissionClass;
  scope: VfsScope;
}

interface VfsPathRule extends VfsPathRuleDefinition {
  matches: (path: string) => boolean;
}

const stripCurrentPrefix = (path: string): string => {
  const normalized = normalizeVfsPath(path);
  if (normalized === "current") {
    return "";
  }
  if (normalized.startsWith("current/")) {
    return normalized.slice("current/".length);
  }
  return normalized;
};

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

const compileRule = (rule: VfsPathRuleDefinition): VfsPathRule => {
  const regex = toGlobRegExp(rule.pattern);
  return {
    ...rule,
    matches: (path: string) => regex.test(path),
  };
};

const DEFAULT_PATH_RULES: VfsPathRuleDefinition[] = [
  {
    id: "immutable.skills.root",
    description: "Global skills root is immutable.",
    pattern: "skills",
    permissionClass: "immutable_readonly",
    scope: "shared",
  },
  {
    id: "immutable.skills.tree",
    description: "Global skills content is immutable.",
    pattern: "skills/**",
    permissionClass: "immutable_readonly",
    scope: "shared",
  },
  {
    id: "immutable.refs.root",
    description: "Reference root is immutable.",
    pattern: "refs",
    permissionClass: "immutable_readonly",
    scope: "shared",
  },
  {
    id: "immutable.refs.tree",
    description: "Reference content is immutable.",
    pattern: "refs/**",
    permissionClass: "immutable_readonly",
    scope: "shared",
  },
  {
    id: "elevated.outline.file",
    description: "Primary outline requires elevation to mutate.",
    pattern: "outline/outline.json",
    permissionClass: "elevated_editable",
    scope: "shared",
  },
  {
    id: "elevated.outline.phases",
    description: "Outline phase artifacts require elevation to mutate.",
    pattern: "outline/phases/**",
    permissionClass: "elevated_editable",
    scope: "shared",
  },
  {
    id: "shared.outline.progress",
    description: "Outline progress is shared across forks.",
    pattern: "outline/progress.json",
    permissionClass: "default_editable",
    scope: "shared",
  },
  {
    id: "elevated.history.rewrite",
    description: "History rewrite workspace requires elevation.",
    pattern: "conversation/history_rewrites/**",
    permissionClass: "elevated_editable",
    scope: "fork",
  },
  {
    id: "finish_guard.conversation.root",
    description: "Conversation root is finish-guarded.",
    pattern: "conversation",
    permissionClass: "finish_guarded",
    scope: "fork",
  },
  {
    id: "finish_guard.conversation.tree",
    description: "Conversation files are finish-guarded.",
    pattern: "conversation/**",
    permissionClass: "finish_guarded",
    scope: "fork",
  },
  {
    id: "finish_guard.summary.state",
    description: "Summary state is finish-guarded.",
    pattern: "summary/state.json",
    permissionClass: "finish_guarded",
    scope: "fork",
  },
  {
    id: "shared.custom_rules.root",
    description: "Custom rules root is shared and editable.",
    pattern: "custom_rules",
    permissionClass: "default_editable",
    scope: "shared",
  },
  {
    id: "shared.custom_rules.tree",
    description: "Custom rules are shared and editable.",
    pattern: "custom_rules/**",
    permissionClass: "default_editable",
    scope: "shared",
  },
  {
    id: "shared.legacy_custom_rules.tree",
    description: "Legacy custom rules location remains shared and editable.",
    pattern: "world/custom_rules/**",
    permissionClass: "default_editable",
    scope: "shared",
  },
  {
    id: "shared.theme_config",
    description: "Theme config is shared across forks.",
    pattern: "world/theme_config.json",
    permissionClass: "default_editable",
    scope: "shared",
  },
  {
    id: "shared.custom_rules_ack",
    description: "Custom rules acknowledgement is shared across forks.",
    pattern: "world/runtime/custom_rules_ack_state.json",
    permissionClass: "default_editable",
    scope: "shared",
  },
  {
    id: "default.fallback",
    description: "Default mutable fork-scoped content.",
    pattern: "**",
    permissionClass: "default_editable",
    scope: "fork",
  },
];

export class VfsPathRegistry {
  private readonly rules: VfsPathRule[];

  constructor(rules: VfsPathRuleDefinition[] = DEFAULT_PATH_RULES) {
    this.rules = rules.map(compileRule);
  }

  public listRules(): Array<Omit<VfsPathRule, "matches">> {
    return this.rules.map(({ matches: _matches, ...rest }) => ({ ...rest }));
  }

  public classify(path: string): VfsPathClassification {
    const normalizedPath = stripCurrentPrefix(path);

    const matchedRule =
      this.rules.find((rule) => rule.matches(normalizedPath)) ??
      this.rules[this.rules.length - 1];

    return {
      path,
      normalizedPath,
      permissionClass: matchedRule.permissionClass,
      scope: matchedRule.scope,
      ruleId: matchedRule.id,
      description: matchedRule.description,
    };
  }

  public isImmutableReadonly(path: string): boolean {
    return this.classify(path).permissionClass === "immutable_readonly";
  }

  public isShared(path: string): boolean {
    return this.classify(path).scope === "shared";
  }
}

export const vfsPathRegistry = new VfsPathRegistry();
export { stripCurrentPrefix as stripCurrentPrefixFromVfsPath };
