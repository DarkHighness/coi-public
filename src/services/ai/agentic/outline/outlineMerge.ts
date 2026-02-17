/**
 * Outline Merge
 *
 * Utilities for merging phased outline submissions into a full StoryOutline.
 */

import type { StoryOutline, PartialStoryOutline } from "../../../../types";
import type {
  OutlinePhase2,
  OutlinePhase3,
  OutlinePhase4,
  OutlinePhase5,
  OutlinePhase6,
  OutlinePhase7,
  OutlinePhase8,
  OutlinePhase9,
} from "../../../schemas";

// ============================================================================
// Merge Phases
// ============================================================================

interface PrepareEntitiesOptions {
  defaultUnlocked?: boolean;
}

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null;

const normalizePlaceholderDraftPath = (
  value: unknown,
  fallbackIndex: number,
): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^world\/placeholders\/[^/]+\.md$/.test(trimmed)) {
      return trimmed;
    }

    if (trimmed.length > 0) {
      const normalized = trimmed.replace(/^\/+/, "").replace(/\.md$/i, "");
      if (normalized.length > 0) {
        const filename = normalized.split("/").filter(Boolean).pop();
        if (filename && filename.length > 0) {
          return `world/placeholders/${filename}.md`;
        }
      }
    }
  }

  return `world/placeholders/ph:${fallbackIndex}.md`;
};

const normalizePlaceholderDraftMarkdown = (
  value: unknown,
  path: string,
  fallbackIndex: number,
): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  const idFromPath = path.split("/").pop()?.replace(/\.md$/i, "")?.trim();
  const id =
    idFromPath && idFromPath.length > 0 ? idFromPath : `ph:${fallbackIndex}`;

  return [
    "# Placeholder Draft",
    "",
    `- id: ${id}`,
    "",
    "## Notes",
    "- Pending concretization.",
    "",
  ].join("\n");
};

/**
 * Helper to ensure all entities have IDs.
 * For actor-owned entities, unlocked can be defaulted when requested.
 */
function prepareEntities<T extends { id?: string; unlocked?: boolean }>(
  items: T[] | undefined | null,
  prefix: string,
  options: PrepareEntitiesOptions = {},
): T[] {
  if (!items || !Array.isArray(items) || items.length === 0) {
    if (items && !Array.isArray(items)) {
      console.error(
        `[OutlineMerge] Expected array for ${prefix}, got:`,
        typeof items,
        items,
      );
    }
    return [];
  }
  let counter = 1;
  const result = items.map((item) => {
    const hasId = !!item.id;
    let idNumber: number;

    if (hasId) {
      const match = item.id!.match(/:(\d+)$/);
      idNumber = match ? parseInt(match[1], 10) : counter;
    } else {
      idNumber = counter;
    }

    const newId = hasId ? item.id : `${prefix}:${idNumber}`;
    if (!hasId) {
      console.warn(
        `[OutlineMerge] Auto-assigning ID ${newId} to entity without ID`,
      );
    }

    counter = idNumber + 1;
    if (options.defaultUnlocked) {
      return {
        ...item,
        id: newId,
        unlocked: typeof item.unlocked === "boolean" ? item.unlocked : false,
      };
    }
    return { ...item, id: newId };
  });

  return result;
}

type StoryActorBundle = StoryOutline["player"] | StoryOutline["npcs"][number];
type StoryActorProfile = StoryActorBundle["profile"];
type StoryActorSkill = NonNullable<StoryActorBundle["skills"]>[number];
type StoryActorCondition = NonNullable<StoryActorBundle["conditions"]>[number];
type StoryActorTrait = NonNullable<StoryActorBundle["traits"]>[number];
type StoryActorInventoryItem = NonNullable<
  StoryActorBundle["inventory"]
>[number];
type StoryActorRelation = NonNullable<StoryActorProfile["relations"]>[number];

type DraftActorBundle = Partial<{
  profile: Partial<StoryActorProfile>;
  skills: StoryActorSkill[];
  conditions: StoryActorCondition[];
  traits: StoryActorTrait[];
  inventory: StoryActorInventoryItem[];
}>;

const getEntityArray = <T extends { id?: string; unlocked?: boolean }>(
  value: unknown,
): T[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value as T[];
};

const getProfileFromBundle = (
  bundle: DraftActorBundle,
): Partial<StoryActorProfile> => {
  if (!isRecord(bundle.profile)) {
    return {};
  }
  return bundle.profile as Partial<StoryActorProfile>;
};

const getRelations = (
  profile: Partial<StoryActorProfile>,
): StoryActorRelation[] =>
  Array.isArray(profile.relations)
    ? (profile.relations as StoryActorRelation[])
    : [];

const toDraftActorBundle = (value: unknown): DraftActorBundle => {
  if (!isRecord(value)) {
    return {};
  }
  return value as DraftActorBundle;
};

