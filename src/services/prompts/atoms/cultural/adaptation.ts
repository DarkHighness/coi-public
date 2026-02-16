/**
 * ============================================================================
 * Cultural Atom: Cultural Adaptation
 * ============================================================================
 *
 * This atom controls language quality and expression style only.
 * Cultural-circle selection must follow runtime culture skill protocol,
 * not output language.
 */

import type { Atom } from "../types";
import { defineAtom } from "../../trace/runtime";

export type CulturalAdaptationInput = {
  language: string;
};

const ZH_CODES = ["zh", "zh-CN", "zh-TW", "Chinese"];
const EN_CODES = ["en", "en-US", "en-GB", "English"];

/**
 * Full cultural adaptation guidance.
 * NOTE: This is language-quality guidance, not culture-circle routing logic.
 */
export const culturalAdaptation: Atom<CulturalAdaptationInput> = defineAtom(
  {
    atomId: "atoms/cultural/adaptation#culturalAdaptation",
    source: "atoms/cultural/adaptation.ts",
    exportName: "culturalAdaptation",
  },
  ({ language }) => {
    const isZh = ZH_CODES.includes(language);
    const isEn = EN_CODES.includes(language);

    if (isZh) {
      return `
<cultural_adaptation>
  <critical>
    - Language only controls phrasing quality. Do NOT bind culture circle by language.
    - Names, customs, religion, historical memory, and social hierarchy must follow \`culture_skill_protocol\` and resolved culture skills.
    - Keep single-script output and avoid bilingual parenthetical duplication unless explicitly requested by the user.
  </critical>
  <style>
    <phrasing_guide>
      - Use natural modern Chinese phrasing; avoid literal translation patterns.
      - Prefer concise active clauses and concrete verbs over abstract summaries.
      - Avoid unnecessary pronoun repetition when the subject is clear.
      - Keep diction consistent with era and setting (do not mix modern slang into historical tone unless intentionally stylized).
    </phrasing_guide>

    <pacing_control>
      - Keep each scene conflict-driven with a clear pressure vector.
      - Avoid retrospective summary narration; present observable actions and consequences.
      - Preserve causal continuity and emotional progression between beats.
    </pacing_control>
  </style>
</cultural_adaptation>
`;
    }

    if (isEn) {
      return `
<cultural_adaptation>
  <critical>
    - Language only controls phrasing quality. Do NOT bind culture circle by language.
    - Names, customs, religion, historical memory, and social hierarchy must follow \`culture_skill_protocol\` and resolved culture skills.
    - Keep single-script output and avoid dual-script name pairs unless explicitly requested by the user.
  </critical>
  <style>
    <phrasing_guide>
      - Write natural contemporary English; avoid translation-ese and glossary-style prose.
      - Prefer active voice and concrete verbs over abstract narration.
      - Keep terminology consistent once transliterated for the chosen output language.
      - Match register and cadence to era and social context.
    </phrasing_guide>

    <pacing_control>
      - Keep scenes pressure-driven with clear stakes.
      - Avoid summary shortcuts; show decisive actions and outcomes.
      - Maintain continuity of tone, motivation, and consequence.
    </pacing_control>
  </style>
</cultural_adaptation>
`;
    }

    return `<cultural_adaptation>
- Write for the selected output language with natural native fluency.
- Language does not decide culture circle; follow \`culture_skill_protocol\` for naming and cultural constraints.
- Keep output in a single script and avoid mixed-script pairing unless explicitly requested.
- Maintain setting-consistent register, terminology, and pacing.
</cultural_adaptation>`;
  },
);

/**
 * Cultural adaptation primer (system-prompt safe).
 */
export const culturalAdaptationPrimer: Atom<CulturalAdaptationInput> =
  defineAtom(
    {
      atomId: "atoms/cultural/adaptation#culturalAdaptationPrimer",
      source: "atoms/cultural/adaptation.ts",
      exportName: "culturalAdaptationPrimer",
    },
    ({ language }) => `<cultural_adaptation>
- Write in natural ${language} fluency.
- Do NOT infer culture circle from language.
- Follow \`culture_skill_protocol\` for naming, social, religious, and historical constraints.
- Keep single-script output unless user explicitly asks for mixed-script rendering.
</cultural_adaptation>`,
  );

export default culturalAdaptation;
