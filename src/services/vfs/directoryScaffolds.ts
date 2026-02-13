import type { RuleCategory } from "@/types";
import type { VfsSession } from "./vfsSession";
import { normalizeVfsPath } from "./utils";

export interface CustomRuleCategoryPreset {
  category: RuleCategory;
  priority: number;
  slug: string;
  title: string;
  directoryPurpose: string;
  whenToApply: string;
  starterRules: string[];
}

export const CUSTOM_RULE_CATEGORY_PRESETS: readonly CustomRuleCategoryPreset[] =
  [
    {
      category: "systemCore",
      priority: 0,
      slug: "system-core",
      title: "System Core",
      directoryPurpose:
        "Core behavior constraints that always anchor the storyteller.",
      whenToApply:
        "Always apply. Use for non-negotiable system-level constraints.",
      starterRules: [
        "Keep continuity strict across turns unless explicitly retconned.",
        "Do not contradict established world facts without an in-world reason.",
        "Prioritize clear causal links between action and consequence.",
      ],
    },
    {
      category: "worldSetting",
      priority: 1,
      slug: "world-setting",
      title: "World Setting",
      directoryPurpose:
        "Rules for world physics, institutions, technology, and social order.",
      whenToApply:
        "Apply when scenes rely on setting logic or world consistency.",
      starterRules: [
        "Keep geography, infrastructure, and institutions internally consistent.",
        "Technology and magic must follow previously established limits.",
        "Political and cultural consequences should follow major events.",
      ],
    },
    {
      category: "protagonist",
      priority: 2,
      slug: "protagonist",
      title: "Protagonist",
      directoryPurpose:
        "Rules for player-character agency, constraints, and growth arcs.",
      whenToApply:
        "Apply whenever protagonist decisions or development is central.",
      starterRules: [
        "Preserve meaningful player agency; avoid forced outcomes without warning.",
        "Character growth should follow accumulated choices, not sudden rewrites.",
        "Protagonist strengths must carry trade-offs and opportunity cost.",
      ],
    },
    {
      category: "npcBehavior",
      priority: 3,
      slug: "npc-behavior",
      title: "NPC Behavior",
      directoryPurpose:
        "Rules for NPC motivations, memory, and social behavior.",
      whenToApply:
        "Apply in social, political, investigative, or relationship scenes.",
      starterRules: [
        "NPC behavior should reflect their goals, fears, and available information.",
        "Important NPCs remember key interactions and react accordingly.",
        "Conflicting NPC agendas should surface through action, not exposition alone.",
      ],
    },
    {
      category: "combatAction",
      priority: 4,
      slug: "combat-action",
      title: "Combat & Action",
      directoryPurpose:
        "Rules for pacing, stakes, and consequence in conflict scenes.",
      whenToApply:
        "Apply in combat, chase, stealth, and other high-intensity action beats.",
      starterRules: [
        "Action outcomes must reflect skill, positioning, and preparation.",
        "Escalation should increase risk, not only spectacle.",
        "After-action consequences should materially affect future scenes.",
      ],
    },
    {
      category: "writingStyle",
      priority: 5,
      slug: "writing-style",
      title: "Writing Style",
      directoryPurpose: "Rules for tone, prose texture, and narration cadence.",
      whenToApply: "Apply whenever narrative voice and prose quality matter.",
      starterRules: [
        "Favor concrete sensory detail over abstract summary.",
        "Keep sentence rhythm varied while preserving readability.",
        "Use tone consistent with established genre and scene stakes.",
      ],
    },
    {
      category: "dialogue",
      priority: 6,
      slug: "dialogue",
      title: "Dialogue",
      directoryPurpose:
        "Rules for voice differentiation, subtext, and conversational flow.",
      whenToApply: "Apply in all dialogue-heavy turns and negotiation scenes.",
      starterRules: [
        "Each speaking character should sound distinct in diction and cadence.",
        "Let subtext and implication carry part of the dramatic load.",
        "Keep dialogue purposeful: reveal intent, conflict, or stakes.",
      ],
    },
    {
      category: "mystery",
      priority: 7,
      slug: "mystery",
      title: "Mystery",
      directoryPurpose:
        "Rules for clues, suspicion management, and reveal pacing.",
      whenToApply:
        "Apply when hidden information and investigation loops are active.",
      starterRules: [
        "Clues should be actionable and connectable across scenes.",
        "Reveals should answer one question while opening a deeper one.",
        "Avoid withholding essential information without compensating signals.",
      ],
    },
    {
      category: "stateManagement",
      priority: 8,
      slug: "state-management",
      title: "State Management",
      directoryPurpose:
        "Rules for how game state changes are represented and validated.",
      whenToApply:
        "Apply when introducing, updating, or reconciling stateful entities.",
      starterRules: [
        "State updates must be explicit, minimal, and internally coherent.",
        "Do not silently drop previously established critical state.",
        "When uncertain, preserve prior state and annotate uncertainty.",
      ],
    },
    {
      category: "hiddenTruth",
      priority: 9,
      slug: "hidden-truth",
      title: "Hidden Truth",
      directoryPurpose:
        "Rules governing secret layers, disclosure timing, and dramatic payoff.",
      whenToApply:
        "Apply when managing secrets, deception, and revelation arcs.",
      starterRules: [
        "Hidden truths should alter interpretation of prior events when revealed.",
        "Revelation timing should align with earned narrative pressure.",
        "Track who knows what before and after each reveal beat.",
      ],
    },
    {
      category: "imageStyle",
      priority: 10,
      slug: "image-style",
      title: "Image Style",
      directoryPurpose:
        "Rules for visual consistency in image and scene generation outputs.",
      whenToApply: "Apply when image prompts or visual framing are generated.",
      starterRules: [
        "Keep character and environment visual signatures consistent.",
        "Use camera, lighting, and composition choices that support scene intent.",
        "Avoid style drift unless narratively justified.",
      ],
    },
    {
      category: "cultural",
      priority: 11,
      slug: "cultural",
      title: "Cultural",
      directoryPurpose:
        "Rules for localization, cultural framing, and audience adaptation.",
      whenToApply:
        "Apply whenever cultural context or language adaptation is relevant.",
      starterRules: [
        "Respect cultural nuance and avoid flattening local context.",
        "Prefer culturally grounded metaphors over generic phrasing.",
        "Maintain consistent terminology for culturally specific concepts.",
      ],
    },
    {
      category: "custom",
      priority: 12,
      slug: "custom",
      title: "Custom",
      directoryPurpose:
        "Catch-all category for project-specific constraints and experiments.",
      whenToApply: "Apply only when no specialized category cleanly fits.",
      starterRules: [
        "Keep custom constraints specific, testable, and non-overlapping.",
        "Document why this rule cannot live in an existing category.",
        "Review custom rules regularly and migrate stable ones to dedicated categories.",
      ],
    },
  ] as const;

