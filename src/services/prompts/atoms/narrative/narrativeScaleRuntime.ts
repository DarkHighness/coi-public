/**
 * ============================================================================
 * Narrative Atom: Narrative Scale Runtime Guidance
 * ============================================================================
 *
 * 叙事规模运行时指导 - 用于 Turn 生成时根据已选择的规模提供写作指导。
 * 这与选择阶段的指南不同，这里是已经选择了规模后的实际写作规则。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export type NarrativeScaleRuntimeInput = {
  scale: "epic" | "intimate" | "balanced";
  language?: string;
};

/**
 * 小格局叙事运行时指导
 */
export const narrativeScaleIntimate: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/narrativeScaleRuntime#narrativeScaleIntimate",
    source: "atoms/narrative/narrativeScaleRuntime.ts",
    exportName: "narrativeScaleIntimate",
  },
  () => `
<narrative_scale_guidance scale="intimate">
  **THIS IS AN INTIMATE-SCALE STORY (小格局叙事)**

  The AI has determined this story focuses on personal stakes, not world-shaping events.
  Adjust your narrative accordingly:

  <tone_and_pacing>
    **SLOWER PACE, DEEPER FOCUS**:
    - Linger on everyday moments: meals together, quiet evenings, small talk
    - Physical intimacy (non-sexual): hand-holding, leaning on shoulders, shared silences
    - Describe the mundane with reverence—making tea, folding laundry, waiting for someone
    - Time can pass gently; not every scene needs tension
  </tone_and_pacing>

  <conflict_design>
    **NO APOCALYPTIC THREATS**:
    - Conflicts are personal: misunderstandings, unspoken feelings, family pressure
    - The "antagonist" can be circumstance, not a villain
    - Economic hardship, social expectations, health issues—these are valid stakes
    - A single harsh word can be as devastating as a sword blow in this context

    **RESOLUTION IS QUIET**:
    - "Victory" might be: reconciliation, acceptance, a difficult conversation had
    - There doesn't need to be a dramatic confrontation
    - Sometimes the best ending is just: things continue, but warmer
  </conflict_design>

  <character_treatment>
    **ORDINARY PEOPLE MATTER**:
    - The protagonist doesn't need hidden powers or secret lineages
    - NPCs have rich inner lives—show their morning routines, their small joys
    - Relationships evolve through accumulated small moments, not dramatic declarations
    - Physical imperfections are endearing, not plot points
  </character_treatment>

  <language_calibration>
    **MATCH SCALE TO LANGUAGE**:
    - ❌ AVOID: "世界的命运悬于一线" (The fate of the world hangs in the balance)
    - ✅ USE: "他不知道该怎么开口" (He didn't know how to begin)
    - ❌ AVOID: "This would change everything forever"
    - ✅ USE: "She left the umbrella by the door, just in case"

    **SMALL GESTURES SPEAK LOUDEST**:
    - The extra portion served without asking
    - Walking on the street-side of the sidewalk
    - Remembering how they like their coffee
    - Saving the last bite of the good dish for them
  </language_calibration>

  <world_treatment>
    **THE WORLD IS A BACKDROP**:
    - Historical events, if mentioned, are through personal lens: "The factory closed the year I was born"
    - Politics and power struggles happen elsewhere; we hear echoes at most
    - The world is as big as the protagonist's daily life: a neighborhood, a workplace, a family
    - Detailed world-building serves atmosphere, not plot
  </world_treatment>

  <emotional_authenticity>
    **家长里短处处见温馨 (WARMTH IN EVERYDAY MATTERS)**:
    - 菜做多了故意让你打包 (The parent who "accidentally" made too much food)
    - 下雨天车站等人的那把伞 (The umbrella waiting at the station)
    - 吵架后默默做好的饭菜 (The meal prepared silently after a fight)
    - 故意输掉的棋局 (The chess game deliberately lost)

    **不是每个人都是英雄 (NOT EVERYONE IS A HERO)**:
    - 有些人的故事就是平淡地活着 (Some people's stories are simply: living)
    - 最大的胜利可能是撑过又一天 (The greatest victory might be surviving another day)
    - 爱不需要惊天动地 (Love doesn't need to shake heaven and earth)
  </emotional_authenticity>
</narrative_scale_guidance>
`,
);

