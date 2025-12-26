/**
 * Outline Phase Handler
 *
 * Handles processing of outline phase results.
 */

import type { StoryOutline, PartialStoryOutline } from "../../../../types";
import type { OutlineLoopState } from "./outlineInitializer";
import {
  createToolCallMessage,
  createToolResponseMessage,
} from "../../../messageTypes";
import type {
  OutlinePhase0,
  OutlinePhase1,
  OutlinePhase2,
  OutlinePhase3,
  OutlinePhase4,
  OutlinePhase5,
  OutlinePhase6,
  OutlinePhase7,
  OutlinePhase8,
  OutlinePhase9,
  OutlinePhase10,
} from "../../../schemas";

// ============================================================================
// Phase Result Processing
// ============================================================================

export function processPhaseResult(
  phaseNum: number,
  result: any,
  loopState: OutlineLoopState,
): void {
  const functionCalls = result.functionCalls;
  if (!functionCalls || functionCalls.length === 0) return;

  const call = functionCalls[0];

  // Record in history
  loopState.conversationHistory.push(
    createToolCallMessage([
      {
        id: call.id || `call_${Date.now()}`,
        name: call.name,
        arguments: call.args,
      },
    ]),
  );

  loopState.conversationHistory.push(
    createToolResponseMessage([
      {
        toolCallId: call.id || `call_${Date.now()}`,
        name: call.name,
        content: { success: true, message: `Phase ${phaseNum} completed` },
      },
    ]),
  );

  // Store phase data
  loopState.partial[`phase${phaseNum}`] = call.args;
}

// ============================================================================
// Merge Phases
// ============================================================================

/**
 * Helper to ensure all entities have IDs and set unlocked: false
 */
function prepareEntities<T extends { id?: string; unlocked?: boolean }>(
  items: T[] | undefined | null,
  prefix: string,
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
    return { ...item, id: newId, unlocked: false };
  });

  return result;
}

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
    !partial.phase9 ||
    !partial.phase10
  ) {
    throw new Error("Cannot merge incomplete outline phases");
  }

  const p1 = partial.phase1 as OutlinePhase1;
  const p2 = partial.phase2 as OutlinePhase2;
  const p3 = partial.phase3 as OutlinePhase3;
  const p4 = partial.phase4 as OutlinePhase4;
  const p5 = partial.phase5 as OutlinePhase5;
  const p6 = partial.phase6 as OutlinePhase6;
  const p7 = partial.phase7 as OutlinePhase7;
  const p8 = partial.phase8 as OutlinePhase8;
  const p9 = partial.phase9 as OutlinePhase9;
  const p10 = partial.phase10 as OutlinePhase10;

  const outline: StoryOutline = {
    // Phase 1: World Foundation
    title: p1.title,
    initialTime: p1.initialTime,
    premise: p1.premise,
    narrativeScale: p1.narrativeScale,
    worldSetting: p1.worldSetting as StoryOutline["worldSetting"],
    mainGoal: p1.mainGoal as StoryOutline["mainGoal"],

    // Phase 2: Character
    character: {
      ...p2.character,
      skills: p2.character.skills
        ? prepareEntities(p2.character.skills, "skill")
        : undefined,
      conditions: p2.character.conditions
        ? prepareEntities(p2.character.conditions, "cond")
        : undefined,
      hiddenTraits: p2.character.hiddenTraits
        ? prepareEntities(p2.character.hiddenTraits, "trait")
        : undefined,
    } as StoryOutline["character"],

    // Phase 3-9: Entities
    locations: prepareEntities(
      p3.locations as StoryOutline["locations"],
      "loc",
    ) as StoryOutline["locations"],
    factions: prepareEntities(
      p4.factions as StoryOutline["factions"],
      "fac",
    ) as StoryOutline["factions"],
    npcs: prepareEntities(
      p5.npcs as StoryOutline["npcs"],
      "npc",
    ) as StoryOutline["npcs"],
    inventory: prepareEntities(
      p6.inventory as StoryOutline["inventory"],
      "inv",
    ) as StoryOutline["inventory"],
    quests: prepareEntities(
      p7.quests as StoryOutline["quests"],
      "quest",
    ) as StoryOutline["quests"],
    knowledge: prepareEntities(
      p8.knowledge as StoryOutline["knowledge"],
      "know",
    ) as StoryOutline["knowledge"],
    timeline: prepareEntities(
      p9.timeline as StoryOutline["timeline"],
      "evt",
    ) as StoryOutline["timeline"],
    initialAtmosphere:
      p9.initialAtmosphere as StoryOutline["initialAtmosphere"],

    // Phase 10: Opening Narrative
    openingNarrative: p10.openingNarrative as StoryOutline["openingNarrative"],
  };

  return outline;
}
