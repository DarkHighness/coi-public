/**
 * ============================================================================
 * Cultural Atom: Language Enforcement
 * ============================================================================
 *
 * 语言强制 - 确保 AI 使用正确的语言输出。
 * Full version matching skills/content/cultural.ts
 */

import type { Atom } from "../types";

export type LanguageEnforcementInput = {
  language: string;
};

/**
 * Helper function to check if language is Chinese family
 */
const isChineseFamily = (language: string): boolean =>
  [
    "zh",
    "zh-CN",
    "zh-TW",
    "Chinese",
    "Chinese (Simplified)",
    "Chinese (Traditional)",
  ].some((l) => language.includes(l) || l.includes(language));

/**
 * Helper function to get language-specific examples
 */
const getExamples = (language: string) => {
  if (isChineseFamily(language)) {
    return {
      npcNameWrong1: `"name": "法海 (Fahai)"`,
      npcNameWrong2: `"name": "Fahai / 法海"`,
      npcNameCorrect: `"name": "法海"`,
      titleWrong1: `"title": "孤傲的孽龙公子 (The Desolate Dragon Prince)"`,
      titleWrong2: `"title": "Dragon Prince - 龙太子"`,
      titleCorrect: `"title": "孤傲的孽龙公子"`,
      locationWrong1: `"name": "黑龙潭 (Black Dragon Pool)"`,
      locationWrong2: `"name": "Black Dragon Pool / 黑龙潭"`,
      locationCorrect: `"name": "黑龙潭"`,
      roleTagWrong1: `"roleTag": "引导者 / Mentor"`,
      roleTagWrong2: `"roleTag": "Guide / 向导"`,
      roleTagCorrect: `"roleTag": "引导者"`,
      statusWrong: `"status": "虚弱 (Weakened)"`,
      statusCorrect: `"status": "虚弱"`,
      raceWrong: `"race": "黑龙族 男性 (Black Dragon Male)"`,
      raceCorrect: `"race": "黑龙族男性"`,
      mixedTermsWrong: `"Level up你的技能", "NPC对话", "HP恢复"`,
      mixedTermsCorrect: `"提升你的技能", "角色对话", "生命值恢复"`,
      parenWrong1: `"一个战士（A Warrior）"`,
      parenWrong2: `"A sword (一把剑)"`,
      parenCorrect: `"一个战士"`,
      inlineWrong: `"他是战士 - He is a warrior"`,
      inlineCorrect: `"他是战士"`,
      // Primer examples
      liteForbidden: `"法海 (Fahai)", "黑龙潭 (Black Dragon Pool)", "roleTag: 引导者/Guide"`,
      liteCorrect: `"法海", "黑龙潭", "roleTag: 引导者"`,
    };
  }

  // English and other languages - use generic placeholders
  return {
    npcNameWrong1: `"name": "John (约翰)"`,
    npcNameWrong2: `"name": "ジョン / John"`,
    npcNameCorrect: `"name": "John"`,
    titleWrong1: `"title": "Dragon Slayer (屠龙者)"`,
    titleWrong2: `"title": "屠龙者 - Dragon Slayer"`,
    titleCorrect: `"title": "Dragon Slayer"`,
    locationWrong1: `"name": "Black Pool (黒い池)"`,
    locationWrong2: `"name": "黑龙潭 / Black Dragon Pool"`,
    locationCorrect: `"name": "Black Dragon Pool"`,
    roleTagWrong1: `"roleTag": "Mentor / 导师"`,
    roleTagWrong2: `"roleTag": "导师 / Mentor"`,
    roleTagCorrect: `"roleTag": "Mentor"`,
    statusWrong: `"status": "Weakened (虚弱)"`,
    statusCorrect: `"status": "Weakened"`,
    raceWrong: `"race": "Dragon Male (龙族男性)"`,
    raceCorrect: `"race": "Black Dragon Male"`,
    mixedTermsWrong: `"提升你的Level", "NPC对话", "HP回復"`,
    mixedTermsCorrect: `"Level up your skills", "Character dialogue", "Health recovery"`,
    parenWrong1: `"a warrior（戦士）"`,
    parenWrong2: `"一把剑 (a sword)"`,
    parenCorrect: `"a warrior"`,
    inlineWrong: `"He is a warrior - 他是战士"`,
    inlineCorrect: `"He is a warrior"`,
    // Primer examples
    liteForbidden: `"John (约翰)", "Black Pool (黒池)", "roleTag: Mentor/导师"`,
    liteCorrect: `"John", "Black Pool", "roleTag: Mentor"`,
  };
};

