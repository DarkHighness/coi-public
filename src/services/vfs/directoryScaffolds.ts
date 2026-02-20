import type { RuleCategory } from "@/types";
import type { VfsSession } from "./vfsSession";
import { normalizeVfsPath } from "./utils";
import { PLACEHOLDER_DOMAINS } from "./placeholders";

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

interface RootCategoryDirectoryDefinition {
  path: string;
  title: string;
  purpose: string;
  whatBelongs: string[];
  writeProtocol: string[];
  guardrails: string[];
}

const ROOT_CATEGORY_DIRECTORIES: readonly RootCategoryDirectoryDefinition[] = [
  {
    path: "world/characters",
    title: "Characters",
    purpose:
      "Actor profiles and actor-owned entities (skills/conditions/traits/inventory/views).",
    whatBelongs: [
      "Per-actor profile files: `world/characters/<actorId>/profile.json`.",
      "Actor-owned collections: `skills/`, `conditions/`, `traits/`, `inventory/`.",
      "Per-actor perspective files under `views/` for world entities.",
    ],
    writeProtocol: [
      "Patch `profile.json` for scalar actor state (for example `/currentLocation`, `/visible/status`).",
      "Write actor-owned entities as separate JSON files under their subfolders.",
      "Use stable IDs (`char:*`, `skill:*`, `cond:*`, `trait:*`, `inv:*`).",
    ],
    guardrails: [
      "`profile.json` is not a container for skills/conditions/traits/inventory arrays.",
      "Do not write UI-only fields (`highlight`, `lastAccess`) into files here.",
      "For world-entity unlocks, use `views/**`; do not back-write unlock fields into canonical world files.",
    ],
  },
  {
    path: "world/locations",
    title: "Locations",
    purpose:
      "Canonical location definitions and location-anchored dropped items.",
    whatBelongs: [
      "Location definitions: `world/locations/<locId>.json`.",
      "Dropped/placed items: `world/locations/<locId>/items/<itemId>.json`.",
    ],
    writeProtocol: [
      "Write world truth to canonical location files.",
      "Write actor discovery/progress (`unlocked`, `isVisited`) to actor views, not canonical locations.",
      "Move items between actor inventory and location items via file move semantics.",
    ],
    guardrails: [
      "Canonical location files must not contain root `unlocked`/`unlockReason`.",
      "Canonical location files must not contain UI/view fields (`highlight`, `lastAccess`, `isVisited`, `visitedCount`).",
      "Keep `knownBy` canonical and evidence-driven.",
    ],
  },
  {
    path: "world/quests",
    title: "Quests",
    purpose:
      "Canonical quest definitions, objective truth, and quest-level hidden data.",
    whatBelongs: [
      "Quest definitions at `world/quests/<questId>.json`.",
      "Canonical objective structure and hidden quest truth.",
    ],
    writeProtocol: [
      "Write world truth and canonical objective design in quest files.",
      "Write player progress/status/unlock to `world/characters/<actorId>/views/quests/*.json`.",
      "Keep IDs stable (`quest:*`) and relation references canonical.",
    ],
    guardrails: [
      "Do not write root `unlocked`/`unlockReason` in canonical quest files.",
      "Do not write UI-only fields (`highlight`, `lastAccess`) here.",
      "Avoid speculative objective rewrites without narrative cause.",
    ],
  },
  {
    path: "world/knowledge",
    title: "Knowledge",
    purpose: "Canonical lore/fact entries and hidden truth anchors.",
    whatBelongs: [
      "Knowledge definitions at `world/knowledge/<knowledgeId>.json`.",
      "Player-facing summaries and hidden canonical truth for knowledge entries.",
    ],
    writeProtocol: [
      "Persist durable facts and world truth canonically.",
      "Track player-side discovery/unlock only in actor views.",
      "Use canonical IDs (`know:*`) and actor IDs in `knownBy`.",
    ],
    guardrails: [
      "No root `unlocked`/`unlockReason` in canonical knowledge files.",
      "No UI-only fields (`highlight`, `lastAccess`) in canonical knowledge files.",
      "Do not delete established durable facts without explicit retcon handling.",
    ],
  },
  {
    path: "world/factions",
    title: "Factions",
    purpose: "Canonical faction identity, agenda, and relation truth.",
    whatBelongs: [
      "Faction definitions at `world/factions/<factionId>.json`.",
      "Canonical relation structures and hidden strategic intent.",
    ],
    writeProtocol: [
      "Write faction truth canonically (identity, doctrine, hidden agenda).",
      "Write actor-specific standing/unlock in actor views.",
      "Use stable faction IDs (`fac:*`) in relation targets.",
    ],
    guardrails: [
      "No root `unlocked`/`unlockReason` in canonical faction files.",
      "No UI-only fields (`highlight`, `lastAccess`) in canonical faction files.",
      "Do not mix display names in ID fields.",
    ],
  },
  {
    path: "world/timeline",
    title: "Timeline",
    purpose: "Canonical chronological events and causality anchors.",
    whatBelongs: [
      "Timeline events at `world/timeline/<eventId>.json`.",
      "Canonical event ordering and durable cause/effect anchors.",
    ],
    writeProtocol: [
      "Append/patch canonical events with explicit IDs (`evt:*`).",
      "Write player memory/unlock in actor views.",
      "Keep `involvedEntities` as canonical IDs only.",
    ],
    guardrails: [
      "No root `unlocked`/`unlockReason` in canonical timeline files.",
      "No UI-only fields (`highlight`, `lastAccess`) in canonical timeline files.",
      "Do not retroactively reorder major events without explicit retcon intent.",
    ],
  },
  {
    path: "world/causal_chains",
    title: "Causal Chains",
    purpose: "Canonical long-range consequence graphs and investigation links.",
    whatBelongs: [
      "Causal chain files at `world/causal_chains/<chainId>.json`.",
      "Canonical cause-effect relations across events/entities.",
    ],
    writeProtocol: [
      "Write durable cause/effect truth canonically.",
      "Write actor-facing unlock/investigation notes in actor views.",
      "Use stable IDs and canonical entity references in links.",
    ],
    guardrails: [
      "No root `unlocked`/`unlockReason` in canonical causal chain files.",
      "No UI-only fields (`highlight`, `lastAccess`) in canonical causal chain files.",
      "Avoid speculative links without narrative evidence.",
    ],
  },
  {
    path: "world/placeholders",
    title: "Placeholder Drafts",
    purpose:
      "Markdown draft notes for unresolved entities across all domains before canonical promotion.",
    whatBelongs: [
      "Draft notes only: `world/placeholders/<domain>/<entityId>.md`.",
      "Allowed domains: `characters`, `locations`, `quests`, `knowledge`, `factions`, `timeline`, `causal_chains`, `items`, `skills`, `conditions`, `traits`, `misc`.",
      "Each draft should include at minimum `- id:` and a `## Notes` section.",
      "Cross-domain unresolved entities are all valid here (character/location/item/skill/quest/knowledge/faction/timeline/causal chain).",
    ],
    writeProtocol: [
      "Keep drafts concise, evidence-based, and mechanically useful.",
      "When identity is explicit, create canonical JSON entity/entities and replace touched references in the same response.",
      "After successful canonical write, delete the corresponding draft markdown in the same response.",
    ],
    guardrails: [
      "This folder is markdown-only; do not store JSON entities here.",
      "If canonical write fails, keep draft and retry write; do not delete draft on failed promotion.",
      "Do not keep stale placeholder aliases once canonical IDs exist.",
    ],
  },
  {
    path: "custom_rules",
    title: "Custom Rules",
    purpose:
      "Rule-pack root. Category folders hold optional `RULES.md` files with active constraints.",
    whatBelongs: [
      "Category directories `custom_rules/<priority>-<slug>/`.",
      "`README.md` markers for folder intent and structure preservation.",
      "Optional `RULES.md` inside category folders when active rules are required.",
    ],
    writeProtocol: [
      "Create or update category `RULES.md` only when constraints are intentionally active.",
      "Keep rules concrete, testable, and non-overlapping.",
      "Prefer existing category folders over creating new ad-hoc structures.",
    ],
    guardrails: [
      "Do not write unrelated world state in this tree.",
      "Avoid duplicate/conflicting rules across categories.",
      "Keep category scope narrow and explicit.",
    ],
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
  whatBelongs = [],
  writeProtocol = [],
  guardrails = [],
  maintenance = [],
}: {
  title: string;
  purpose: string;
  whatBelongs?: string[];
  writeProtocol?: string[];
  guardrails?: string[];
  maintenance?: string[];
}): string =>
  [
    `# ${title}`,
    "",
    "## Purpose",
    purpose,
    "",
    "## Audience",
    "- StateEditor: keep this README as a persistent directory marker.",
    "- AI Runtime: treat this document as the folder write contract.",
    "",
    "## What Belongs Here",
    ...(whatBelongs.length > 0
      ? whatBelongs.map((entry) => `- ${entry}`)
      : ["- Folder-specific artifacts for this path scope."]),
    "",
    "## Write Protocol",
    ...(writeProtocol.length > 0
      ? writeProtocol.map((entry) => `- ${entry}`)
      : ["- Keep writes minimal and schema-valid."]),
    "",
    "## Guardrails",
    ...(guardrails.length > 0
      ? guardrails.map((entry) => `- ${entry}`)
      : ["- Avoid unrelated writes outside this folder purpose."]),
    "",
    "## Maintenance",
    ...(maintenance.length > 0
      ? maintenance.map((entry) => `- ${entry}`)
      : [
          "- Keep this README in place to preserve folder structure and intent.",
          "- If folder scope changes, update this README before changing file layout.",
        ]),
    "",
  ].join("\n");

