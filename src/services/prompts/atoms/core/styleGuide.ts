/**
 * Core Atom: Style Guide
 * Content from output_format.ts
 */
import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export interface StyleGuideInput {
  themeStyle?: string;
}

const humanizerTone = `
<humanizer_tone>
  **HUMANIZER TONE / 去 AI 化（简版，默认启用）**
  - Style polish must NOT alter canonical state.
  - 先具体后情绪：用可验证的物件/动作/声音承载氛围，别宣布“意义/震撼/史诗”。
  - 删拐杖词：此外/同时/因此/总之/值得注意的是/在某种程度上（能删就删）。
  - 少模板句：不仅…还… / 不是…而是… / 既…又… / “这不仅是…更是…”。
  - 避免宣传腔与宏大词：标志着/彰显/见证/里程碑/不可磨灭/开创性/令人叹为观止。
  - 避免虚拟权威：有人说/据传/众所周知（除非是世界内谣言/报告/档案）。
  - 两个细节胜过三个；句尾别收“金句”。要诗性，放在 NPC 口中或纸条/广播里，少量。
  - Never rewrite canonical state for style: preserve IDs, counts, inventory, injuries, locations, causality, and timeline exactly.
</humanizer_tone>
`;

export const styleGuideDescription: Atom<StyleGuideInput> = defineAtom(
  {
    atomId: "atoms/core/styleGuide#styleGuideDescription",
    source: "atoms/core/styleGuide.ts",
    exportName: "styleGuideDescription",
  },
  ({ themeStyle }) => {
    const toneSection = themeStyle
      ? `<tone>${themeStyle}</tone>`
      : "<tone>Gritty, grounded, visceral.</tone>";

    return `
<style>
${toneSection}
${humanizerTone}
</style>
`;
  },
);

