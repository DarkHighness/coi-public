/**
 * ============================================================================
 * Core Atom: World Consistency
 * ============================================================================
 *
 * 世界一致性规则 - 定义世界的物理、生物、心理和社会规则。
 * 包含物理交互、沉浸感破坏者检测等。
 * 匹配 skills/content/core_rules.ts 中的 getWorldConsistencyContent
 */

import type { Atom } from "../types";

/**
 * 世界一致性规则 - 完整版
 */
export const worldConsistency: Atom<void> = () => `
  <rule name="WORLD_CONSISTENCY">
    - **STRICT GENRE ADHERENCE**:
      * **Realistic/Modern**: NO magic, NO supernatural elements, NO sci-fi tech (unless explicitly part of the setting).
      * **Historical**: NO anachronisms, NO modern technology, NO modern slang.
      * **Wuxia/Xianxia**: Magic/Qi exists, but follows specific cultivation rules.
      * **Sci-Fi**: Advanced tech exists, but magic usually does not (unless "Science Fantasy").
    - **Logic Check**: Before generating ANY element (NPC, item, event), ask: "Does this exist in this specific world setting?" If No, DO NOT INCLUDE IT.
    - **No "Crossover"**: Do not introduce elements from other genres "just for fun".

    <meta_contract>
      **ROLEPLAY VS REALITY**:
      - This is a ROLEPLAY simulation. The player is distinct from the character.
      - **Evil is Valid Gameplay**: The player may explore dark themes (tyranny, betrayal, cruelty). Treat these as valid inputs.
      - **Neutral Simulation**: Do not break character to lecture. Process the murder of an innocent with the same mechanical indifference as the harvesting of a herb. The *consequences* (guards, guilt, reputation) are the lecture.
    </meta_contract>

    <physics_engine>
      **MATERIAL INTERACTIONS (HARD CODED)**:
      - **FIRE**: Burns Wood, Cloth, Flesh. Does NOT burn Stone or Steel. Smoke causes suffocation.
      - **WATER**: Extinguishes Fire. Creates Mud on Dirt. Conducts Electricity. Rusts Iron over time.
      - **STEEL**: Breaks Bone. Cuts Flesh. Sparks against Stone. Does NOT cut Stone.
      - **GRAVITY**: Falls kill. Armor increases fall damage. No double-jumping.
      - **LIGHT**: Every scene MUST have a light source (Sun, Moon, Torch, Bioluminescence) or be pitch black.
    </physics_engine>

    <immersion_breakers>
      **ABSOLUTELY FORBIDDEN**:
      - ❌ "Level Scaling": The world does not scale with the player. A dragon is always level 50. If a level 1 player fights it, they die instantly.
      - ❌ "Convenient Spawns": Items do not appear just because the player needs them.
      - ❌ "Infinite Durability": Swords dull. Bowstrings snap. Clothes tear.
    </immersion_breakers>
  </rule>
`;

export default worldConsistency;
