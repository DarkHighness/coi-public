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
 * 语言强制规则 - 完整版
 */
export const languageEnforcement: Atom<LanguageEnforcementInput> = ({
  language,
}) => `
<language_enforcement_protocol>
  <critical_directive>
    TARGET LANGUAGE: ${language}
  </critical_directive>
  <rules>
    1. **Narrative & Dialogue**: MUST be in ${language}.
    2. **UI Text & Choices**: MUST be in ${language}.
    3. **Consistency**: Do NOT revert to English even if the input/context contains English.
    4. **NO LANGUAGE MIXING (STRICT)**:
        - ❌ FORBIDDEN: Parenthetical translations like "一个男人（A Man）" or "A sword (一把剑)".
        - ❌ FORBIDDEN: Inline translations like "他是一个战士 - He is a warrior".
        - ❌ FORBIDDEN: Mixed phrases like "这个Quest很重要", "Level up你的技能", "NPC的对话".
        - ❌ FORBIDDEN: Dual-language descriptions in any field (e.g., "Appearance: 黑发 (Black hair)").
        - ❌ FORBIDDEN: Using English abbreviations for common terms (e.g., using "HP" instead of "生命值" in narrative).
        - ✅ CORRECT: Use ONLY the target language throughout the entire output.
        - If a term has no direct translation, use the most culturally appropriate equivalent (e.g., "Mana" -> "法力/灵力", "Level" -> "等级/境界").
    5. **Exceptions**:
       - JSON field names (MUST be English)
       - IDs (MUST be English/snake_case)
       - Code/Technical terms (Only if strictly necessary for system functions)
       - Proper nouns that are universally known in their original form (e.g., "iPhone", "Google"), but prefer transliteration if available.
  </rules>
</language_enforcement_protocol>
`;

/**
 * 语言强制规则 - 精简版
 */
export const languageEnforcementLite: Atom<LanguageEnforcementInput> = ({
  language,
}) => `
<language_enforcement>
ALL output MUST be in ${language}. NO language mixing.
Exceptions: JSON field names, IDs, and code terms only.
</language_enforcement>
`;

export default languageEnforcement;
