import { getRoleInstruction } from "./common";

export const getTranslationPrompt = (
  text: string,
  targetLanguage: string,
): string => {
  return `
${getRoleInstruction()}
<instruction>
Translate the following text into ${targetLanguage}.
Maintain the tone, style, and nuance of the original text.
If the text contains game terms (stats, UI elements), keep them accurate to standard gaming terminology in the target language.
</instruction>

<input_text>
${text}
</input_text>

<output_format>
Return ONLY the translated text.
    **CRITICAL Rules**:
    1. Do NOT wrap the output in markdown code blocks (No \`\`\` or \`\`\`text).
    2. Do NOT include any explanations or extra text.
    3. Do NOT include quotes around the output unless they are part of the translation.
</output_format>
`;
};