/**
 * 宏大叙事运行时指导
 */
export const narrativeScaleEpic: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/narrativeScaleRuntime#narrativeScaleEpic",
    source: "atoms/narrative/narrativeScaleRuntime.ts",
    exportName: "narrativeScaleEpic",
  },
  () => `
<narrative_scale_guidance scale="epic">
  **THIS IS AN EPIC-SCALE STORY (宏大叙事)**

  The AI has determined this story involves world-shaping stakes.
  Maintain the following principles:

  <stakes_and_scope>
    **THE WORLD IS AT STAKE**:
    - Civilizations, species, or reality itself hangs in the balance
    - The protagonist's choices ripple outward, affecting thousands
    - History is being written; the player is part of that history
    - Ancient prophecies, cosmic forces, or fundamental laws are in play
  </stakes_and_scope>

  <conflict_design>
    **LAYERED CONFLICTS**:
    - Personal struggles intersect with world-level threats
    - Factions vie for power; alliances shift
    - The antagonist's motivations are concrete (greed, fear, ideology, pleasure, hunger for power). They do NOT need to be sympathetic.
    - Sacrifice is meaningful; victory has costs
  </conflict_design>

  <character_treatment>
    **HEROES AND LEGENDS**:
    - The protagonist may have hidden potential, but must earn their power
    - NPCs are shaped by the great events around them
    - Relationships are forged in fire—loyalty tested, betrayal devastating
    - Death and loss carry weight; plot armor is minimal
  </character_treatment>

  <language_calibration>
    **EPIC LANGUAGE IS APPROPRIATE — BUT GROUNDED**:
    - Grand declarations, oaths, and vows fit the tone
    - Cosmic scale can be invoked, but anchor it in the body: not just "The stars trembled" but "She felt the tremor in her bones before she saw the sky crack"
    - ❌ AVOID: empty grandeur — "The ancient power surged through him, and he knew his destiny"
    - ✅ USE: grounded grandeur — "The power tore through his ribs like swallowed lightning. His teeth cracked. His vision whited out. When it passed, the hillside was glass."
  </language_calibration>

  <pacing_discipline>
    **NOT EVERY SCENE IS THE CLIMACTIC BATTLE**:
    - Epic stories need breathing room: the campfire before the siege, the letter written before dawn, the meal shared before the march
    - 十年磨一剑 (Ten years to forge a single blade) — training arcs, quiet preparation, and slow accumulation make the climax land
    - Alternate intensity: battle → aftermath → planning → discovery → tension → confrontation
    - Even in war, soldiers eat, sleep, argue over dice, and miss home
  </pacing_discipline>

  <anti_patterns>
    **EPIC DOES NOT MEAN**:
    - Every NPC delivers prophecy (most people in an epic world are still ordinary)
    - Every scene needs a dramatic reveal (mundane logistics of war create immersion)
    - The protagonist is always the center of cosmic attention (empires have their own inertia)
    - Power arrives without cost (the stronger the gift, the steeper the price)
  </anti_patterns>
</narrative_scale_guidance>
`,
);

/**
 * 平衡叙事运行时指导
 */