const ROOT_CATEGORY_DIRECTORIES = [
  {
    path: "world/characters",
    title: "Characters",
    purpose:
      "Actor profiles and per-actor assets. Keep IDs stable and explicit.",
  },
  {
    path: "world/locations",
    title: "Locations",
    purpose: "Place definitions and location-level state for the active world.",
  },
  {
    path: "world/quests",
    title: "Quests",
    purpose:
      "Quest definitions, progression metadata, and objective structure.",
  },
  {
    path: "world/knowledge",
    title: "Knowledge",
    purpose: "Lore, discovered facts, and knowledge graph style entries.",
  },
  {
    path: "world/factions",
    title: "Factions",
    purpose: "Faction identity, relationships, and standing-related entities.",
  },
  {
    path: "world/timeline",
    title: "Timeline",
    purpose: "Chronological events and temporal anchors for continuity.",
  },
  {
    path: "world/causal_chains",
    title: "Causal Chains",
    purpose: "Cause-effect traces for investigations and consequence modeling.",
  },
  {
    path: "custom_rules",
    title: "Custom Rules",
    purpose:
      "Rule pack categories. Each category may contain RULES.md when active rules are needed.",
  },
] as const;

export interface DirectoryScaffoldDefinition {
  path: string;
  title: string;
  purpose: string;
  readme: string;
}

const toCustomRulesDirectoryPath = (preset: CustomRuleCategoryPreset): string =>
  `custom_rules/${String(preset.priority).padStart(2, "0")}-${preset.slug}`;

export const CUSTOM_RULE_CATEGORY_DIRECTORY_PATHS: readonly string[] =
  CUSTOM_RULE_CATEGORY_PRESETS.map((preset) =>
    toCustomRulesDirectoryPath(preset),
  ) as readonly string[];

const toDirectoryReadmePath = (directoryPath: string): string =>
  normalizeVfsPath(`${normalizeVfsPath(directoryPath)}/README.md`);