/**
 * 语言强制规则 - 完整版
 */
export const languageEnforcement: Atom<LanguageEnforcementInput> = ({
  language,
}) => {
  const ex = getExamples(language);

  return `
<language_enforcement_protocol>
  <critical_directive>
    ⚠️ ABSOLUTE LANGUAGE PURITY REQUIRED ⚠️
    TARGET LANGUAGE: ${language}
    ALL user-facing content MUST be in ${language} ONLY.
  </critical_directive>

  <strict_field_rules>
    **EVERY text field in JSON output must be PURE ${language}:**
    - "name" fields: PURE ${language} only
    - "title" fields: PURE ${language} only
    - "description" fields: PURE ${language} only
    - "roleTag" fields: PURE ${language} only
    - "status" fields: PURE ${language} only
    - "appearance" fields: PURE ${language} only
    - "voice" fields: PURE ${language} only
    - "mannerism" fields: PURE ${language} only
    - "mood" fields: PURE ${language} only
    - "choices" text: PURE ${language} only
    - "lore" fields: PURE ${language} only
    - "background" fields: PURE ${language} only
    - "profession" fields: PURE ${language} only
    - "narrative" fields: PURE ${language} only
    - "objectives" fields: PURE ${language} only
    - ALL other narrative content: PURE ${language} only
  </strict_field_rules>

  <common_violations>
    🚫 **THESE PATTERNS ARE STRICTLY FORBIDDEN:**

    **NPC/Character Names:**
    ❌ WRONG: ${ex.npcNameWrong1}
    ❌ WRONG: ${ex.npcNameWrong2}
    ✅ CORRECT: ${ex.npcNameCorrect}

    **Character Titles:**
    ❌ WRONG: ${ex.titleWrong1}
    ❌ WRONG: ${ex.titleWrong2}
    ✅ CORRECT: ${ex.titleCorrect}

    **Location Names:**
    ❌ WRONG: ${ex.locationWrong1}
    ❌ WRONG: ${ex.locationWrong2}
    ✅ CORRECT: ${ex.locationCorrect}

    **Role Tags:**
    ❌ WRONG: ${ex.roleTagWrong1}
    ❌ WRONG: ${ex.roleTagWrong2}
    ✅ CORRECT: ${ex.roleTagCorrect}

    **Status Fields:**
    ❌ WRONG: ${ex.statusWrong}
    ✅ CORRECT: ${ex.statusCorrect}

    **Race Fields:**
    ❌ WRONG: ${ex.raceWrong}
    ✅ CORRECT: ${ex.raceCorrect}

    **Parenthetical Translations:**
    ❌ WRONG: ${ex.parenWrong1}
    ❌ WRONG: ${ex.parenWrong2}
    ✅ CORRECT: ${ex.parenCorrect}

    **Inline Translations:**
    ❌ WRONG: ${ex.inlineWrong}
    ✅ CORRECT: ${ex.inlineCorrect}

    **Mixed Terms:**
    ❌ WRONG: ${ex.mixedTermsWrong}
    ✅ CORRECT: ${ex.mixedTermsCorrect}
  </common_violations>

  <exceptions>
    **ONLY these may be in English (regardless of target language):**
    - JSON field KEYS (e.g., "name", "description", "visible", "hidden")
    - Entity IDs (e.g., "saint_monk_fahai", "black_dragon_pool")
    - Technical code terms strictly required by system

    **NEVER put translations or alternative languages in field VALUES (the content).**
  </exceptions>

  <enforcement>
    Before outputting ANY text field value, verify:
    1. Is this an ID field or JSON key? → English is allowed
    2. Is this a content/narrative field? → Must be PURE ${language}
    3. Does it have parentheses containing an alternative-language translation?
    4. Does it have slashes or dashes separating two languages?
    If #3 or #4 is YES → REWRITE in PURE ${language}.
  </enforcement>
</language_enforcement_protocol>
`;
};

/**
 * Language enforcement primer (system-prompt safe).
 *
 * This is intentionally short and non-optional. It replaces the old short-form export.
 */
export const languageEnforcementPrimer: Atom<LanguageEnforcementInput> = ({
  language,
}) => {
  const ex = getExamples(language);

  return `
<language_enforcement>
⚠️ LANGUAGE PURITY: ALL field VALUES must be in ${language}.
ONLY JSON keys and entity IDs may be in English.
❌ FORBIDDEN: ${ex.liteForbidden}
✅ CORRECT: ${ex.liteCorrect}
NO parenthetical translations. NO slash-separated alternatives. PURE ${language} only.
</language_enforcement>
`;
};

export default languageEnforcement;
