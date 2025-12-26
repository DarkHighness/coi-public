/**
 * ============================================================================
 * Skill Content: Combat, Dialogue, and Atmosphere (具身现象学)
 * ============================================================================
 *
 * 维度分类: ACTING (How the body experiences the world)
 * 本体论层级: Level 2 BIOLOGY / Level 3 PSYCHOLOGY
 *
 * 哲学基础：
 * - 梅洛-庞蒂 (Merleau-Ponty): 肉身 — 身体是感知世界的媒介，不是灵魂的容器
 * - 杜威 (Dewey): 经验即交互 — 战斗、对话是与世界的交互经验
 * - 海德格尔: 情态 — 氛围是存在的基调，不是装饰
 *
 * 核心原则：
 * - 战斗是丑陋的、混乱的、令人疲惫的
 * - 疼痛是物理的，不是数字
 * - 氛围是感知的，不是描述的
 */

import type { SkillContext } from "../../types";

export function getCombatContent(_ctx: SkillContext): string {
  return `
  <rule name="COMBAT & ACTION">
    <core_combat_philosophy>
      **COMBAT IS UGLY**:
      - It is not a dance. It is fast, confusing, and exhausting.
      - **No "Exchanges"**: Don't write "He attacks, you block, he attacks again." Write "A blur of steel. The jar of impact travels up your arm. You are breathing hard."
      - **Environmental Chaos**: Tables overturn. Mud makes footing slippery. Blood gets in eyes. Use the mess.
    </core_combat_philosophy>

    <injury_system>
      **PAIN IS PHYSICAL**:
      - Don't say "You take 10 damage."
      - Say "The blade bites deep into your thigh. The leg buckles. Warmth spreads down your boot."
    </injury_system>

    <logic_enforcement>
      **CONSISTENCY IS LAW**:
      - **Injury Persistence**: If the narrative says "leg broken", you CANNOT run in the next sentence. You crawl. You limp. The penalty persists.
      - **Genre/Tech Coherence**:
        * **Fantasy**: No cellphones, no "downloads", no plastic. Magic exists, but follows rules (cost/fatigue).
        * **Historical**: No modern concepts (democracy, germs, atoms) unless appropriate for the era.
        * **Sci-Fi**: No "magic" without explanation. Physics (gravity, vacuum) kills.
    </logic_enforcement>
  </rule>
`;
}

export function getDialogueContent(_ctx: SkillContext): string {
  return `
  <rule name="DIALOGUE_MECHANICS">
    <!-- Detailed Dialogue Style is in Writing Craft -->
    <instruction>
      Refer to **Writing Craft** (Always Loaded).
    </instruction>

    <voice_texture>
      - **Accent/Dialect**: Show it through syntax, not just phonetic spelling. (e.g., A noble uses passive voice; a soldier uses commands).
    </voice_texture>

    <micro_expressions_and_physiologoy>
      **PHYSICALITY OF EMOTION**:
      Emotions are biological events. Describe the body's betrayal of the mind.

      - **Active Silence**: Characters are NEVER "silent" without reason.
        * NOT: "He was silent."
        * BUT: "He stared at the floor, jaw working." / "She looked away, feigning interest in the window."
      - **Body Betrays Words**: Someone might say "I'm fine" while gripping their sword hilt until their knuckles turn white.

      **PHYSIOLOGICAL TELLS**:
      - **The Eyes**: Rapid blinking (lying), Pupil dilation (fear), "Thousand-Yard Stare" (trauma).
      - **The Breath**: Shallow/Upper-chest (panic), Heavy rhythmic flaring (anger), Breath catches (shock).
      - **The Hands**: Picking cuticles/Wiping sweat (anxiety), White-knuckled grip/Tremors (rage).
      - **Involuntary**: Flushing red (shame), Going pale (terror), Upper lip curl (disgust).
    </micro_expressions_and_physiologoy>
  </rule>
`;
}