const toTitleCase = (value: string): string =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(
      (chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase(),
    )
    .join(" ");

const buildReadme = ({
  title,
  purpose,
}: {
  title: string;
  purpose: string;
}): string =>
  [
    `# ${title}`,
    "",
    purpose,
    "",
    "This README is used by StateEditor as a persistent directory marker.",
    "Keep this file in place to preserve folder structure and intent.",
    "",
  ].join("\n");

const SCAFFOLD_DEFINITIONS: readonly DirectoryScaffoldDefinition[] = [
  ...ROOT_CATEGORY_DIRECTORIES.map((item) => ({
    path: item.path,
    title: item.title,
    purpose: item.purpose,
    readme: buildReadme(item),
  })),
  ...CUSTOM_RULE_CATEGORY_PRESETS.map((preset) => {
    const path = toCustomRulesDirectoryPath(preset);
    return {
      path,
      title: `${preset.title} Rules`,
      purpose: `${preset.directoryPurpose} Add a RULES.md file here only when this category needs active constraints.`,
      readme: buildReadme({
        title: `${preset.title} Rules`,
        purpose: preset.directoryPurpose,
      }),
    } satisfies DirectoryScaffoldDefinition;
  }),
] as const;

const SCAFFOLD_DIRECTORY_SET = new Set(
  SCAFFOLD_DEFINITIONS.map((item) => normalizeVfsPath(item.path)),
);

const CUSTOM_RULE_PRESET_BY_CATEGORY = new Map(
  CUSTOM_RULE_CATEGORY_PRESETS.map((preset) => [preset.category, preset]),
);

const CUSTOM_RULE_PRESET_BY_FOLDER = new Map(
  CUSTOM_RULE_CATEGORY_PRESETS.map((preset) => [
    toCustomRulesDirectoryPath(preset).split("/").pop() ?? "",
    preset,
  ]),
);

export const DIRECTORY_SCAFFOLD_DEFINITIONS: readonly DirectoryScaffoldDefinition[] =
  SCAFFOLD_DEFINITIONS;

export const isReadmePath = (path: string): boolean => {
  const normalized = normalizeVfsPath(path).toLowerCase();
  return normalized === "readme.md" || normalized.endsWith("/readme.md");
};

export const isScaffoldDirectoryPath = (path: string): boolean =>
  SCAFFOLD_DIRECTORY_SET.has(normalizeVfsPath(path));

export const isScaffoldReadmePath = (path: string): boolean => {
  const normalized = normalizeVfsPath(path);
  if (!isReadmePath(normalized)) {
    return false;
  }
  const directory = normalized.replace(/\/README\.md$/i, "");
  return isScaffoldDirectoryPath(directory);
};

export const getCustomRuleCategoryPreset = (
  category: RuleCategory,
): CustomRuleCategoryPreset | undefined =>
  CUSTOM_RULE_PRESET_BY_CATEGORY.get(category);

export const getCustomRuleCategoryPresetFromPath = (
  path: string,
): CustomRuleCategoryPreset | null => {
  const normalized = normalizeVfsPath(path);
  const match = /^custom_rules\/([^/]+)/.exec(normalized);
  if (!match) {
    return null;
  }
  return CUSTOM_RULE_PRESET_BY_FOLDER.get(match[1] ?? "") ?? null;
};

export const getCustomRuleCategoryDirectoryPath = (
  category: RuleCategory,
): string => {
  const preset = CUSTOM_RULE_PRESET_BY_CATEGORY.get(category);
  if (!preset) {
    return "custom_rules/12-custom";
  }
  return toCustomRulesDirectoryPath(preset);
};

export const ensureDirectoryReadme = (
  session: VfsSession,
  directoryPath: string,
  options?: { content?: string },
): string => {
  const normalizedDirectoryPath = normalizeVfsPath(directoryPath);
  const readmePath = toDirectoryReadmePath(normalizedDirectoryPath);
  if (session.readFile(readmePath)) {
    return readmePath;
  }

  const title = toTitleCase(
    normalizedDirectoryPath.split("/").pop() ?? "Directory",
  );
  const content =
    options?.content ??
    buildReadme({
      title: `${title || "Directory"}`,
      purpose: `This directory stores resources under ${normalizedDirectoryPath || "current"}.`,
    });

  session.writeFile(readmePath, content, "text/markdown");
  return readmePath;
};

const collectDirectoryChain = (directoryPath: string): string[] => {
  const normalized = normalizeVfsPath(directoryPath);
  if (!normalized) {
    return [];
  }
  const parts = normalized.split("/").filter(Boolean);
  const chain: string[] = [];
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    chain.push(current);
  }
  return chain;
};

export const ensureDirectoryChainReadmes = (
  session: VfsSession,
  directoryPath: string,
): string[] => {
  const created: string[] = [];
  for (const candidate of collectDirectoryChain(directoryPath)) {
    const readmePath = toDirectoryReadmePath(candidate);
    if (session.readFile(readmePath)) {
      continue;
    }
    ensureDirectoryReadme(session, candidate);
    created.push(readmePath);
  }
  return created;
};

export const ensureDirectoryScaffolds = (session: VfsSession): string[] => {
  const created: string[] = [];
  for (const scaffold of DIRECTORY_SCAFFOLD_DEFINITIONS) {
    const readmePath = toDirectoryReadmePath(scaffold.path);
    if (session.readFile(readmePath)) {
      continue;
    }
    session.writeFile(readmePath, scaffold.readme, "text/markdown");
    created.push(readmePath);
  }
  return created;
};
