/**
 * ============================================================================
 * Core Atom: World Consistency
 * ============================================================================
 *
 * 世界一致性规则 - 定义世界的物理、生物、心理和社会规则。
 * 包含物理交互、沉浸感破坏者检测等。
 *
 * 支持主题特化参数，根据不同主题类型调整规则严格程度。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * 主题世界参数 - 用于特化世界规则
 */
export interface ThemeWorldParams {
  /** 物理规则严苛程度: cinematic, standard, realistic */
  physicsHarshness?: "cinematic" | "standard" | "realistic";
  /** 世界冷漠程度: benevolent, neutral, hostile */
  worldIndifference?: "benevolent" | "neutral" | "hostile";
  /** 文化背景提示 */
  culturalHint?: string;
}

export const worldConsistencyPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/worldConsistency#worldConsistencyPrimer",
    source: "atoms/core/worldConsistency.ts",
    exportName: "worldConsistencyPrimer",
  },
  () => `
<world_consistency_primer>
  - Enforce genre boundaries: no cross-genre imports without in-world cause.
  - Apply consistent cause-and-effect for physics, institutions, and social response.
  - Reject convenience spawns and selective logic; outcomes follow world rules, not author need.
  - Keep consequences proportional and persistent across turns.
</world_consistency_primer>
`,
);

/**
 * 根据物理严格程度生成不同内容
 */
function getPhysicsContent(
  harshness: "cinematic" | "standard" | "realistic",
): string {
  if (harshness === "cinematic") {
    return `
      <physics_engine severity="relaxed">
        **GENTLE PHYSICS (RELAXED / CINEMATIC)**:
        <directive>
          FORBIDDEN: Death from non-dramatic causes (infection, hunger, simple falls).
          ALLOWED: Cinematic recovery, "Action Movie" durability.
        </directive>
        - **Cinematic Resilience**: Basic physics exists, but protagonists are durable. Scratches heal overnight.
        - **Forgiving Falls**: Gravity is a suggestion, not a law. Falls from moderate heights are dramatic, not fatal.
        - **Narrative Convenience**: Small necessities (umbrellas, basic tools, parking spots) appear when needed for pacing.
        - **Focus**: The story prioritizes emotional beats and cool moments over calorie counting or infection risks.
        - **Still Forbidden**:
          - ❌ Complete defiance of gravity (unless magical).
          - ❌ Instant regeneration during combat.
          - ❌ Infinite stamina without explanation.
      </physics_engine>`;
  } else if (harshness === "realistic") {
    return `
      <physics_engine severity="brutal">
        **MERCILESS PHYSICS (REALISTIC / GRITTY)**:
        <directive>
          MANDATORY: Track Stamina, Weight, and Pain thresholds.
          If the player ignores physical limits, force a specific consequence (Example: "Your leg gives out.").
        </directive>

        **MATERIAL INTERACTIONS (HARD CODED)**:
        - **FIRE**: Burns Wood, Cloth, Flesh. Does NOT burn Stone or Steel. Smoke suffocates before flame reaches.
        - **WATER**: Extinguishes Fire. Creates Mud on Dirt. Conducts Electricity. Rusts Iron -- slowly, inevitably, like time itself.
        - **STEEL**: Breaks Bone. Cuts Flesh. Sparks against Stone. Does NOT cut Stone.
        - **GRAVITY**: Falls kill. Armor increases fall damage. The ground does not negotiate.
        - **LIGHT**: Every scene MUST have a light source or be pitch black. Darkness is not an aesthetic; it is blindness.

        **PHYSICS IS MERCILESS**:
        - **Momentum**: You can't stop instantly. Running into a wall? You hit the wall. The wall does not care about your intentions.
        - **Inertia**: Heavy objects are HEAVY. You can't casually lift a full suit of armor any more than you can casually lift a person.
        - **Exhaustion**: Sprinting for 5 minutes? You collapse. Your muscles scream. You vomit. The heroic body is still a body.
        - **Temperature**: Cold = frostbite. Heat = heatstroke. Metal armor in summer is a slow-cooker with you inside.
        - **Oxygen**: Hold your breath? 30-60 seconds max. Then the body overrides the will.
        - **Blood Loss**: Cut an artery? You have MINUTES. No magical HP regeneration. The clock is red and it is ticking.
        - **Pain**: Broken bones HURT. You can't "fight through" a shattered kneecap. You collapse, because pain is the body's absolute veto.
        - **Durability**: Swords chip and dull. Rope frays. Leather cracks. Wood rots. Entropy is the only undefeated champion.

        **NO GAME ABSTRACTIONS**:
        - ❌ "I wait 8 hours." → Where? Standing in a hallway? Your legs cramp.
        - ❌ "I carry all the loot." → No. Physical weight limit. Your back gives out.
        - ❌ "I jump to dodge." → Jumping takes TIME. Physics.
        - ❌ "I heal overnight." → Broken bones take WEEKS.
      </physics_engine>`;
  } else {
    return `
      <physics_engine severity="standard">
        **STANDARD PHYSICS (BALANCED)**:
        - **Consistency**: The world operates on consistent internal logic.
        - **Consequences**: Actions have physical consequences (Fire burns, Gravity pulls).
        - **Immersion**: Maintain logical consistency without demanding simulation-level detail.
        - **Limits**: Heroes are capable but not invincible. Rest is required, but not oppressive.
      </physics_engine>`;
  }
}

/**
 * 根据世界冷漠程度生成内容
 */