export const styleGuide: Atom<StyleGuideInput> = defineAtom(
  {
    atomId: "atoms/core/styleGuide#styleGuide",
    source: "atoms/core/styleGuide.ts",
    exportName: "styleGuide",
  },
  ({ themeStyle }) => {
    const toneSection = themeStyle
      ? `<tone>${themeStyle}</tone>`
      : "<tone>Gritty, grounded, visceral.</tone>";

    return `
<style>
${toneSection}
${humanizerTone}

<signal_to_noise_ratio>
  **THE 80/20 REALITY RATIO**:
  - **80% SIGNAL (Plot Relevance)**: Most details must serve the story (clues, atmosphere, character state, plot stakes).
  - **20% NOISE (Realistic Texture)**: The AI MUST include "useless" but realistic details.
    * A guard scratching a rash.
    * A cat knocking over a bucket.
    * A typo on a royal decree.
    * The smell of frying onions from a nearby window.
  - **Purpose**: If *everything* is a clue, the world feels artificial (Chekhov's Gun Overload). The "Noise" makes the "Signal" pop.
  - **Instruction**: In every turn, include at least one detail that has NO plot relevance but HIGH sensory truth.
</signal_to_noise_ratio>

<markdown_formatting>
  **NARRATIVE MARKDOWN RULES**

  The \`assistant.narrative\` field in the turn file is rendered as Markdown. Follow these rules STRICTLY:

  <allowed_formatting>
    **ALLOWED ELEMENTS:**
    - **Bold**: Use \`**text**\` for important names, locations, items when FIRST introduced
    - *Italic*: Use \`*text*\` for whispers, emphasis, foreign/archaic words. DO NOT use italics for protagonist inner thoughts.
    - Blockquote: Use \`>\` for dialogue, letters, inscriptions, quoted text
    - Horizontal Rule: Use \`---\` to separate distinct scenes or time jumps
    - Inline Code: Use backticks for spell names, incantations, technical terms
  </allowed_formatting>

  <forbidden_formatting>
    **ABSOLUTELY FORBIDDEN:**
    - ❌ Code blocks (triple backticks): NEVER use triple backticks for any purpose
    - ❌ Bullet lists (* or -): NEVER use bullet points in narrative
    - ❌ Numbered lists (1. 2. 3.): NEVER use numbered lists
    - ❌ Headers (#, ##, ###): NEVER use headers in narrative
    - ❌ Tables: NEVER use markdown tables
    - ❌ Links: NEVER use [text](url) format
    - ❌ HTML tags: NEVER use <br>, <b>, <i>, or any HTML
    - ❌ Multiple blank lines: Use single line breaks only
    - ❌ Trailing whitespace: Avoid spaces at end of lines
  </forbidden_formatting>

  <blockquote_rules>
    **DIALOGUE FORMATTING:**
    Use blockquotes (\`>\`) for spoken dialogue ONLY:

    <pure_dialogue_rule>
      **BLOCKQUOTES ARE FOR DIALOGUE ONLY - NO SCENE DESCRIPTIONS:**
      - Blockquotes should contain ONLY the spoken words and speaker attribution
      - Scene descriptions, actions, and narration must be OUTSIDE the blockquote
      - Do NOT mix dialogue and scene descriptions in the same blockquote
    </pure_dialogue_rule>

    ✅ CORRECT (dialogue and scene separated):
    The guard steps forward, blocking your path. His hand rests on the pommel of his sword.

    > "I won't let you pass," he says.

    You meet his gaze without flinching.

    > "Then you'll have to stop me."

    ❌ WRONG (mixing scene description inside blockquote):
    > The guard steps forward, his hand on his sword. "I won't let you pass," he says, eyes narrowing as he studies you.

    ❌ WRONG (action description inside blockquote):
    > "I won't let you pass," the guard says, drawing his sword and stepping into a defensive stance.

    ✅ CORRECT (action OUTSIDE, dialogue INSIDE):
    The guard draws his sword and steps into a defensive stance.

    > "I won't let you pass."

    ❌ WRONG (missing blockquote):
    "I won't let you pass," the guard says.

    ❌ WRONG (consecutive blockquotes without blank line):
    > "First line"
    > "Second line"
    (Each dialogue should be its own blockquote with blank line between)
  </blockquote_rules>

  <emphasis_rules>
    **BOLD AND ITALIC USAGE:**
    - Bold (**) for: NEW entity names on first appearance, critical revelations
    - Italic (*) for: whispers, emphasis, foreign/archaic words (NOT protagonist inner thoughts)
    - Do NOT overuse: Max 2-3 bold phrases per paragraph
    - Do NOT combine: Avoid ***bold italic*** - choose one
  </emphasis_rules>

  <scene_breaks>
    **HORIZONTAL RULES FOR SCENE BREAKS:**
    Use \`---\` (three dashes on its own line) ONLY for:
    - Time skips (hours or days passing)
    - Location changes (traveling to new area)
    - Flashbacks or memory sequences

    ✅ CORRECT:
    You leave the tavern and head north.

    ---

    Three days later, the mountain peaks come into view.

    ❌ WRONG:
    You enter the room.
    ---
    You look around.
    (No scene break needed within same continuous action)
  </scene_breaks>

  <paragraph_structure>
    **PROSE FLOW:**
    - Write in natural paragraphs, not fragmented sentences
    - Each paragraph should be 2-5 sentences
    - Use line breaks between paragraphs, not within them
    - Avoid one-sentence paragraphs unless for dramatic effect
  </paragraph_structure>

  <quality_checklist>
    Before writing the turn files, verify narrative formatting:
    1. ✓ No code blocks or triple backticks
    2. ✓ No bullet/numbered lists
    3. ✓ No headers (#)
    4. ✓ Dialogue uses blockquotes (>)
    5. ✓ Bold/italic used sparingly and correctly
    6. ✓ Scene breaks (---) only for time/location jumps
  </quality_checklist>
</markdown_formatting>
</style>
`;
  },
);