export function getAtmosphereContent(_ctx: SkillContext): string {
  return `
  <rule name="ATMOSPHERE & MOOD">
    <mood_enforcement>
      **SHOW, DON'T TELL**:
      - Never use the word "creepy". Describe the silence and the smell of stale air.
      - Never use the word "majestic". Describe the scale and the light.
    </mood_enforcement>

    <location_atmosphere_consistency>
      **DUAL-LAYER ATMOSPHERE (CRITICAL)**:
      - **Textual Descriptions (Visible Layer)**:
        * **environment**: A vivid, natural language sentence describing the physical surroundings.
        * **ambience**: A vivid description of the audio landscape and general "vibe".
        * **weather**: A natural language description of current conditions.
      - **System UI (atmosphere field)**:
        * Use enums (envTheme, ambience, weather) for technical UI implementation.
      - **CONSISTENCY**: AI MUST ensure the textual descriptions align perfectly with the selected enums. If the enum is 'heavy_rain', the weather description MUST reflect heavy rain.
    </location_atmosphere_consistency>

    <dynamic_environment>
      **THE WORLD IS ALIVE AND SENSORY**:
      - **Atmosphere as Character**: The rain *drowns* conversation; the wind *mocks* silence.
      - **Small Imperfections**: Moss in the corner, a crack in pristine marble, a flickering torch. These ground the scene.
      - **Unnatural Details**: In dungeons/horror, describe "wrongness"—shadows stretching toward light, air that smells of old graves.
      - **Sensory Texture**:
        * **Touch**: Slime-slick walls, weeping moisture, grit of sand.
        * **Smell**: Old paper, dried lavender, rust, sour milk, ozone.
        * **Sound**: House settling, fire snapping like bone.
    </dynamic_environment>

    <!-- Detailed Syntax Rhythm is in Writing Craft -->
    <instruction>
      Refer to **Writing Craft** (Always Loaded).
    </instruction>
  </rule>
`;
}

export function getMysteryContent(_ctx: SkillContext): string {
  return `
  <rule name="MYSTERY & FORESHADOWING">
    <plant_seeds>
    **Plant Seeds Early**: Every major revelation should have at least 3 prior hints scattered throughout the narrative.
    </plant_seeds>

    <layered_clues>
    **Layered Clues**:
      * **Surface Level**: Obvious clues that attentive players will catch immediately.
      * **Hidden Level**: Clues that only make sense in retrospect ("Oh, THAT's why the merchant was nervous!").
      * **Deep Level**: Clues embedded in world-building that require piecing together multiple sources.
    - **Red Herrings**: Not every suspicious element is guilty. Some innocent things look suspicious. Some guilty things look innocent.
    - **Chekhov's Arsenal**:
      * If you describe a weapon on the wall, it should fire eventually.
      * If you introduce a character detail, it should matter.
      * Every "random" detail is secretly purposeful.
    - **Dramatic Irony**: Let the player suspect what characters don't know. The tension of "Don't go in there!" when the character can't hear you.
    - **Revelation Pacing**:
      * **Too Early**: Kills tension. The mystery becomes known fact.
      * **Too Late**: Frustrates. The player stops caring.
      * **Just Right**: The moment of revelation lands with impact. "I knew it!" and "I should have seen it!" simultaneously.
    - **Conspiracy Layering**: Big secrets protect themselves with smaller secrets. Uncover one layer, find another beneath.
    - **Environmental Storytelling**: Let locations tell stories:
      * Blood stains that don't match the official story.
      * A child's toy in an abandoned fortress.
      * Two wine glasses when only one person is supposed to live here.
    - **NPC Contradiction Tracking**: When NPCs lie, track the inconsistencies. Let attentive players catch them:
      * "He said he was in the north wing, but his shoes have south courtyard mud."
      * "She claims to be a stranger here, but greeted the innkeeper by name."
  </rule>
`;
}
