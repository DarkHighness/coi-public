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
        unlocked:
          typeof item.unlocked === "boolean" ? item.unlocked : false,
      };
    }
    return { ...item, id: newId };
  });

  return result;
}

type ActorBundleShape = {
  profile: { id?: string; kind?: string; relations?: unknown[] };
  skills?: Array<{ id?: string; unlocked?: boolean }>;
  conditions?: Array<{ id?: string; unlocked?: boolean }>;
  traits?: Array<{ id?: string; unlocked?: boolean }>;
  inventory?: Array<{ id?: string; unlocked?: boolean }>;
};

const prepareActorBundle = (
  input: ActorBundleShape,
  options: {
    requiredKind: "player" | "npc";
    requiredId?: string;
    idPrefix: string;
  },
): ActorBundleShape => {
  const profile = input.profile ?? ({} as any);
  const id =
    options.requiredId ??
    (typeof profile.id === "string" && profile.id.trim()
      ? profile.id.trim()
      : `${options.idPrefix}:1`);

  const kind = options.requiredKind;

  return {
    ...input,
    profile: {
      ...profile,
      id,
      kind,
      relations: Array.isArray(profile.relations) ? profile.relations : [],
    },
    skills: prepareEntities(input.skills as any, "skill", {
      defaultUnlocked: true,
    }) as any,
    conditions: prepareEntities(input.conditions as any, "cond", {
      defaultUnlocked: true,
    }) as any,
    traits: prepareEntities(input.traits as any, "trait", {
      defaultUnlocked: true,
    }) as any,
    inventory: prepareEntities(input.inventory as any, "inv", {
      defaultUnlocked: true,
    }) as any,
  };
};

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

  const preparedPlayer = prepareActorBundle((p3 as any).player as any, {
    requiredKind: "player",
    requiredId: "char:player",
    idPrefix: "char:player",
  }) as any;

  const playerPerceptions = Array.isArray((p6 as any).playerPerceptions)
    ? ((p6 as any).playerPerceptions as any[])
    : [];

  if (playerPerceptions.length > 0) {
    const existing = Array.isArray((preparedPlayer as any).profile?.relations)
      ? (preparedPlayer as any).profile.relations
      : [];
    (preparedPlayer as any).profile = {
      ...(preparedPlayer as any).profile,
      relations: [...existing, ...playerPerceptions],
    };
  }

  const outline: StoryOutline = {
    // Phase 2: World foundation
    title: p2.title,
    initialTime: p2.initialTime,
    premise: p2.premise,
    narrativeScale: p2.narrativeScale,
    worldSetting: p2.worldSetting as StoryOutline["worldSetting"],
    mainGoal: p2.mainGoal as StoryOutline["mainGoal"],

    // Phase 3: Player actor bundle
    player: preparedPlayer as any,

    // Phase 4-8: Entities
    locations: prepareEntities(
      p4.locations as StoryOutline["locations"],
      "loc",
    ) as StoryOutline["locations"],
    factions: prepareEntities(
      p5.factions as StoryOutline["factions"],
      "fac",
    ) as StoryOutline["factions"],
    quests: prepareEntities(
      (p7 as any).quests as StoryOutline["quests"],
      "quest",
    ) as StoryOutline["quests"],
    knowledge: prepareEntities(
      (p7 as any).knowledge as StoryOutline["knowledge"],
      "know",
    ) as StoryOutline["knowledge"],
    timeline: prepareEntities(
      (p8 as any).timeline as StoryOutline["timeline"],
      "evt",
    ) as StoryOutline["timeline"],
    initialAtmosphere: (p8 as any)
      .initialAtmosphere as StoryOutline["initialAtmosphere"],

    // Phase 6: NPCs + placeholders
    npcs: Array.isArray((p6 as any).npcs)
      ? ((p6 as any).npcs as any[]).map((bundle, idx) =>
          prepareActorBundle(bundle as any, {
            requiredKind: "npc",
            requiredId:
              typeof bundle?.profile?.id === "string" &&
              bundle.profile.id.trim()
                ? bundle.profile.id.trim()
                : `npc:${idx + 1}`,
            idPrefix: "npc",
          }),
        )
      : ([] as any),
    placeholders: Array.isArray((p6 as any).placeholders)
      ? ((p6 as any).placeholders as any[]).map((ph, idx) => ({
          ...ph,
          id:
            typeof ph?.id === "string" && ph.id.trim()
              ? ph.id.trim()
              : `ph:${idx + 1}`,
        }))
      : [],

    // Phase 9: Opening Narrative
    openingNarrative: (p9 as any)
      .openingNarrative as StoryOutline["openingNarrative"],
  };

  return outline;
}