const prepareActorBundle = (
  input: unknown,
  options: {
    requiredKind: "player" | "npc";
    requiredId?: string;
    idPrefix: string;
  },
): StoryActorBundle => {
  const bundle = toDraftActorBundle(input);
  const profile = getProfileFromBundle(bundle);
  const id =
    options.requiredId ??
    (typeof profile.id === "string" && profile.id.trim()
      ? profile.id.trim()
      : `${options.idPrefix}:1`);

  const kind = options.requiredKind;

  return {
    ...bundle,
    profile: {
      ...profile,
      id,
      kind,
      relations: getRelations(profile),
    },
    skills: prepareEntities(
      getEntityArray<StoryActorSkill>(bundle.skills),
      "skill",
      {
        defaultUnlocked: true,
      },
    ),
    conditions: prepareEntities(
      getEntityArray<StoryActorCondition>(bundle.conditions),
      "cond",
      {
        defaultUnlocked: true,
      },
    ),
    traits: prepareEntities(
      getEntityArray<StoryActorTrait>(bundle.traits),
      "trait",
      {
        defaultUnlocked: true,
      },
    ),
    inventory: prepareEntities(
      getEntityArray<StoryActorInventoryItem>(bundle.inventory),
      "inv",
      {
        defaultUnlocked: true,
      },
    ),
  };
};

const asArray = <T>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const getPlaceholderPath = (draft: unknown, index: number): string => {
  if (!isRecord(draft)) {
    return normalizePlaceholderDraftPath(undefined, index);
  }
  return normalizePlaceholderDraftPath(draft.path, index);
};

const getPlaceholderMarkdown = (
  draft: unknown,
  path: string,
  index: number,
): string => {
  if (!isRecord(draft)) {
    return normalizePlaceholderDraftMarkdown(undefined, path, index);
  }
  return normalizePlaceholderDraftMarkdown(draft.markdown, path, index);
};

const getBundleProfileId = (bundle: unknown): string | undefined => {
  if (!isRecord(bundle)) {
    return undefined;
  }
  const profile = bundle.profile;
  if (!isRecord(profile)) {
    return undefined;
  }
  if (typeof profile.id !== "string") {
    return undefined;
  }
  const trimmed = profile.id.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getPlayerPerceptions = (phase6: OutlinePhase6): StoryActorRelation[] =>
  asArray<StoryActorRelation>(phase6.playerPerceptions);

const mergeProfileRelations = (
  bundle: StoryOutline["player"],
  perceptions: StoryActorRelation[],
): StoryOutline["player"] => {
  if (perceptions.length === 0) {
    return bundle;
  }
  const existing = getRelations(bundle.profile);
  return {
    ...bundle,
    profile: {
      ...bundle.profile,
      relations: [...existing, ...perceptions],
    },
  };
};

const toNpcs = (phase6: OutlinePhase6): StoryOutline["npcs"] =>
  asArray<unknown>(phase6.npcs).map((bundle, idx) =>
    prepareActorBundle(bundle, {
      requiredKind: "npc",
      requiredId: getBundleProfileId(bundle) ?? `npc:${idx + 1}`,
      idPrefix: "npc",
    }),
  );

const toPlaceholders = (phase6: OutlinePhase6): StoryOutline["placeholders"] =>
  asArray<unknown>(phase6.placeholders).map((draft, idx) => {
    const path = getPlaceholderPath(draft, idx + 1);
    return {
      path,
      markdown: getPlaceholderMarkdown(draft, path, idx + 1),
    };
  });

const toPreparedEntities = <T extends { id?: string }>(
  items: T[] | undefined,
  prefix: string,
): T[] => prepareEntities(items, prefix);

/**
 * Merge partial outline phases into a complete StoryOutline
 */
export function mergeOutlinePhases(partial: PartialStoryOutline): StoryOutline {
  if (
    !partial.phase1 ||
    !partial.phase2 ||
    !partial.phase3 ||
    !partial.phase4 ||
    !partial.phase5 ||
    !partial.phase6 ||
    !partial.phase7 ||
    !partial.phase8 ||
    !partial.phase9
  ) {
    throw new Error("Cannot merge incomplete outline phases");
  }

  const p2 = partial.phase2 as OutlinePhase2;
  const p3 = partial.phase3 as OutlinePhase3;
  const p4 = partial.phase4 as OutlinePhase4;
  const p5 = partial.phase5 as OutlinePhase5;
  const p6 = partial.phase6 as OutlinePhase6;
  const p7 = partial.phase7 as OutlinePhase7;
  const p8 = partial.phase8 as OutlinePhase8;
  const p9 = partial.phase9 as OutlinePhase9;

  const preparedPlayer = prepareActorBundle(p3.player, {
    requiredKind: "player",
    requiredId: "char:player",
    idPrefix: "char:player",
  }) as StoryOutline["player"];
  const hydratedPlayer = mergeProfileRelations(
    preparedPlayer,
    getPlayerPerceptions(p6),
  );

  const outline: StoryOutline = {
    // Phase 2: World foundation
    title: p2.title,
    initialTime: p2.initialTime,
    premise: p2.premise,
    narrativeScale: p2.narrativeScale,
    worldSetting: p2.worldSetting,
    mainGoal: p2.mainGoal,

    // Phase 3: Player actor bundle
    player: hydratedPlayer,

    // Phase 4-8: Entities
    locations: toPreparedEntities(p4.locations, "loc"),
    factions: toPreparedEntities(p5.factions, "fac"),
    quests: toPreparedEntities(p7.quests, "quest"),
    knowledge: toPreparedEntities(p7.knowledge, "know"),
    timeline: toPreparedEntities(p8.timeline, "evt"),
    initialAtmosphere: p8.initialAtmosphere,

    // Phase 6: NPCs + placeholders
    npcs: toNpcs(p6),
    placeholders: toPlaceholders(p6),

    // Phase 9: Opening Narrative
    openingNarrative: p9.openingNarrative,
  };

  return outline;
}
