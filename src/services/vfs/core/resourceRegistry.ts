import { normalizeVfsPath } from "../utils";
import { vfsPathRegistry } from "./pathRegistry";
import type {
  VfsPermissionClass,
  VfsResourceDescriptor,
  VfsResourceMatch,
  VfsScope,
} from "./types";

interface InternalDescriptor extends VfsResourceDescriptor {
  matches: (path: string) => boolean;
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

const compileDescriptor = (descriptor: VfsResourceDescriptor): InternalDescriptor => {
  const matchers = descriptor.patterns.map((pattern) => toGlobRegExp(pattern));
  return {
    ...descriptor,
    matches: (path: string) => matchers.some((matcher) => matcher.test(path)),
  };
};

const DEFAULT_RESOURCE_DESCRIPTORS: VfsResourceDescriptor[] = [
  {
    id: "resource.skills",
    resourceType: "skills",
    description: "Global skills library",
    patterns: ["skills", "skills/**"],
    permissionClass: "immutable_readonly",
    scope: "shared",
  },
  {
    id: "resource.refs",
    resourceType: "refs",
    description: "Reference content",
    patterns: ["refs", "refs/**"],
    permissionClass: "immutable_readonly",
    scope: "shared",
  },
  {
    id: "resource.outline",
    resourceType: "outline",
    description: "Core outline and phase artifacts",
    patterns: ["outline/outline.json", "outline/phases/**"],
    permissionClass: "elevated_editable",
    scope: "shared",
    contentTypes: ["application/json"],
  },
  {
    id: "resource.outline_progress",
    resourceType: "outline_progress",
    description: "Outline progress tracker",
    patterns: ["outline/progress.json"],
    permissionClass: "default_editable",
    scope: "shared",
    contentTypes: ["application/json"],
  },
  {
    id: "resource.history_rewrite",
    resourceType: "history_rewrite",
    description: "Conversation history rewrite workspace",
    patterns: ["conversation/history_rewrites/**"],
    permissionClass: "elevated_editable",
    scope: "fork",
    contentTypes: ["application/json"],
  },
  {
    id: "resource.conversation",
    resourceType: "conversation",
    description: "Conversation turn storage",
    patterns: ["conversation", "conversation/**"],
    permissionClass: "finish_guarded",
    scope: "fork",
    contentTypes: ["application/json"],
  },
  {
    id: "resource.summary",
    resourceType: "summary",
    description: "Summary state",
    patterns: ["summary/state.json"],
    permissionClass: "finish_guarded",
    scope: "fork",
    contentTypes: ["application/json"],
  },
  {
    id: "resource.custom_rules",
    resourceType: "custom_rules",
    description: "Custom rules shared layer",
    patterns: ["custom_rules", "custom_rules/**", "world/custom_rules/**"],
    permissionClass: "default_editable",
    scope: "shared",
  },
  {
    id: "resource.theme_config",
    resourceType: "theme_config",
    description: "Theme config shared layer",
    patterns: ["world/theme_config.json"],
    permissionClass: "default_editable",
    scope: "shared",
    contentTypes: ["application/json"],
  },
  {
    id: "resource.world",
    resourceType: "world",
    description: "Default world files",
    patterns: ["world/**"],
    permissionClass: "default_editable",
    scope: "fork",
  },
  {
    id: "resource.fallback",
    resourceType: "generic",
    description: "Fallback default VFS resource",
    patterns: ["**"],
    permissionClass: "default_editable",
    scope: "fork",
  },
];

export class VfsResourceRegistry {
  private readonly descriptors: InternalDescriptor[];

  constructor(descriptors: VfsResourceDescriptor[] = DEFAULT_RESOURCE_DESCRIPTORS) {
    this.descriptors = descriptors.map(compileDescriptor);
  }

  public list(): VfsResourceDescriptor[] {
    return this.descriptors.map(({ matches: _matches, ...rest }) => ({ ...rest }));
  }

  public match(path: string): VfsResourceMatch {
    const normalizedPath = stripCurrentPrefix(path);
    const descriptor =
      this.descriptors.find((candidate) => candidate.matches(normalizedPath)) ??
      this.descriptors[this.descriptors.length - 1];

    const classification = vfsPathRegistry.classify(normalizedPath);

    return {
      descriptor,
      path,
      normalizedPath,
      permissionClass:
        descriptor.permissionClass ??
        (classification.permissionClass as VfsPermissionClass),
      scope: descriptor.scope ?? (classification.scope as VfsScope),
    };
  }
}

export const vfsResourceRegistry = new VfsResourceRegistry();