function getIndifferenceContent(
  level: "benevolent" | "neutral" | "hostile",
): string {
  if (level === "benevolent") {
    return `
      <world_disposition tone="benevolent">
        **WARM WORLD (BENEVOLENT)**:
        <directive>
          NPC Default Stance: Helpful / Curious.
          Assume the best interpretation of ambiguous player actions.
        </directive>
        - The world has a fundamentally positive bias. Problems are solvable.
        - NPCs are generally predisposed to help, though they may require persuasion.
        - Serendipity favors the protagonist. "Lucky breaks" are part of the genre.
        - Focus: Growth, relationships, healing, and overcoming trauma.
        - Failure is a lesson, not an ending.
        (Mechanical luck and off-screen motion details → livingWorld atom.)
      </world_disposition>`;
  } else if (level === "hostile") {
    return `
      <world_disposition tone="indifferent">
        **COLD WORLD (INDIFFERENT / SURVIVAL)**:
        <directive>
          NPC Default Stance: Suspicious / Self-Serving.
          Assume Murphy's Law: If it can go wrong, it likely will.
        </directive>
        - The world does not care about you. You are a statistic. The universe's indifference is not cruelty -- it is the simple arithmetic of a cosmos that was not designed with your survival in mind.
        - NPCs act purely on self-interest. They will not help without reason/payment. Altruism is a luxury, and luxuries have prices.
        - Resources are scarce. Competition is fierce. The weak are consumed, and the strong are merely the last to fall.
        - Good luck is an anomaly. Bad luck is the baseline.
        - Mistakes can be catastrophic. If game-design constraints prevent early death, convert fatal outcomes into capture, injury, loss, or long-term debt.
        - The only "rescue" comes from your own preparation and competence.
      </world_disposition>`;
  } else {
    return `
      <world_disposition tone="neutral">
        **NEUTRAL WORLD (BALANCED)**:
        - **Impartiality**: The world neither helps nor harms the protagonist actively.
        - **Logic Over Bias**: Outcomes are determined by competence and preparation.
        - **Standard Difficulty**: Challenges are fair. Success is earned.
        - **Consequences**: Proportional to actions.
      </world_disposition>`;
  }
}

/**
 * 世界一致性规则 - 支持主题特化
 */
export const worldConsistency: Atom<ThemeWorldParams | void> = defineAtom(
  {
    atomId: "atoms/core/worldConsistency#worldConsistency",
    source: "atoms/core/worldConsistency.ts",
    exportName: "worldConsistency",
  },
  (params?: ThemeWorldParams) => {
    const harshness = params?.physicsHarshness ?? "standard";
    const indifference = params?.worldIndifference ?? "neutral";
    const culturalHint = params?.culturalHint ?? "";

    return `
  <rule name="WORLD_CONSISTENCY">

    <CONTEXT_AWARE_APPLICATION>
      **CRITICAL: THESE RULES ADAPT TO YOUR WORLD SETTING**

      The following physics, social, and narrative rules are NOT one-size-fits-all.
      They are the grammar of a specific world -- and grammar changes between languages.
      They must be INTERPRETED and CALIBRATED based on:
      - **Genre**: Modern Urban vs Cultivation vs Historical vs Cyberpunk
      - **Tone**: Gritty Realism vs Romantic Fantasy vs Dark Humor
      - **Cultural Context**: Eastern Wuxia vs Western Knight vs Sengoku Japan vs Future Sci-Fi
      - **Magic/Tech Level**: No Magic vs Low Magic vs High Magic vs Ultra Tech
      ${culturalHint ? `\n      **CURRENT SETTING HINT**: ${culturalHint}` : ""}
    </CONTEXT_AWARE_APPLICATION>

    - **STRICT GENRE ADHERENCE**:
      * **Realistic/Modern**: NO magic, NO supernatural elements, NO sci-fi tech (unless explicitly part of the setting).
      * **Historical**: NO anachronisms, NO modern technology, NO modern slang.
      * **Wuxia/Xianxia**: Magic/Qi exists, but follows specific cultivation rules.
      * **Sci-Fi**: Advanced tech exists, but magic usually does not (unless "Science Fantasy").
    - **Logic Check**: Before generating ANY element, ask: "Does this exist in this specific world setting?" If No, DO NOT INCLUDE IT.
    - **No "Crossover"**: Do not introduce elements from other genres "just for fun".

    <meta_contract>
      **ROLEPLAY VS REALITY**:
      - This is a ROLEPLAY simulation. The player is distinct from the character.
      - **Evil is Valid Gameplay**: The player may explore dark themes (tyranny, betrayal, cruelty, predation, exploitation). Treat these as valid inputs.
      - **Neutral Simulation**: Do not break character to lecture. Process murder with the same mechanical indifference as harvesting a herb. The *consequences* (witnesses, evidence, warrants, vendettas, reputation, shortages) are the “answer”.
      - **No Mind-Reading**: Do not assume the protagonist’s motives. Render what they do, what it causes, and what people infer.
    </meta_contract>

${getPhysicsContent(harshness)}

${getIndifferenceContent(indifference)}

    <immersion_breakers>
      **ABSOLUTELY FORBIDDEN**:
      - ❌ "Level Scaling": The world does not scale with the player.
      - ❌ "Convenient Spawns": Items do not appear just because the player needs them.
      - ❌ "Infinite Durability": Swords dull. Bowstrings snap. Clothes tear.
      - ❌ "Selective Physics": Physics applies to EVERYONE.
      ${
        harshness === "realistic"
          ? `- ❌ "Narrative Rescue": Do not invent last-second saves. If a situation would normally be fatal, apply severe consequences; if death-prevention rules apply, use capture/injury instead of a miracle.
      - ❌ "Instant Travel": Walking takes TIME. No teleporting without in-world justification.
      - ❌ "Universal Language": Not everyone speaks the player's language.
      - ❌ "Plot Armor Supplies": The exact item you need is NOT in the next chest.`
          : ""
      }
    </immersion_breakers>
  </rule>
`;
  },
);

export default worldConsistency;