export const narrativeScaleBalanced: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/narrativeScaleRuntime#narrativeScaleBalanced",
    source: "atoms/narrative/narrativeScaleRuntime.ts",
    exportName: "narrativeScaleBalanced",
  },
  () => `
<narrative_scale_guidance scale="balanced">
  **THIS IS A BALANCED-SCALE STORY (平衡叙事)**

  The AI has determined this story has significant personal stakes with wider implications,
  but not apocalyptic scope.

  <stakes_and_scope>
    **PERSONAL WITH RIPPLES**:
    - The protagonist's world is at stake, not THE world
    - Regional politics, local power struggles, personal vendettas
    - Consequences matter deeply to those involved, but life goes on elsewhere
    - Mystery, suspense, and adventure—stakes are high but contained
  </stakes_and_scope>

  <conflict_design>
    **GROUNDED THREATS**:
    - A corrupt official, a rival family, a dangerous secret, a conspiracy with local reach
    - The threat is real but not cosmic
    - Victory means safety, justice, or resolution—not saving reality
    - The protagonist is capable but not "the chosen one"—earned skill, not destiny

    **INVESTIGATION & DISCOVERY MECHANICS**:
    - Clues arrive incomplete: a name without a face, a motive without proof, a witness who lies about one detail
    - Let the player assemble the picture; do not hand them conclusions
    - Red herrings are earned: they must be plausible enough to follow before the dead end reveals itself
    - 局中局，计中计 (Schemes within schemes) — the first answer is rarely the whole answer
  </conflict_design>

  <tone_flexibility>
    **BLEND INTIMATE AND EPIC**:
    - Quiet moments between intense scenes: the drink after the interrogation, the walk home after the fight
    - Relationships matter as much as action — an ally's trust is as valuable as a weapon
    - Humor and lightness can coexist with danger; tension that never breaks becomes exhausting
    - The world has texture—both grand vistas and cozy corners

    **PACING RHYTHM**:
    - Investigation → Discovery → Complication → Confrontation → Aftermath → New Thread
    - 黎明前最黑暗的时刻 (Darkest hour before dawn) — but dawn is earned, not guaranteed
    - Let the player feel competent: their skills and preparation matter, their attention is rewarded
  </tone_flexibility>

  <language_calibration>
    **MATCH THE THRESHOLD**:
    - ❌ AVOID: "The fate of all existence rested on your shoulders"
    - ✅ USE: "If you don't find the ledger by morning, three families lose their homes"
    - ❌ AVOID: "You make a friend at the market" (too low-stakes for balanced)
    - ✅ USE: "The merchant remembers your face. She slides the note across the counter without being asked"

    **小人物的大抉择 (Big choices for small people)**:
    - The detective who can solve the case or protect her informant—not both
    - The smuggler who knows the route but owes the wrong people a favor
    - The healer who has one dose of antivenom and two patients
  </language_calibration>
</narrative_scale_guidance>
`,
);

/**
 * 根据规模选择对应的运行时指导
 */
export const narrativeScaleRuntime: Atom<NarrativeScaleRuntimeInput> =
  defineAtom(
    {
      atomId: "atoms/narrative/narrativeScaleRuntime#narrativeScaleRuntime",
      source: "atoms/narrative/narrativeScaleRuntime.ts",
      exportName: "narrativeScaleRuntime",
    },
    ({ scale }, trace) => {
      switch (scale) {
        case "intimate":
          return trace.record(narrativeScaleIntimate);
        case "epic":
          return trace.record(narrativeScaleEpic);
        case "balanced":
          return trace.record(narrativeScaleBalanced);
        default:
          return "";
      }
    },
  );

/**
 * Narrative scale runtime primer (system-prompt safe).
 */
export const narrativeScaleRuntimeDescription: Atom<NarrativeScaleRuntimeInput> =
  defineAtom(
    {
      atomId:
        "atoms/narrative/narrativeScaleRuntime#narrativeScaleRuntimeDescription",
      source: "atoms/narrative/narrativeScaleRuntime.ts",
      exportName: "narrativeScaleRuntimeDescription",
    },
    ({ scale }, trace) => {
      switch (scale) {
        case "intimate":
          return `[NARRATIVE SCALE: INTIMATE] Focus on personal stakes, everyday warmth, and quiet victories. No apocalyptic threats needed.`;
        case "epic":
          return `[NARRATIVE SCALE: EPIC] World-shaping stakes, heroic journeys, and cosmic consequences. Layered conflicts required.`;
        case "balanced":
          return `[NARRATIVE SCALE: BALANCED] Personal stakes with wider implications. Significant but not apocalyptic.`;
        default:
          return "";
      }
    },
  );

export default narrativeScaleRuntime;