const buildCustomRuleCategoryReadme = (
  preset: CustomRuleCategoryPreset,
): string =>
  buildReadme({
    title: `${preset.title} Rules`,
    purpose: preset.directoryPurpose,
    whatBelongs: [
      "Optional `RULES.md` with active constraints for this category.",
      "Category-local notes that explain why rules here are needed.",
    ],
    writeProtocol: [
      `When to apply: ${preset.whenToApply}`,
      "Add actionable constraints in bullet form under `## Specific Rules`.",
      "Prefer explicit trigger conditions and verifiable outcomes per rule.",
      ...preset.starterRules.map((rule) => `Starter baseline: ${rule}`),
    ],
    guardrails: [
      "Do not duplicate constraints that already exist in another category.",
      "Avoid vague style-only guidance with no operational effect.",
      "If a rule no longer applies, remove or revise it rather than leaving stale text.",
    ],
  });

const SCAFFOLD_DEFINITIONS: readonly DirectoryScaffoldDefinition[] = [
  ...ROOT_CATEGORY_DIRECTORIES.map((item) => ({
    path: item.path,
    title: item.title,
    purpose: item.purpose,
    readme: buildReadme(item),
  })),
  ...PLACEHOLDER_DOMAINS.map((domain) => ({
    path: `world/placeholders/${domain}`,
    title: `Placeholder ${toTitleCase(domain)}`,
    purpose: `Placeholder drafts for ${domain} entities.`,
    readme: buildReadme({
      title: `Placeholder ${toTitleCase(domain)}`,
      purpose: `Draft markdown placeholders scoped to ${domain}.`,
      whatBelongs: [
        `Draft files at \`world/placeholders/${domain}/<entityId>.md\`.`,
      ],
      writeProtocol: [
        "Use this draft only while identity/details are unresolved.",
        "Promote to canonical entity JSON once identity is explicit.",
        "Delete draft in the same response after successful promotion.",
      ],
      guardrails: [
        "Markdown only; never store canonical JSON in placeholder folders.",
        "Do not keep stale drafts after canonical entity creation.",
      ],
    }),
  })),
  ...CUSTOM_RULE_CATEGORY_PRESETS.map((preset) => {
    const path = toCustomRulesDirectoryPath(preset);
    return {
      path,
      title: `${preset.title} Rules`,
      purpose: `${preset.directoryPurpose} Add a RULES.md file here only when this category needs active constraints.`,
      readme: buildCustomRuleCategoryReadme(preset),
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
