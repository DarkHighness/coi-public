/**
 * ============================================================================
 * Skill Content: Cultural Adaptation
 * ============================================================================
 *
 * 完整迁移自 common.ts getCulturalAdaptationInstruction
 */

import type { SkillContext } from "../types";

export function getCulturalAdaptationContent(ctx: SkillContext): string {
  const { language } = ctx;

  if (language === "zh" || language === "zh-CN" || language === "zh-TW") {
    return `
<cultural_adaptation>
  <critical>
    - **World View & Aesthetics**: For ALL themes (unless explicitly Western/Foreign), you MUST use **Chinese-style backgrounds, philosophy, and social structures**.
    - **Names**: ALL characters MUST have authentic Chinese names (e.g., "Li Qing", "Zhang Wei") unless they are explicitly foreigners.
    - **Items/Locations**: Use Chinese naming conventions (e.g., "Jade Pavilion", "Spirit Sword").
    - **Visuals**: Describe scenes with Eastern aesthetics (e.g., ink wash painting style, flying eaves, flowing robes) where appropriate.
    - **CHARACTER APPEARANCE - MANDATORY**:
      * **Facial Features**: Describe characters with **typical East Asian features** (e.g., "黑色的眼睛", "东方人的面孔", "典型的亚洲人长相").
      * **Physical Traits**: Use culturally appropriate descriptions (e.g., "乌黑的长发", "白皙的皮肤", "凤眼" for female characters, "剑眉星目" for male characters).
      * **Modern Settings**: For contemporary/realistic themes, describe characters as having "亚洲人的面容", "黑发黑眼", etc.
      * **Fantasy/Historical Settings**: Use period-appropriate Eastern aesthetics (e.g., "如水墨画中走出的佳人", "剑客的凌厉气质").
      * **ABSOLUTELY PROHIBITED**: Do NOT describe characters with Western features (blue eyes, blonde hair, "European appearance") UNLESS the character is explicitly a foreigner in the story.
  </critical>
  <exceptions>
    1. The theme is explicitly Western (e.g., "Medieval Europe", "Cyberpunk Western").
    2. The character is explicitly a non-human race (Elf, Orc, Dwarf, Robot, Alien, etc.).
    3. The character is explicitly described as a foreigner or from a different specific culture in the story context.
  </exceptions>
  <style>
    <phrasing_guide>
      **STRICT NATIVE FLUENCY (NO TRANSLATION-ESE)**:
      The following patterns are overly "English" and forbidden in high-quality Chinese writing:

      1. **Ban on "When..." Clauses**:
         - ❌ "当他进门的时候..." (When he entered...)
         - ✅ "他一进门..." / "进门时..." / "推门而入..." (He entered...)

      2. **Ban on unnecessary pronouns**:
         - ❌ "他抬起他的手，看着他的剑。" (He raised his hand and looked at his sword.)
         - ✅ "他抬手凝视剑锋。" (He raised [null] hand, stared at [null] sword edge.)

      3. **Ban on passive markers (被)**:
         - ❌ "他被剑刺中了。" (He was stabbed by the sword.)
         - ✅ "长剑贯穿胸膛。" (Long sword pierced chest.)

      4. **Ban on "Adjective + de" (...的...) overload**:
         - ❌ "一个愤怒的、巨大的、红色的怪物。"
         - ✅ "一头赤红巨兽，怒不可遏。"

      **Vocabulary Precision**:
      - Use specific verbs. Don't say "put" (放). Say "slam" (拍), "place" (置), "toss" (掷).
      - Use "Baihua" (Modern Written Chinese) for narration. Keep "Chengyu" (Idioms) for emphasis, not filler.
    </phrasing_guide>

    <pacing_control>
      - **Conflict-Driven**: Like a high-quality drama, every scene must have a hook.
      - **Avoid "Summary Style"**: Don't say "经过一番激烈的打斗" (After a fierce fight). Describe the fight.
    </pacing_control>

    <social_consistency>
      **CLASS & STATION EXIST**:
      - **Hierarchy of Knowledge**: A peasant likely cannot read, does not know who the Chancellor is, and cares mostly about harvest/taxes. A noble likely doesn't know the price of bread.
      - **Language Register**:
        * **Highborn**: Formal, indirect, uses allusions. "The tea is... barely adequate."
        * **Lowborn**: Direct, rough, uses slang. "This swill tastes like piss."
      - **Survival Instinct**: Commoners fear power. They bow, avert eyes, or flee. If they are brave, it is *despite* fear, not absence of it.
    </social_consistency>
  </style>
</cultural_adaptation>
`;
  }

  if (language === "en" || language === "en-US" || language === "en-GB") {
    return `
<cultural_adaptation>
  <critical>
    - **World View**: Adhere strictly to the provided 'World Setting'. If the setting is Eastern/Chinese (e.g., Wuxia, Xianxia), maintain the cultural nuances but use accessible English terminology (e.g., 'Sect' instead of 'Menpai', 'Cultivation' instead of 'Xiulian').
    - **Visuals**: For Western themes, use standard Western aesthetics. For Eastern themes, describe the unique Eastern elements clearly.
    - **CHARACTER APPEARANCE - MANDATORY**:
      * Match character physical descriptions to the cultural setting.
      * For Eastern/Asian settings: Describe characters with appropriate East Asian features (dark hair, dark eyes, Asian facial features).
      * For Western settings: Describe characters with culturally appropriate features.
      * **Western Fantasy**: Fair to tan complexion, varied hair colors (blonde, brown, red, black), eye colors (blue, green, hazel, brown). Describe weathering from environment (sun-tanned sailor, pale scholar).
      * **Modern Western**: Diverse features reflecting multicultural society. Be specific: "freckled redhead", "olive-skinned", "weathered lines around his eyes".
      * **VIVIDNESS CHECK**: Physical descriptions should reveal character history. A blacksmith's arms are thick. A scholar's hands are ink-stained. A soldier has scars.
  </critical>
  <exceptions>
    1. The character is explicitly a non-human race (Elf, Orc, Dwarf, Robot, Alien, etc.).
    2. The character is explicitly described as a foreigner or from a different specific culture in the story context.
  </exceptions>
  <style>
    <phrasing_guide>
      - **NATURALISTIC PROSE**: Write like a contemporary novelist, not a Victorian narrator.
      - **AVOID PURPLE PROSE**: "The obsidian orbs of her eyes" → "her dark eyes". Keep it grounded.
      - **ACTIVE VOICE**: Prefer active over passive. "The guard drew his sword" not "The sword was drawn by the guard".
    </phrasing_guide>

    <pacing_control>
      - **Conflict-Driven**: Every scene must have a hook—tension, mystery, or stakes.
      - **Avoid "Summary Style"**: Don't say "After a fierce battle". Describe the battle.
      - **Momentum**: Even quiet scenes need undercurrent tension—internal conflict, ticking clock, environmental pressure.
    </pacing_control>
  </style>
</cultural_adaptation>
`;
  }

  return "";
}

export function getLanguageEnforcementContent(language: string): string {
  return `
<language_enforcement_protocol>
  <critical_directive>
    TARGET LANGUAGE: ${language}
  </critical_directive>
  <rules>
    1. **Narrative & Dialogue**: MUST be in ${language}.
    2. **UI Text & Choices**: MUST be in ${language}.
    3. **Consistency**: Do NOT revert to English even if the input/context contains English.
    4. **NO LANGUAGE MIXING**:
       - ❌ FORBIDDEN: Parenthetical translations like "一个男人（A Man）" or "A sword (一把剑)"
       - ❌ FORBIDDEN: Inline translations like "他是一个战士 - He is a warrior"
       - ❌ FORBIDDEN: Mixed phrases like "这个Quest很重要" or "Level up你的技能"
       - ✅ CORRECT: Use ONLY the target language throughout the entire output
       - If a term has no direct translation, choose the most culturally appropriate equivalent or describe it
    5. **Exceptions**:
       - JSON field names (MUST be English)
       - IDs (MUST be English/snake_case)
       - Code/Technical terms (If appropriate)
       - Proper nouns that are universally known in their original form (e.g., "iPhone", "Google")
  </rules>
</language_enforcement_protocol>
`;
}
