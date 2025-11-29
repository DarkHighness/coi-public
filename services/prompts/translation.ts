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
Return ONLY the translated text. No explanations, no quotes around the output.
</output_format>
`;
};
